window.SUPABASE_API_URL = "https://rmhupvzeksnqfxdrgmos.supabase.co/rest/v1/";
window.SUPABASE_KEY = "sb_publishable_alxS7cZ43l46SS1-QyGhYQ_I7O0HNKq";
async function registerUser({ username, displayName, phone, email, password }) {
  const supabaseBaseUrl = window.SUPABASE_API_URL.replace("/rest/v1/", "");

  const response = await fetch(`${supabaseBaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": window.SUPABASE_KEY
    },
    body: JSON.stringify({
      email: email,
      password: password,
      data: {
        username: username,
        display_name: displayName,
        phone: phone
      }
    })
  });

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
      `${SUPABASE_API_URL}listings?select=*`,
      {
        headers: {
          apikey: SUPABASE_KEY
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase hatası: ${response.status}`);
    }

    listings = await response.json();

    render();

  } catch (error) {
    console.error(error);

    grid.innerHTML = `
      <div class="listing">
        <h3>İlanlar yüklenemedi</h3>
        <p>Veritabanı bağlantısı kontrol ediliyor.</p>
      </div>
    `;
  }
}

function render() {
  const cat = category.value;

  const data = listings.filter(x =>
    (selectedServer === "Tümü" || x.server === selectedServer) &&
    (cat === "Tümü" || x.cat === cat)
  );

  grid.innerHTML = data.map(x => `
    <article class="listing">
      <div class="listing-top">
        <span class="server-tag">${x.server?.toUpperCase() || ""}</span>
        <span class="cat">${x.cat || ""}</span>
      </div>

      <h3>${x.title || ""}</h3>
      <p>${x.desc || ""}</p>

      <div class="listing-bottom">
        <div class="price">
          ${x.price || ""}
          <small>TL</small>
        </div>

        <a class="view" href="listing.html?id=${x.id}">İLANI GÖR →</a>
      </div>
    </article>
  `).join("") || `
    <div class="listing">
      <h3>İlan bulunamadı</h3>
      <p>Filtreleri değiştirerek tekrar deneyebilirsin.</p>
    </div>
  `;
}

document.querySelectorAll(".filter").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach(b =>
      b.classList.remove("active")
    );

    btn.classList.add("active");
    selectedServer = btn.dataset.server;
    render();
  });
});

if (category) {
    category.addEventListener("change", render);
}

document.querySelectorAll("[data-server-card]").forEach(card => {
  card.addEventListener("click", () => {
    selectedServer = card.dataset.serverCard;

    document.querySelectorAll(".filter").forEach(b =>
      b.classList.toggle(
        "active",
        b.dataset.server === selectedServer
      )
    );

    document.getElementById("market").scrollIntoView({
      behavior: "smooth"
    });

    render();
  });
});

loadListings();
// ===============================
// SUPABASE GİRİŞ SİSTEMİ
// ===============================

async function loginUser(email, password) {
    try {
        const response = await fetch(
            `${SUPABASE_API_URL.replace('/rest/v1/', '')}/auth/v1/token?grant_type=password`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "apikey": SUPABASE_KEY
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            alert("Giriş başarısız: " + (data.error_description || data.msg || "E-posta veya şifre hatalı."));
            return;
        }

        localStorage.setItem("royale2_access_token", data.access_token);
        localStorage.setItem("royale2_refresh_token", data.refresh_token);
        localStorage.setItem("royale2_user", JSON.stringify(data.user));

        alert("Giriş başarılı!");

        window.location.hash = "";
        window.location.reload();

    } catch (error) {
        console.error("Giriş hatası:", error);
        alert("Giriş sırasında bir hata oluştu.");
 }
async function registerUser(username, displayName, phone, email, password) {
    try {
        const response = await fetch(
            `${SUPABASE_API_URL.replace('/rest/v1/', '/') }auth/v1/signup`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "apikey": SUPABASE_KEY
                },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    data: {
                        username: username,
                        display_name: displayName,
                        phone: phone
                    }
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error_description ||
                data.msg ||
                data.message ||
                "Kayıt oluşturulamadı."
            );
        }

        return data;

    } catch (error) {
        console.error("Kayıt hatası:", error);
        throw error;
    }
}

 
}// ===============================
// OTURUM / KULLANICI MENÜSÜ
// ===============================

