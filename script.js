const SUPABASE_API_URL = "https://rmhupvzeksnqfxdrgmos.supabase.co/rest/v1/";
const SUPABASE_KEY = "sb_publishable_alxS7cZ43l46SS1-QyGhYQ_I7O0HNKq";

let listings = [];
let selectedServer = "Tümü";

const grid = document.getElementById("listings");
const category = document.getElementById("category");

async function loadListings() {
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

category.addEventListener("change", render);

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
