// ==========================================================
// ROYALE2 MARKET - ANA JAVASCRIPT
// ==========================================================

window.SUPABASE_API_URL =
  "https://rmhupvzeksnqfxdrgmos.supabase.co/rest/v1/";

window.SUPABASE_KEY =
  "sb_publishable_alxS7cZ43l46SS1-QyGhYQ_I7O0HNKq";


// ==========================================================
// YARDIMCI FONKSIYONLAR
// ==========================================================

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("royale2_user") || "null");
  } catch (error) {
    console.error("Kullanıcı bilgisi okunamadı:", error);
    return null;
  }
}

function clearStoredSession() {
  localStorage.removeItem("royale2_access_token");
  localStorage.removeItem("royale2_refresh_token");
  localStorage.removeItem("royale2_user");
}

function saveSession(data) {
  if (data?.access_token) {
    localStorage.setItem("royale2_access_token", data.access_token);
  }

  if (data?.refresh_token) {
    localStorage.setItem("royale2_refresh_token", data.refresh_token);
  }

  if (data?.user) {
    localStorage.setItem("royale2_user", JSON.stringify(data.user));
  }
}


// ==========================================================
// SUPABASE TOKEN YENILEME
// ==========================================================

let refreshPromise = null;

async function refreshSupabaseSession() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem("royale2_refresh_token");

    if (!refreshToken) {
      return null;
    }

    try {
      const supabaseBaseUrl =
        window.SUPABASE_API_URL.replace("/rest/v1/", "");

      const response = await fetch(
        `${supabaseBaseUrl}/auth/v1/token?grant_type=refresh_token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": window.SUPABASE_KEY
          },
          body: JSON.stringify({
            refresh_token: refreshToken
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Token yenileme başarısız:", data);
        clearStoredSession();
        return null;
      }

      saveSession(data);

      console.log("Supabase oturumu yenilendi.");

      return data.access_token || null;

    } catch (error) {
      console.error("Token yenileme hatası:", error);
      return null;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}


// ==========================================================
// GEÇERLİ ACCESS TOKEN AL
// ==========================================================

async function getValidAccessToken() {
  const accessToken = localStorage.getItem("royale2_access_token");
  const refreshToken = localStorage.getItem("royale2_refresh_token");

  if (!refreshToken) {
    return accessToken || null;
  }

  const refreshedToken = await refreshSupabaseSession();

  return refreshedToken || accessToken || null;
}


// ==========================================================
// SUPABASE YETKİLİ FETCH
// 401 GELİRSE TOKEN'I YENİLEYİP BİR KEZ DAHA DENER
// ==========================================================

async function supabaseAuthFetch(url, options = {}) {
  let accessToken = await getValidAccessToken();

  if (!accessToken) {
    throw new Error("Oturum bulunamadı.");
  }

  const makeRequest = token => {
    const headers = new Headers(options.headers || {});

    headers.set("apikey", window.SUPABASE_KEY);
    headers.set("Authorization", `Bearer ${token}`);

    return fetch(url, {
      ...options,
      headers
    });
  };

  let response = await makeRequest(accessToken);

  if (response.status === 401) {
    accessToken = await refreshSupabaseSession();

    if (accessToken) {
      response = await makeRequest(accessToken);
    }
  }

  return response;
}


// ==========================================================
// KAYIT SİSTEMİ
// ==========================================================

async function registerUser({
  username,
  displayName,
  phone,
  email,
  password
}) {
  const supabaseBaseUrl =
    window.SUPABASE_API_URL.replace("/rest/v1/", "");

  const response = await fetch(
    `${supabaseBaseUrl}/auth/v1/signup`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": window.SUPABASE_KEY
      },
      body: JSON.stringify({
        email,
        password,
        data: {
          username,
          display_name: displayName,
          phone
        }
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.msg ||
      data.message ||
      data.error_description ||
      "Kullanıcı oluşturulamadı."
    );
  }

  return data;
}


// ==========================================================
// GİRİŞ SİSTEMİ
// ==========================================================

async function loginUser(email, password, redirectAfterLogin = true) {
  const supabaseBaseUrl =
    window.SUPABASE_API_URL.replace("/rest/v1/", "");

  const response = await fetch(
    `${supabaseBaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": window.SUPABASE_KEY
      },
      body: JSON.stringify({
        email,
        password
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error_description ||
      data.msg ||
      data.message ||
      "E-posta veya şifre hatalı."
    );
  }

  saveSession(data);

  if (redirectAfterLogin) {
    alert("Giriş başarılı!");
    window.location.href = "/";
  }

  return data;
}


// ==========================================================
// ÇIKIŞ
// ==========================================================

function logoutUser() {
  clearStoredSession();
  window.location.href = "/";
}


// ==========================================================
// KULLANICI MENÜSÜ
// ==========================================================

async function updateUserMenu() {
  const loginLink = document.querySelector(".login");
  const user = getStoredUser();

  if (!loginLink) return;

  if (!user) {
    loginLink.textContent = "Giriş Yap";
    loginLink.href = "#login";
    return;
  }

  let username =
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    "Hesabım";

  try {
    const accessToken = await getValidAccessToken();

    if (accessToken) {
      const response = await supabaseAuthFetch(
        `${window.SUPABASE_API_URL}profiles?id=eq.${encodeURIComponent(user.id)}&select=username,display_name`
      );

      if (response.ok) {
        const profiles = await response.json();
        const profile = profiles?.[0];

        username =
          profile?.username ||
          profile?.display_name ||
          username;
      }
    }
  } catch (error) {
    console.error("Profil bilgisi alınamadı:", error);
  }

  loginLink.textContent = username;
  loginLink.href = "#";
  loginLink.id = "user-menu-link";
}


document.addEventListener("DOMContentLoaded", () => {
  updateUserMenu();

  document.addEventListener("click", event => {
    const userLink = document.getElementById("user-menu-link");
    const existingMenu = document.getElementById("user-dropdown");

    if (event.target.id === "user-menu-link") {
      event.preventDefault();

      if (existingMenu) {
        existingMenu.remove();
        return;
      }

      if (!userLink?.parentElement) return;

      const menu = document.createElement("div");

      menu.id = "user-dropdown";

      menu.innerHTML = `
        <a href="account.html">Hesabım</a>
        <a href="#my-listings">İlanlarım</a>
        <a href="#favorites">Favorilerim</a>
        <button type="button" id="logout-button">Çıkış Yap</button>
      `;

      userLink.parentElement.appendChild(menu);
      return;
    }

    if (event.target.id === "logout-button") {
      logoutUser();
      return;
    }

    if (
      existingMenu &&
      !existingMenu.contains(event.target) &&
      event.target.id !== "user-menu-link"
    ) {
      existingMenu.remove();
    }
  });
});


// ==========================================================
// KAYIT FORMU
// ==========================================================

document.addEventListener("DOMContentLoaded", () => {
  const registerButton =
    document.getElementById("register-button");

  if (!registerButton) return;

  registerButton.addEventListener("click", async () => {
    const username =
      document.getElementById("register-username")?.value.trim() || "";

    const displayName =
      document.getElementById("register-display-name")?.value.trim() || "";

    const phone =
      document.getElementById("register-phone")?.value.trim() || "";

    const email =
      document.getElementById("register-email")?.value.trim() || "";

    const password =
      document.getElementById("register-password")?.value || "";

    const passwordConfirm =
      document.getElementById("register-password-confirm")?.value || "";

    const termsAccepted =
      document.getElementById("register-terms")?.checked;

    const message =
      document.getElementById("register-message");

    if (!message) return;

    const reservedUsernames = [
      "admin",
      "administrator",
      "moderator",
      "mod",
      "royale2",
      "support",
      "destek",
      "system"
    ];

    message.textContent = "";

    if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
      message.textContent =
        "Kullanıcı adı 3-20 karakter olmalı ve sadece harf, rakam veya alt çizgi içermelidir.";
      return;
    }

    if (
      username.startsWith("_") ||
      username.endsWith("_") ||
      username.includes("__")
    ) {
      message.textContent =
        "Kullanıcı adı alt çizgi ile başlayamaz, bitemez veya çift alt çizgi içeremez.";
      return;
    }

    if (reservedUsernames.includes(username.toLowerCase())) {
      message.textContent = "Bu kullanıcı adı kullanılamaz.";
      return;
    }

    if (!displayName) {
      message.textContent =
        "Lütfen adınızı ve soyadınızı girin.";
      return;
    }

    if (!/^05\d{9}$/.test(phone)) {
      message.textContent =
        "Telefon numarası 05XXXXXXXXX formatında 11 haneli olmalıdır.";
      return;
    }

    if (!email) {
      message.textContent =
        "Lütfen e-posta adresinizi girin.";
      return;
    }

    if (password.length < 8) {
      message.textContent =
        "Şifre en az 8 karakter olmalıdır.";
      return;
    }

    if (password !== passwordConfirm) {
      message.textContent = "Şifreler eşleşmiyor.";
      return;
    }

    if (!termsAccepted) {
      message.textContent =
        "Kullanım koşullarını ve gizlilik politikasını kabul etmelisiniz.";
      return;
    }

    try {
      registerButton.disabled = true;
      registerButton.textContent = "Hesap oluşturuluyor...";

      await registerUser({
        username,
        displayName,
        phone,
        email,
        password
      });

      message.textContent =
        "Hesabınız başarıyla oluşturuldu. Giriş yapılıyor...";

      await loginUser(email, password, false);

      window.location.href = "/";

    } catch (error) {
      const errorText =
        String(error?.message || error || "");

      console.error("Kayıt hatası:", error);

      if (
        errorText.includes("already registered") ||
        errorText.includes("User already registered")
      ) {
        message.textContent =
          "Bu e-posta adresi zaten kayıtlı.";

      } else if (
        errorText.includes("duplicate key value") ||
        errorText.includes("profiles_username_unique_ci")
      ) {
        message.textContent =
          "Bu kullanıcı adı zaten kullanılıyor.";

      } else {
        message.textContent =
          error.message ||
          "Hesap oluşturulurken bir hata oluştu.";
      }

    } finally {
      registerButton.disabled = false;
      registerButton.textContent = "Hesap Oluştur";
    }
  });
});