async function updateUserMenu() {
  const loginLink = document.querySelector('.login');
  const savedUser = localStorage.getItem('royale2_user');
  const accessToken = localStorage.getItem('royale2_access_token');

  if (!loginLink) return;

  if (!savedUser || !accessToken) {
    loginLink.textContent = 'Giriş Yap';
    loginLink.href = '#login';
    return;
  }

  try {
    const user = JSON.parse(savedUser);

    const response = await fetch(
      `${SUPABASE_API_URL}profiles?id=eq.${user.id}&select=username,display_name`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    const profiles = await response.json();

    const profile = profiles?.[0];

    const username =
      profile?.username ||
      profile?.display_name ||
      user.email?.split('@')[0] ||
      'Hesabım';

    loginLink.textContent = username;
    loginLink.href = '#';
    loginLink.id = 'user-menu-link';

  } catch (error) {
    console.error('Profil bilgisi alınamadı:', error);
  }
}

function logoutUser() {
  localStorage.removeItem('royale2_access_token');
  localStorage.removeItem('royale2_refresh_token');
  localStorage.removeItem('royale2_user');

  window.location.reload();
}

document.addEventListener('DOMContentLoaded', () => {
  updateUserMenu();

  document.addEventListener('click', (e) => {
    const userLink = document.getElementById('user-menu-link');
    const existingMenu = document.getElementById('user-dropdown');

    if (e.target.id === 'user-menu-link') {
      e.preventDefault();

      if (existingMenu) {
        existingMenu.remove();
        return;
      }

      const menu = document.createElement('div');
      menu.id = 'user-dropdown';
      menu.innerHTML = `
        <a href="account.html">Hesabım</a>
        <a href="#my-listings">İlanlarım</a>
        <a href="#favorites">Favorilerim</a>
        <button type="button" id="logout-button">Çıkış Yap</button>
      `;

      userLink.parentElement.appendChild(menu);
      return;
    }

    if (e.target.id === 'logout-button') {
      logoutUser();
      return;
    }

    if (
      existingMenu &&
      !existingMenu.contains(e.target) &&
      e.target.id !== 'user-menu-link'
    ) {
      existingMenu.remove();
    }
  });
});


document.addEventListener("DOMContentLoaded", () => {
    const registerButton = document.getElementById("register-button");

    if (!registerButton) return;

    registerButton.addEventListener("click", async () => {
        const username = document.getElementById("register-username").value.trim();
        const displayName = document.getElementById("register-display-name").value.trim();
        const phone = document.getElementById("register-phone").value.trim();
        const email = document.getElementById("register-email").value.trim();
        const password = document.getElementById("register-password").value;
        const passwordConfirm = document.getElementById("register-password-confirm").value;
        const termsAccepted = document.getElementById("register-terms").checked;
        const message = document.getElementById("register-message");

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
            message.textContent = "Kullanıcı adı 3-20 karakter olmalı ve sadece harf, rakam veya alt çizgi içermelidir.";
            return;
        }

        if (username.startsWith("_") || username.endsWith("_") || username.includes("__")) {
            message.textContent = "Kullanıcı adı alt çizgi ile başlayamaz, bitemez veya çift alt çizgi içeremez.";
            return;
        }

        if (reservedUsernames.includes(username.toLowerCase())) {
            message.textContent = "Bu kullanıcı adı kullanılamaz.";
            return;
        }

        if (!displayName) {
            message.textContent = "Lütfen adınızı ve soyadınızı girin.";
            return;
        }

        if (!/^05\d{9}$/.test(phone)) {
            message.textContent = "Telefon numarası 05XXXXXXXXX formatında 11 haneli olmalıdır.";
            return;
        }

        if (!email) {
            message.textContent = "Lütfen e-posta adresinizi girin.";
            return;
        }

        if (password.length < 8) {
            message.textContent = "Şifre en az 8 karakter olmalıdır.";
            return;
        }

        if (password !== passwordConfirm) {
            message.textContent = "Şifreler eşleşmiyor.";
            return;
        }

        if (!termsAccepted) {
            message.textContent = "Kullanım koşullarını ve gizlilik politikasını kabul etmelisiniz.";
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

message.textContent = "Hesabınız başarıyla oluşturuldu. Giriş yapılıyor...";

const loginData = await loginUser(email, password);

localStorage.setItem("royale2_access_token", loginData.access_token);
localStorage.setItem("royale2_refresh_token", loginData.refresh_token);
localStorage.setItem("royale2_user", JSON.stringify(loginData.user));

window.location.href = "/";
return;

        } catch (error) {
            const errorText = String(error?.message || error || "");

            if (
                errorText.includes("already registered") ||
                errorText.includes("User already registered")
            ) {
                message.textContent = "Bu e-posta adresi zaten kayıtlı.";
            } else if (
                errorText.includes("duplicate key value") ||
                errorText.includes("profiles_username_unique_ci")
            ) {
                message.textContent = "Bu kullanıcı adı zaten kullanılıyor.";
            } else {
                message.textContent = "Hesap oluşturulurken bir hata oluştu.";
            }

            console.error(error);
        } finally {
            registerButton.disabled = false;
            registerButton.textContent = "Hesap Oluştur";
        }
    });
});

