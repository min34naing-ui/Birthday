
(() => {
  const cfg = window.APP_CONFIG || {};

  const loginView = document.getElementById("login-view");
  const birthdayView = document.getElementById("birthday-view");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const gallery = document.getElementById("gallery");
  const galleryMessage = document.getElementById("gallery-message");
  const logoutButton = document.getElementById("logout-btn");

  const photoInput = document.getElementById("photo-input");
  const uploadButton = document.getElementById("upload-btn");
  const uploadStatus = document.getElementById("upload-status");

  const music = document.getElementById("birthday-music");
  const musicButton = document.getElementById("music-btn");
  const musicMessage = document.getElementById("music-message");

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
      "Setup မပြီးသေးပါ။ config.js ကို ပြန်စစ်ပါ။";
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
    if (music) music.pause();
  }

  function showBirthday() {
    loginView.classList.add("hidden");
    birthdayView.classList.remove("hidden");
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
      '<div class="empty-state">အမှတ်တရပုံလေးတွေကို ရှာနေပါတယ် </div>';

    galleryMessage.textContent = "";

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
      console.error("Gallery error:", error);
      return;
    }

    const photos = (objects || []).filter(item =>
      item.name &&
      !item.name.startsWith(".") &&
      /\.(jpe?g|png|webp|gif)$/i.test(item.name)
    );

    if (!photos.length) {
      gallery.innerHTML =
        '<div class="empty-state">ဓာတ်ပုံမတင်ရသေးပါ။ ဒီနေရာကနေ ပုံတင်နိုင်ပါတယ် </div>';
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

      if (signedError || !data?.signedUrl) {
        console.error("Signed URL error:", signedError);
        continue;
      }

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
        `Memory ${String(index + 1).padStart(2, "0")} `;

      card.append(img, caption);
      gallery.append(card);
    }

    if (!gallery.children.length) {
      gallery.innerHTML =
        '<div class="empty-state">ဓာတ်ပုံပြသလို့မရပါ။ Storage Policy ကို စစ်ဆေးပါ။</div>';
    }
  }

  async function uploadPhotos() {
    const files = Array.from(photoInput.files || []);

    if (!files.length) {
      uploadStatus.textContent = "အရင်ဆုံး တင်ချင်တဲ့ပုံတွေ ရွေးပေးပါနော်။";
      return;
    }

    uploadButton.disabled = true;
    uploadStatus.textContent = "ဓာတ်ပုံတွေ တင်နေပါတယ်";

    let uploaded = 0;
    let failed = 0;
    let uploadError = "";

    for (const file of files) {
      try {
        if (!file.type.startsWith("image/")) {
          throw new Error("Image file မဟုတ်ပါ။");
        }

        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const filePath =
          `${cfg.PHOTO_FOLDER}/${Date.now()}_${Math.random()
            .toString(36).slice(2, 8)}_${safeName}`;

        const { error } = await client.storage
          .from(cfg.PHOTO_BUCKET)
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type
          });

        if (error) throw error;
        uploaded++;

      } catch (err) {
        console.error("Photo upload error:", err);

        uploadError = [
          err?.message,
          err?.error,
          err?.statusCode,
          err?.name
        ].filter(Boolean).join(" | ") || String(err);

        failed++;
      }
    }

    uploadButton.disabled = false;
    photoInput.value = "";

    uploadStatus.textContent =
      uploaded + " ပုံ တင်ပြီး၊ " + failed +
      " ပုံ မအောင်မြင်ပါ။" +
      (failed ? " အကြောင်းရင်း: " + uploadError : "");

    if (uploaded > 0) {
      await loadGallery();
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
    loginMessage.textContent = "ဝင်ရောက်နေပါတယ်";

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

  uploadButton.addEventListener("click", uploadPhotos);

  musicButton.addEventListener("click", async () => {
    if (music.paused) {
      try {
        await music.play();
        musicButton.textContent = " Pause birthday song";
        musicButton.classList.add("playing");
        musicMessage.textContent = "သီချင်းလေး ဖွင့်ထားပါတယ် ";
      } catch (err) {
        musicMessage.textContent =
          "သီချင်းဖွင့်မရပါ။ birthday.mp3 ဖိုင်ကို စစ်ပေးပါနော်။";
        console.error("Music error:", err);
      }
    } else {
      music.pause();
      musicButton.textContent = " Play birthday song";
      musicButton.classList.remove("playing");
      musicMessage.textContent = "သီချင်းကို ခဏရပ်ထားပါတယ် ";
    }
  });

  music.addEventListener("ended", () => {
    musicButton.textContent = " Play birthday song";
    musicButton.classList.remove("playing");
  });

  logoutButton.addEventListener("click", async () => {
    await client.auth.signOut();
    gallery.innerHTML = "";
    showLogin();
    loginMessage.textContent = "လုံခြုံစွာ Log out လုပ်ပြီးပါပြီ။";
  });

  client.auth.getSession().then(async ({ data, error }) => {
    if (error) {
      console.error(error);
      return;
    }

    if (data.session?.user) {
      await enterApp(data.session.user);
    }
  });

  client.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session) {
      showLogin();
    }
  });
})();