// ==========================================================
// ANA SAYFA İLANLARI
// ==========================================================

let listings = [];
let selectedServer = "Tümü";

const grid = document.getElementById("listings");
const category = document.getElementById("category");

async function loadListings() {
  if (!grid) return;

  try {
    grid.innerHTML = `
      <div class="listing">
        <h3>İlanlar yükleniyor...</h3>
      </div>
    `;

    const response = await fetch(
      `${window.SUPABASE_API_URL}listings?select=*`,
      {
        headers: {
          "apikey": window.SUPABASE_KEY
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        `Supabase hatası: ${response.status}`
      );
    }

    listings = await response.json();

    renderListings();

  } catch (error) {
    console.error("İlan yükleme hatası:", error);

    grid.innerHTML = `
      <div class="listing">
        <h3>İlanlar yüklenemedi</h3>
        <p>Veritabanı bağlantısı kontrol ediliyor.</p>
      </div>
    `;
  }
}

function renderListings() {
  if (!grid) return;

  const cat = category?.value || "Tümü";

  const data = listings.filter(item =>
    (selectedServer === "Tümü" ||
      item.server === selectedServer) &&
    (cat === "Tümü" || item.cat === cat)
  );

  grid.innerHTML =
    data.map(item => `
      <article class="listing">
        <div class="listing-top">
          <span class="server-tag">
            ${item.server?.toUpperCase() || ""}
          </span>

          <span class="cat">
            ${item.cat || ""}
          </span>
        </div>

        <h3>${item.title || ""}</h3>

        <p>${item.desc || ""}</p>

        <div class="listing-bottom">
          <div class="price">
            ${item.price || ""}
            <small>TL</small>
          </div>

          <a class="view"
             href="listing.html?id=${encodeURIComponent(item.id)}">
             İLANI GÖR →
          </a>
        </div>
      </article>
    `).join("") ||
    `
      <div class="listing">
        <h3>İlan bulunamadı</h3>
        <p>Filtreleri değiştirerek tekrar deneyebilirsin.</p>
      </div>
    `;
}

document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach(item =>
      item.classList.remove("active")
    );

    button.classList.add("active");

    selectedServer = button.dataset.server;

    renderListings();
  });
});