/* =========================================================
   İLAN OLUŞTURMA SİSTEMİ
   ========================================================= */

(function initCreateListingPage() {
    const createListingForm = document.getElementById("createListingForm");

    // Bu kod sadece create-listing.html sayfasında çalışır.
    if (!createListingForm) return;

    const accessToken = localStorage.getItem("royale2_access_token");
    const userData = localStorage.getItem("royale2_user");

    // Giriş yapılmamışsa ilan oluşturulamaz.
    if (!accessToken || !userData) {
        alert("İlan verebilmek için hesabınıza giriş yapmanız gerekiyor.");
        window.location.href = "/";
        return;
    }

    console.log("İlan oluşturma sayfası: kullanıcı oturumu bulundu.");
})();
/* =========================================================
   HESAP SAYFASI - KULLANICI ADI SENKRONİZASYONU
   ========================================================= */

(function syncAccountUsername() {
    const sidebarUsername = document.getElementById("sidebar-username");

    if (!sidebarUsername) return;

    try {
        const storedUser = JSON.parse(
            localStorage.getItem("royale2_user") || "{}"
        );

        const username =
            storedUser?.user_metadata?.username ||
            storedUser?.username ||
            "Kullanıcı";

        sidebarUsername.textContent = username;
    } catch (error) {
        console.error("Kullanıcı adı yüklenemedi:", error);
        sidebarUsername.textContent = "Kullanıcı";
    }
})();


/* ==================================================
   İLAN FORMU - GERÇEK KAYIT SİSTEMİ
================================================== */

async function createListingInDatabase(listingData, accessToken) {

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
async function uploadListingImages(files, listingId, userId, accessToken) {
    if (!files || files.length === 0) return [];

    const supabaseBaseUrl = window.SUPABASE_API_URL.replace("/rest/v1/", "");
    const uploadedImages = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Güvenlik kontrolleri
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

        if (!allowedTypes.includes(file.type)) {
            throw new Error("Sadece JPG, PNG veya WEBP görseller yüklenebilir.");
        }

        if (file.size > 5 * 1024 * 1024) {
            throw new Error("Her görsel en fazla 5 MB olabilir.");
        }

        const extension = file.name.split(".").pop().toLowerCase();
        const fileName =
            `${userId}/${listingId}/${Date.now()}-${i}.${extension}`;

        // Görseli Storage'a yükle
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
            const errorText = await uploadResponse.text();
            console.error("Görsel yükleme hatası:", errorText);
            throw new Error("Görsel yüklenemedi.");
        }

        // Public görsel adresi
        const imageUrl =
            `${supabaseBaseUrl}/storage/v1/object/public/listing-images/${fileName}`;

        // listing_images tablosuna kaydet
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
            const errorData = await databaseResponse.text();
            console.error("Görsel kayıt hatası:", errorData);
            throw new Error("Görsel bilgisi kaydedilemedi.");
        }

        uploadedImages.push(imageUrl);
    }

    return uploadedImages;
}



/* ==================================================
   İLAN FORMU - FORM VERİLERİNİ TOPLA VE KAYDET
================================================== */

