(() => {
  const cfg = window.APP_CONFIG || {};

  const loginView = document.getElementById("login-view");
  const birthdayView = document.getElementById("birthday-view");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const gallery = document.getElementById("gallery");
  const galleryMessage = document.getElementById("gallery-message");
  const logoutButton = document.getElementById("logout-btn");

  if (
    !loginView || !birthdayView || !loginForm ||
    !loginMessage || !gallery || !galleryMessage || !logoutButton
  ) {
    console.error("Website HTML elements are missing.");
    return;
  }

  const loginButton = loginForm.querySelector("button")

  if (
    !window.supabase ||
    !cfg.SUPABASE_URL ||
    !cfg.SUPABASE_ANON_KEY ||
    !cfg.PHOTO_BUCKET ||
    !cfg.PHOTO_FOLDER ||
    cfg.SUPABASE_URL.includes("YOUR_PROJECT") ||
    cfg.SUPABASE_ANON_KEY.includes("YOUR_")
  ) {
    loginMessage.textContent = "Supabase Setup မမှန်ပါ။ config.js ကို ပြန်စစ်ပါ။";
    if (loginButton) loginButton.disabled = true;
    return;
  }

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

  function withTimeout(promise, ms = 15000) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT")), ms)
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

  async function isApproved(userId) {
    const result = await withTimeout(
      client.from("birthday_members")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle()
    );

    if (result.error) throw result.error;
    return Boolean(result.data);
  }

  // Create photo upload controls
  const uploadArea = document.createElement("div");
  uploadArea.style.cssText =
    "text-align:center;margin:20px 0;padding:20px;background:#fff0f5;border-radius:16px;";

  const uploadTitle = document.createElement("p");
  uploadTitle.textContent = "♡ အမှတ်တရပုံလေးတွေ ထည့်ကြမယ် ♡";
  uploadTitle.style.cssText = "font-weight:600;color:#9b5575;";

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/jpeg,image/png,image/webp,image/gif";
  fileInput.multiple = true;
  fileInput.style.display = "none";

  const uploadButton = document.createElement("button");
  uploadButton.type = "button";
  uploadButton.textContent = "♡ ပုံရွေးပြီး တင်မယ် ♡";
  uploadButton.style.cssText =
    "background:#d879a1;color:white;border:0;border-radius:30px;padding:12px 24px;font-size:15px;cursor:pointer;";

  const uploadStatus = document.createElement("p");
  uploadStatus.style.cssText = "color:#9b5575;font-size:14px;margin-top:12px;";
  uploadStatus.setAttribute("role", "status");

  uploadArea.append(uploadTitle, uploadButton, fileInput, uploadStatus);
  gallery.parentNode.insertBefore(uploadArea, gallery);

  uploadButton.addEventListener("click", () => {
    fileInput.click();
  });

  // Upload selected photos to private Supabase Storage
  fileInput.addEventListener("change", async () => {
    const files = Array.from(fileInput.files || []);

    if (!files.length) return;

    uploadButton.disabled = true;
    uploadStatus.textContent = "ပုံတွေ တင်နေပါတယ်… ♡";

    let uploaded = 0;
    let failed = 0;
    let uploadError="";

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        failed++;
        continue;
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const uniqueName =
        Date.now() + "-" + Math.random().toString(36).slice(2) + "-" + safeName;

      const path = cfg.PHOTO_FOLDER + "/" + uniqueName;

      try {
        const result = await withTimeout(
          client.storage
            .from(cfg.PHOTO_BUCKET)
            .upload(path, file, {
              contentType: file.type,
              upsert: false
            }),
          30000
        );

        if (result.error) throw result.error;
        uploaded++;
      } catch (err) {
        console.error("Photo upload error:", err);
        uploadError=err.message//String(err);
        uploadStatus.textContent="Upload Error:"+
          err.massage;
        failed++;
      }
    }

    fileInput.value = "";
    uploadButton.disabled = false;

    if (failed === 0) {
      uploadStatus.textContent = "ပုံ " + uploaded + " ပုံ တင်ပြီးပါပြီ။ ♡";
    } else {
      uploadStatus.textContent =
        uploaded + " ပုံ တင်ပြီး၊ " + failed + " ပုံ မအောင်မြင်ပါ။";
    }

    await loadGallery();
  });

  // Load photos
  async function loadGallery() {
    gallery.innerHTML =
      '<div class="empty-state">အမှတ်တရပုံလေးတွေကို ရှာနေပါတယ် ♡</div>';

    galleryMessage.textContent = "";

    try {
      const result = await withTimeout(
        client.storage.from(cfg.PHOTO_BUCKET).list(cfg.PHOTO_FOLDER, {
          limit: 100,
          sortBy: { column: "name", order: "asc" }
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
          '<div class="empty-state">ဓာတ်ပုံမတင်ရသေးပါ။ ပုံလေးတွေ စတင်တင်လိုက်ပါနော် ♡</div>';
        return;
      }

      gallery.innerHTML = "";

      for (const [index, photo] of photos.entries()) {
        const path = cfg.PHOTO_FOLDER + "/" + photo.name;

        const signedResult = await withTimeout(
          client.storage.from(cfg.PHOTO_BUCKET)
            .createSignedUrl(
              path,
              Number(cfg.SIGNED_URL_SECONDS) || 3600
            )
        );

        if (signedResult.error || !signedResult.data?.signedUrl) {
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
          "Memory " + String(index + 1).padStart(2, "0") + " ♡";

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
  loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (loginButton) loginButton.disabled = true;
    loginMessage.textContent = "ဝင်ရောက်နေပါတယ်…";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      const result = await withTimeout(
        client.auth.signInWithPassword({ email, password }),
        15000
      );

      if (result.error) {
        console.error("Login error:", result.error);
        loginMessage.textContent = "Login Error: " + result.error.message;
        return;
      }

      if (!result.data?.user) {
        loginMessage.textContent = "Login မအောင်မြင်ပါ။ ထပ်စမ်းကြည့်ပါ။";
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
      uploadStatus.textContent = "";

      showLogin();
      loginMessage.textContent = "လုံခြုံစွာ Log out လုပ်ပြီးပါပြီ။";
    } catch (err) {
      console.error("Logout error:", err);
    }
  });

  // Restore session
  async function initializeApp() {
    try {
      const result = await withTimeout(client.auth.getSession());

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

  client.auth.onAuthStateChange(event => {
    if (event === "SIGNED_OUT") {
      showLogin();
    }
  });

  initializeApp();
})();