if (category) {
  category.addEventListener("change", renderListings);
}

document
  .querySelectorAll("[data-server-card]")
  .forEach(card => {
    card.addEventListener("click", () => {
      selectedServer = card.dataset.serverCard;

      document.querySelectorAll(".filter").forEach(button => {
        button.classList.toggle(
          "active",
          button.dataset.server === selectedServer
        );
      });

      const market = document.getElementById("market");

      if (market) {
        market.scrollIntoView({
          behavior: "smooth"
        });
      }

      renderListings();
    });
  });

loadListings();


// ==========================================================
// İLAN OLUŞTURMA SAYFASI
// ==========================================================

(function initCreateListingPage() {
  const form =
    document.getElementById("createListingForm");

  if (!form) return;

  const user = getStoredUser();

  if (!user) {
    alert(
      "İlan verebilmek için hesabınıza giriş yapmanız gerekiyor."
    );

    window.location.href = "/";
  }
})();


// ==========================================================
// HESAP SAYFASI
// ==========================================================

(function syncAccountUsername() {
  const sidebarUsername =
    document.getElementById("sidebar-username");

  if (!sidebarUsername) return;

  const user = getStoredUser();

  sidebarUsername.textContent =
    user?.user_metadata?.username ||
    user?.username ||
    "Kullanıcı";
})();


// ==========================================================
// İLAN VERİTABANI KAYDI
// ==========================================================