(function initListingSubmit() {

    const form = document.getElementById("createListingForm");

    // Sadece ilan oluşturma sayfasında çalışır
    if (!form) return;

    form.addEventListener("submit", async function (event) {

        event.preventDefault();

        const accessToken = localStorage.getItem("royale2_access_token");

        let storedUser = {};

        try {
            storedUser = JSON.parse(
                localStorage.getItem("royale2_user") || "{}"
            );
        } catch (error) {
            console.error("Kullanıcı bilgisi okunamadı:", error);
        }

        // Kullanıcı kontrolü
        if (!accessToken || !storedUser.id) {
            alert("İlan verebilmek için hesabınıza giriş yapmanız gerekiyor.");
            window.location.href = "/";
            return;
        }

        // Seçilen sunucu ve kategori
        const selectedServer = form.querySelector(
            'input[name="server"]:checked'
        );

        const selectedCategory = form.querySelector(
            'input[name="category"]:checked'
        );

        // İlan alanları
        const title = document.getElementById("listingTitle");
        const description = document.getElementById("listingDescription");
        const price = document.getElementById("listingPrice");

        const message = document.getElementById("listingFormMessage");
        const publishButton = document.getElementById("publishListingButton");

        // Eksik seçim kontrolü
        if (!selectedServer) {
            alert("Lütfen bir sunucu seçin.");
            return;
        }

        if (!selectedCategory) {
            alert("Lütfen bir kategori seçin.");
            return;
        }

        if (!title || !title.value.trim()) {
            alert("Lütfen ilan başlığını girin.");
            return;
        }

        if (!price || Number(price.value) <= 0) {
            alert("Lütfen geçerli bir satış fiyatı girin.");
            return;
        }

        const listingData = {
            user_id: storedUser.id,
            server_id: Number(selectedServer.value),
            category_id: Number(selectedCategory.value),
            title: title.value.trim(),
            description: description ? description.value.trim() : null,
            price: Number(price.value),
            currency: "TRY",
            status: "active"
        };

        try {

            if (publishButton) {
                publishButton.disabled = true;
                publishButton.textContent = "İlan Yayınlanıyor...";
            }

            if (message) {
                message.textContent = "İlanınız oluşturuluyor...";
            }

            const createdListing = await createListingInDatabase(
                listingData,
                accessToken
            );

            console.log("İlan başarıyla oluşturuldu:", createdListing);
          const listingImagesInput = document.getElementById("listingImages");
const selectedImages = listingImagesInput
    ? Array.from(listingImagesInput.files)
    : [];

console.log("Seçilen ilan görselleri:", selectedImages);
if (selectedImages.length > 0) {
    if (message) {
        message.textContent = "İlan görselleri yükleniyor...";
    }

    await uploadListingImages(
        selectedImages,
        createdListing.id,
        storedUser.id,
        accessToken
    );
}
          
            if (message) {
                message.textContent = "İlanınız başarıyla yayınlandı.";
            }

            alert("İlanınız başarıyla yayınlandı!");
window.location.href = `/listing?id=${createdListing.id}`;
return;
          
        } catch (error) {

            console.error("İlan yayınlama hatası:", error);

            if (message) {
                message.textContent =
                    error.message || "İlan yayınlanırken bir hata oluştu.";
            }

            alert(
                "İlan yayınlanamadı: " +
                (error.message || "Bilinmeyen hata")
            );

        } finally {

            if (publishButton) {
                publishButton.disabled = false;
                publishButton.textContent = "İlanı Yayınla";
            }

        }

    });

})();


/* ==================================================
   İLAN DETAY SAYFASI
================================================== */

