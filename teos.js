// ==========================================================
// ROYALE2 MARKET
// TEOS MARKET MODULE
// ==========================================================

(() => {
  "use strict";

  // ========================================================
  // TEOS AYARLARI
  // ========================================================

  const TEOS_SERVER_ID = 2;
  const ITEMS_PER_PAGE = 20;

  const CATEGORY_NAMES = {
    1: "Item",
    2: "Yang",
    3: "Karakter",
    4: "Hesap"
  };


  // ========================================================
  // STATE
  // ========================================================

  const state = {
    listings: [],
    filteredListings: [],

    category: "Tümü",
    search: "",
    sort: "newest",

    page: 1,
    perPage: ITEMS_PER_PAGE
  };


  // ========================================================
  // DOM
  // ========================================================

  const elements = {
    grid:
      document.getElementById(
        "teosListings"
      ),

    search:
      document.getElementById(
        "teosSearch"
      ),

    sort:
      document.getElementById(
        "teosSort"
      ),

    count:
      document.getElementById(
        "teosListingCount"
      ),

    status:
      document.getElementById(
        "teosMarketStatus"
      ),

    empty:
      document.getElementById(
        "teosEmptyState"
      ),

    pagination:
      document.getElementById(
        "teosPagination"
      ),

    filters:
      document.querySelectorAll(
        ".teos-filter"
      )
  };


  /*
   * Bu modül sadece teos.html
   * sayfasında çalışır.
   */
  if (!elements.grid) {
    return;
  }


  // ========================================================
  // GÜVENLİ HTML
  // ========================================================

  function escapeHtml(value) {

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  // ========================================================
  // FİYAT FORMATLA
  // ========================================================

  function formatPrice(value) {

    const number =
      Number(value);


    if (!Number.isFinite(number)) {
      return "";
    }


    return number.toLocaleString(
      "tr-TR",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }
    );
  }


  // ========================================================
  // İLAN VERİSİNİ NORMALLEŞTİR
  // ========================================================

  function normalizeListing(item) {

    return {
      ...item,

      category:
        item.cat ||
        CATEGORY_NAMES[
          Number(item.category_id)
        ] ||
        "",

      description:
        item.desc ??
        item.description ??
        "",

      coverImage: ""
    };
  }


  // ========================================================
  // İLANLARI SUPABASE'DEN AL
  // ========================================================

  async function loadTeosListings() {

    setLoadingState();


    try {

      const response =
        await fetch(
          `${window.SUPABASE_API_URL}listings?server_id=eq.${TEOS_SERVER_ID}&status=eq.active&select=*&order=created_at.desc`,
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
          `İlan sorgusu başarısız: ${response.status}`
        );
      }


      const data =
        await response.json();


      state.listings =
        Array.isArray(data)
          ? data.map(normalizeListing)
          : [];


      await loadListingImages();


      applyFilters();


    } catch (error) {

      console.error(
        "Teos ilan yükleme hatası:",
        error
      );


      showErrorState();
    }
  }


  // ========================================================
  // İLAN GÖRSELLERİ
  // ========================================================

  async function loadListingImages() {

    if (!state.listings.length) {
      return;
    }


    const listingIds =
      state.listings
        .map(item => item.id)
        .filter(Boolean);


    if (!listingIds.length) {
      return;
    }


    const ids =
      listingIds
        .map(id =>
          encodeURIComponent(
            String(id)
          )
        )
        .join(",");


    try {

      const response =
        await fetch(
          `${window.SUPABASE_API_URL}listing_images?listing_id=in.(${ids})&select=listing_id,image_url,sort_order&order=sort_order.asc`,
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

        console.warn(
          "Teos ilan görselleri alınamadı:",
          response.status
        );

        return;
      }


      const images =
        await response.json();


      const firstImageMap =
        new Map();


      images.forEach(image => {

        const listingId =
          String(
            image.listing_id ?? ""
          );


        if (
          listingId &&
          image.image_url &&
          !firstImageMap.has(listingId)
        ) {

          firstImageMap.set(
            listingId,
            image.image_url
          );
        }
      });


      state.listings =
        state.listings.map(
          listing => ({
            ...listing,

            coverImage:
              firstImageMap.get(
                String(listing.id)
              ) || ""
          })
        );


    } catch (error) {

      console.error(
        "Teos ilan görsel hatası:",
        error
      );
    }
  }


  // ========================================================
  // FİLTRE + ARAMA + SIRALAMA
  // ========================================================

  function applyFilters() {

    let result =
      [...state.listings];


    // ------------------------------------------------------
    // KATEGORİ
    // ------------------------------------------------------

    if (
      state.category !== "Tümü"
    ) {

      result =
        result.filter(item => {

          if (
            state.category === "Item"
          ) {
            return item.category === "Item";
          }

          return (
            item.category ===
            state.category
          );
        });
    }


    // ------------------------------------------------------
    // ARAMA
    // ------------------------------------------------------

    const searchTerm =
      state.search
        .trim()
        .toLocaleLowerCase("tr-TR");


    if (searchTerm) {

      result =
        result.filter(item => {

          const searchableText = [
            item.title,
            item.description,
            item.category
          ]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase(
              "tr-TR"
            );


          return searchableText.includes(
            searchTerm
          );
        });
    }


    // ------------------------------------------------------
    // SIRALAMA
    // ------------------------------------------------------

    result.sort(
      (a, b) => {

        switch (state.sort) {

          case "oldest":

            return (
              new Date(
                a.created_at || 0
              ) -
              new Date(
                b.created_at || 0
              )
            );


          case "price-asc":

            return (
              Number(a.price || 0) -
              Number(b.price || 0)
            );


          case "price-desc":

            return (
              Number(b.price || 0) -
              Number(a.price || 0)
            );


          case "newest":
          default:

            return (
              new Date(
                b.created_at || 0
              ) -
              new Date(
                a.created_at || 0
              )
            );
        }
      }
    );


    state.filteredListings =
      result;


    /*
     * Filtre değişince mevcut sayfa
     * toplam sayfa sayısını aşmış olabilir.
     */
    const totalPages =
      Math.max(
        1,
        Math.ceil(
          result.length /
          state.perPage
        )
      );


    if (
      state.page > totalPages
    ) {
      state.page = 1;
    }


    render();
  }


  // ========================================================
  // ANA RENDER
  // ========================================================

  function render() {

    updateCount();


    if (
      !state.filteredListings.length
    ) {

      elements.grid.innerHTML = "";

      elements.status.hidden = true;
      elements.empty.hidden = false;

      if (elements.pagination) {
        elements.pagination.hidden = true;
        elements.pagination.innerHTML = "";
      }

      return;
    }


    elements.status.hidden = true;
    elements.empty.hidden = true;


    const start =
      (state.page - 1) *
      state.perPage;


    const end =
      start +
      state.perPage;


    const pageItems =
      state.filteredListings.slice(
        start,
        end
      );


    elements.grid.innerHTML =
      pageItems
        .map(renderListingCard)
        .join("");


    renderPagination();
  }


  // ========================================================
  // İLAN KARTI
  // ========================================================

  function renderListingCard(item) {

    const title =
      escapeHtml(
        item.title || "İlan"
      );


    const description =
      escapeHtml(
        item.description || ""
      );


    const category =
      escapeHtml(
        item.category || ""
      );


    const price =
      escapeHtml(
        formatPrice(item.price)
      );


    const image =
      escapeHtml(
        item.coverImage || ""
      );


    const listingUrl =
      `listing.html?id=${encodeURIComponent(
        item.id
      )}`;


    return `
      <article class="listing">

        ${
          image
            ? `
              <div class="listing-image">

                <img
                  src="${image}"
                  alt="${title}"
                  loading="lazy"
                >

              </div>
            `
            : ""
        }


        <div class="listing-top">

          <span class="server-tag">
            TEOS
          </span>


          <span class="cat">
            ${category}
          </span>

        </div>


        <h3>
          ${title}
        </h3>


        <p>
          ${description}
        </p>


        <div class="listing-bottom">

          <div class="price">

            ${price}

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


  // ========================================================
  // İLAN SAYACI
  // ========================================================

  function updateCount() {

    if (!elements.count) {
      return;
    }


    const total =
      state.filteredListings.length;


    if (
      state.search ||
      state.category !== "Tümü"
    ) {

      elements.count.textContent =
        `${total} ilan bulundu`;

      return;
    }


    elements.count.textContent =
      `Toplam ${total} aktif ilan`;
  }


  // ========================================================
  // SAYFALAMA
  // ========================================================

  function renderPagination() {

    if (!elements.pagination) {
      return;
    }


    const totalPages =
      Math.ceil(
        state.filteredListings.length /
        state.perPage
      );


    if (totalPages <= 1) {

      elements.pagination.innerHTML = "";
      elements.pagination.hidden = true;

      return;
    }


    elements.pagination.hidden = false;


    let html = "";


    html += `
      <button
        type="button"
        class="teos-page-button"
        data-page="${state.page - 1}"
        ${state.page === 1 ? "disabled" : ""}
      >
        ← Önceki
      </button>
    `;


    for (
      let page = 1;
      page <= totalPages;
      page++
    ) {

      html += `
        <button
          type="button"
          class="teos-page-button ${
            page === state.page
              ? "active"
              : ""
          }"
          data-page="${page}"
          ${
            page === state.page
              ? 'aria-current="page"'
              : ""
          }
        >
          ${page}
        </button>
      `;
    }


    html += `
      <button
        type="button"
        class="teos-page-button"
        data-page="${state.page + 1}"
        ${
          state.page === totalPages
            ? "disabled"
            : ""
        }
      >
        Sonraki →
      </button>
    `;


    elements.pagination.innerHTML =
      html;
  }


  // ========================================================
  // YÜKLENİYOR DURUMU
  // ========================================================

  function setLoadingState() {

    elements.grid.innerHTML = "";

    elements.empty.hidden = true;

    elements.status.hidden = false;

    elements.status.textContent =
      "Teos ilanları yükleniyor...";


    if (elements.count) {

      elements.count.textContent =
        "İlanlar yükleniyor...";
    }


    if (elements.pagination) {

      elements.pagination.hidden = true;
    }
  }


  // ========================================================
  // HATA DURUMU
  // ========================================================

  function showErrorState() {

    elements.grid.innerHTML = "";

    elements.empty.hidden = true;

    elements.status.hidden = false;

    elements.status.textContent =
      "Teos ilanları şu anda yüklenemedi.";


    if (elements.count) {

      elements.count.textContent =
        "İlanlar yüklenemedi";
    }


    if (elements.pagination) {

      elements.pagination.hidden = true;
    }
  }


  // ========================================================
  // KATEGORİ EVENTLERİ
  // ========================================================

  elements.filters.forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          state.category =
            button.dataset.category ||
            "Tümü";


          state.page = 1;


          elements.filters.forEach(
            item => {

              const isActive =
                item === button;


              item.classList.toggle(
                "active",
                isActive
              );


              item.setAttribute(
                "aria-pressed",
                String(isActive)
              );
            }
          );


          applyFilters();
        }
      );
    }
  );


  // ========================================================
  // ARAMA EVENTİ
  // ========================================================

  if (elements.search) {

    elements.search.addEventListener(
      "input",
      event => {

        state.search =
          event.target.value || "";


        state.page = 1;


        applyFilters();
      }
    );
  }


  // ========================================================
  // SIRALAMA EVENTİ
  // ========================================================

  if (elements.sort) {

    elements.sort.addEventListener(
      "change",
      event => {

        state.sort =
          event.target.value ||
          "newest";


        state.page = 1;


        applyFilters();
      }
    );
  }


  // ========================================================
  // SAYFALAMA EVENTİ
  // ========================================================

  if (elements.pagination) {

    elements.pagination.addEventListener(
      "click",
      event => {

        const button =
          event.target.closest(
            "[data-page]"
          );


        if (
          !button ||
          button.disabled
        ) {
          return;
        }


        const page =
          Number(
            button.dataset.page
          );


        const totalPages =
          Math.ceil(
            state.filteredListings.length /
            state.perPage
          );


        if (
          !Number.isInteger(page) ||
          page < 1 ||
          page > totalPages
        ) {
          return;
        }


        state.page = page;


        render();


        const market =
          document.getElementById(
            "teos-market"
          );


        market?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    );
  }


  // ========================================================
  // BAŞLAT
  // ========================================================

  loadTeosListings();

})();