async function createListingInDatabase(
  listingData,
  accessToken
) {
  const response = await fetch(
    `${window.SUPABASE_API_URL}listings`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": window.SUPABASE_KEY,
        "Authorization": `Bearer ${accessToken}`,
        "Prefer": "return=representation"
      },
      body: JSON.stringify(listingData)
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("İlan oluşturma hatası:", data);

    throw new Error(
      data.message ||
      data.details ||
      "İlan oluşturulamadı."
    );
  }

  return data[0];
}


// ==========================================================
// İLAN GÖRSEL YÜKLEME
// ==========================================================

async function uploadListingImages(
  files,
  listingId,
  userId,
  accessToken
) {
  if (!files?.length) return [];

  const supabaseBaseUrl =
    window.SUPABASE_API_URL.replace("/rest/v1/", "");

  const uploadedImages = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error(
        "Sadece JPG, PNG veya WEBP görseller yüklenebilir."
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error(
        "Her görsel en fazla 5 MB olabilir."
      );
    }

    const extension =
      file.name.split(".").pop().toLowerCase();

    const fileName =
      `${userId}/${listingId}/${Date.now()}-${i}.${extension}`;

    const uploadResponse = await fetch(
      `${supabaseBaseUrl}/storage/v1/object/listing-images/${fileName}`,
      {
        method: "POST",
        headers: {
          "apikey": window.SUPABASE_KEY,
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": file.type,
          "x-upsert": "false"
        },
        body: file
      }
    );

    if (!uploadResponse.ok) {
      console.error(
        "Görsel yükleme hatası:",
        await uploadResponse.text()
      );

      throw new Error("Görsel yüklenemedi.");
    }

    const imageUrl =
      `${supabaseBaseUrl}/storage/v1/object/public/listing-images/${fileName}`;

    const databaseResponse = await fetch(
      `${window.SUPABASE_API_URL}listing_images`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": window.SUPABASE_KEY,
          "Authorization": `Bearer ${accessToken}`,
          "Prefer": "return=representation"
        },
        body: JSON.stringify({
          listing_id: listingId,
          image_url: imageUrl,
          sort_order: i
        })
      }
    );

    if (!databaseResponse.ok) {
      console.error(
        "Görsel kayıt hatası:",
        await databaseResponse.text()
      );

      throw new Error(
        "Görsel bilgisi kaydedilemedi."
      );
    }

    uploadedImages.push(imageUrl);
  }

  return uploadedImages;
}


// ==========================================================
// İLAN FORMUNU KAYDET
// ==========================================================

(function initListingSubmit() {
  const form =
    document.getElementById("createListingForm");

  if (!form) return;

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const storedUser = getStoredUser();

    if (!storedUser?.id) {
      alert(
        "İlan verebilmek için hesabınıza giriş yapmanız gerekiyor."
      );

      window.location.href = "/";
      return;
    }

    const selectedServer =
      form.querySelector('input[name="server"]:checked');

    const selectedCategory =
      form.querySelector('input[name="category"]:checked');

    const title =
      document.getElementById("listingTitle");

    const description =
      document.getElementById("listingDescription");

    const price =
      document.getElementById("listingPrice");

    const message =
      document.getElementById("listingFormMessage");

    const publishButton =
      document.getElementById("publishListingButton");

    if (!selectedServer) {
      alert("Lütfen bir sunucu seçin.");
      return;
    }

    if (!selectedCategory) {
      alert("Lütfen bir kategori seçin.");
      return;
    }

    if (!title?.value.trim()) {
      alert("Lütfen ilan başlığını girin.");
      return;
    }

    if (!price || Number(price.value) <= 0) {
      alert("Lütfen geçerli bir satış fiyatı girin.");
      return;
    }

    try {
      const accessToken =
        await getValidAccessToken();

      if (!accessToken) {
        throw new Error(
          "Oturumunuz sona erdi. Tekrar giriş yapın."
        );
      }

      const listingData = {
        user_id: storedUser.id,
        server_id: Number(selectedServer.value),
        category_id: Number(selectedCategory.value),
        title: title.value.trim(),
        description:
          description?.value.trim() || null,
        price: Number(price.value),
        currency: "TRY",
        status: "active"
      };

      if (publishButton) {
        publishButton.disabled = true;
        publishButton.textContent =
          "İlan Yayınlanıyor...";
      }

      if (message) {
        message.textContent =
          "İlanınız oluşturuluyor...";
      }

      const createdListing =
        await createListingInDatabase(
          listingData,
          accessToken
        );

      const imageInput =
        document.getElementById("listingImages");

      const selectedImages =
        imageInput
          ? Array.from(imageInput.files)
          : [];

      if (selectedImages.length) {
        if (message) {
          message.textContent =
            "İlan görselleri yükleniyor...";
        }

        await uploadListingImages(
          selectedImages,
          createdListing.id,
          storedUser.id,
          accessToken
        );
      }

      if (message) {
        message.textContent =
          "İlanınız başarıyla yayınlandı.";
      }

      alert("İlanınız başarıyla yayınlandı!");

      window.location.href =
        `/listing?id=${encodeURIComponent(createdListing.id)}`;

    } catch (error) {
      console.error(
        "İlan yayınlama hatası:",
        error
      );

      if (message) {
        message.textContent =
          error.message ||
          "İlan yayınlanırken bir hata oluştu.";
      }

      alert(
        "İlan yayınlanamadı: " +
        (error.message || "Bilinmeyen hata")
      );

    } finally {
      if (publishButton) {
        publishButton.disabled = false;
        publishButton.textContent =
          "İlanı Yayınla";
      }
    }
  });
})();