(async function initListingDetailPage() {

    const detailContainer = document.getElementById("listingDetail");

    // Bu kod sadece listing.html sayfasında çalışır.
    if (!detailContainer) return;

    const loading = document.getElementById("listingLoading");
    const errorBox = document.getElementById("listingError");

    try {

        // URL'den ilan ID'sini al
        const params = new URLSearchParams(window.location.search);
        const listingId = params.get("id");

        if (!listingId) {
            throw new Error("İlan ID bulunamadı.");
        }

        // Supabase'den ilanı getir
        const response = await fetch(
            `${window.SUPABASE_API_URL}listings?id=eq.${encodeURIComponent(listingId)}&select=*`,
            {
                headers: {
                    "apikey": window.SUPABASE_KEY
                }
            }
        );

        if (!response.ok) {
            throw new Error("İlan bilgileri alınamadı.");
        }

        const listings = await response.json();

        if (!listings || listings.length === 0) {
            throw new Error("İlan bulunamadı.");
        }

        const listing = listings[0];
// İlan sahibinin kullanıcı adını getir
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
    const profiles = await profileResponse.json();

    if (profiles && profiles.length > 0 && profiles[0].username) {
      sellerUsername = profiles[0].username;
    }
  }
} catch (profileError) {
  console.error("Satıcı bilgisi alınamadı:", profileError);
}
      
// İlana ait görselleri getir
const imagesResponse = await fetch(
    `${window.SUPABASE_API_URL}listing_images?listing_id=eq.${encodeURIComponent(listingId)}&select=*&order=sort_order.asc`,
    {
        headers: {
            "apikey": window.SUPABASE_KEY
        }
    }
);

if (!imagesResponse.ok) {
    throw new Error("İlan görselleri alınamadı.");
}

const listingImages = await imagesResponse.json();

console.log("İlan görselleri:", listingImages);
// İlanın ana görselini göster
const mainImage = document.getElementById("listingMainImage");
const imagePlaceholder = document.getElementById("listingImagePlaceholder");

if (listingImages.length > 0 && listingImages[0].image_url) {
    if (mainImage) {
        mainImage.src = listingImages[0].image_url;
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
      
      
      // Sunucu isimleri
        const serverNames = {
            1: "Ephesus",
            2: "Teos",
            3: "Pergamon",
            4: "Akademi Teos"
        };

        // Kategori isimleri
        const categoryNames = {
            1: "Item",
            2: "Yang",
            3: "Karakter",
            4: "Hesap"
        };

        // Bilgileri ekrana yaz
      const sellerElement = document.getElementById("listingSeller");

if (sellerElement) {
    sellerElement.textContent = sellerUsername;
}
        document.getElementById("listingServer").textContent =
            serverNames[listing.server_id] || "Sunucu";

        document.getElementById("listingCategory").textContent =
            categoryNames[listing.category_id] || "Kategori";

        document.getElementById("listingDetailTitle").textContent =
            listing.title || "İlan";

        document.getElementById("listingDetailDescription").textContent =
            listing.description || "Açıklama belirtilmemiş.";

        document.getElementById("listingDetailPrice").textContent =
            Number(listing.price).toLocaleString("tr-TR") + " ₺";

        // Sayfa başlığını değiştir
        document.title =
            (listing.title || "İlan") + " | Royale2 Market";

        // Yükleniyor yazısını kapat
        if (loading) loading.style.display = "none";

        // İlanı göster
        detailContainer.style.display = "";
// Satıcıyla İletişime Geç butonu
const contactSellerButton = document.getElementById("contactSellerButton");

if (contactSellerButton) {
  contactSellerButton.addEventListener("click", async () => {

    try {
      // Giriş yapan kullanıcıyı kontrol et
      const accessToken = localStorage.getItem("royale2_access_token");

      if (!accessToken) {
        alert("Mesaj gönderebilmek için giriş yapmalısınız.");
        window.location.href = "account.html";
        return;
      }

const currentUser = JSON.parse(
  localStorage.getItem("royale2_user") || "null"
);

const currentUserId = currentUser?.id;

      if (!currentUserId) {
        alert("Kullanıcı bilgisi alınamadı. Lütfen tekrar giriş yapın.");
        return;
      }

      // Kendi ilanına mesaj gönderemez
      if (currentUserId === listing.user_id) {
        alert("Kendi ilanınıza mesaj gönderemezsiniz.");
        return;
      }

      alert("Mesajlaşma sistemi çalışıyor!");

    } catch (error) {
      console.error("İletişim butonu hatası:", error);
      alert("Bir hata oluştu.");
    }

  });
}
        const descriptionSection =
            document.getElementById("listingDescriptionSection");

        const securitySection =
            document.getElementById("listingSecuritySection");

        if (descriptionSection) {
            descriptionSection.style.display = "";
        }

        if (securitySection) {
            securitySection.style.display = "";
        }

    } catch (error) {

        console.error("İlan detay hatası:", error);

        if (loading) {
            loading.style.display = "none";
        }

        if (errorBox) {
            errorBox.style.display = "";
            errorBox.textContent =
                error.message || "İlan bulunamadı.";
        }
    }

})();

