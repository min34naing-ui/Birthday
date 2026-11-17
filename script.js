(() => {
  const cfg = window.APP_CONFIG || {};

  const loginView = document.getElementById("login-view");
  const birthdayView = document.getElementById("birthday-view");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const gallery = document.getElementById("gallery");
  const galleryMessage = document.getElementById("gallery-message");
  const logoutButton = document.getElementById("logout-btn");

  // Check required website elements
  if (
    !loginView || !birthdayView || !loginForm ||
    !loginMessage || !gallery || !galleryMessage || !logoutButton
  ) {
    console.error("Website HTML elements are missing.");
    return;
  }

  const loginButton = loginForm.querySelector("button");

  // Check Supabase configuration
  if (
    !window.supabase ||
    !cfg.SUPABASE_URL ||
    !cfg.SUPABASE_ANON_KEY ||
    !cfg.PHOTO_BUCKET ||
    !cfg.PHOTO_FOLDER ||
    cfg.SUPABASE_URL.includes("YOUR_PROJECT") ||
    cfg.SUPABASE_ANON_KEY.includes("YOUR_")
  ) {
    loginMessage.textContent =
      "Supabase Setup မမှန်ပါ။ config.js ကို ပြန်စစ်ပါ။";

    if (loginButton) loginButton.disabled = true;
    return;
  }

  // Create Supabase client
  const client = window.supabase.createClient(
    cfg.SUPABASE_URL,
    cfg.SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    }
  );

  // Prevent endless waiting
  function withTimeout(promise, ms = 15000) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("TIMEOUT")),
          ms
        )
      )
    ]);
  }

  function showLogin() {
    loginView.classList.remove("hidden");
    birthdayView.classList.add("hidden");
  }

  function showBirthday() {
    loginView.classList.add("hidden");
    birthdayView.classList.remove("hidden");
  }

  // Check approved members
  async function isApproved(userId) {
    const result = await withTimeout(
      client
        .from("birthday_members")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle()
    );

    if (result.error) throw result.error;

    return Boolean(result.data);
  }

  // Load private photos
  async function loadGallery() {
    gallery.innerHTML =
      '<div class="empty-state">အမှတ်တရပုံလေးတွေကို ရှာနေပါတယ် ♡</div>';

    galleryMessage.textContent = "";

    try {
      const result = await withTimeout(
        client.storage
          .from(cfg.PHOTO_BUCKET)
          .list(cfg.PHOTO_FOLDER, {
            limit: 100,
            sortBy: {
              column: "name",
              order: "asc"
            }
          })
      );

      if (result.error) throw result.error;

      const photos = (result.data || []).filter(item =>
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

        const signedResult = await withTimeout(
          client.storage
            .from(cfg.PHOTO_BUCKET)
            .createSignedUrl(
              path,
              Number(cfg.SIGNED_URL_SECONDS) || 3600
            )
        );

        if (
          signedResult.error ||
          !signedResult.data?.signedUrl
        ) {
          console.error("Photo URL error:", signedResult.error);
          continue;
        }

        const card = document.createElement("article");
        card.className = "photo-card";

        card.style.setProperty(
          "--tilt",
          index % 2 === 0 ? "-1.5deg" : "1.5deg"
        );

        const img = document.createElement("img");
        img.src = signedResult.data.signedUrl;
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

    } catch (err) {
      console.error("Gallery error:", err);

      gallery.innerHTML = "";
      galleryMessage.textContent =
        "ဓာတ်ပုံတွေကို ဖတ်မရပါ။ Storage Permission ကို စစ်ဆေးပါ။";
    }
  }

  // Enter website after login
  async function enterApp(user) {
    try {
      loginMessage.textContent = "Account ခွင့်ပြုချက် စစ်ဆေးနေပါတယ်…";

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
      console.error("Account check error:", err);

      try {
        await client.auth.signOut();
      } catch (signOutError) {
        console.error(signOutError);
      }

      showLogin();

      loginMessage.textContent =
        err.message === "TIMEOUT"
          ? "Connection ကြာနေပါတယ်။ Internet နဲ့ Supabase ကို ပြန်စစ်ပါ။"
          : "Account ခွင့်ပြုချက် စစ်ဆေးမရပါ။ Table နဲ့ RLS Policy ကို ပြန်စစ်ပါ။";
    }
  }

  // Login
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (loginButton) loginButton.disabled = true;

    loginMessage.textContent = "ဝင်ရောက်နေပါတယ်…";

    const email = document
      .getElementById("email")
      .value.trim();

    const password = document
      .getElementById("password")
      .value;

    try {
      const result = await withTimeout(
        client.auth.signInWithPassword({
          email,
          password
        }),
        15000
      );

      if (result.error) {
        console.error("Login error:", result.error);

        loginMessage.textContent =
          "Email သို့မဟုတ် Password မှားနေပါတယ်။ ပြန်စစ်ကြည့်ပါ။";

        return;
      }

      if (!result.data?.user) {
        loginMessage.textContent =
          "Login မအောင်မြင်ပါ။ ထပ်စမ်းကြည့်ပါ။";

        return;
      }

      await enterApp(result.data.user);

    } catch (err) {
      console.error("Login failed:", err);

      loginMessage.textContent =
        err.message === "TIMEOUT"
          ? "ဆက်သွယ်မှု ကြာနေပါတယ်။ Internet သို့မဟုတ် Supabase URL/Key ကို စစ်ဆေးပါ။"
          : "Login လုပ်ရာမှာ ပြဿနာဖြစ်နေပါတယ်။ Internet နဲ့ Supabase Setup ကို စစ်ပါ။";

    } finally {
      if (loginButton) loginButton.disabled = false;
    }
  });

  // Logout
  logoutButton.addEventListener("click", async () => {
    try {
      await client.auth.signOut();

      gallery.innerHTML = "";
      galleryMessage.textContent = "";

      showLogin();

      loginMessage.textContent =
        "လုံခြုံစွာ Log out လုပ်ပြီးပါပြီ။";

    } catch (err) {
      console.error("Logout error:", err);
    }
  });

  // Restore existing session
  async function initializeApp() {
    try {
      const result = await withTimeout(
        client.auth.getSession()
      );

      if (result.data?.session?.user) {
        await enterApp(result.data.session.user);
      } else {
        showLogin();
      }

    } catch (err) {
      console.error("Session error:", err);
      showLogin();

      loginMessage.textContent =
        "Connection မရပါ။ Internet နဲ့ Supabase Setup ကို စစ်ဆေးပါ။";
    }
  }

  client.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      showLogin();
    }
  });

  initializeApp();

})();