// ==========================================================
// İLAN DETAY SAYFASI
// ==========================================================

(async function initListingDetailPage() {
  const detailContainer =
    document.getElementById("listingDetail");

  if (!detailContainer) return;

  const loading =
    document.getElementById("listingLoading");

  const errorBox =
    document.getElementById("listingError");

  try {
    const params =
      new URLSearchParams(window.location.search);

    const listingId = params.get("id");

    if (!listingId) {
      throw new Error("İlan ID bulunamadı.");
    }

    const response = await fetch(
      `${window.SUPABASE_API_URL}listings?id=eq.${encodeURIComponent(listingId)}&select=*`,
      {
        headers: {
          "apikey": window.SUPABASE_KEY
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        "İlan bilgileri alınamadı."
      );
    }

    const result = await response.json();

    if (!result.length) {
      throw new Error("İlan bulunamadı.");
    }

    const listing = result[0];

    let sellerUsername = "Kullanıcı";

    try {
      const profileResponse = await fetch(
        `${window.SUPABASE_API_URL}profiles?id=eq.${encodeURIComponent(listing.user_id)}&select=username`,
        {
          headers: {
            "apikey": window.SUPABASE_KEY
          }
        }
      );

      if (profileResponse.ok) {
        const profiles =
          await profileResponse.json();

        sellerUsername =
          profiles?.[0]?.username ||
          sellerUsername;
      }

    } catch (profileError) {
      console.error(
        "Satıcı bilgisi alınamadı:",
        profileError
      );
    }

    const imagesResponse = await fetch(
      `${window.SUPABASE_API_URL}listing_images?listing_id=eq.${encodeURIComponent(listingId)}&select=*&order=sort_order.asc`,
      {
        headers: {
          "apikey": window.SUPABASE_KEY
        }
      }
    );

    if (!imagesResponse.ok) {
      throw new Error(
        "İlan görselleri alınamadı."
      );
    }

    const listingImages =
      await imagesResponse.json();

    const mainImage =
      document.getElementById("listingMainImage");

    const imagePlaceholder =
      document.getElementById(
        "listingImagePlaceholder"
      );

    if (
      listingImages.length &&
      listingImages[0].image_url
    ) {
      if (mainImage) {
        mainImage.src =
          listingImages[0].image_url;

        mainImage.style.display = "block";
      }

      if (imagePlaceholder) {
        imagePlaceholder.style.display = "none";
      }

    } else {
      if (mainImage) {
        mainImage.style.display = "none";
      }

      if (imagePlaceholder) {
        imagePlaceholder.style.display = "flex";
      }
    }

    const serverNames = {
      1: "Ephesus",
      2: "Teos",
      3: "Pergamon",
      4: "Akademi Teos"
    };

    const categoryNames = {
      1: "Item",
      2: "Yang",
      3: "Karakter",
      4: "Hesap"
    };

    const sellerElement =
      document.getElementById("listingSeller");

    if (sellerElement) {
      sellerElement.textContent =
        sellerUsername;
    }

    const serverElement =
      document.getElementById("listingServer");

    if (serverElement) {
      serverElement.textContent =
        serverNames[listing.server_id] ||
        "Sunucu";
    }

    const categoryElement =
      document.getElementById(
        "listingCategory"
      );

    if (categoryElement) {
      categoryElement.textContent =
        categoryNames[listing.category_id] ||
        "Kategori";
    }

    const titleElement =
      document.getElementById(
        "listingDetailTitle"
      );

    if (titleElement) {
      titleElement.textContent =
        listing.title || "İlan";
    }

    const descriptionElement =
      document.getElementById(
        "listingDetailDescription"
      );

    if (descriptionElement) {
      descriptionElement.textContent =
        listing.description ||
        "Açıklama belirtilmemiş.";
    }

    const priceElement =
      document.getElementById(
        "listingDetailPrice"
      );

    if (priceElement) {
      priceElement.textContent =
        Number(listing.price).toLocaleString(
          "tr-TR"
        ) + " ₺";
    }

    document.title =
      `${listing.title || "İlan"} | Royale2 Market`;

    if (loading) {
      loading.style.display = "none";
    }

    detailContainer.style.display = "";

    const descriptionSection =
      document.getElementById(
        "listingDescriptionSection"
      );

    const securitySection =
      document.getElementById(
        "listingSecuritySection"
      );

    if (descriptionSection) {
      descriptionSection.style.display = "";
    }

    if (securitySection) {
      securitySection.style.display = "";
    }

  } catch (error) {
    console.error(
      "İlan detay hatası:",
      error
    );

    if (loading) {
      loading.style.display = "none";
    }

    if (errorBox) {
      errorBox.style.display = "";
      errorBox.textContent =
        error.message ||
        "İlan bulunamadı.";
    }
  }
})();


// ==========================================================
// SATICIYLA İLETİŞİME GEÇ
// ==========================================================

async function initContactSellerButton() {
  const contactButton =
    document.getElementById(
      "contactSellerButton"
    );

  if (!contactButton) return;

  contactButton.addEventListener(
    "click",
    async () => {
      try {
        const currentUser =
          getStoredUser();

        if (!currentUser?.id) {
          alert(
            "Satıcıyla iletişime geçmek için giriş yapmalısınız."
          );

          window.location.href =
            "account.html";

          return;
        }

        const accessToken =
          await getValidAccessToken();

        if (!accessToken) {
          alert(
            "Oturumunuz sona erdi. Lütfen tekrar giriş yapın."
          );

          window.location.href =
            "account.html";

          return;
        }

        const params =
          new URLSearchParams(
            window.location.search
          );

        const listingId =
          params.get("id");

        if (!listingId) {
          throw new Error(
            "İlan bilgisi bulunamadı."
          );
        }

        const listingResponse =
          await supabaseAuthFetch(
            `${window.SUPABASE_API_URL}listings?id=eq.${encodeURIComponent(listingId)}&select=id,user_id`
          );

        if (!listingResponse.ok) {
          throw new Error(
            "İlan bilgisi alınamadı."
          );
        }

        const listingRows =
          await listingResponse.json();

        if (!listingRows.length) {
          throw new Error(
            "İlan bulunamadı."
          );
        }

        const sellerId =
          listingRows[0].user_id;

        const buyerId =
          currentUser.id;

        if (buyerId === sellerId) {
          alert(
            "Kendi ilanınız için kendinizle mesajlaşamazsınız."
          );
          return;
        }

        const conversationResponse =
          await supabaseAuthFetch(
            `${window.SUPABASE_API_URL}conversations?listing_id=eq.${encodeURIComponent(listingId)}&buyer_id=eq.${encodeURIComponent(buyerId)}&seller_id=eq.${encodeURIComponent(sellerId)}&select=id`
          );

        if (!conversationResponse.ok) {
          const errorText =
            await conversationResponse.text();

          throw new Error(
            errorText ||
            "Konuşma bilgisi alınamadı."
          );
        }

        const conversations =
          await conversationResponse.json();

        let conversationId;

        if (conversations.length) {
          conversationId =
            conversations[0].id;

        } else {
          const createResponse =
            await supabaseAuthFetch(
              `${window.SUPABASE_API_URL}conversations`,
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                  "Prefer":
                    "return=representation"
                },
                body: JSON.stringify({
                  listing_id: listingId,
                  buyer_id: buyerId,
                  seller_id: sellerId
                })
              }
            );

          if (!createResponse.ok) {
            throw new Error(
              await createResponse.text()
            );
          }

          const created =
            await createResponse.json();

          conversationId =
            created?.[0]?.id;
        }

        if (!conversationId) {
          throw new Error(
            "Konuşma oluşturulamadı."
          );
        }

        window.location.href =
          `messages.html?conversation=${encodeURIComponent(conversationId)}`;

      } catch (error) {
        console.error(
          "Mesajlaşma başlatma hatası:",
          error
        );

        alert(
          "Mesajlaşma başlatılamadı. Lütfen tekrar deneyin."
        );
      }
    }
  );
}