//initListingDetailPage();

// ==========================================
// SATICIYLA İLETİŞİME GEÇ
// ==========================================

async function initContactSellerButton() {
  const contactButton = document.getElementById("contactSellerButton");

  // Bu buton sadece listing.html sayfasında var
  if (!contactButton) return;

  contactButton.addEventListener("click", async () => {
    try {
      // Giriş yapan kullanıcıyı al
      const accessToken = localStorage.getItem("royale2_access_token");
      const userData = localStorage.getItem("royale2_user");

      if (!accessToken || !userData) {
        alert("Satıcıyla iletişime geçmek için giriş yapmalısınız.");
        window.location.href = "account.html";
        return;
      }

      const currentUser = JSON.parse(userData);

      // URL'den ilan ID'sini al
      const params = new URLSearchParams(window.location.search);
      const listingId = params.get("id");

      if (!listingId) {
        alert("İlan bilgisi bulunamadı.");
        return;
      }

      // İlanı getir ve satıcı ID'sini öğren
      const listingResponse = await fetch(
        `${window.SUPABASE_API_URL}listings?id=eq.${encodeURIComponent(listingId)}&select=id,user_id`,
        {
          headers: {
            "apikey": window.SUPABASE_KEY,
            "Authorization": `Bearer ${accessToken}`
          }
        }
      );

      if (!listingResponse.ok) {
        throw new Error("İlan bilgisi alınamadı.");
      }

      const listings = await listingResponse.json();

      if (!listings.length) {
        throw new Error("İlan bulunamadı.");
      }

      const sellerId = listings[0].user_id;
      const buyerId = currentUser.id;

      if (buyerId === sellerId) {
        alert("Kendi ilanınız için kendinizle mesajlaşamazsınız.");
        return;
      }

      // Daha önce bu ilan için konuşma var mı?
      const conversationResponse = await fetch(
        `${window.SUPABASE_API_URL}conversations?listing_id=eq.${listingId}&buyer_id=eq.${buyerId}&seller_id=eq.${sellerId}&select=id`,
        {
          headers: {
            "apikey": window.SUPABASE_KEY,
            "Authorization": `Bearer ${accessToken}`
          }
        }
      );

      if (!conversationResponse.ok) {
        throw new Error("Konuşma bilgisi alınamadı.");
      }

      const conversations = await conversationResponse.json();
      let conversationId;

      if (conversations.length > 0) {

        // Mevcut konuşmayı kullan
        conversationId = conversations[0].id;

      } else {

        // Yeni konuşma oluştur
        const createResponse = await fetch(
          `${window.SUPABASE_API_URL}conversations`,
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
              buyer_id: buyerId,
              seller_id: sellerId
            })
          }
        );

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          throw new Error(errorText);
        }

        const createdConversation = await createResponse.json();
        conversationId = createdConversation[0].id;
      }

      // Mesajlaşma sayfasına gönder
      window.location.href =
        `messages.html?conversation=${encodeURIComponent(conversationId)}`;

    } catch (error) {
      console.error("Mesajlaşma başlatma hatası:", error);
      alert("Mesajlaşma başlatılamadı. Lütfen tekrar deneyin.");
    }
  });
}

initContactSellerButton();
// ==========================================
// MESAJLAR SAYFASI
// ==========================================

