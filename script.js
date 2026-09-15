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

    alert(
      "Giriş başarılı!"
    );

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

  const loginLink =
    document.querySelector(
      ".login"
    );


  const user =
    getStoredUser();


  if (!loginLink) {
    return;
  }


  if (!user) {

    loginLink.textContent =
      "Giriş Yap";

    loginLink.href =
      "#login";

    return;
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
            <a href="account.html">
              Hesabım
            </a>

            <a href="#my-listings">
              İlanlarım
            </a>

            <a href="#favorites">
              Favorilerim
            </a>

            <button
              type="button"
              id="logout-button"
            >
              Çıkış Yap
            </button>
          `;


          userLink
            .parentElement
            .appendChild(menu);


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

let selectedServer =
  "Tümü";


const grid =
  document.getElementById(
    "listings"
  );


const category =
  document.getElementById(
    "category"
  );


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
        `${window.SUPABASE_API_URL}listings?select=*`,
        {
          headers: {
            "apikey":
              window.SUPABASE_KEY
          }
        }
      );


    if (!response.ok) {

      throw new Error(
        `Supabase hatası: ${response.status}`
      );
    }


    listings =
      await response.json();


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


function renderListings() {

  if (!grid) {
    return;
  }


  const cat =
    category?.value ||
    "Tümü";


  const data =
    listings.filter(
      item =>

        (
          selectedServer ===
            "Tümü" ||

          item.server ===
            selectedServer
        )

        &&

        (
          cat === "Tümü" ||

          item.cat === cat
        )
    );


  grid.innerHTML =

    data.map(
      item => `
        <article class="listing">

          <div class="listing-top">

            <span class="server-tag">
              ${
                item.server
                  ?.toUpperCase() ||
                ""
              }
            </span>

            <span class="cat">
              ${
                item.cat || ""
              }
            </span>

          </div>


          <h3>
            ${
              item.title || ""
            }
          </h3>


          <p>
            ${
              item.desc || ""
            }
          </p>


          <div class="listing-bottom">

            <div class="price">

              ${
                item.price || ""
              }

              <small>
                TL
              </small>

            </div>


            <a
              class="view"
              href="listing.html?id=${encodeURIComponent(
                item.id
              )}"
            >
              İLANI GÖR →
            </a>

          </div>

        </article>
      `
    ).join("")

    ||

    `
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
}


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
            button.dataset.server;


          renderListings();
        }
      );
    }
  );


if (category) {

  category.addEventListener(
    "change",
    renderListings
  );
}


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
            card.dataset.serverCard;


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


loadListings();


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
// İLAN GÖRSEL YÜKLEME
// ==========================================================

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


        if (
          selectedImages.length
        ) {

          if (message) {

            message.textContent =
              "İlan görselleri yükleniyor...";
          }


          await uploadListingImages(
            selectedImages,
            createdListing.id,
            storedUser.id
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


    if (
      listingImages.length &&
      listingImages[0].image_url
    ) {

      if (mainImage) {

        mainImage.src =
          listingImages[0]
            .image_url;


        mainImage.style.display =
          "block";
      }


      if (
        imagePlaceholder
      ) {

        imagePlaceholder
          .style
          .display =
          "none";
      }


    } else {

      if (mainImage) {

        mainImage.style.display =
          "none";
      }


      if (
        imagePlaceholder
      ) {

        imagePlaceholder
          .style
          .display =
          "flex";
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
  } else {
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


      const small =
        document.createElement(
          "small"
        );


      small.textContent =
        new Date(
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
        small
      );


      item.addEventListener(
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


    if (
      !messagesResponse.ok
    ) {

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
const readResponse = await supabaseAuthFetch(
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
}
// Bu konuşma için anlık mesaj dinlemeyi başlat
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
