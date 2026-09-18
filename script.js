// ==========================================================
// ROYALE2 MARKET - ANA JAVASCRIPT
// ==========================================================

window.SUPABASE_API_URL =
  "https://rmhupvzeksnqfxdrgmos.supabase.co/rest/v1/";

window.SUPABASE_KEY =
  "sb_publishable_alxS7cZ43l46SS1-QyGhYQ_I7O0HNKq";

const SUPABASE_BASE_URL =
  window.SUPABASE_API_URL.replace("/rest/v1/", "");


// ==========================================================
// YARDIMCI FONKSİYONLAR
// ==========================================================

function getStoredUser() {
  try {
    return JSON.parse(
      localStorage.getItem("royale2_user") || "null"
    );
  } catch (error) {
    console.error(
      "Kullanıcı bilgisi okunamadı:",
      error
    );

    return null;
  }
}


function clearStoredSession() {
  localStorage.removeItem(
    "royale2_access_token"
  );

  localStorage.removeItem(
    "royale2_refresh_token"
  );

  localStorage.removeItem(
    "royale2_user"
  );
}


function saveSession(data) {
  if (data?.access_token) {
    localStorage.setItem(
      "royale2_access_token",
      data.access_token
    );
  }

  if (data?.refresh_token) {
    localStorage.setItem(
      "royale2_refresh_token",
      data.refresh_token
    );
  }

  if (data?.user) {
    localStorage.setItem(
      "royale2_user",
      JSON.stringify(data.user)
    );
  }
}


// ==========================================================
// JWT TOKEN KONTROLÜ
// ==========================================================

function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];

    if (!payload) {
      return null;
    }

    const normalized = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const padded = normalized.padEnd(
      Math.ceil(normalized.length / 4) * 4,
      "="
    );

    const decoded = atob(padded);

    return JSON.parse(
      decodeURIComponent(
        decoded
          .split("")
          .map(char =>
            "%" +
            char
              .charCodeAt(0)
              .toString(16)
              .padStart(2, "0")
          )
          .join("")
      )
    );

  } catch (error) {
    return null;
  }
}


function isAccessTokenUsable(
  token,
  bufferSeconds = 60
) {
  if (!token) {
    return false;
  }

  const payload =
    decodeJwtPayload(token);

  if (!payload?.exp) {
    return true;
  }

  return (
    payload.exp * 1000 >
    Date.now() +
      bufferSeconds * 1000
  );
}


// ==========================================================
// SUPABASE TOKEN YENİLEME
// ==========================================================

let refreshPromise = null;