async function initMessagesPage() {
  const conversationList = document.getElementById("conversationList");

  // messages.html sayfasında değilsek çalışmasın
  if (!conversationList) return;

  const accessToken = localStorage.getItem("royale2_access_token");
  const userData = localStorage.getItem("royale2_user");

  if (!accessToken || !userData) {
    alert("Mesajları görüntülemek için giriş yapmalısınız.");
    window.location.href = "account.html";
    return;
  }

  const currentUser = JSON.parse(userData);
  const currentUserId = currentUser.id;

  try {
    // Kullanıcının alıcı olduğu konuşmalar
    const buyerResponse = await fetch(
      `${window.SUPABASE_API_URL}conversations?buyer_id=eq.${encodeURIComponent(currentUserId)}&select=*&order=created_at.desc`,
      {
        headers: {
          "apikey": window.SUPABASE_KEY,
          "Authorization": `Bearer ${accessToken}`
        }
      }
    );

    // Kullanıcının satıcı olduğu konuşmalar
    const sellerResponse = await fetch(
      `${window.SUPABASE_API_URL}conversations?seller_id=eq.${encodeURIComponent(currentUserId)}&select=*&order=created_at.desc`,
      {
        headers: {
          "apikey": window.SUPABASE_KEY,
          "Authorization": `Bearer ${accessToken}`
        }
      }
    );

    if (!buyerResponse.ok || !sellerResponse.ok) {
      throw new Error("Konuşmalar alınamadı.");
    }

    const buyerConversations = await buyerResponse.json();
    const sellerConversations = await sellerResponse.json();

    // İki listeyi birleştir
    const conversations = [
      ...buyerConversations,
      ...sellerConversations
    ];

    // Aynı konuşma iki kere gelirse temizle
    const uniqueConversations = Array.from(
      new Map(conversations.map(item => [item.id, item])).values()
    );

    // Yeniden eskiye sırala
    uniqueConversations.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    if (uniqueConversations.length === 0) {
      conversationList.innerHTML = `
        <div class="no-conversations">
          <strong>Henüz mesajınız yok.</strong>
          <p>Bir ilandaki "Satıcıyla İletişime Geç" butonunu kullanarak konuşma başlatabilirsiniz.</p>
        </div>
      `;
      return;
    }

    conversationList.innerHTML = "";

    uniqueConversations.forEach(conversation => {
      const item = document.createElement("button");

      item.type = "button";
      item.className = "conversation-item";

      item.innerHTML = `
        <strong>İlan Görüşmesi</strong>
        <small>${new Date(conversation.created_at).toLocaleString("tr-TR")}</small>
      `;

      item.addEventListener("click", () => {
        window.location.href =
          `messages.html?conversation=${encodeURIComponent(conversation.id)}`;
      });

      conversationList.appendChild(item);
    });

  } catch (error) {
    console.error("Mesajlar yüklenirken hata:", error);

    conversationList.innerHTML = `
      <div class="no-conversations">
        Konuşmalar yüklenemedi.
      </div>
    `;
  }
}

initMessagesPage();

// ==========================================
// MESAJ DETAYI - AKTIF KONUSMAYI AC
// ==========================================