initContactSellerButton();


// ==========================================================
// MESAJLAR SAYFASI - KONUŞMA LİSTESİ
// ==========================================================

async function initMessagesPage() {
  const conversationList =
    document.getElementById(
      "conversationList"
    );

  if (!conversationList) return;

  const currentUser =
    getStoredUser();

  if (!currentUser?.id) {
    alert(
      "Mesajları görüntülemek için giriş yapmalısınız."
    );

    window.location.href =
      "account.html";

    return;
  }

  try {
    const accessToken =
      await getValidAccessToken();

    if (!accessToken) {
      alert(
        "Oturumunuz sona erdi. Lütfen tekrar giriş yapın."
      );

      window.location.href =
        "account.html";

      return;
    }

    const currentUserId =
      currentUser.id;

    const buyerResponse =
      await supabaseAuthFetch(
        `${window.SUPABASE_API_URL}conversations?buyer_id=eq.${encodeURIComponent(currentUserId)}&select=*&order=created_at.desc`
      );

    const sellerResponse =
      await supabaseAuthFetch(
        `${window.SUPABASE_API_URL}conversations?seller_id=eq.${encodeURIComponent(currentUserId)}&select=*&order=created_at.desc`
      );

    if (
      !buyerResponse.ok ||
      !sellerResponse.ok
    ) {
      const buyerError =
        await buyerResponse.text();

      const sellerError =
        await sellerResponse.text();

      console.error(
        "BUYER HATASI:",
        buyerResponse.status,
        buyerError
      );

      console.error(
        "SELLER HATASI:",
        sellerResponse.status,
        sellerError
      );

      throw new Error(
        "Konuşmalar alınamadı."
      );
    }

    const buyerConversations =
      await buyerResponse.json();

    const sellerConversations =
      await sellerResponse.json();

    const conversations = [
      ...buyerConversations,
      ...sellerConversations
    ];

    const uniqueConversations =
      Array.from(
        new Map(
          conversations.map(item => [
            item.id,
            item
          ])
        ).values()
      );

    uniqueConversations.sort(
      (a, b) =>
        new Date(b.created_at) -
        new Date(a.created_at)
    );

    if (!uniqueConversations.length) {
      conversationList.innerHTML = `
        <div class="no-conversations">
          <strong>Henüz mesajınız yok.</strong>
          <p>
            Bir ilandaki "Satıcıyla İletişime Geç"
            butonunu kullanarak konuşma
            başlatabilirsiniz.
          </p>
        </div>
      `;

      return;
    }

    conversationList.innerHTML = "";

    uniqueConversations.forEach(
      conversation => {
        const item =
          document.createElement("button");

        item.type = "button";
        item.className =
          "conversation-item";

        item.innerHTML = `
          <strong>İlan Görüşmesi</strong>
          <small>
            ${new Date(
              conversation.created_at
            ).toLocaleString("tr-TR")}
          </small>
        `;

        item.addEventListener(
          "click",
          () => {
            window.location.href =
              `messages.html?conversation=${encodeURIComponent(conversation.id)}`;
          }
        );

        conversationList.appendChild(
          item
        );
      }
    );

  } catch (error) {
    console.error(
      "Mesajlar yüklenirken hata:",
      error
    );

    conversationList.innerHTML = `
      <div class="no-conversations">
        Konuşmalar yüklenemedi.
      </div>
    `;
  }
}