async function refreshSupabaseSession() {

  if (refreshPromise) {
    return refreshPromise;
  }


  refreshPromise = (async () => {

    const refreshToken =
      localStorage.getItem(
        "royale2_refresh_token"
      );


    if (!refreshToken) {
      return null;
    }


    try {

      const response =
        await fetch(
          `${SUPABASE_BASE_URL}/auth/v1/token?grant_type=refresh_token`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              "apikey":
                window.SUPABASE_KEY
            },

            body: JSON.stringify({
              refresh_token:
                refreshToken
            })
          }
        );


      const data =
        await response
          .json()
          .catch(() => ({}));


      if (!response.ok) {

        console.error(
          "Token yenileme başarısız:",
          response.status,
          data
        );


        /*
         * 429 = çok fazla istek.
         * Böyle bir durumda kullanıcıyı
         * hemen sistemden çıkarmıyoruz.
         */
        if (response.status !== 429) {
          clearStoredSession();
        }


        return null;
      }


      saveSession(data);


      return (
        data.access_token ||
        null
      );


    } catch (error) {

      console.error(
        "Token yenileme hatası:",
        error
      );

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

  const accessToken =
    localStorage.getItem(
      "royale2_access_token"
    );


  /*
   * Access token hâlâ geçerliyse
   * Supabase'e refresh isteği
   * göndermiyoruz.
   */
  if (
    isAccessTokenUsable(
      accessToken
    )
  ) {
    return accessToken;
  }


  return await refreshSupabaseSession();
}


// ==========================================================
// SUPABASE YETKİLİ FETCH
// ==========================================================

async function supabaseAuthFetch(
  url,
  options = {}
) {

  let accessToken =
    await getValidAccessToken();


  if (!accessToken) {
    throw new Error(
      "Oturum bulunamadı veya süresi doldu."
    );
  }


  const makeRequest =
    token => {

      const headers =
        new Headers(
          options.headers || {}
        );


      headers.set(
        "apikey",
        window.SUPABASE_KEY
      );


      headers.set(
        "Authorization",
        `Bearer ${token}`
      );


      return fetch(
        url,
        {
          ...options,
          headers
        }
      );
    };


  let response =
    await makeRequest(
      accessToken
    );


  /*
   * Access token Supabase tarafından
   * reddedilirse yalnızca bir kez
   * refresh yapıp tekrar deniyoruz.
   */
  if (
    response.status === 401
  ) {

    const refreshedToken =
      await refreshSupabaseSession();


    if (refreshedToken) {

      response =
        await makeRequest(
          refreshedToken
        );
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

  const response =
    await fetch(
      `${SUPABASE_BASE_URL}/auth/v1/signup`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "apikey":
            window.SUPABASE_KEY
        },

        body: JSON.stringify({
          email,
          password,

          data: {
            username,
            display_name:
              displayName,
            phone
          }
        })
      }
    );


  const data =
    await response
      .json()
      .catch(() => ({}));


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

async function loginUser(
  email,
  password,
  redirectAfterLogin = true
) {

  const response =
    await fetch(
      `${SUPABASE_BASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "apikey":
            window.SUPABASE_KEY
        },

        body: JSON.stringify({
          email,
          password
        })
      }
    );


  const data =
    await response
      .json()
      .catch(() => ({}));


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

    window.location.href = "account.html";
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
  
  const loginLink =
    document.querySelector(
      ".login"
    );


  const user =
    getStoredUser();

const registerLink =
  document.querySelector(
    ".header-register"
  );

  if (!loginLink) {
    return;
  }


if (!user) {

  loginLink.textContent =
    "Giriş Yap";

  loginLink.href =
    "#login";

  if (registerLink) {
    registerLink.style.display = "";
  }

  return;
}
  
if (registerLink) {
  registerLink.style.setProperty("display", "none", "important");
}

  let username =
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    "Hesabım";


  try {

    const accessToken =
      await getValidAccessToken();


    if (accessToken) {

      const response =
        await supabaseAuthFetch(
          `${window.SUPABASE_API_URL}profiles?id=eq.${encodeURIComponent(
            user.id
          )}&select=username,display_name`
        );


      if (response.ok) {

        const profiles =
          await response.json();


        const profile =
          profiles?.[0];


        username =
          profile?.username ||
          profile?.display_name ||
          username;
      }
    }

  } catch (error) {

    console.error(
      "Profil bilgisi alınamadı:",
      error
    );
  }


  loginLink.textContent =
    username;


  loginLink.href = "#";


  loginLink.id =
    "user-menu-link";
}


document.addEventListener(
  "DOMContentLoaded",
  () => {

    updateUserMenu();


    document.addEventListener(
      "click",
      event => {

        const userLink =
          document.getElementById(
            "user-menu-link"
          );


        const existingMenu =
          document.getElementById(
            "user-dropdown"
          );


        if (
          event.target.id ===
          "user-menu-link"
        ) {

          event.preventDefault();


          if (existingMenu) {

            existingMenu.remove();

            return;
          }


          if (
            !userLink?.parentElement
          ) {
            return;
          }


          const menu =
            document.createElement(
              "div"
            );


          menu.id =
            "user-dropdown";

menu.innerHTML = `
    <a href="account.html#overview">
        Hesabım
    </a>

    <a href="account.html#my-listings">
        İlanlarım
    </a>

    <a href="account.html#orders">
        Siparişlerim
    </a>

    <a href="account.html#wallet-deposit">
        Bakiye Yükle
    </a>

    <a href="account.html#wallet-withdraw">
        Para Çek
    </a>

    <button
        type="button"
        id="logout-button"
    >
        Çıkış Yap
    </button>
`;

const userMenuWrapper = document.createElement("div");
userMenuWrapper.className = "user-menu-wrapper";

userLink.parentElement.insertBefore(userMenuWrapper, userLink);

userMenuWrapper.appendChild(userLink);
userMenuWrapper.appendChild(menu);

          return;
        }


        if (
          event.target.id ===
          "logout-button"
        ) {

          logoutUser();

          return;
        }


        if (
          existingMenu &&
          !existingMenu.contains(
            event.target
          ) &&
          event.target.id !==
            "user-menu-link"
        ) {

          existingMenu.remove();
        }
      }
    );
  }
);


// ==========================================================
// KAYIT FORMU
// ==========================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const registerButton =
      document.getElementById(
        "register-button"
      );


    if (!registerButton) {
      return;
    }


    registerButton.addEventListener(
      "click",
      async () => {

        const username =
          document
            .getElementById(
              "register-username"
            )
            ?.value
            .trim() || "";


        const displayName =
          document
            .getElementById(
              "register-display-name"
            )
            ?.value
            .trim() || "";


        const phone =
          document
            .getElementById(
              "register-phone"
            )
            ?.value
            .trim() || "";


        const email =
          document
            .getElementById(
              "register-email"
            )
            ?.value
            .trim() || "";


        const password =
          document.getElementById(
            "register-password"
          )?.value || "";


        const passwordConfirm =
          document.getElementById(
            "register-password-confirm"
          )?.value || "";


        const termsAccepted =
          document.getElementById(
            "register-terms"
          )?.checked;


        const message =
          document.getElementById(
            "register-message"
          );


        if (!message) {
          return;
        }


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


        if (
          !/^[A-Za-z0-9_]{3,20}$/.test(
            username
          )
        ) {

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


        if (
          reservedUsernames.includes(
            username.toLowerCase()
          )
        ) {

          message.textContent =
            "Bu kullanıcı adı kullanılamaz.";

          return;
        }


        if (!displayName) {

          message.textContent =
            "Lütfen adınızı ve soyadınızı girin.";

          return;
        }


        if (
          !/^05\d{9}$/.test(
            phone
          )
        ) {

          message.textContent =
            "Telefon numarası 05XXXXXXXXX formatında 11 haneli olmalıdır.";

          return;
        }


        if (!email) {

          message.textContent =
            "Lütfen e-posta adresinizi girin.";

          return;
        }


        if (
          password.length < 8
        ) {

          message.textContent =
            "Şifre en az 8 karakter olmalıdır.";

          return;
        }


        if (
          password !==
          passwordConfirm
        ) {

          message.textContent =
            "Şifreler eşleşmiyor.";

          return;
        }


        if (!termsAccepted) {

          message.textContent =
            "Kullanım koşullarını ve gizlilik politikasını kabul etmelisiniz.";

          return;
        }


        try {

          registerButton.disabled =
            true;


          registerButton.textContent =
            "Hesap oluşturuluyor...";


          await registerUser({
            username,
            displayName,
            phone,
            email,
            password
          });


          message.textContent =
            "Hesabınız başarıyla oluşturuldu. Giriş yapılıyor...";


          await loginUser(
            email,
            password,
            false
          );


          window.location.href =
            "/";


        } catch (error) {

          const errorText =
            String(
              error?.message ||
              error ||
              ""
            );


          console.error(
            "Kayıt hatası:",
            error
          );


          if (
            errorText.includes(
              "already registered"
            ) ||
            errorText.includes(
              "User already registered"
            )
          ) {

            message.textContent =
              "Bu e-posta adresi zaten kayıtlı.";


          } else if (
            errorText.includes(
              "duplicate key value"
            ) ||
            errorText.includes(
              "profiles_username_unique_ci"
            )
          ) {

            message.textContent =
              "Bu kullanıcı adı zaten kullanılıyor.";


          } else {

            message.textContent =
              error.message ||
              "Hesap oluşturulurken bir hata oluştu.";
          }


        } finally {

          registerButton.disabled =
            false;


          registerButton.textContent =
            "Hesap Oluştur";
        }
      }
    );
  }
);


// ==========================================================
// ANA SAYFA İLANLARI
// ==========================================================

let listings = [];

let selectedServer = "Tümü";

const grid =
  document.getElementById(
    "listings"
  );

const category =
  document.getElementById(
    "category"
  );


// ==========================================================
// ANA SAYFA İLAN VERİSİNİ NORMALLEŞTİR
// ==========================================================

function normalizeHomeListing(item) {

  const serverNames = {
    1: "Ephesus",
    2: "Teos",
    3: "Pergamon",
    4: "Akademi Teos"
  };


  const categoryNames = {
    1: "Eşya",
    2: "Yang",
    3: "Karakter",
    4: "Hesap"
  };


  return {
    ...item,

    server:
      item.server ||
      serverNames[
        Number(item.server_id)
      ] ||
      "",

    cat:
      item.cat ||
      categoryNames[
        Number(item.category_id)
      ] ||
      "",

    desc:
      item.desc ??
      item.description ??
      ""
  };
}


// ==========================================================
// HTML GÜVENLİ METİN
// ==========================================================

function escapeHomeListingHtml(value) {

  return String(
    value ?? ""
  )
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// ==========================================================
// FİYAT FORMATLA
// ==========================================================

function formatHomeListingPrice(value) {

  const price =
    Number(value);


  if (!Number.isFinite(price)) {
    return "";
  }


  return price.toLocaleString(
    "tr-TR",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }
  );
}


// ==========================================================
// İLANLARI SUPABASE'DEN YÜKLE
// ==========================================================

async function loadListings() {

  if (!grid) {
    return;
  }


  try {

    grid.innerHTML = `
      <div class="listing">
        <h3>
          İlanlar yükleniyor...
        </h3>
      </div>
    `;


    const response =
      await fetch(
        `${window.SUPABASE_API_URL}listings?status=eq.active&select=*&order=created_at.desc`,
        {
          method: "GET",

          headers: {
            "apikey":
              window.SUPABASE_KEY,

            "Accept":
              "application/json"
          }
        }
      );


    if (!response.ok) {

      throw new Error(
        `Supabase hatası: ${response.status}`
      );
    }


    const data =
      await response.json();


    listings =
      Array.isArray(data)
        ? data.map(
            normalizeHomeListing
          )
        : [];


    // ======================================================
    // İLAN KAPAK GÖRSELLERİ
    // ======================================================

    if (listings.length > 0) {

      const listingIds =
        listings
          .map(item => item.id)
          .filter(Boolean);


      if (listingIds.length > 0) {

        const encodedIds =
          listingIds
            .map(id =>
              encodeURIComponent(
                String(id)
              )
            )
            .join(",");


        const listingImagesResponse =
          await fetch(
            `${window.SUPABASE_API_URL}listing_images?listing_id=in.(${encodedIds})&select=listing_id,image_url,sort_order&order=sort_order.asc`,
            {
              method: "GET",

              headers: {
                "apikey":
                  window.SUPABASE_KEY,

                "Accept":
                  "application/json"
              }
            }
          );


        if (listingImagesResponse.ok) {

          const listingImages =
            await listingImagesResponse.json();


          const firstImageByListing =
            new Map();


          listingImages.forEach(
            image => {

              const listingId =
                String(
                  image.listing_id ?? ""
                );


              if (
                listingId &&
                image.image_url &&
                !firstImageByListing.has(
                  listingId
                )
              ) {

                firstImageByListing.set(
                  listingId,
                  image.image_url
                );
              }
            }
          );


          listings =
            listings.map(
              item => ({
                ...item,

                cover_image:
                  firstImageByListing.get(
                    String(item.id)
                  ) || ""
              })
            );
        }

        else {

          console.warn(
            "İlan kapak görselleri alınamadı:",
            listingImagesResponse.status
          );
        }
      }
    }


    renderListings();


  } catch (error) {

    console.error(
      "İlan yükleme hatası:",
      error
    );


    grid.innerHTML = `
      <div class="listing">

        <h3>
          İlanlar yüklenemedi
        </h3>

        <p>
          Veritabanı bağlantısı
          kontrol ediliyor.
        </p>

      </div>
    `;
  }
}


// ==========================================================
// İLANLARI EKRANA BAS
// ==========================================================

function renderListings() {

  if (!grid) {
    return;
  }


  const selectedCategory =
    category?.value ||
    "Tümü";


  const filteredListings =
    listings.filter(
      item => {

        const serverMatches =
          selectedServer === "Tümü" ||
          item.server === selectedServer;


        const categoryMatches =
          selectedCategory === "Tümü" ||
          item.cat === selectedCategory ||
          (
            selectedCategory === "Eşya" &&
            item.cat === "Item"
          );


        return (
          serverMatches &&
          categoryMatches
        );
      }
    );


  if (!filteredListings.length) {

    grid.innerHTML = `
      <div class="listing">

        <h3>
          İlan bulunamadı
        </h3>

        <p>
          Filtreleri değiştirerek
          tekrar deneyebilirsin.
        </p>

      </div>
    `;

    return;
  }


  grid.innerHTML =
    filteredListings
      .map(
        item => {

          const safeTitle =
            escapeHomeListingHtml(
              item.title || "İlan"
            );


          const safeDescription =
            escapeHomeListingHtml(
              item.desc || ""
            );


          const safeServer =
            escapeHomeListingHtml(
              String(
                item.server || ""
              ).toUpperCase()
            );


          const safeCategory =
            escapeHomeListingHtml(
              item.cat || ""
            );


          const safePrice =
            escapeHomeListingHtml(
              formatHomeListingPrice(
                item.price
              )
            );


          const safeImage =
            escapeHomeListingHtml(
              item.cover_image || ""
            );


          const listingUrl =
            `listing.html?id=${encodeURIComponent(
              item.id
            )}`;


          return `
            <article class="listing">

              ${
                safeImage
                  ? `
                    <div class="listing-image">

                      <img
                        src="${safeImage}"
                        alt="${safeTitle}"
                        loading="lazy"
                      >

                    </div>
                  `
                  : ""
              }

              <div class="listing-top">

                <span class="server-tag">
                  ${safeServer}
                </span>

                <span class="cat">
                  ${safeCategory}
                </span>

              </div>


              <h3>
                ${safeTitle}
              </h3>


              <p>
                ${safeDescription}
              </p>


              <div class="listing-bottom">

                <div class="price">

                  ${safePrice}

                  <small>
                    TL
                  </small>

                </div>


                <a
                  class="view"
                  href="${listingUrl}"
                >
                  İLANI GÖR →
                </a>

              </div>

            </article>
          `;
        }
      )
      .join("");
}


// ==========================================================
// SUNUCU FİLTRELERİ
// ==========================================================

document
  .querySelectorAll(
    ".filter"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          document
            .querySelectorAll(
              ".filter"
            )
            .forEach(
              item =>
                item.classList.remove(
                  "active"
                )
            );


          button.classList.add(
            "active"
          );


          selectedServer =
            button.dataset.server ||
            "Tümü";


          renderListings();
        }
      );
    }
  );


// ==========================================================
// KATEGORİ FİLTRESİ
// ==========================================================

if (category) {

  category.addEventListener(
    "change",
    renderListings
  );
}


// ==========================================================
// SUNUCU KARTLARI
// ==========================================================

document
  .querySelectorAll(
    "[data-server-card]"
  )
  .forEach(
    card => {

      card.addEventListener(
        "click",
        () => {

          selectedServer =
            card.dataset.serverCard ||
            "Tümü";


          document
            .querySelectorAll(
              ".filter"

                          )
            .forEach(
              button => {

                button.classList.toggle(
                  "active",

                  button.dataset.server ===
                    selectedServer
                );
              }
            );


          const market =
            document.getElementById(
              "market"
            );


          if (market) {

            market.scrollIntoView({
              behavior: "smooth"
            });
          }


          renderListings();
        }
      );
    }
  );


// ==========================================================
// ANA SAYFA İLAN SİSTEMİNİ BAŞLAT
// ==========================================================

if (!document.querySelector(".account-page")) {
  loadListings();
}

// ==========================================================
// İLAN OLUŞTURMA SAYFASI
// ==========================================================

(function initCreateListingPage() {

  const form =
    document.getElementById(
      "createListingForm"
    );


  if (!form) {
    return;
  }


  const user =
    getStoredUser();


  if (!user) {

    alert(
      "İlan verebilmek için hesabınıza giriş yapmanız gerekiyor."
    );


    window.location.href =
      "/";
  }

})();


// ==========================================================
// HESAP SAYFASI
// ==========================================================

(function syncAccountUsername() {

  const sidebarUsername =
    document.getElementById(
      "sidebar-username"
    );


  if (!sidebarUsername) {
    return;
  }


  const user =
    getStoredUser();


  sidebarUsername.textContent =

    user?.user_metadata
      ?.username ||

    user?.username ||

    "Kullanıcı";

})();


// ==========================================================
// İLAN VERİTABANI KAYDI
// ==========================================================

async function createListingInDatabase(
  listingData
) {

  const response =
    await supabaseAuthFetch(
      `${window.SUPABASE_API_URL}listings`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Prefer":
            "return=representation"
        },

        body:
          JSON.stringify(
            listingData
          )
      }
    );


  const data =
    await response
      .json()
      .catch(() => []);


  if (!response.ok) {

    console.error(
      "İlan oluşturma hatası:",
      data
    );


    throw new Error(
      data.message ||
      data.details ||
      "İlan oluşturulamadı."
    );
  }


  return data[0];
}



// ==========================================================
// İLAN GÖRSEL SEÇİMİ VE ÖNİZLEME
// ==========================================================

(function initListingImagePreview() {

  const imageInput =
    document.getElementById("listingImages");

  const imagePreview =
    document.getElementById("imagePreview");

  if (!imageInput || !imagePreview) {
    return;
  }

  imageInput.addEventListener(
    "change",
    () => {

      imagePreview.innerHTML = "";

      const selectedFiles =
        Array.from(imageInput.files || []);

      console.log(
        "Seçilen ilan görseli sayısı:",
        selectedFiles.length
      );

      selectedFiles.forEach(
        (file, index) => {

          const image =
            document.createElement("img");

          image.src =
            URL.createObjectURL(file);

          image.alt =
            `Seçilen görsel ${index + 1}`;

          image.style.width = "110px";
          image.style.height = "110px";
          image.style.objectFit = "cover";
          image.style.borderRadius = "10px";

          image.onload = () => {
            URL.revokeObjectURL(image.src);
          };

          imagePreview.appendChild(image);
        }
      );

    }
  );

})();
async function uploadListingImages(
  files,
  listingId,
  userId
) {

  if (!files?.length) {
    return [];
  }


  const uploadedImages = [];


  for (
    let i = 0;
    i < files.length;
    i++
  ) {

    const file =
      files[i];


    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];


    if (
      !allowedTypes.includes(
        file.type
      )
    ) {

      throw new Error(
        "Sadece JPG, PNG veya WEBP görseller yüklenebilir."
      );
    }


    if (
      file.size >
      5 * 1024 * 1024
    ) {

      throw new Error(
        "Her görsel en fazla 5 MB olabilir."
      );
    }


    const extension =
      file.name
        .split(".")
        .pop()
        .toLowerCase();


    const fileName =
      `${userId}/${listingId}/${Date.now()}-${i}.${extension}`;


    const uploadResponse =
      await supabaseAuthFetch(
        `${SUPABASE_BASE_URL}/storage/v1/object/listing-images/${fileName}`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              file.type,

            "x-upsert":
              "false"
          },

          body: file
        }
      );


    if (!uploadResponse.ok) {

      console.error(
        "Görsel yükleme hatası:",
        await uploadResponse.text()
      );


      throw new Error(
        "Görsel yüklenemedi."
      );
    }


    const imageUrl =
      `${SUPABASE_BASE_URL}/storage/v1/object/public/listing-images/${fileName}`;


    const databaseResponse =
      await supabaseAuthFetch(
        `${window.SUPABASE_API_URL}listing_images`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "Prefer":
              "return=representation"
          },

          body:
            JSON.stringify({
              listing_id:
                listingId,

              image_url:
                imageUrl,

              sort_order:
                i
            })
        }
      );


    if (
      !databaseResponse.ok
    ) {

      console.error(
        "Görsel kayıt hatası:",
        await databaseResponse.text()
      );


      throw new Error(
        "Görsel bilgisi kaydedilemedi."
      );
    }


    uploadedImages.push(
      imageUrl
    );
  }


  return uploadedImages;
}
// =====================================================
// HAZIR İLAN KAPAK GÖRSELİNİ KAYDET
// =====================================================

async function saveDefaultListingImage(
  listingId,
  imageUrl
) {

  const response =
    await supabaseAuthFetch(
      `${window.SUPABASE_API_URL}listing_images`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify({
          listing_id: listingId,
          image_url: imageUrl,
          sort_order: 0
        })
      }
    );

  if (!response.ok) {

    console.error(
      "Hazır ilan görseli kayıt hatası:",
      await response.text()
    );

    throw new Error(
      "Hazır ilan görseli kaydedilemedi."
    );
  }

  return await response.json();
}

// ==========================================================
// İLAN FORMUNU KAYDET
// ==========================================================

(function initListingSubmit() {

  const form =
    document.getElementById(
      "createListingForm"
    );


  if (!form) {
    return;
  }


  form.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const storedUser =
        getStoredUser();


      if (!storedUser?.id) {

        alert(
          "İlan verebilmek için hesabınıza giriş yapmanız gerekiyor."
        );


        window.location.href =
          "/";


        return;
      }


      const selectedServer =
        form.querySelector(
          'input[name="server"]:checked'
        );


      const selectedCategory =
        form.querySelector(
          'input[name="category"]:checked'
        );


      const title =
        document.getElementById(
          "listingTitle"
        );


      const description =
        document.getElementById(
          "listingDescription"
        );


      const price =
        document.getElementById(
          "listingPrice"
        );


      const message =
        document.getElementById(
          "listingFormMessage"
        );


      const publishButton =
        document.getElementById(
          "publishListingButton"
        );


      if (!selectedServer) {

        alert(
          "Lütfen bir sunucu seçin."
        );

        return;
      }


      if (!selectedCategory) {

        alert(
          "Lütfen bir kategori seçin."
        );

        return;
      }


      if (
        !title?.value.trim()
      ) {

        alert(
          "Lütfen ilan başlığını girin."
        );

        return;
      }


      if (
        !price ||
        Number(price.value) <= 0
      ) {

        alert(
          "Lütfen geçerli bir satış fiyatı girin."
        );

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

          user_id:
            storedUser.id,

          server_id:
            Number(
              selectedServer.value
            ),

          category_id:
            Number(
              selectedCategory.value
            ),

          title:
            title.value.trim(),

          description:
            description
              ?.value
              .trim() ||
            null,

          price:
            Number(
              price.value
            ),

          currency:
            "TRY",

          status:
            "active"
        };
// İLAN GÖRSELİ KONTROLÜ
const listingImageInput =
    document.getElementById("listingImages");

const uploadedImageCount =
    listingImageInput?.files?.length || 0;

const selectedDefaultCover =
    document.querySelector(
        'input[name="defaultCover"]:checked'
    );

if (
    uploadedImageCount === 0 &&
    !selectedDefaultCover
) {
    alert(
        "Lütfen ilan fotoğrafı yükleyin veya hazır ilan görsellerinden birini seçin."
    );

    return;
}

        if (publishButton) {

          publishButton.disabled =
            true;


          publishButton.textContent =
            "İlan Yayınlanıyor...";
        }


        if (message) {

          message.textContent =
            "İlanınız oluşturuluyor...";
        }


        const createdListing =
          await createListingInDatabase(
            listingData
          );


        const imageInput =
          document.getElementById(
            "listingImages"
          );


        const selectedImages =
          imageInput
            ? Array.from(
                imageInput.files
              )
            : [];


if (selectedImages.length) {

    // Kullanıcı kendi ilan fotoğrafını yüklediyse
    // sadece kendi fotoğrafları kullanılır.
    if (message) {
        message.textContent =
            "İlan görselleri yükleniyor...";
    }

    await uploadListingImages(
        selectedImages,
        createdListing.id,
        storedUser.id
    );

} else {

    // Kullanıcı fotoğraf yüklemediyse
    // seçtiği hazır ilan kapağı kullanılır.
    const selectedDefaultCover =
        document.querySelector(
            'input[name="defaultCover"]:checked'
        );

    const defaultCoverImages = {
        hesap: "images/hesap-ilani.webp",
        yang: "images/yang-ilani.webp",
        item: "images/item-ilani.webp"
    };

    const selectedDefaultImage =
        selectedDefaultCover
            ? defaultCoverImages[selectedDefaultCover.value]
            : null;

    if (!selectedDefaultImage) {
        throw new Error(
            "Hazır ilan görseli seçilemedi."
        );
    }

    const defaultImageUrl =
        new URL(
            selectedDefaultImage,
            window.location.href
        ).href;

    await saveDefaultListingImage(
        createdListing.id,
        defaultImageUrl
    );
}


        if (message) {

          message.textContent =
            "İlanınız başarıyla yayınlandı.";
        }


        alert(
          "İlanınız başarıyla yayınlandı!"
        );


        window.location.href =
          `listing.html?id=${encodeURIComponent(
            createdListing.id
          )}`;


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
          (
            error.message ||
            "Bilinmeyen hata"
          )
        );


      } finally {

        if (publishButton) {

          publishButton.disabled =
            false;


          publishButton.textContent =
            "İlanı Yayınla";
        }
      }
    }
  );

})();


// ==========================================================
// İLAN DETAY SAYFASI
// ==========================================================

(async function initListingDetailPage() {

  const detailContainer =
    document.getElementById(
      "listingDetail"
    );


  if (!detailContainer) {
    return;
  }


  const loading =
    document.getElementById(
      "listingLoading"
    );


  const errorBox =
    document.getElementById(
      "listingError"
    );


  try {

    const params =
      new URLSearchParams(
        window.location.search
      );


    const listingId =
      params.get("id");


    if (!listingId) {

      throw new Error(
        "İlan ID bulunamadı."
      );
    }


    const response =
      await fetch(
        `${window.SUPABASE_API_URL}listings?id=eq.${encodeURIComponent(
          listingId
        )}&select=*`,
        {
          headers: {
            "apikey":
              window.SUPABASE_KEY
          }
        }
      );


    if (!response.ok) {

      throw new Error(
        "İlan bilgileri alınamadı."
      );
    }


    const result =
      await response.json();


    if (!result.length) {

      throw new Error(
        "İlan bulunamadı."
      );
    }


    const listing =
      result[0];


let sellerUsername =
    "Kullanıcı";


    try {

const profileResponse = await fetch(
    `${window.SUPABASE_API_URL}profiles?id=eq.${encodeURIComponent(listing.user_id)}&select=username,display_name,avatar_url,is_verified`,
    {
        headers: {
            "apikey": window.SUPABASE_KEY
        }
    }
);


      if (
        profileResponse.ok
      ) {

        const profiles =
          await profileResponse.json();


        sellerUsername =
          profiles?.[0]
            ?.username ||
          sellerUsername;
      }


    } catch (
      profileError
    ) {

      console.error(
        "Satıcı bilgisi alınamadı:",
        profileError
      );
    }


    const imagesResponse =
      await fetch(
        `${window.SUPABASE_API_URL}listing_images?listing_id=eq.${encodeURIComponent(
          listingId
        )}&select=*&order=sort_order.asc`,
        {
          headers: {
            "apikey":
              window.SUPABASE_KEY
          }
        }
      );


    if (
      !imagesResponse.ok
    ) {

      throw new Error(
        "İlan görselleri alınamadı."
      );
    }


    const listingImages =
      await imagesResponse.json();


    const mainImage =
      document.getElementById(
        "listingMainImage"
      );


    const imagePlaceholder =
      document.getElementById(
        "listingImagePlaceholder"
      );


const imageThumbnails =
    document.getElementById(
        "listingImageThumbnails"
    );

if (
    listingImages.length &&
    listingImages[0].image_url
) {

    // İlk görsel büyük ana görsel olarak gösterilir
    if (mainImage) {
        mainImage.src =
            listingImages[0].image_url;

        mainImage.style.display =
            "block";
    }

    // Placeholder gizlenir
    if (imagePlaceholder) {
        imagePlaceholder.style.display =
            "none";
    }

    // Küçük görseller hazırlanır
    if (imageThumbnails) {

        imageThumbnails.innerHTML = "";

        listingImages.forEach(
            (image, index) => {

                if (!image.image_url) {
                    return;
                }

                const thumbnail =
                    document.createElement("img");

                thumbnail.src =
                    image.image_url;

                thumbnail.alt =
                    `İlan görseli ${index + 1}`;

                thumbnail.className =
                    "listing-image-thumbnail";

                if (index === 0) {
                    thumbnail.classList.add(
                        "active"
                    );
                }

                thumbnail.addEventListener(
                    "click",
                    () => {

                        if (mainImage) {
                            mainImage.src =
                                image.image_url;
                        }

                        imageThumbnails
                            .querySelectorAll(
                                ".listing-image-thumbnail"
                            )
                            .forEach(
                                item =>
                                    item.classList.remove(
                                        "active"
                                    )
                            );

                        thumbnail.classList.add(
                            "active"
                        );
                    }
                );

                imageThumbnails.appendChild(
                    thumbnail
                );
            }
        );

        imageThumbnails.style.display =
            listingImages.length > 1
                ? "flex"
                : "none";
    }

} else {

    if (mainImage) {
        mainImage.style.display =
            "none";
    }

    if (imagePlaceholder) {
        imagePlaceholder.style.display =
            "flex";
    }

    if (imageThumbnails) {
        imageThumbnails.innerHTML = "";
        imageThumbnails.style.display =
            "none";
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
    document.getElementById(
        "listingSeller"
    );

const sellerProfileLink =
    document.getElementById(
        "listingSellerProfile"
    );

const sellerAvatar =
    document.getElementById(
        "listingSellerAvatar"
    );


/* =================================================
   SATICI KULLANICI ADI
   ================================================= */

if (sellerElement) {

    sellerElement.textContent =
        sellerUsername;

}


/* =================================================
   SATICI PROFİL BAĞLANTISI
   ================================================= */

if (sellerProfileLink && listing.user_id) {

    sellerProfileLink.href =
        "profile.html?id=" +
        encodeURIComponent(
            listing.user_id
        );

}


/* =================================================
   SATICI AVATARI
   ================================================= */

if (sellerAvatar) {

    const cleanSellerName =
        String(
            sellerUsername || "R2"
        ).trim();

    const initials =
        cleanSellerName
            .slice(0, 2)
            .toUpperCase();

    sellerAvatar.textContent =
        initials || "R2";

}
    


    const serverElement =
      document.getElementById(
        "listingServer"
      );


    if (serverElement) {

      serverElement.textContent =
        serverNames[
          listing.server_id
        ] ||
        "Sunucu";
    }


    const categoryElement =
      document.getElementById(
        "listingCategory"
      );


    if (categoryElement) {

      categoryElement.textContent =
        categoryNames[
          listing.category_id
        ] ||
        "Kategori";
    }


    const titleElement =
      document.getElementById(
        "listingDetailTitle"
      );


    if (titleElement) {

      titleElement.textContent =
        listing.title ||
        "İlan";
    }


    const descriptionElement =
      document.getElementById(
        "listingDetailDescription"
      );


    if (
      descriptionElement
    ) {

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
        Number(
          listing.price
        ).toLocaleString(
          "tr-TR"
        ) +
        " ₺";
    }


    document.title =
      `${listing.title || "İlan"} | Royale2 Market`;


    if (loading) {

      loading.style.display =
        "none";
    }


    detailContainer.style.display =
      "";


    const descriptionSection =
      document.getElementById(
        "listingDescriptionSection"
      );


    const securitySection =
      document.getElementById(
        "listingSecuritySection"
      );


    if (
      descriptionSection
    ) {

      descriptionSection
        .style
        .display =
        "";
    }


    if (
      securitySection
    ) {

      securitySection
        .style
        .display =
        "";
    }


  } catch (error) {

    console.error(
      "İlan detay hatası:",
      error
    );


    if (loading) {

      loading.style.display =
        "none";
    }


    if (errorBox) {

      errorBox.style.display =
        "";


      errorBox.textContent =
        error.message ||
        "İlan bulunamadı.";
    }
  }

})();


// ==========================================================
// SATICIYLA İLETİŞİME GEÇ
// ==========================================================

function initContactSellerButton() {

  const contactButton =
    document.getElementById(
      "contactSellerButton"
    );


  if (!contactButton) {
    return;
  }


  contactButton.addEventListener(
    "click",
    async () => {

      try {

        const currentUser =
          getStoredUser();


        if (
          !currentUser?.id
        ) {

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
            `${window.SUPABASE_API_URL}listings?id=eq.${encodeURIComponent(
              listingId
            )}&select=id,user_id`
          );


        if (
          !listingResponse.ok
        ) {

          throw new Error(
            "İlan bilgisi alınamadı."
          );
        }


        const listingRows =
          await listingResponse.json();


        if (
          !listingRows.length
        ) {

          throw new Error(
            "İlan bulunamadı."
          );
        }


        const sellerId =
          listingRows[0]
            .user_id;


        const buyerId =
          currentUser.id;


        if (
          buyerId ===
          sellerId
        ) {

          alert(
            "Kendi ilanınız için kendinizle mesajlaşamazsınız."
          );


          return;
        }


        const conversationResponse =
          await supabaseAuthFetch(
            `${window.SUPABASE_API_URL}conversations?listing_id=eq.${encodeURIComponent(
              listingId
            )}&buyer_id=eq.${encodeURIComponent(
              buyerId
            )}&seller_id=eq.${encodeURIComponent(
              sellerId
            )}&select=id`
          );


        if (
          !conversationResponse.ok
        ) {

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


        if (
          conversations.length
        ) {

          conversationId =
            conversations[0]
              .id;


        } else {

          const createResponse =
            await supabaseAuthFetch(
              `${window.SUPABASE_API_URL}conversations`,
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",

                  "Prefer":
                    "return=representation"
                },

                body:
                  JSON.stringify({
                    listing_id:
                      listingId,

                    buyer_id:
                      buyerId,

                    seller_id:
                      sellerId
                  })
              }
            );


          if (
            !createResponse.ok
          ) {

            throw new Error(
              await createResponse.text()
            );
          }


          const created =
            await createResponse.json();


          conversationId =
            created?.[0]?.id;
        }


        if (
          !conversationId
        ) {

          throw new Error(
            "Konuşma oluşturulamadı."
          );
        }


        window.location.href =
          `messages.html?conversation=${encodeURIComponent(
            conversationId
          )}`;


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


// ==========================================================
// MESAJ YARDIMCI FONKSİYONLARI
// ==========================================================

async function fetchProfile(
  userId
) {

  if (!userId) {
    return null;
  }


  const response =
    await supabaseAuthFetch(
      `${window.SUPABASE_API_URL}profiles?id=eq.${encodeURIComponent(
        userId
      )}&select=username,display_name`
    );


  if (!response.ok) {
    return null;
  }


  const profiles =

      await response.json();


  return (
    profiles?.[0] ||
    null
  );
}


async function fetchListingSummary(
  listingId
) {

  if (!listingId) {
    return null;
  }


  const response =
    await supabaseAuthFetch(
      `${window.SUPABASE_API_URL}listings?id=eq.${encodeURIComponent(
        listingId
      )}&select=id,title`
    );


  if (!response.ok) {
    return null;
  }


  const rows =
    await response.json();


  return (
    rows?.[0] ||
    null
  );
}


function getProfileName(
  profile
) {

  return (
    profile?.username ||
    profile?.display_name ||
    "Royale2 Kullanıcısı"
  );
}


function setAvatarText(
  element,
  name
) {

  if (!element) {
    return;
  }


  const cleanName =
    String(
      name || "R2"
    ).trim();


  element.textContent =
    cleanName
      .slice(0, 2)
      .toUpperCase() ||
    "R2";
}


function renderMessage(
    messageList,
    msg,
    currentUserId
) {
    if (!messageList || !msg) {
        return;
    }

    // Aynı mesaj Realtime ile ikinci kez gelirse tekrar gösterme
    if (
        msg.id &&
        messageList.querySelector(
            `[data-message-id="${msg.id}"]`
        )
    ) {
        return;
    }

    const messageItem =
        document.createElement(
            "div"
        );

    const isMine =
        msg.sender_id ===
        currentUserId;

    messageItem.className =
        isMine
            ? "message-item message-sent"
            : "message-item message-received";

    if (msg.id) {
        messageItem.dataset.messageId =
            msg.id;
    }

    const bubble =
        document.createElement(
            "div"
        );

    bubble.className =
        isMine
            ? "message-bubble own"
            : "message-bubble";

    const text =
        document.createElement(
            "div"
        );

    text.className =
        "message-text";

    text.textContent =
        msg.message || "";

    const meta =
        document.createElement(
            "div"
        );

    meta.style.cssText = `
        display:flex;
        align-items:center;
        justify-content:flex-end;
        gap:5px;
        margin-top:4px;
        font-size:10px;
        opacity:.72;
    `;

    const time =
        document.createElement(
            "span"
        );

    time.className =
        "message-time";

    time.textContent =
        new Date(
            msg.created_at
        ).toLocaleString(
            "tr-TR"
        );

    meta.appendChild(time);

    // Tik sadece kendi gönderdiğimiz mesajlarda görünsün
    if (isMine) {
        const status =
            document.createElement(
                "span"
            );

        status.className =
            "message-read-status";

        status.dataset.messageId =
            msg.id || "";

        status.textContent =
            msg.read_at
                ? "✓✓"
                : "✓";

        status.title =
            msg.read_at
                ? "Okundu"
                : "İletildi";

        status.style.cssText = `
            font-size:13px;
            font-weight:800;
            line-height:1;
            color:${
                msg.read_at
                    ? "#4db8ff"
                    : "#aab4bf"
            };
        `;

        meta.appendChild(status);
    }

    bubble.appendChild(text);
    bubble.appendChild(meta);

    messageItem.appendChild(
        bubble
    );

    messageList.appendChild(
        messageItem
    );
}
/* =====================================================
   MESAJLAR - SUPABASE REALTIME
   ===================================================== */

let messagesRealtimeChannel = null;

async function startMessagesRealtime(conversationId, currentUserId) {
    if (!conversationId || !currentUserId) {
        return;
    }

    if (
        typeof supabase === "undefined" ||
        !supabase.createClient
    ) {
        console.error("Supabase Realtime istemcisi yüklenmedi.");
        return;
    }

    try {
        if (messagesRealtimeChannel) {
            try {
                await messagesRealtimeChannel.unsubscribe();
            } catch (error) {
                console.error(
                    "Eski Realtime bağlantısı kapatılamadı:",
                    error
                );
            }

            messagesRealtimeChannel = null;
        }

        const accessToken = await getValidAccessToken();

        if (!accessToken) {
            console.error(
                "Realtime için kullanıcı access token bulunamadı."
            );
            return;
        }

        const realtimeClient = supabase.createClient(
            window.SUPABASE_API_URL.replace("/rest/v1/", ""),
            window.SUPABASE_KEY,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false
                }
            }
        );

        await realtimeClient.realtime.setAuth(accessToken);
      
      window.realtimeClient = realtimeClient;

        console.log("Realtime kullanıcı doğrulaması hazır.");

        messagesRealtimeChannel = realtimeClient
            .channel("messages-" + conversationId)

            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter:
                        "conversation_id=eq." +
                        conversationId
                },
                payload => {
                    console.log(
                        "REALTIME MESAJ GELDİ:",
                        payload
                    );

                    const messageList =
                        document.getElementById("messageList");

                    if (!messageList || !payload.new) {
                        return;
                    }

                    renderMessage(
                        messageList,
                        payload.new,
                        currentUserId
                    );

                    messageList.scrollTop =
                        messageList.scrollHeight;

                    // Karşı taraftan gelen mesajı,
                    // konuşma açık olduğu için okundu yap.
                    if (
                        payload.new.sender_id !== currentUserId &&
                        !payload.new.read_at &&
                        payload.new.id
                    ) {
                        supabaseAuthFetch(
                            `${window.SUPABASE_API_URL}messages?id=eq.${encodeURIComponent(
                                payload.new.id
                            )}&read_at=is.null`,
                            {
                                method: "PATCH",
                                headers: {
                                    "Content-Type": "application/json",
                                    "Prefer": "return=minimal"
                                },
                                body: JSON.stringify({
                                    read_at: new Date().toISOString()
                                })
                            }
                        ).catch(error => {
                            console.error(
                                "Yeni mesaj okundu hatası:",
                                error
                            );
                        });
                    }
                }
            )

            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "messages",
                    filter:
                        "conversation_id=eq." +
                        conversationId
                },
                payload => {
                    console.log(
                        "REALTIME MESAJ GÜNCELLENDİ:",
                        payload
                    );

                    if (!payload.new || !payload.new.id) {
                        return;
                    }

                    const status =
                        document.querySelector(
                            `.message-read-status[data-message-id="${payload.new.id}"]`
                        );

                    if (!status) {
                        return;
                    }

                    if (payload.new.read_at) {
                        status.textContent = "✓✓";
                        status.title = "Okundu";
                        status.style.color = "#4db8ff";
                    } else {
                        status.textContent = "✓";
                        status.title = "İletildi";
                        status.style.color = "#aaa4bf";
                    }
                }
            )

            .subscribe(status => {
                console.log(
                    "Mesaj Realtime durumu:",
                    status
                );
            });

    } catch (error) {
        console.error(
            "Realtime başlatılırken hata oluştu:",
            error
        );
    }
}

// ==========================================================
// MESAJLAR SAYFASI - KONUŞMA LİSTESİ
// ==========================================================

async function initMessagesPage() {

  const conversationList =
    document.getElementById(
      "conversationList"
    );


  if (!conversationList) {
    return;
  }


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


    const [
      buyerResponse,
      sellerResponse
    ] =
      await Promise.all([

        supabaseAuthFetch(
          `${window.SUPABASE_API_URL}conversations?buyer_id=eq.${encodeURIComponent(
            currentUserId
          )}&select=*&order=created_at.desc`
        ),

        supabaseAuthFetch(
          `${window.SUPABASE_API_URL}conversations?seller_id=eq.${encodeURIComponent(
            currentUserId
          )}&select=*&order=created_at.desc`
        )

      ]);


    if (
      !buyerResponse.ok ||
      !sellerResponse.ok
    ) {

      console.error(
        "Konuşma listesi hatası:",
        buyerResponse.status,
        sellerResponse.status
      );


      throw new Error(
        "Konuşmalar alınamadı."
      );
    }


    const buyerConversations =
      await buyerResponse.json();


    const sellerConversations =
      await sellerResponse.json();


    const uniqueConversations =
      Array.from(
        new Map(
          [
            ...buyerConversations,
            ...sellerConversations
          ].map(
            item => [
              item.id,
              item
            ]
          )
        ).values()
      );

for (const conversation of uniqueConversations) {
  const lastMessageResponse =
    await supabaseAuthFetch(
      `${window.SUPABASE_API_URL}messages?conversation_id=eq.${encodeURIComponent(
        conversation.id
      )}&select=id,message,created_at,sender_id,read_at&order=created_at.desc&limit=1`
    );

  if (lastMessageResponse.ok) {
    const lastMessages =
      await lastMessageResponse.json();

    conversation.lastMessage =
      lastMessages?.[0] || null;
 const unreadResponse =
    await supabaseAuthFetch(
        `${window.SUPABASE_API_URL}messages?conversation_id=eq.${encodeURIComponent(
            conversation.id
        )}&sender_id=neq.${encodeURIComponent(
            currentUserId
        )}&read_at=is.null&select=id`
    );

if (unreadResponse.ok) {
    const unreadMessages =
        await unreadResponse.json();

    conversation.unreadCount =
        unreadMessages.length;
} else {
    conversation.unreadCount = 0;
} } else {
    conversation.lastMessage = null;
  }
}
uniqueConversations.sort((a, b) => {
    const dateA = a.lastMessage?.created_at || a.created_at;
    const dateB = b.lastMessage?.created_at || b.created_at;

    return new Date(dateB) - new Date(dateA);
});


    if (
      !uniqueConversations.length
    ) {

      conversationList.innerHTML = `
        <div class="no-conversations">

          <strong>
            Henüz mesajınız yok.
          </strong>

          <p>
            Bir ilandaki
            "Satıcıyla İletişime Geç"
            butonunu kullanarak
            konuşma başlatabilirsiniz.
          </p>

        </div>
      `;


      return;
    }


    conversationList.innerHTML =
      "";


    const activeConversationId =
      new URLSearchParams(
        window.location.search
      ).get(
        "conversation"
      );


    for (
      const conversation
      of uniqueConversations
    ) {

      const otherUserId =

        conversation.buyer_id ===
          currentUserId

          ? conversation.seller_id

          : conversation.buyer_id;


      const [
        profile,
        listing
      ] =
        await Promise.all([

          fetchProfile(
            otherUserId
          ).catch(
            () => null
          ),

          fetchListingSummary(
            conversation.listing_id
          ).catch(
            () => null
          )

        ]);


      const otherName =
        getProfileName(
          profile
        );


      const item =
        document.createElement(
          "button"
        );


      item.type =
        "button";


      item.className =
        "conversation-item";


      if (
        String(
          conversation.id
        ) ===
        String(
          activeConversationId
        )
      ) {

        item.classList.add(
          "active"
        );
      }


      const strong =
        document.createElement(
          "strong"
        );


      strong.textContent =
        otherName;


      const listingTitle =
        document.createElement(
          "span"
        );


      listingTitle.className =
        "conversation-listing-title";


      listingTitle.textContent =
        listing?.title ||
        "İlan Görüşmesi";

const lastMessageText =
    document.createElement("div");

lastMessageText.className =
    "conversation-last-message";

lastMessageText.textContent =
    conversation.lastMessage?.message ||
    "Henüz mesaj yok.";
const unreadCount =
    conversation.unreadCount || 0;

const unreadBadge =
    document.createElement("span");

unreadBadge.className =
    "conversation-unread-badge";

unreadBadge.textContent =
    unreadCount;

if (!unreadCount) {
    unreadBadge.style.display = "none";
}
      const small =
        document.createElement(
          "small"
        );


      small.textContent =
        new Date(
conversation.lastMessage?.created_at ||
conversation.created_at
        ).toLocaleString(
          "tr-TR"
        );

item.appendChild(
    strong
);

item.appendChild(
    listingTitle
);

item.appendChild(
    lastMessageText
);
item.appendChild(
    unreadBadge
);

item.appendChild(
    small
);      item.addEventListener(
        "click",
        () => {

          window.location.href =
            `messages.html?conversation=${encodeURIComponent(
              conversation.id
            )}`;
        }
      );


      conversationList.appendChild(
        item
      );
    }


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

  const chatArea =
    document.getElementById(
      "chatArea"
    );


  const chatEmpty =
    document.getElementById(
      "chatEmpty"
    );


  const messageList =
    document.getElementById(
      "messageList"
    );


  if (
    !chatArea ||
    !chatEmpty ||
    !messageList
  ) {
    return;
  }


  const currentUser =
    getStoredUser();


  if (!currentUser?.id) {
    return;
  }


  const params =
    new URLSearchParams(
      window.location.search
    );


  const conversationId =
    params.get(
      "conversation"
    );


  if (!conversationId) {

    chatArea.style.display =
      "none";


    chatEmpty.style.display =
      "";


    return;
  }


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
        `${window.SUPABASE_API_URL}conversations?id=eq.${encodeURIComponent(
          conversationId
        )}&select=*`
      );


    if (!response.ok) {

      throw new Error(
        "Konuşma bilgisi alınamadı."
      );
    }


    const conversations =
      await response.json();


    if (
      !conversations.length
    ) {

      throw new Error(
        "Konuşma bulunamadı."
      );
    }


    const conversation =
      conversations[0];


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


    const [
      profile,
      listing
    ] =
      await Promise.all([

        fetchProfile(
          otherUserId
        ).catch(
          () => null
        ),

        fetchListingSummary(
          conversation.listing_id
        ).catch(
          () => null
        )

      ]);


    const otherName =
      getProfileName(
        profile
      );


    const chatUsername =
      document.getElementById(
        "chatUsername"
      );


    const chatListingTitle =
      document.getElementById(
        "chatListingTitle"
      );


    const chatUserAvatar =
      document.getElementById(
        "chatUserAvatar"
      );


    if (chatUsername) {

      chatUsername.textContent =
        otherName;
    }


    if (chatListingTitle) {

      chatListingTitle.textContent =
        listing?.title ||
        "İlan Görüşmesi";
    }


    setAvatarText(
      chatUserAvatar,
      otherName
    );


    chatEmpty.style.display =
      "none";


    chatArea.style.display =
      "flex";


    const messagesResponse =
      await supabaseAuthFetch(
        `${window.SUPABASE_API_URL}messages?conversation_id=eq.${encodeURIComponent(
          conversationId
        )}&select=*&order=created_at.asc`
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

messageList.innerHTML =
    "";

messages.forEach(
    msg => {
        renderMessage(
            messageList,
            msg,
            currentUserId
        );
    }
);

messageList.scrollTop =
    messageList.scrollHeight;

// Bu konuşmadaki karşı taraftan gelen mesajları okundu yap
const readResponse =
    await supabaseAuthFetch(
        `${window.SUPABASE_API_URL}rpc/mark_conversation_messages_read`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                p_conversation_id: conversationId
            })
        }
    );

if (!readResponse.ok) {

    console.error(
        "Mesajlar okundu olarak işaretlenemedi:",
        await readResponse.text()
    );

} else {

    // Üst menü okunmamış mesaj sayısını hemen güncelle
    await initUnreadMessagesBadge();
}

// Sol konuşma listesini de güncelle
await initMessagesPage();

// Realtime mesaj dinlemeyi başlat
startMessagesRealtime(
    conversationId,
    currentUserId
);

} catch (error) {

    console.error(
      "Aktif konuşma açma hatası:",
      error
    );


    chatArea.style.display =
      "none";


    chatEmpty.style.display =
      "";


    const heading =
      chatEmpty.querySelector(
        "h2"
      );


    const paragraph =
      chatEmpty.querySelector(
        "p"
      );


    if (heading) {

      heading.textContent =
        "Konuşma açılamadı";
    }


    if (paragraph) {

      paragraph.textContent =
        error.message ||
        "Lütfen tekrar deneyin.";
    }
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


  if (
    !messageForm ||
    messageForm.dataset.initialized ===
      "true"
  ) {
    return;
  }


  messageForm.dataset.initialized =
    "true";


  messageForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const messageInput =
        document.getElementById(
          "messageInput"
        );


      const submitButton =
        messageForm.querySelector(
          'button[type="submit"]'
        );


      if (!messageInput) {
        return;
      }


      const message =
        messageInput
          .value
          .trim();


      if (!message) {
        return;
      }


      const conversationId =
        new URLSearchParams(
          window.location.search
        ).get(
          "conversation"
        );


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

        if (submitButton) {

          submitButton.disabled =
            true;
        }


        const accessToken =
          await getValidAccessToken();


        if (!accessToken) {

          throw new Error(
            "Oturumunuz sona erdi. Tekrar giriş yapın."
          );
        }


        /*
         * Önce kullanıcının gerçekten
         * bu konuşmanın tarafı olduğunu
         * doğruluyoruz.
         */

        const conversationResponse =
          await supabaseAuthFetch(
            `${window.SUPABASE_API_URL}conversations?id=eq.${encodeURIComponent(
              conversationId
            )}&select=buyer_id,seller_id`
          );



        if (
          !conversationResponse.ok
        ) {

          throw new Error(
            "Konuşma doğrulanamadı."
          );
        }


        const rows =
          await conversationResponse.json();


        const conversation =
          rows?.[0];


        if (
          !conversation ||

          (
            conversation.buyer_id !==
              currentUser.id &&

            conversation.seller_id !==
              currentUser.id
          )
        ) {

          throw new Error(
            "Bu konuşmaya mesaj gönderme yetkiniz yok."
          );
        }
// ============================================
// BU KONUŞMADAKİ GELEN MESAJLARI OKUNDU YAP
// ============================================

const markReadResponse =
    await supabaseAuthFetch(
        `${window.SUPABASE_API_URL}messages?conversation_id=eq.${encodeURIComponent(
            conversationId
        )}&sender_id=neq.${encodeURIComponent(
            currentUser.id
        )}&read_at=is.null`,
        {
            method: "PATCH",
            headers: {
                "Content-Type":
                    "application/json",
                "Prefer":
                    "return=minimal"
            },
            body: JSON.stringify({
                read_at:
                    new Date().toISOString()
            })
        }
    );

if (!markReadResponse.ok) {
    console.error(
        "Mesajlar okundu olarak işaretlenemedi:",
        await markReadResponse.text()
    );
}

        const response =
          await supabaseAuthFetch(
            `${window.SUPABASE_API_URL}messages`,
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",

                "Prefer":
                  "return=representation"
              },

              body:
                JSON.stringify({

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


        const createdRows =
          await response
            .json()
            .catch(
              () => []
            );


        messageInput.value =
          "";


        const messageList =
          document.getElementById(
            "messageList"
          );


        if (
          messageList &&
          createdRows?.[0]
        ) {

          renderMessage(
            messageList,
            createdRows[0],
            currentUser.id
          );


          messageList.scrollTop =
            messageList.scrollHeight;


        } else {

          await initActiveConversation();
        }


      } catch (error) {

        console.error(
          "Mesaj gönderme hatası:",
          error
        );


        alert(
          error.message ||
          "Mesaj gönderilemedi. Lütfen tekrar deneyin."
        );


      } finally {

        if (submitButton) {

          submitButton.disabled =
            false;
        }


        messageInput.focus();
      }
    }
  );
}

/* ==================================================
   ÜST MENÜ - MESAJLAR / OKUNMAMIŞ MESAJ SAYISI
   ================================================== */

async function initUnreadMessagesBadge() {
    try {
        const currentUser =
            getStoredUser();

        if (!currentUser?.id) {
            return;
        }

        const accessToken =
            await getValidAccessToken();

        if (!accessToken) {
            return;
        }

        // Kullanıcının dahil olduğu konuşmaları al
        const conversationsResponse =
            await supabaseAuthFetch(
                `${window.SUPABASE_API_URL}conversations?or=(buyer_id.eq.${currentUser.id},seller_id.eq.${currentUser.id})&select=id`
            );

        if (!conversationsResponse.ok) {
            console.error(
                "Konuşmalar alınamadı:",
                await conversationsResponse.text()
            );
            return;
        }

        const conversations =
            await conversationsResponse.json();

        const conversationIds =
            conversations.map(
                conversation => conversation.id
            );

        let unreadCount = 0;

        if (conversationIds.length) {
            const ids =
                conversationIds.join(",");

            const unreadResponse =
                await supabaseAuthFetch(
                    `${window.SUPABASE_API_URL}messages?conversation_id=in.(${ids})&sender_id=neq.${currentUser.id}&read_at=is.null&select=id`
                );

            if (unreadResponse.ok) {
                const unreadMessages =
                    await unreadResponse.json();

                unreadCount =
                    unreadMessages.length;
            }
        }

        // Üst menüde uygun alanı bul
        const actions =
            document.querySelector(
                ".actions"
            );

        if (!actions) {
            return;
        }

        // Daha önce oluşturulduysa tekrar oluşturma
        let messagesLink =
            document.getElementById(
                "header-messages-link"
            );

        if (!messagesLink) {
            messagesLink =
                document.createElement("a");

            messagesLink.id =
                "header-messages-link";

            messagesLink.href =
                "messages";

            messagesLink.style.cssText = `
                position: relative;
                display: inline-flex;
                align-items: center;
                gap: 7px;
                padding: 9px 12px;
                color: #ffffff;
                text-decoration: none;
                font-weight: 600;
                border-radius: 7px;
                white-space: nowrap;
            `;

            messagesLink.innerHTML = `
                <span>💬 Mesajlar</span>
                <span
                    id="unread-messages-badge"
                    style="
                        display:none;
                        min-width:18px;
                        height:18px;
                        padding:0 5px;
                        align-items:center;
                        justify-content:center;
                        background:#ef4444;
                        color:#ffffff;
                        border-radius:999px;
                        font-size:11px;
                        font-weight:700;
                        line-height:18px;
                    "
                ></span>
            `;

            actions.insertBefore(
                messagesLink,
                actions.firstChild
            );
        }

        const badge =
            document.getElementById(
                "unread-messages-badge"
            );

        if (!badge) {
            return;
        }

        if (unreadCount > 0) {
            badge.textContent =
                unreadCount > 99

                          ? "99+"
                    : String(unreadCount);

            badge.style.display =
                "inline-flex";
        } else {
            badge.textContent = "";
            badge.style.display =
                "none";
        }

    } catch (error) {
        console.error(
            "Okunmamış mesaj sayısı alınamadı:",
            error
        );
    }
}// ==========================================================
// OKUNMAMIS MESAJ SAYACI - REALTIME
// ==========================================================
async function startUnreadMessagesRealtime() {
    try {
        const accessToken = await getValidAccessToken();

        if (!accessToken) {
            console.log("Unread Realtime: Kullanıcı giriş yapmamış.");
            return;
        }

        if (
            typeof supabase === "undefined" ||
            typeof supabase.createClient !== "function"
        ) {
            console.error("Unread Realtime: Supabase kütüphanesi hazır değil.");
            return;
        }

        if (window.unreadMessagesRealtimeChannel) {
            return;
        }

        const client = supabase.createClient(
            window.SUPABASE_API_URL.replace("/rest/v1/", ""),
            window.SUPABASE_KEY,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false
                }
            }
        );

        await client.realtime.setAuth(accessToken);

        window.unreadMessagesRealtimeClient = client;

        window.unreadMessagesRealtimeChannel = client
            .channel("unread-messages-badge")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "messages"
                },
                async (payload) => {
                    console.log(
                        "UNREAD REALTIME EVENT:",
                        payload
                    );

                    await initUnreadMessagesBadge();

                    if (document.getElementById("conversationList")) {
                        await initMessagesPage();
                    }
                }
            )
            .subscribe((status) => {
                console.log(
                    "Unread mesaj sayacı Realtime:",
                    status
                );
            });

    } catch (error) {
        console.error(
            "Unread Realtime başlatılamadı:",
            error
        );
    }
}


// ==========================================================
// SAYFAYI BAŞLAT
// ==========================================================

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    initContactSellerButton();
    await initUnreadMessagesBadge();
    startUnreadMessagesRealtime();


    if (
      document.getElementById(
        "conversationList"
      )
    ) {

      await initMessagesPage();

      await initActiveConversation();

      initMessageForm();

    }
  }
);


// =========================================================
// ROYALE2 MARKET - ANA SAYFA MANSET SLIDER
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
    const slider = document.querySelector(".market-slider");

    // Slider bu sayfada yoksa hiçbir işlem yapma
    if (!slider) return;

    const slides = Array.from(slider.querySelectorAll(".slider-item"));
    const prevButton = slider.querySelector(".slider-prev");
    const nextButton = slider.querySelector(".slider-next");
    const dotsContainer = slider.querySelector(".slider-dots");

    if (!slides.length || !dotsContainer) return;

    let currentSlide = 0;
    let autoPlayTimer = null;
    const AUTO_PLAY_DELAY = 5000;

    // Alt noktaları otomatik oluştur
    slides.forEach((slide, index) => {
        const dot = document.createElement("button");

        dot.type = "button";
        dot.className = "slider-dot";
        dot.setAttribute("aria-label", `Manşet ${index + 1}`);

        dot.addEventListener("click", () => {
            showSlide(index);
            restartAutoPlay();
        });

        dotsContainer.appendChild(dot);
    });

    const dots = Array.from(
        dotsContainer.querySelectorAll(".slider-dot")
    );

    function showSlide(index) {
        if (index < 0) {
            index = slides.length - 1;
        }

        if (index >= slides.length) {
            index = 0;
        }

        slides.forEach((slide) => {
            slide.classList.remove("active");
        });

        dots.forEach((dot) => {
            dot.classList.remove("active");
        });

        slides[index].classList.add("active");

        if (dots[index]) {
            dots[index].classList.add("active");
        }

        currentSlide = index;
    }

    function nextSlide() {
        showSlide(currentSlide + 1);
    }

    function previousSlide() {
        showSlide(currentSlide - 1);
    }

    function startAutoPlay() {
        stopAutoPlay();

        autoPlayTimer = setInterval(() => {
            nextSlide();
        }, AUTO_PLAY_DELAY);
    }

    function stopAutoPlay() {
        if (autoPlayTimer) {
            clearInterval(autoPlayTimer);
            autoPlayTimer = null;
        }
    }

    function restartAutoPlay() {
        stopAutoPlay();
        startAutoPlay();
    }

    if (nextButton) {
        nextButton.addEventListener("click", () => {
            nextSlide();
            restartAutoPlay();
        });
    }

    if (prevButton) {
        prevButton.addEventListener("click", () => {
            previousSlide();
            restartAutoPlay();
        });
    }

    // Mouse bannerin üzerindeyken otomatik geçişi durdur
    slider.addEventListener("mouseenter", stopAutoPlay);
    slider.addEventListener("mouseleave", startAutoPlay);

    // Sekme arka plana geçince gereksiz çalışmasın
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            stopAutoPlay();
        } else {
            startAutoPlay();
        }
    });

    // İlk manşeti göster ve sistemi başlat
    showSlide(0);
    startAutoPlay();
});


// =====================================================
// ROYALE MARKET - CANLI YANG KURLARI
// Supabase: public.yang_rates
// =====================================================

async function loadYangRates() {
    const rateBoard = document.querySelector(".yang-rates-section");

    // Bu bölüm sadece Yang Kurları alanının bulunduğu sayfada çalışsın.
    if (!rateBoard) {
        return;
    }

    try {
        const response = await fetch(
            `${window.SUPABASE_API_URL}yang_rates?select=server,unit,current_price,previous_price,updated_at&order=server.asc`,
            {
                method: "GET",
                headers: {
                    apikey: window.SUPABASE_KEY,
                    Authorization: `Bearer ${window.SUPABASE_KEY}`,
                    Accept: "application/json"
                }
            }
        );

        if (!response.ok) {
            throw new Error(
                `Yang kurları alınamadı. HTTP ${response.status}`
            );
        }

        const rates = await response.json();

        if (!Array.isArray(rates) || rates.length === 0) {
            console.warn("Yang kuru verisi bulunamadı.");
            return;
        }

        rates.forEach((rate) => {
            const serverName = String(rate.server || "").trim();

            const card = document.querySelector(
                `[data-yang-server="${serverName}"]`
            );

            if (!card) {
                return;
            }

            const currentPrice = Number(rate.current_price);
            const previousPrice = Number(rate.previous_price);

            const priceElement =
                card.querySelector(".yang-current-price");

            const changeElement =
                card.querySelector(".yang-change");

            const previousElement =
                card.querySelector(".yang-previous-price");

            if (priceElement && Number.isFinite(currentPrice)) {
                priceElement.textContent =
                    `${currentPrice.toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })} TL`;
            }

            if (previousElement && Number.isFinite(previousPrice)) {
                previousElement.textContent =
                    `Önceki: ${previousPrice.toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })} TL`;
            }
        });

        // En son güncellenen kaydı bul.
        const validDates = rates
            .map((rate) => new Date(rate.updated_at))
            .filter((date) => !Number.isNaN(date.getTime()));

        if (validDates.length > 0) {
            const latestDate = new Date(
                Math.max(...validDates.map((date) => date.getTime()))
            );

            const updateElement =
                document.getElementById("yang-last-update");

            if (updateElement) {
                updateElement.textContent =
                    `Son Güncelleme: ${latestDate.toLocaleString(
                        "tr-TR",
                        {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                        }
                    )}`;
            }
        }

        console.log(
            "Royale Market Yang kurları Supabase'den güncellendi.",
            rates
        );

    } catch (error) {
        console.error(
            "Yang kurları yüklenirken hata oluştu:",
            error
        );
    }
}


// Sayfa açıldığında Yang kurlarını getir.
document.addEventListener(
    "DOMContentLoaded",
    () => {
        loadYangRates();
    }
);

// =====================================================
// ROYALE2 MARKET - YANG KURLARI REALTIME
// Supabase'de fiyat değişince sayfayı yenilemeden günceller
// =====================================================

let yangRatesRealtimeChannel = null;

function startYangRatesRealtime() {
    const rateBoard = document.querySelector(".yang-rates-section");

    // Yang kuru bölümü olmayan sayfalarda çalışmasın.
    if (!rateBoard) {
        return;
    }

    if (
        typeof supabase === "undefined" ||
        typeof supabase.createClient !== "function"
    ) {
        console.error(
            "Yang Realtime başlatılamadı: Supabase kütüphanesi bulunamadı."
        );
        return;
    }

    // Aynı kanalın birden fazla kez açılmasını engelle.
    if (yangRatesRealtimeChannel) {
        return;
    }

    const realtimeClient = supabase.createClient(
        window.SUPABASE_API_URL.replace("/rest/v1/", ""),
        window.SUPABASE_KEY,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        }
    );

    yangRatesRealtimeChannel = realtimeClient
        .channel("yang-rates-live")
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "yang_rates"
            },
            async (payload) => {
                console.log(
                    "Yang kuru Realtime güncellemesi:",
                    payload
                );

                // Tablo değiştiğinde güncel değerleri tekrar çek.
                await loadYangRates();
            }
        )
        .subscribe((status) => {
            console.log(
                "Yang kurları Realtime durumu:",
                status
            );
        });
}

document.addEventListener(
    "DOMContentLoaded",
    () => {
        startYangRatesRealtime();
    }
);
// =====================================================
// ROYALE2 MARKET - YANG FİYAT HAREKETİ
// Son fiyat değişimini yeşil/kırmızı ve flash ile gösterir
// =====================================================

const yangRateVisualState = new Map();

function getYangRateDirection(currentPrice, previousPrice) {
    const current = Number(currentPrice);
    const previous = Number(previousPrice);

    if (
        !Number.isFinite(current) ||
        !Number.isFinite(previous)
    ) {
        return "neutral";
    }

    if (current > previous) {
        return "up";
    }

    if (current < previous) {
        return "down";
    }

    return "neutral";
}

function clearYangRateMovementClasses(card) {
    if (!card) {
        return;
    }

    card.classList.remove(
        "yang-rate-up",
        "yang-rate-down",
        "yang-rate-flash-up",
        "yang-rate-flash-down"
    );
}

function applyYangRateMovement(card, direction, shouldFlash = false) {
    if (!card) {
        return;
    }

    clearYangRateMovementClasses(card);

    if (direction === "up") {
        card.classList.add("yang-rate-up");

        if (shouldFlash) {
            card.classList.add("yang-rate-flash-up");
        }
    }

    if (direction === "down") {
        card.classList.add("yang-rate-down");

        if (shouldFlash) {
            card.classList.add("yang-rate-flash-down");
        }
    }

    if (shouldFlash) {
        window.setTimeout(() => {
            card.classList.remove(
                "yang-rate-flash-up",
                "yang-rate-flash-down"
            );
        }, 1300);
    }
}

async function loadYangRatesWithMovement() {
    const rateBoard = document.querySelector(".yang-rates-section");

    if (!rateBoard) {
        return;
    }

    try {
        const response = await fetch(
            `${window.SUPABASE_API_URL}yang_rates?select=server,unit,current_price,previous_price,updated_at&order=server.asc`,
            {
                method: "GET",
                headers: {
                    apikey: window.SUPABASE_KEY,
                    Authorization: `Bearer ${window.SUPABASE_KEY}`,
                    Accept: "application/json"
                }
            }
        );

        if (!response.ok) {
            throw new Error(
                `Yang kurları alınamadı. HTTP ${response.status}`
            );
        }

        const rates = await response.json();

        if (!Array.isArray(rates) || rates.length === 0) {
            return;
        }

        rates.forEach((rate) => {
            const serverName = String(rate.server || "").trim();

            const card = document.querySelector(
                `[data-yang-server="${serverName}"]`
            );

            if (!card) {
                return;
            }

            const currentPrice = Number(rate.current_price);
            const previousPrice = Number(rate.previous_price);

            const priceElement =
                card.querySelector(".yang-current-price");

            const previousElement =
                card.querySelector(".yang-previous-price");

            if (priceElement && Number.isFinite(currentPrice)) {
                priceElement.textContent =
                    `${currentPrice.toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })} TL`;
            }

            if (previousElement && Number.isFinite(previousPrice)) {
                previousElement.textContent =
                    `Önceki: ${previousPrice.toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })} TL`;
            }

            const direction =
                getYangRateDirection(
                    currentPrice,
                    previousPrice
                );

            const oldState =
                yangRateVisualState.get(serverName);

            const shouldFlash =
                oldState &&
                oldState.currentPrice !== currentPrice;

            applyYangRateMovement(
                card,
                direction,
                shouldFlash
            );

            yangRateVisualState.set(
                serverName,
                {
                    currentPrice,
                    previousPrice,
                    direction
                }
            );
        });

    } catch (error) {
        console.error(
            "Yang fiyat hareketi yüklenirken hata:",
            error
        );
    }
}

document.addEventListener(
    "DOMContentLoaded",
    () => {
        loadYangRatesWithMovement();
    }
);
// =====================================================
// ROYALE2 MARKET - YANG FİYAT HAREKETİ V2
// Tüm sunucularda yükseliş/düşüş görünümünü zorunlu uygular
// =====================================================

function normalizeYangServerName(value) {
    return String(value || "")
        .trim()
        .toLocaleLowerCase("tr-TR")
        .replace(/\s+/g, " ");
}

function getYangServerCard(serverName) {
    const normalizedTarget =
        normalizeYangServerName(serverName);

    const cards =
        Array.from(
            document.querySelectorAll("[data-yang-server]")
        );

    return (
        cards.find((card) => {
            const cardServer =
                normalizeYangServerName(
                    card.dataset.yangServer
                );

            return cardServer === normalizedTarget;
        }) || null
    );
}

function applyYangVisualState(card, direction, shouldFlash = false) {
    if (!card) {
        return;
    }

    const priceElement =
        card.querySelector(".yang-current-price");

    const changeElement =
        card.querySelector(".yang-change");

    card.classList.remove(
        "yang-up",
        "yang-down",
        "yang-neutral",
        "yang-flash-up",
        "yang-flash-down"
    );

    if (priceElement) {
        priceElement.classList.remove(
            "yang-price-up",
            "yang-price-down",
            "yang-price-neutral"
        );
    }

    if (changeElement) {
        changeElement.classList.remove(
            "yang-change-up",
            "yang-change-down",
            "yang-change-neutral"
        );
    }

    if (direction === "up") {
        card.classList.add("yang-up");

        if (priceElement) {
            priceElement.classList.add("yang-price-up");
        }

        if (changeElement) {
            changeElement.classList.add("yang-change-up");
            changeElement.textContent = "YÜKSELİYOR";
        }

        if (shouldFlash) {
            card.classList.add("yang-flash-up");
        }
    } else if (direction === "down") {
        card.classList.add("yang-down");

        if (priceElement) {
            priceElement.classList.add("yang-price-down");
        }

        if (changeElement) {
            changeElement.classList.add("yang-change-down");
            changeElement.textContent = "DÜŞÜYOR";
        }

        if (shouldFlash) {
            card.classList.add("yang-flash-down");
        }
    } else {
        card.classList.add("yang-neutral");

        if (priceElement) {
            priceElement.classList.add("yang-price-neutral");
        }

        if (changeElement) {
            changeElement.classList.add("yang-change-neutral");
            changeElement.textContent = "SABİT";
        }
    }

    if (shouldFlash) {
        window.setTimeout(() => {
            card.classList.remove(
                "yang-flash-up",
                "yang-flash-down"
            );
        }, 1400);
    }
}

const yangVisualPreviousPrices = new Map();

async function syncYangVisualMarket() {
    const rateBoard =
        document.querySelector(".yang-rates-section");

    if (!rateBoard) {
        return;
    }

    try {
        const response = await fetch(
            `${window.SUPABASE_API_URL}yang_rates?select=server,current_price,previous_price,updated_at&order=server.asc`,
            {
                method: "GET",
                headers: {
                    apikey: window.SUPABASE_KEY,
                    Authorization: `Bearer ${window.SUPABASE_KEY}`,
                    Accept: "application/json"
                }
            }
        );

        if (!response.ok) {
            throw new Error(
                `Yang görsel sistemi HTTP ${response.status}`
            );
        }

        const rates = await response.json();

        if (!Array.isArray(rates)) {
            return;
        }

        rates.forEach((rate) => {
            const serverName =
                String(rate.server || "").trim();

            const card =
                getYangServerCard(serverName);

            if (!card) {
                console.warn(
                    "Yang kartı bulunamadı:",
                    serverName
                );
                return;
            }

            const currentPrice =
                Number(rate.current_price);

            const previousPrice =
                Number(rate.previous_price);

            if (!Number.isFinite(currentPrice)) {
                return;
            }

            const oldRenderedPrice =
                yangVisualPreviousPrices.get(
                    normalizeYangServerName(serverName)
                );

            let direction = "neutral";

            if (Number.isFinite(previousPrice)) {
                if (currentPrice > previousPrice) {
                    direction = "up";
                } else if (currentPrice < previousPrice) {
                    direction = "down";
                }
            }

            const shouldFlash =
                Number.isFinite(oldRenderedPrice) &&
                oldRenderedPrice !== currentPrice;

            applyYangVisualState(
                card,
                direction,
                shouldFlash
            );

            yangVisualPreviousPrices.set(
                normalizeYangServerName(serverName),
                currentPrice
            );
        });

    } catch (error) {
        console.error(
            "Yang görsel senkronizasyon hatası:",
            error
        );
    }
}

document.addEventListener(
    "DOMContentLoaded",
    () => {
        syncYangVisualMarket();
    }
);
// =====================================================
// ROYALE2 MARKET - YANG GÖRSEL SİSTEMİ V3
// Mevcut CSS yapısından bağımsız çalışır.
// Tüm sunuculara yükseliş/düşüş oku ve flash efekti verir.
// =====================================================

(function initRoyaleYangVisualV3() {
    const STYLE_ID = "royale-yang-visual-v3-style";

    const lastRenderedPrices = new Map();

    function normalizeServer(value) {
        return String(value || "")
            .trim()
            .toLocaleLowerCase("tr-TR")
            .replace(/\s+/g, " ");
    }

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const style = document.createElement("style");

        style.id = STYLE_ID;

        style.textContent = `
            [data-yang-server] .yang-v3-price-up {
                color: #22c55e !important;
                text-shadow: 0 0 12px rgba(34, 197, 94, 0.28);
            }

            [data-yang-server] .yang-v3-price-down {
                color: #ef4444 !important;
                text-shadow: 0 0 12px rgba(239, 68, 68, 0.28);
            }

            [data-yang-server] .yang-v3-price-neutral {
                color: inherit !important;
                text-shadow: none;
            }

            [data-yang-server] .yang-v3-indicator {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 22px;
                height: 22px;
                margin-left: 7px;
                border-radius: 999px;
                font-size: 14px;
                font-weight: 900;
                line-height: 1;
                vertical-align: middle;
                transition:
                    transform 180ms ease,
                    opacity 180ms ease,
                    background-color 180ms ease,
                    color 180ms ease;
            }

            [data-yang-server] .yang-v3-indicator-up {
                color: #22c55e;
                background: rgba(34, 197, 94, 0.12);
                border: 1px solid rgba(34, 197, 94, 0.30);
            }

            [data-yang-server] .yang-v3-indicator-down {
                color: #ef4444;
                background: rgba(239, 68, 68, 0.12);
                border: 1px solid rgba(239, 68, 68, 0.30);
            }

            [data-yang-server] .yang-v3-indicator-neutral {
                color: #9ca3af;
                background: rgba(156, 163, 175, 0.10);
                border: 1px solid rgba(156, 163, 175, 0.20);
            }

            [data-yang-server].yang-v3-card-up {
                border-color: rgba(34, 197, 94, 0.28) !important;
            }

            [data-yang-server].yang-v3-card-down {
                border-color: rgba(239, 68, 68, 0.28) !important;
            }

            [data-yang-server].yang-v3-flash-up {
                animation: royaleYangFlashUp 1.15s ease;
            }

            [data-yang-server].yang-v3-flash-down {
                animation: royaleYangFlashDown 1.15s ease;
            }

            @keyframes royaleYangFlashUp {
                0% {
                    box-shadow: 0 0 0 rgba(34, 197, 94, 0);
                    transform: translateY(0);
                }

                35% {
                    box-shadow: 0 0 26px rgba(34, 197, 94, 0.34);
                    transform: translateY(-2px);
                }

                100% {
                    box-shadow: 0 0 0 rgba(34, 197, 94, 0);
                    transform: translateY(0);
                }
            }

            @keyframes royaleYangFlashDown {
                0% {
                    box-shadow: 0 0 0 rgba(239, 68, 68, 0);
                    transform: translateY(0);
                }

                35% {
                    box-shadow: 0 0 26px rgba(239, 68, 68, 0.34);
                    transform: translateY(2px);
                }

                100% {
                    box-shadow: 0 0 0 rgba(239, 68, 68, 0);
                    transform: translateY(0);
                }
            }
        `;

        document.head.appendChild(style);
    }

    function getCard(serverName) {
        const target =
            normalizeServer(serverName);

        const cards =
            Array.from(
                document.querySelectorAll(
                    "[data-yang-server]"
                )
            );

        return (
            cards.find((card) => {
                return (
                    normalizeServer(
                        card.dataset.yangServer
                    ) === target
                );
            }) || null
        );
    }

    function getPriceElement(card) {
        if (!card) {
            return null;
        }

        return (
            card.querySelector(".yang-current-price") ||
            card.querySelector(".yang-price") ||
            card.querySelector("[data-yang-price]") ||
            null
        );
    }

    function ensureIndicator(card, priceElement) {
        if (!card || !priceElement) {
            return null;
        }

        let indicator =
            card.querySelector(
                ".yang-v3-indicator"
            );

        if (indicator) {
            return indicator;
        }

        indicator =
            document.createElement("span");

        indicator.className =
            "yang-v3-indicator yang-v3-indicator-neutral";

        indicator.textContent = "•";

        indicator.setAttribute(
            "aria-hidden",
            "true"
        );

        priceElement.insertAdjacentElement(
            "afterend",
            indicator
        );

        return indicator;
    }

    function setVisualState(
        card,
        priceElement,
        indicator,
        direction,
        shouldFlash
    ) {
        if (!card || !priceElement || !indicator) {
            return;
        }

        priceElement.classList.remove(
            "yang-v3-price-up",
            "yang-v3-price-down",
            "yang-v3-price-neutral"
        );

        indicator.classList.remove(
            "yang-v3-indicator-up",
            "yang-v3-indicator-down",
            "yang-v3-indicator-neutral"
        );

        card.classList.remove(
            "yang-v3-card-up",
            "yang-v3-card-down",
            "yang-v3-flash-up",
            "yang-v3-flash-down"
        );

        if (direction === "up") {
            priceElement.classList.add(
                "yang-v3-price-up"
            );

            indicator.classList.add(
                "yang-v3-indicator-up"
            );

            indicator.textContent = "▲";

            indicator.title =
                "Fiyat yükseldi";

            card.classList.add(
                "yang-v3-card-up"
            );

            if (shouldFlash) {
                card.classList.add(
                    "yang-v3-flash-up"
                );
            }
        } else if (direction === "down") {
            priceElement.classList.add(
                "yang-v3-price-down"
            );

            indicator.classList.add(
                "yang-v3-indicator-down"
            );

            indicator.textContent = "▼";

            indicator.title =
                "Fiyat düştü";

            card.classList.add(
                "yang-v3-card-down"
            );

            if (shouldFlash) {
                card.classList.add(
                    "yang-v3-flash-down"
                );
            }
        } else {
            priceElement.classList.add(
                "yang-v3-price-neutral"
            );

            indicator.classList.add(
                "yang-v3-indicator-neutral"
            );

            indicator.textContent = "•";

            indicator.title =
                "Fiyat sabit";
        }

        if (shouldFlash) {
            window.setTimeout(() => {
                card.classList.remove(
                    "yang-v3-flash-up",
                    "yang-v3-flash-down"
                );
            }, 1250);
        }
    }

    async function syncVisuals() {
        const board =
            document.querySelector(
                ".yang-rates-section"
            );

        if (!board) {
            return;
        }

        try {
            const response = await fetch(
                `${window.SUPABASE_API_URL}yang_rates?select=server,current_price,previous_price,updated_at&order=server.asc`,
                {
                    method: "GET",
                    headers: {
                        apikey:
                            window.SUPABASE_KEY,
                        Authorization:
                            `Bearer ${window.SUPABASE_KEY}`,
                        Accept:
                            "application/json"
                    }
                }
            );

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}`
                );
            }

            const rates =
                await response.json();

            if (!Array.isArray(rates)) {
                return;
            }

            rates.forEach((rate) => {
                const serverName =
                    String(
                        rate.server || ""
                    ).trim();

                const currentPrice =
                    Number(
                        rate.current_price
                    );

                const previousPrice =
                    Number(
                        rate.previous_price
                    );

                if (
                    !serverName ||
                    !Number.isFinite(
                        currentPrice
                    )
                ) {
                    return;
                }

                const card =
                    getCard(serverName);

                if (!card) {
                    console.warn(
                        "Yang V3 kart bulunamadı:",
                        serverName
                    );
                    return;
                }

                const priceElement =
                    getPriceElement(card);

                if (!priceElement) {
                    console.warn(
                        "Yang V3 fiyat alanı bulunamadı:",
                        serverName
                    );
                    return;
                }

                const indicator =
                    ensureIndicator(
                        card,
                        priceElement
                    );

                priceElement.textContent =
                    `${currentPrice.toLocaleString(
                        "tr-TR",
                        {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        }
                    )} TL`;

                let direction =
                    "neutral";

                if (
                    Number.isFinite(
                        previousPrice
                    )
                ) {
                    if (
                        currentPrice >
                        previousPrice
                    ) {
                        direction = "up";
                    } else if (
                        currentPrice <
                        previousPrice
                    ) {
                        direction = "down";
                    }
                }

                const stateKey =
                    normalizeServer(
                        serverName
                    );

                const oldPrice =
                    lastRenderedPrices.get(
                        stateKey
                    );

                const shouldFlash =
                    Number.isFinite(
                        oldPrice
                    ) &&
                    oldPrice !==
                        currentPrice;

                setVisualState(
                    card,
                    priceElement,
                    indicator,
                    direction,
                    shouldFlash
                );

                lastRenderedPrices.set(
                    stateKey,
                    currentPrice
                );
            });

        } catch (error) {
            console.error(
                "Yang V3 görsel senkronizasyon hatası:",
                error
            );
        }
    }

    function start() {
        injectStyles();

        syncVisuals();

        window.setInterval(
            syncVisuals,
            30000
        );
    }

    window.addEventListener(
        "load",
        () => {
            window.setTimeout(
                start,
                2200
            );
        }
    );
})();