async function initActiveConversation() {
    const conversationList = document.getElementById("conversationList");
    const chatArea = document.getElementById("chatArea");
    const chatEmpty = document.getElementById("chatEmpty");
    const messageList = document.getElementById("messageList");

    // Sadece messages.html sayfasında çalış
    if (!conversationList || !chatArea || !chatEmpty || !messageList) {
        return;
    }

    const accessToken = localStorage.getItem("royale2_access_token");
    const userData = localStorage.getItem("royale2_user");

    if (!accessToken || !userData) {
        return;
    }

    const currentUser = JSON.parse(userData);
    const currentUserId = currentUser.id;

    // URL'deki conversation değerini al
    const params = new URLSearchParams(window.location.search);
    const conversationId = params.get("conversation");

    // Conversation seçilmemişse normal liste ekranında kal
    if (!conversationId) {
        return;
    }

    try {
        // Konuşmayı getir
        const response = await fetch(
            `${window.SUPABASE_API_URL}conversations?id=eq.${encodeURIComponent(conversationId)}&select=*`,
            {
                headers: {
                    "apikey": window.SUPABASE_KEY,
                    "Authorization": `Bearer ${accessToken}`
                }
            }
        );

        if (!response.ok) {
            throw new Error("Konuşma bilgisi alınamadı.");
        }

        const conversations = await response.json();

        if (!conversations.length) {
            throw new Error("Konuşma bulunamadı.");
        }

        const conversation = conversations[0];
// Karşı tarafın kullanıcı bilgilerini belirle
const otherUserId =
    conversation.buyer_id === currentUserId
        ? conversation.seller_id
        : conversation.buyer_id;

// Karşı tarafın profilini getir
const profileResponse = await fetch(
    `${window.SUPABASE_API_URL}profiles?id=eq.${encodeURIComponent(otherUserId)}&select=username,display_name`,
    {
        headers: {
            "apikey": window.SUPABASE_KEY,
            "Authorization": `Bearer ${accessToken}`
        }
    }
);

if (profileResponse.ok) {
    const profiles = await profileResponse.json();

    if (profiles.length > 0) {
        const otherProfile = profiles[0];

        const chatUsername = document.getElementById("chatUsername");

        if (chatUsername) {
            chatUsername.textContent =
                otherProfile.username ||
                otherProfile.display_name ||
                "Royale2 Kullanıcısı";
        }
    }
}
        // Güvenlik kontrolü
        if (
            conversation.buyer_id !== currentUserId &&
            conversation.seller_id !== currentUserId
        ) {
            throw new Error("Bu konuşmaya erişim yetkiniz yok.");
        }

        // Sohbet alanını aç
        chatEmpty.style.display = "none";
        chatArea.style.display = "block";

        console.log("Aktif konuşma başarıyla açıldı:", conversation);
// Bu konuşmaya ait mesajları getir
const messagesResponse = await fetch(
    `${window.SUPABASE_API_URL}messages?conversation_id=eq.${encodeURIComponent(conversationId)}&select=*&order=created_at.asc`,
    {
        headers: {
            "apikey": window.SUPABASE_KEY,
            "Authorization": `Bearer ${accessToken}`
        }
    }
);

if (!messagesResponse.ok) {
    throw new Error("Mesajlar alınamadı.");
}

const messages = await messagesResponse.json();

messageList.innerHTML = "";

messages.forEach(msg => {
    const messageItem = document.createElement("div");

    const isMine = msg.sender_id === currentUserId;

    messageItem.className = isMine
        ? "message-item message-sent"
        : "message-item message-received";

    messageItem.innerHTML = `
        <div class="message-bubble">
            <div class="message-text"></div>
            <small class="message-time">
                ${new Date(msg.created_at).toLocaleString("tr-TR")}
            </small>
        </div>
    `;

    messageItem.querySelector(".message-text").textContent = msg.message;

    messageList.appendChild(messageItem);
});

messageList.scrollTop = messageList.scrollHeight;
    } catch (error) {
        console.error("Aktif konuşma açma hatası:", error);
    }
}

initActiveConversation();


// ========================================
// MESAJ GONDERME SISTEMI
// ========================================

const messageForm = document.getElementById("messageForm");

if (messageForm) {
    messageForm.addEventListener("submit", async function (event) {
        event.preventDefault();


        const messageInput = document.getElementById("messageInput");

        if (!messageInput) {
            console.error("messageInput bulunamadi.");
            return;
        }

        const message = messageInput.value.trim();

        if (!message) {
            return;
        }

      
        const params = new URLSearchParams(window.location.search);
        const conversationId = params.get("conversation");

console.log("MESAJ OKUNDU:", message);
console.log("CONVERSATION ID:", conversationId);

if (!conversationId) {
    alert("Konuşma bilgisi bulunamadı.");
    return;
}
        

        const accessToken = localStorage.getItem("royale2_access_token");
        const userData = localStorage.getItem("royale2_user");

        if (!accessToken || !userData) {
            alert("Mesaj gondermek icin giris yapmalisiniz.");
            window.location.href = "account.html";
            return;
        }

        try {
            const currentUser = JSON.parse(userData);
            const senderId = currentUser.id;

            if (!senderId) {
                throw new Error("Kullanici ID bulunamadi.");
            }

            const response = await fetch(
                `${window.SUPABASE_API_URL}messages`,
                {
                    method: "POST",
                    headers: {
                        "apikey": window.SUPABASE_KEY,
                        "Authorization": `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                        "Prefer": "return=representation"
                    },
                    body: JSON.stringify({
                        conversation_id: conversationId,
                        sender_id: senderId,
                        message: message
                    })
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Mesaj gonderme Supabase hatasi:", errorText);
                throw new Error(errorText || "Mesaj gonderilemedi.");
            }

            const result = await response.json();

            console.log("Mesaj gonderildi:", result);

            messageInput.value = "";

            // Sayfayi ayni konusma ID'siyle yenile
            window.location.href =
                `messages.html?conversation=${encodeURIComponent(conversationId)}`;

        } catch (error) {
            console.error("Mesaj gonderme hatasi:", error);
            alert("Mesaj gonderilemedi. Lutfen tekrar deneyin.");
        }
    });
}
