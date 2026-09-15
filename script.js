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

        <a class="view" href="#login">İLANI GÖR →</a>
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