// ==========================================================
// ROYALE2 MARKET - İLANLARIM YÖNETİM SİSTEMİ
// account.html içindeki mevcut profesyonel paneli kullanır.
// ==========================================================

(function initMyListingsFeature() {

     "use strict";

    // ==========================================================
    // SABİT TANIMLAR
    // ==========================================================

    const SERVER_NAMES = {
        1: "Ephesus",
        2: "Teos",
        3: "Pergamon",
        4: "Akademi Teos"
    };

    const CATEGORY_NAMES = {
        1: "Eşya",
        2: "Yang",
        3: "Karakter",
        4: "Hesap"
    };

    let myListings = [];
    let myListingImages = new Map();

    let selectedMyListingsStatus = "all";
    let myListingsSearchTerm = "";
    let myListingsInitialized = false;


    // ==========================================================
    // GÜVENLİ HTML
    // ==========================================================

    function escapeMyListingsHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    // ==========================================================
    // FİYAT
    // ==========================================================

    function formatMyListingsPrice(value) {
        const price = Number(value);

        if (!Number.isFinite(price)) {
            return "0 TL";
        }

        return (
            price.toLocaleString("tr-TR", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }) + " TL"
        );
    }


    // ==========================================================
    // TARİH
    // ==========================================================

    function formatMyListingsDate(value) {
        if (!value) {
            return "-";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "-";
        }

        return date.toLocaleString("tr-TR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }


    // ==========================================================
    // DURUM
    // ==========================================================

    function normalizeMyListingsStatus(value) {
        return String(value || "")
            .trim()
            .toLowerCase();
    }


    function getMyListingsStatusInfo(value) {
        const status =
            normalizeMyListingsStatus(value);

        if (status === "active") {
            return {
                text: "Aktif",
                className: "active"
            };
        }

        if (status === "sold") {
            return {
                text: "Satıldı",
                className: "sold"
            };
        }

        if (
            status === "inactive" ||
            status === "passive"
        ) {
            return {
                text: "Yayında Değil",
                className: "inactive"
            };
        }

        return {
            text: value || "Bilinmiyor",
            className: "inactive"
        };
    }


    // ==========================================================
    // FİLTRE
    // ==========================================================

    function myListingMatchesStatus(listing) {
        if (selectedMyListingsStatus === "all") {
            return true;
        }

        const listingStatus =
            normalizeMyListingsStatus(
                listing.status
            );

        if (
            selectedMyListingsStatus ===
            "inactive"
        ) {
            return (
                listingStatus === "inactive" ||
                listingStatus === "passive"
            );
        }

        return (
            listingStatus ===
            selectedMyListingsStatus
        );
    }


    function myListingMatchesSearch(listing) {
        if (!myListingsSearchTerm) {
            return true;
        }

        const serverName =
            SERVER_NAMES[
                Number(listing.server_id)
            ] || "";

        const categoryName =
            CATEGORY_NAMES[
                Number(listing.category_id)
            ] || "";

        const searchableText = [
            listing.title,
            listing.description,
            serverName,
            categoryName,
            listing.price
        ]
            .filter(
                value =>
                    value !== null &&
                    value !== undefined
            )
            .join(" ")
            .toLocaleLowerCase("tr-TR");

        return searchableText.includes(
            myListingsSearchTerm
        );
    }


    function getFilteredMyListings() {
        return myListings.filter(
            listing =>
                myListingMatchesStatus(
                    listing
                ) &&
                myListingMatchesSearch(
                    listing
                )
        );
    }


    // ==========================================================
    // SUPABASE - KULLANICININ İLANLARI
    // ==========================================================

    async function fetchAccountMyListings(
        userId
    ) {
        const url =
            `${window.SUPABASE_API_URL}` +
            `listings?user_id=eq.${encodeURIComponent(
                userId
            )}` +
            `&select=*` +
            `&order=created_at.desc`;

        const response =
            await supabaseAuthFetch(url);

        if (!response.ok) {
            const errorText =
                await response.text();

            console.error(
                "İlanlarım sorgu hatası:",
                response.status,
                errorText
            );

            throw new Error(
                "İlanlarınız alınamadı."
            );
        }

        const rows =
            await response.json();

        return Array.isArray(rows)
            ? rows
            : [];
    }


    // ==========================================================
    // SUPABASE - İLAN GÖRSELLERİ
    // ==========================================================

    async function fetchAccountMyListingImages(
        listings
    ) {
        const imageMap = new Map();

        const listingIds = listings
            .map(listing => listing.id)
            .filter(
                id =>
                    id !== null &&
                    id !== undefined
            );

        if (!listingIds.length) {
            return imageMap;
        }

        const encodedIds = listingIds
            .map(id =>
                encodeURIComponent(
                    String(id)
                )
            )
            .join(",");

        const url =
            `${window.SUPABASE_API_URL}` +
            `listing_images?listing_id=in.(${encodedIds})` +
            `&select=listing_id,image_url,sort_order` +
            `&order=sort_order.asc`;

        const response =
            await supabaseAuthFetch(url);

        if (!response.ok) {
            console.warn(
                "İlanlarım görselleri alınamadı:",
                response.status
            );

            return imageMap;
        }

        const rows =
            await response.json();

        if (!Array.isArray(rows)) {
            return imageMap;
        }

        rows.forEach(image => {
            const listingId =
                String(
                    image.listing_id ?? ""
                );

            if (
                listingId &&
                image.image_url &&
                !imageMap.has(listingId)
            ) {
                imageMap.set(
                    listingId,
                    image.image_url
                );
            }
        });

        return imageMap;
    }


    // ==========================================================
    // BOŞ DURUM
    // ==========================================================

    function renderMyListingsEmpty(
        container,
        title,
        description
    ) {
        container.innerHTML = `
            <div class="my-listings-empty">
                <strong>
                    ${escapeMyListingsHtml(title)}
                </strong>

                <span>
                    ${escapeMyListingsHtml(description)}
                </span>
            </div>
        `;
    }


    // ==========================================================
    // İLANLARI EKRANA BAS
    // ==========================================================

    function renderAccountMyListings() {
        const container =
            document.getElementById(
                "my-listings-container"
            );

        if (!container) {
            return;
        }

        const filteredListings =
            getFilteredMyListings();

        if (!filteredListings.length) {
            if (
                myListings.length === 0 &&
                selectedMyListingsStatus ===
                    "all" &&
                !myListingsSearchTerm
            ) {
                renderMyListingsEmpty(
                    container,
                    "Henüz ilanınız yok.",
                    "Yeni bir ilan oluşturarak satışa başlayabilirsiniz."
                );

                return;
            }

            renderMyListingsEmpty(
                container,
                "İlan bulunamadı.",
                "Seçtiğiniz filtre veya arama kriterine uygun ilan bulunmuyor."
            );

            return;
        }

        container.innerHTML =
            filteredListings
                .map(listing => {
                    const serverName =
                        SERVER_NAMES[
                            Number(
                                listing.server_id
                            )
                        ] || "Sunucu";

                    const categoryName =
                        CATEGORY_NAMES[
                            Number(
                                listing.category_id
                            )
                        ] || "Kategori";

                    const statusInfo =
                        getMyListingsStatusInfo(
                            listing.status
                        );

                    const title =
                        escapeMyListingsHtml(
                            listing.title ||
                                "İlan"
                        );

                    const imageUrl =
                        myListingImages.get(
                            String(listing.id)
                        ) || "";

                    const safeImageUrl =
                        escapeMyListingsHtml(
                            imageUrl
                        );

                    const safeServerName =
                        escapeMyListingsHtml(
                            serverName
                        );

                    const safeCategoryName =
                        escapeMyListingsHtml(
                            categoryName
                        );

                    const safeStatusText =
                        escapeMyListingsHtml(
                            statusInfo.text
                        );

                    const safeStatusClass =
                        escapeMyListingsHtml(
                            statusInfo.className
                        );

                    const safePrice =
                        escapeMyListingsHtml(
                            formatMyListingsPrice(
                                listing.price
                            )
                        );

                    const safeDate =
                        escapeMyListingsHtml(
                            formatMyListingsDate(
                                listing.created_at
                            )
                        );

                    const detailUrl =
                        `listing.html?id=${encodeURIComponent(
                            listing.id
                        )}`;

                    return `
                        <article class="my-listing-item">

                            <div class="my-listing-image">

                                ${
                                    safeImageUrl
                                        ? `
                                            <img
                                                src="${safeImageUrl}"
                                                alt="${title}"
                                                loading="lazy"
                                            >
                                        `
                                        : `
                                            <div class="my-listing-no-image">
                                                Görsel Yok
                                            </div>
                                        `
                                }

                            </div>

                            <div class="my-listing-info">

                                <div class="my-listing-top">

                                    <div class="my-listing-tags">

                                        <span class="my-listing-server">
                                            ${safeServerName}
                                        </span>

                                        <span class="my-listing-category">
                                            ${safeCategoryName}
                                        </span>

                                    </div>

                                    <span
                                        class="my-listing-status ${safeStatusClass}"
                                    >
                                        ${safeStatusText}
                                    </span>

                                </div>

                                <h3 class="my-listing-title">
                                    ${title}
                                </h3>

                                <div class="my-listing-meta">
                                    <span>
                                        ${safeDate}
                                    </span>
                                </div>

                                <div class="my-listing-bottom">

                                    <strong class="my-listing-price">
                                        ${safePrice}
                                    </strong>

                                    <a
                                        class="my-listing-view"
                                        href="${detailUrl}"
                                    >
                                        İlanı Gör
                                    </a>

                                </div>

                            </div>

                        </article>
                    `;
                })
                .join("");
    }


    // ==========================================================
    // FİLTRE BUTONLARI
    // ==========================================================

    function setActiveMyListingsFilter(
        activeButton
    ) {
        document
            .querySelectorAll(
                ".my-listings-filter"
            )
            .forEach(button => {
                button.classList.remove(
                    "active"
                );
            });

        activeButton.classList.add(
            "active"
        );
    }


    function initializeMyListingsFilters() {
        const filterButtons =
            document.querySelectorAll(
                ".my-listings-filter"
            );

        filterButtons.forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    selectedMyListingsStatus =
                        button.dataset.status ||
                        "all";

                    setActiveMyListingsFilter(
                        button
                    );

                    renderAccountMyListings();
                }
            );
        });


        const searchInput =
            document.getElementById(
                "my-listings-search"
            );

        if (searchInput) {
            searchInput.addEventListener(
                "input",
                () => {
                    myListingsSearchTerm =
                        searchInput.value
                            .trim()
                            .toLocaleLowerCase(
                                "tr-TR"
                            );

                    renderAccountMyListings();
                }
            );
        }
    }


    // ==========================================================
    // İLANLARI YÜKLE
    // ==========================================================

    async function loadAccountMyListings() {
        const container =
            document.getElementById(
                "my-listings-container"
            );

        if (!container) {
            return;
        }

        const storedUser =
            getStoredUser();

        if (!storedUser?.id) {
            renderMyListingsEmpty(
                container,
                "Oturum bulunamadı.",
                "İlanlarınızı görüntülemek için giriş yapmalısınız."
            );

            return;
        }

        container.innerHTML = `
            <div class="my-listings-loading">
                İlanların yükleniyor...
            </div>
        `;

        try {
            myListings =
                await fetchAccountMyListings(
                    storedUser.id
                );

            myListingImages =
                await fetchAccountMyListingImages(
                    myListings
                );

            renderAccountMyListings();

        } catch (error) {
            console.error(
                "İlanlarım yükleme hatası:",
                error
            );

            renderMyListingsEmpty(
                container,
                "İlanlar yüklenemedi.",
                error?.message ||
                    "Lütfen tekrar deneyin."
            );
        }
    }


    // ==========================================================
    // #my-listings HASH GEÇİŞİ
    // ==========================================================

    function focusAccountMyListings() {
        if (
            window.location.hash !==
            "#my-listings"
        ) {
            return;
        }

        const section =
            document.getElementById(
                "my-listings"
            );

        if (!section) {
            return;
        }

        window.setTimeout(
            () => {
                section.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            },
            100
        );
    }


    // ==========================================================
    // BAŞLAT
    // ==========================================================

    function initializeAccountMyListings() {
        const container =
            document.getElementById(
                "my-listings-container"
            );

        if (!container) {
            return;
        }

        if (!myListingsInitialized) {
            myListingsInitialized = true;

            initializeMyListingsFilters();
            loadAccountMyListings();
        }

        focusAccountMyListings();
    }


    document.addEventListener(
        "DOMContentLoaded",
        initializeAccountMyListings
    );


    window.addEventListener(
        "hashchange",
        focusAccountMyListings
    );

})();