// ==========================================================
// AKTİF KONUŞMAYI AÇ
// ==========================================================

async function initActiveConversation() {
  const conversationList =
    document.getElementById(
      "conversationList"
    );

  const chatArea =
    document.getElementById("chatArea");

  const chatEmpty =
    document.getElementById("chatEmpty");

  const messageList =
    document.getElementById(
      "messageList"
    );

  if (
    !conversationList ||
    !chatArea ||
    !chatEmpty ||
    !messageList
  ) {
    return;
  }

  const currentUser =
    getStoredUser();

  if (!currentUser?.id) return;

  const params =
    new URLSearchParams(
      window.location.search
    );

  const conversationId =
    params.get("conversation");

  if (!conversationId) return;

  try {
    const accessToken =
      await getValidAccessToken();

    if (!accessToken) {
      throw new Error(
        "Oturumunuz sona erdi."
      );
    }

    const currentUserId =
      currentUser.id;

    const response =
      await supabaseAuthFetch(
        `${window.SUPABASE_API_URL}conversations?id=eq.${encodeURIComponent(conversationId)}&select=*`
      );

    if (!response.ok) {
      throw new Error(
        "Konuşma bilgisi alınamadı."
      );
    }

    const conversations =
      await response.json();

    if (!conversations.length) {
      throw new Error(
        "Konuşma bulunamadı."
      );
    }

    const conversation =
      conversations[0];

    // Önce erişim kontrolü
    if (
      conversation.buyer_id !==
        currentUserId &&
      conversation.seller_id !==
        currentUserId
    ) {
      throw new Error(
        "Bu konuşmaya erişim yetkiniz yok."
      );
    }

    const otherUserId =
      conversation.buyer_id ===
      currentUserId
        ? conversation.seller_id
        : conversation.buyer_id;

    try {
      const profileResponse =
        await supabaseAuthFetch(
          `${window.SUPABASE_API_URL}profiles?id=eq.${encodeURIComponent(otherUserId)}&select=username,display_name`
        );

      if (profileResponse.ok) {
        const profiles =
          await profileResponse.json();

        const chatUsername =
          document.getElementById(
            "chatUsername"
          );

        if (
          chatUsername &&
          profiles.length
        ) {
          chatUsername.textContent =
            profiles[0].username ||
            profiles[0].display_name ||
            "Royale2 Kullanıcısı";
        }
      }
    } catch (profileError) {
      console.error(
        "Karşı taraf profili alınamadı:",
        profileError
      );
    }

    chatEmpty.style.display = "none";

    // CSS flex düzenini koru
    chatArea.style.display = "flex";

    const messagesResponse =
      await supabaseAuthFetch(
        `${window.SUPABASE_API_URL}messages?conversation_id=eq.${encodeURIComponent(conversationId)}&select=*&order=created_at.asc`
      );

    if (!messagesResponse.ok) {
      const errorText =
        await messagesResponse.text();

      console.error(
        "Mesaj alma hatası:",
        messagesResponse.status,
        errorText
      );

      throw new Error(
        "Mesajlar alınamadı."
      );
    }

    const messages =
      await messagesResponse.json();

    messageList.innerHTML = "";

    messages.forEach(msg => {
      const messageItem =
        document.createElement("div");

      const isMine =
        msg.sender_id ===
        currentUserId;

      messageItem.className =
        isMine
          ? "message-item message-sent"
          : "message-item message-received";

      const bubble =
        document.createElement("div");

      bubble.className =
        isMine
          ? "message-bubble own"
          : "message-bubble";

      const text =
        document.createElement("div");

      text.className =
        "message-text";

      text.textContent =
        msg.message || "";

      const time =
        document.createElement("small");

      time.className =
        "message-time";

      time.textContent =
        new Date(
          msg.created_at
        ).toLocaleString("tr-TR");

      bubble.appendChild(text);
      bubble.appendChild(time);

      messageItem.appendChild(
        bubble
      );

      messageList.appendChild(
        messageItem
      );
    });

    messageList.scrollTop =
      messageList.scrollHeight;

    console.log(
      "Aktif konuşma başarıyla açıldı:",
      conversation
    );

  } catch (error) {
    console.error(
      "Aktif konuşma açma hatası:",
      error
    );
  }
}


