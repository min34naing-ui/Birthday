(() => {
  const cfg = window.APP_CONFIG || {};

  const loginView = document.getElementById("login-view");
  const birthdayView = document.getElementById("birthday-view");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const gallery = document.getElementById("gallery");
  const galleryMessage = document.getElementById("gallery-message");
  const logoutButton = document.getElementById("logout-btn");

  const recoveryPanel = document.getElementById("recovery-panel");
  const newPassword = document.getElementById("new-password");
  const confirmPassword = document.getElementById("confirm-password");
  const updatePasswordButton = document.getElementById("update-password-btn");
  const recoveryMessage = document.getElementById("recovery-message");

  const isRecovery = window.location.hash.includes("type=recovery");

  if (!window.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY ||
      cfg.SUPABASE_URL.includes("YOUR_PROJECT") ||
      cfg.SUPABASE_ANON_KEY.includes("YOUR_")) {
    loginMessage.textContent =
      "Setup မပြီးသေးပါ။ config.js ထဲမှာ Supabase URL နဲ့ anon key ထည့်ပါ။";
    loginForm.querySelector("button").disabled = true;
    return;
  }

  const client = window.supabase.createClient(
    cfg.SUPABASE_URL,
    cfg.SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  function showLogin() {
    loginView.classList.remove("hidden");
    birthdayView.classList.add("hidden");
  }

  function showBirthday() {
    loginView.classList.add("hidden");
    birthdayView.classList.remove("hidden");
  }

  if (isRecovery && recoveryPanel) {
    recoveryPanel.classList.remove("hidden");
  }

  async function isApproved(userId) {
    const { data, error } = await client
      .from("birthday_members")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return Boolean(data);
  }

  async function loadGallery() {
    gallery.innerHTML =
      '<div class="empty-state">အမှတ်တရပုံလေးတွေကို ရှာနေပါတယ် ♡</div>';

    const { data: objects, error } = await client.storage
      .from(cfg.PHOTO_BUCKET)
      .list(cfg.PHOTO_FOLDER, {
        limit: 100,
        sortBy: { column: "name", order: "asc" }
      });

    if (error) {
      gallery.innerHTML = "";
      galleryMessage.textContent =
        "ဓာတ်ပုံတွေကို ဖတ်လို့မရပါ။ Storage Policy ကို ပြန်စစ်ပါ။";
      return;
    }

    const photos = (objects || []).filter(item =>
      item.name &&
      !item.name.startsWith(".") &&
      /\.(jpe?g|png|webp|gif)$/i.test(item.name)
    );

    if (!photos.length) {
      gallery.innerHTML =
        '<div class="empty-state">ဓာတ်ပုံမတင်ရသေးပါ။ Supabase Storage ထဲ Upload လုပ်ပေးပါနော် ♡</div>';
      return;
    }

    gallery.innerHTML = "";

    for (const [index, photo] of photos.entries()) {
      const path = `${cfg.PHOTO_FOLDER}/${photo.name}`;

      const { data, error: signedError } = await client.storage
        .from(cfg.PHOTO_BUCKET)
        .createSignedUrl(
          path,
          Number(cfg.SIGNED_URL_SECONDS) || 3600
        );

      if (signedError || !data?.signedUrl) continue;

      const card = document.createElement("article");
      card.className = "photo-card";
      card.style.setProperty(
        "--tilt",
        index % 2 === 0 ? "-1.5deg" : "1.5deg"
      );

      const img = document.createElement("img");
      img.src = data.signedUrl;
      img.alt = "A private memory";
      img.loading = "lazy";

      const caption = document.createElement("p");
      caption.textContent =
        `Memory ${String(index + 1).padStart(2, "0")} ♡`;

      card.append(img, caption);
      gallery.append(card);
    }

    if (!gallery.children.length) {
      gallery.innerHTML =
        '<div class="empty-state">ဓာတ်ပုံပြသလို့မရပါ။ Storage Policy ကို စစ်ဆေးပါ။</div>';
    }
  }

  async function enterApp(user) {
    try {
      const approved = await isApproved(user.id);

      if (!approved) {
        await client.auth.signOut();
        showLogin();
        loginMessage.textContent =
          "ဒီ Account ကို Website ကြည့်ခွင့် မပေးထားပါ။";
        return;
      }

      showBirthday();
      await loadGallery();

    } catch (err) {
      await client.auth.signOut();
      showLogin();
      loginMessage.textContent =
        "Account ခွင့်ပြုချက် စစ်ဆေးမရပါ။ Setup ကို ပြန်စစ်ပါ။";
      console.error(err);
    }
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const button = loginForm.querySelector("button");
    button.disabled = true;
    loginMessage.textContent = "ဝင်ရောက်နေပါတယ်…";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });

    button.disabled = false;

    if (error || !data.user) {
      loginMessage.textContent =
        "Email သို့မဟုတ် Password မှားနေပါတယ်။ ထပ်စမ်းကြည့်ပါ။";
      return;
    }

    await enterApp(data.user);
  });

  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      await client.auth.signOut();
      gallery.innerHTML = "";
      showLogin();
      loginMessage.textContent =
        "လုံခြုံစွာ Log out လုပ်ပြီးပါပြီ။";
    });
  }

  if (updatePasswordButton) {
    updatePasswordButton.addEventListener("click", async () => {
      const password = newPassword.value;
      const confirm = confirmPassword.value;

      if (password.length < 12) {
        recoveryMessage.textContent =
          "Password အနည်းဆုံး 12 လုံး ထည့်ပါ။";
        return;
      }

      if (password !== confirm) {
        recoveryMessage.textContent =
          "Password နှစ်ခု မတူပါဘူး။";
        return;
      }

      updatePasswordButton.disabled = true;
      recoveryMessage.textContent = "Session စစ်ဆေးနေပါတယ်...";

      try {
        const { data: sessionData, error: sessionError } =
          await client.auth.getSession();

        if (sessionError || !sessionData.session) {
          recoveryMessage.textContent =
            "Recovery Session မရသေးပါ။ Email အသစ်ထဲက Link ကို ပြန်ဖွင့်ပါ။";
          updatePasswordButton.disabled = false;
          return;
        }

        recoveryMessage.textContent = "Password ပြောင်းနေပါတယ်...";

        const { error } = await client.auth.updateUser({
          password: password
        });

        if (error) {
          recoveryMessage.textContent = error.message;
          updatePasswordButton.disabled = false;
          return;
        }

        recoveryMessage.textContent =
          "Password အသစ် ပြောင်းပြီးပါပြီ။ ❤️";

        newPassword.value = "";
        confirmPassword.value = "";
        updatePasswordButton.disabled = false;

      } catch (err) {
        recoveryMessage.textContent= err.message;
        updatePasswordButton.disabled = false;
      }
    });
  }

  client.auth.getSession().then(async ({ data }) => {
    if (!isRecovery && data.session?.user) {
      await enterApp(data.session.user);
    }
  });

  client.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session) {
      if (!isRecovery) showLogin();
    }
  });
})();