// ==========================================================
// HESAP SAYFASI - ÖZEL GÖRÜNÜM YÖNETİMİ
// ==========================================================

(function initAccountViewManager() {
  "use strict";

  function updateAccountView() {
    const overviewView = document.getElementById("account-overview-view");
    const listingsView = document.getElementById("account-listings-view");

    if (!overviewView || !listingsView) {
      return;
    }

    const isMyListings = window.location.hash === "#my-listings";

    if (isMyListings) {
      overviewView.style.display = "none";
      listingsView.style.display = "block";

      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant"
      });
    } else {
      listingsView.style.display = "none";
      overviewView.style.display = "block";
    }
  }

  document.addEventListener("DOMContentLoaded", updateAccountView);

  window.addEventListener("hashchange", function () {
    updateAccountView();
  });

  window.addEventListener("load", updateAccountView);
})();


// ======================================================
// ROYALE2 MARKET - GLOBAL REKLAM ALANLARI
// Üst 728x90 + Sol/Sağ 200x760
// Tüm sayfalarda otomatik oluşturulur.
// ======================================================

(function initGlobalAdAreas() {
  "use strict";

  function createGlobalAds() {
    if (!document.body) return;

    // --------------------------------------------------
    // SOL REKLAM
    // --------------------------------------------------
    let leftAd = document.querySelector(".side-ad-left");

    if (!leftAd) {
      leftAd = document.createElement("div");
      leftAd.className = "side-ad side-ad-left global-ad-area";

leftAd.innerHTML = `
  <span>REKLAM</span>
  <strong>YAN REKLAM</strong>
  <small>Sol Reklam Alanı</small>
`;

      document.body.appendChild(leftAd);
    }

    // --------------------------------------------------
    // SAĞ REKLAM
    // --------------------------------------------------
    let rightAd = document.querySelector(".side-ad-right");

    if (!rightAd) {
      rightAd = document.createElement("div");
      rightAd.className = "side-ad side-ad-right global-ad-area";

rightAd.innerHTML = `
  <span>REKLAM</span>
  <strong>YAN REKLAM</strong>
  <small>Sağ Reklam Alanı</small>
`;

      document.body.appendChild(rightAd);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createGlobalAds);
  } else {
    createGlobalAds();
  }
})();


/* =========================================================
   ROYALE2 MARKET - SSS ARAMA SİSTEMİ
========================================================= */

(function () {
    "use strict";

    function initFaqSearch() {
        const searchInput = document.getElementById("faq-search-input");
        const faqItems = document.querySelectorAll(".faq-item");

        if (!searchInput || !faqItems.length) return;

        searchInput.addEventListener("input", function () {
            const searchText = this.value
                .toLocaleLowerCase("tr-TR")
                .trim();

            faqItems.forEach(function (item) {
                const itemText = item.textContent
                    .toLocaleLowerCase("tr-TR");

                if (!searchText || itemText.includes(searchText)) {
                    item.style.display = "";
                } else {
                    item.style.display = "none";
                    item.removeAttribute("open");
                }
            });
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initFaqSearch);
    } else {
        initFaqSearch();
    }
})();