// ==========================================================
// MESAJ GÖNDERME
// ==========================================================

function initMessageForm() {
  const messageForm =
    document.getElementById(
      "messageForm"
    );

  if (!messageForm) return;

  messageForm.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      const messageInput =
        document.getElementById(
          "messageInput"
        );

      if (!messageInput) return;

      const message =
        messageInput.value.trim();

      if (!message) return;

      const params =
        new URLSearchParams(
          window.location.search
        );

      const conversationId =
        params.get("conversation");

      if (!conversationId) {
        alert(
          "Konuşma bilgisi bulunamadı."
        );
        return;
      }

      const currentUser =
        getStoredUser();

      if (!currentUser?.id) {
        alert(
          "Mesaj göndermek için giriş yapmalısınız."
        );

        window.location.href =
          "account.html";

        return;
      }

      try {
        const accessToken =
          await getValidAccessToken();

        if (!accessToken) {
          throw new Error(
            "Oturumunuz sona erdi. Tekrar giriş yapın."
          );
        }

        const response =
          await supabaseAuthFetch(
            `${window.SUPABASE_API_URL}messages`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
                "Prefer":
                  "return=representation"
              },
              body: JSON.stringify({
                conversation_id:
                  conversationId,
                sender_id:
                  currentUser.id,
                message
              })
            }
          );

        if (!response.ok) {
          const errorText =
            await response.text();

          console.error(
            "Mesaj gönderme Supabase hatası:",
            response.status,
            errorText
          );

          throw new Error(
            errorText ||
            "Mesaj gönderilemedi."
          );
        }

        messageInput.value = "";

        // Sayfayı yenilemeden mesajları tekrar yükle
        await initActiveConversation();

      } catch (error) {
        console.error(
          "Mesaj gönderme hatası:",
          error
        );

        alert(
          "Mesaj gönderilemedi. Lütfen tekrar deneyin."
        );
      }
    }
  );
}


// ==========================================================
// MESAJ SAYFASINI BAŞLAT
// ==========================================================

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    await initMessagesPage();
    await initActiveConversation();
    initMessageForm();
  }
);
