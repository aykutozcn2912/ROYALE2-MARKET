/* =========================================================
   ROYALE2 MARKET
   PUBLIC PROFILE
   ========================================================= */

(() => {
    "use strict";

    const PROFILE_LISTING_LIMIT = 12;

    let currentProfileId = null;
    let currentOffset = 0;
    let totalLoadedListings = 0;
    let isLoadingListings = false;


    /* =====================================================
       DOM
       ===================================================== */

    const getEl = id => document.getElementById(id);


    /* =====================================================
       GÜVENLİ METİN
       ===================================================== */

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /* =====================================================
       KULLANICI BAŞ HARFLERİ
       ===================================================== */

    function getInitials(name) {
        const cleanName = String(name || "R2").trim();

        if (!cleanName) return "R2";

        const parts = cleanName
            .split(/\s+/)
            .filter(Boolean);

        if (parts.length >= 2) {
            return (
                parts[0].charAt(0) +
                parts[1].charAt(0)
            ).toUpperCase();
        }

        return cleanName
            .slice(0, 2)
            .toUpperCase();
    }


    /* =====================================================
       TL FİYAT
       ===================================================== */

    function formatPriceTL(price) {
        const number = Number(price);

        if (!Number.isFinite(number)) {
            return "Fiyat belirtilmedi";
        }

        return (
            new Intl.NumberFormat(
                "tr-TR",
                {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                }
            ).format(number) +
            " TL"
        );
    }


    /* =====================================================
       ÜYELİK TARİHİ
       ===================================================== */

    function formatMemberDate(value) {
        if (!value) {
            return "Royale2 Market Üyesi";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Royale2 Market Üyesi";
        }

        const formatted = date.toLocaleDateString(
            "tr-TR",
            {
                month: "long",
                year: "numeric"
            }
        );

        return `${formatted} tarihinden beri üye`;
    }


    /* =====================================================
       SUPABASE PUBLIC FETCH
       ===================================================== */

    async function publicSupabaseFetch(path) {
        if (
            !window.SUPABASE_API_URL ||
            !window.SUPABASE_KEY
        ) {
            throw new Error(
                "Supabase bağlantı bilgileri bulunamadı."
            );
        }

        return fetch(
            window.SUPABASE_API_URL + path,
            {
                headers: {
                    apikey: window.SUPABASE_KEY,
                    Authorization:
                        `Bearer ${window.SUPABASE_KEY}`
                }
            }
        );
    }


    /* =====================================================
       HATA
       ===================================================== */

    function showProfileError(message) {
        const content =
            getEl("publicProfileContent");

        const errorBox =
            getEl("publicProfileError");

        const errorText =
            getEl("publicProfileErrorText");

        if (content) {
            content.style.display = "none";
        }

        if (errorText) {
            errorText.textContent =
                message ||
                "Profil şu anda görüntülenemiyor.";
        }

        if (errorBox) {
            errorBox.style.display = "block";
        }
    }


    /* =====================================================
       PROFİL AVATARI
       ===================================================== */

    function renderAvatar(profile, displayName) {
        const avatarEl =
            getEl("publicProfileAvatar");

        if (!avatarEl) return;

        avatarEl.innerHTML = "";

        if (!profile.avatar_url) {
            avatarEl.textContent =
                getInitials(displayName);

            return;
        }

        const image =
            document.createElement("img");

        image.src = profile.avatar_url;
        image.alt = `${displayName} profil resmi`;
        image.loading = "lazy";
        image.decoding = "async";

        image.addEventListener(
            "error",
            () => {
                avatarEl.innerHTML = "";
                avatarEl.textContent =
                    getInitials(displayName);
            },
            { once: true }
        );

        avatarEl.appendChild(image);
    }


    /* =====================================================
       PROFİLİ YÜKLE
       ===================================================== */

    async function loadProfile(profileId) {
        const response =
            await publicSupabaseFetch(
                "profiles" +
                "?id=eq." +
                encodeURIComponent(profileId) +
                "&select=" +
                "id,username,display_name,avatar_url,bio,is_verified,created_at" +
                "&limit=1"
            );

        if (!response.ok) {
            throw new Error(
                "Profil bilgileri alınamadı."
            );
        }

        const rows =
            await response.json();

        if (!Array.isArray(rows) || !rows.length) {
            return null;
        }

        return rows[0];
    }


    /* =====================================================
       PROFİLİ EKRANA BAS
       ===================================================== */

    function renderProfile(profile) {
        const usernameEl =
            getEl("publicProfileUsername");

        const memberSinceEl =
            getEl("publicProfileMemberSince");

        const bioEl =
            getEl("publicProfileBio");

        const verifiedEl =
            getEl("publicProfileVerified");

        const displayName =
            profile.username ||
            profile.display_name ||
            "Royale2 Kullanıcısı";

        if (usernameEl) {
            usernameEl.textContent =
                displayName;
        }

        document.title =
            `${displayName} | Royale2 Market`;

        if (memberSinceEl) {
            memberSinceEl.textContent =
                formatMemberDate(
                    profile.created_at
                );
        }

        if (bioEl) {
            bioEl.textContent =
                profile.bio?.trim()
                    ? profile.bio.trim()
                    : "Bu kullanıcı henüz profil açıklaması eklememiş.";
        }

        if (verifiedEl) {
            verifiedEl.style.display =
                profile.is_verified
                    ? "inline-flex"
                    : "none";
        }

        renderAvatar(
            profile,
            displayName
        );
    }


    /* =====================================================
       AKTİF İLAN SAYISI

       İlanların yalnızca ilk 12 tanesini çeksek bile
       toplam aktif ilan sayısını doğru göstermek için
       Content-Range kullanıyoruz.
       ===================================================== */

    async function getActiveListingCount(profileId) {
        const response =
            await fetch(
                window.SUPABASE_API_URL +
                "listings" +
                "?user_id=eq." +
                encodeURIComponent(profileId) +
                "&status=eq.active" +
                "&select=id",
                {
                    method: "GET",

                    headers: {
                        apikey:
                            window.SUPABASE_KEY,

                        Authorization:
                            `Bearer ${window.SUPABASE_KEY}`,

                        Prefer:
                            "count=exact",

                        Range:
                            "0-0"
                    }
                }
            );

        if (!response.ok) {
            return null;
        }

        const contentRange =
            response.headers.get(
                "content-range"
            );

        if (!contentRange) {
            return null;
        }

        const totalPart =
            contentRange.split("/")[1];

        const total =
            Number(totalPart);

        return Number.isFinite(total)
            ? total
            : null;
    }


    /* =====================================================
       İLANLARI YÜKLE
       ===================================================== */

    async function fetchListings(
        profileId,
        offset
    ) {
        const from = offset;

        const to =
            offset +
            PROFILE_LISTING_LIMIT -
            1;

        const response =
            await fetch(
                window.SUPABASE_API_URL +
                "listings" +
                "?user_id=eq." +
                encodeURIComponent(profileId) +
                "&status=eq.active" +
                "&select=id,title,price,created_at" +
                "&order=created_at.desc",
                {
                    headers: {
                        apikey:
                            window.SUPABASE_KEY,

                        Authorization:
                            `Bearer ${window.SUPABASE_KEY}`,

                        Range:
                            `${from}-${to}`
                    }
                }
            );

        if (!response.ok) {
            throw new Error(
                "Kullanıcının ilanları alınamadı."
            );
        }

        const rows =
            await response.json();

        return Array.isArray(rows)
            ? rows
            : [];
    }


    /* =====================================================
       İLAN GÖRSELLERİNİ TOPLU AL

       12 ilan için 12 ayrı istek yerine tek istek.
       ===================================================== */

    async function fetchListingImages(listings) {
        const imageMap =
            new Map();

        if (!Array.isArray(listings) ||
            !listings.length) {
            return imageMap;
        }

        const ids =
            listings
                .map(item => item.id)
                .filter(Boolean);

        if (!ids.length) {
            return imageMap;
        }

        const inFilter =
            ids
                .map(id => `"${id}"`)
                .join(",");

        const response =
            await publicSupabaseFetch(
                "listing_images" +
                "?listing_id=in.(" +
                encodeURIComponent(inFilter) +
                ")" +
                "&select=listing_id,image_url"
            );

        if (!response.ok) {
            console.error(
                "İlan görselleri toplu olarak alınamadı."
            );

            return imageMap;
        }

        const images =
            await response.json();

        if (!Array.isArray(images)) {
            return imageMap;
        }

        /*
         * Aynı ilana birden fazla resim varsa
         * yalnızca ilk geleni kartta kullanıyoruz.
         */
        images.forEach(image => {
            if (
                image?.listing_id &&
                image?.image_url &&
                !imageMap.has(image.listing_id)
            ) {
                imageMap.set(
                    image.listing_id,
                    image.image_url
                );
            }
        });

        return imageMap;
    }


    /* =====================================================
       İLAN KARTI
       ===================================================== */

    function createListingCard(
        listing,
        imageUrl
    ) {
        const link =
            document.createElement("a");

        link.className =
            "r2-profile-listing";

        link.href =
            "listing.html?id=" +
            encodeURIComponent(
                listing.id
            );

        const safeTitle =
            escapeHtml(
                listing.title ||
                "Royale2 İlanı"
            );

        const imageHtml =
            imageUrl
                ? `
                    <img
                        src="${escapeHtml(imageUrl)}"
                        alt="${safeTitle}"
                        loading="lazy"
                        decoding="async"
                    >
                  `
                : `
                    <span>R2</span>
                  `;

        link.innerHTML = `
            <div class="r2-listing-image">
                ${imageHtml}
            </div>

            <div class="r2-listing-info">

                <h3 class="r2-listing-title">
                    ${safeTitle}
                </h3>

                <div class="r2-listing-meta">
                    Royale2 Market İlanı
                </div>

                <div class="r2-listing-price">
                    ${escapeHtml(
                        formatPriceTL(
                            listing.price
                        )
                    )}
                </div>

            </div>
        `;

        return link;
    }


    /* =====================================================
       DAHA FAZLA BUTONU
       ===================================================== */

    function removeLoadMoreButton() {
        const oldButton =
            getEl("publicProfileLoadMore");

        if (oldButton) {
            oldButton.remove();
        }
    }


    function createLoadMoreButton() {
        removeLoadMoreButton();

        const listingsEl =
            getEl("publicProfileListings");

        if (!listingsEl) return;

        const wrapper =
            document.createElement("div");

        wrapper.id =
            "publicProfileLoadMore";

        wrapper.style.gridColumn =
            "1 / -1";

        wrapper.style.display =
            "flex";

        wrapper.style.justifyContent =
            "center";

        wrapper.style.padding =
            "10px 0 4px";

        const button =
            document.createElement("button");

        button.type = "button";

        button.className =
            "r2-profile-button";

        button.textContent =
            "Daha Fazla İlan Göster";

        button.addEventListener(
            "click",
            async () => {
                button.disabled = true;
                button.textContent =
                    "İlanlar yükleniyor...";

                try {
                    await loadListingPage();
                } finally {
                    if (
                        document.body.contains(
                            button
                        )
                    ) {
                        button.disabled = false;
                        button.textContent =
                            "Daha Fazla İlan Göster";
                    }
                }
            }
        );

        wrapper.appendChild(button);
        listingsEl.appendChild(wrapper);
    }


    /* =====================================================
       İLAN SAYFASINI EKRANA EKLE
       ===================================================== */

    async function loadListingPage() {
        if (
            isLoadingListings ||
            !currentProfileId
        ) {
            return;
        }

        isLoadingListings = true;

        try {
            const listingsEl =
                getEl("publicProfileListings");

            if (!listingsEl) return;

            removeLoadMoreButton();

            const listings =
                await fetchListings(
                    currentProfileId,
                    currentOffset
                );

            /*
             * İlk sayfa ve hiç ilan yok.
             */
            if (
                currentOffset === 0 &&
                !listings.length
            ) {
                listingsEl.innerHTML = `
                    <div class="r2-profile-state">
                        <strong>
                            Aktif ilan bulunmuyor.
                        </strong>

                        Bu kullanıcının şu anda
                        yayında olan bir ilanı yok.
                    </div>
                `;

                return;
            }

            if (!listings.length) {
                return;
            }

            const imageMap =
                await fetchListingImages(
                    listings
                );

            /*
             * İlk yüklemede "yükleniyor" metnini temizle.
             */
            if (currentOffset === 0) {
                listingsEl.innerHTML = "";
            }

            listings.forEach(listing => {
                const card =
                    createListingCard(
                        listing,
                        imageMap.get(
                            listing.id
                        ) || ""
                    );

                listingsEl.appendChild(card);
            });

            currentOffset +=
                listings.length;

            totalLoadedListings +=
                listings.length;

            /*
             * Tam 12 geldiyse devamında ilan olabilir.
             */
            if (
                listings.length ===
                PROFILE_LISTING_LIMIT
            ) {
                createLoadMoreButton();
            }

        } finally {
            isLoadingListings = false;
        }
    }


    /* =====================================================
       İSTATİSTİKLER
       ===================================================== */

    async function updateListingStatistics(
        profileId
    ) {
        const activeListingsEl =
            getEl(
                "publicProfileActiveListings"
            );

        const listingCountEl =
            getEl(
                "publicProfileListingCount"
            );

        const total =
            await getActiveListingCount(
                profileId
            );

        if (total === null) {
            /*
             * Count alınamazsa sayfa yine çalışmaya devam eder.
             */
            if (activeListingsEl) {
                activeListingsEl.textContent =
                    "—";
            }

            if (listingCountEl) {
                listingCountEl.textContent =
                    "Aktif İlanlar";
            }

            return;
        }

        if (activeListingsEl) {
            activeListingsEl.textContent =
                String(total);
        }

        if (listingCountEl) {
            listingCountEl.textContent =
                `${total} İlan`;
        }
    }


    /* =====================================================
       PROFİL BUTONU
       ===================================================== */

    function configureProfileActions() {
        const button =
            getEl(
                "publicProfileMessageButton"
            );

        if (!button) return;

        /*
         * Konuşmalar ilan bazlı olduğu için
         * profil üzerinden rastgele conversation
         * oluşturmuyoruz.
         */
        button.href =
            "#publicProfileListings";

        button.textContent =
            "Satıcının İlanları";
    }


    /* =====================================================
       BAŞLAT
       ===================================================== */

    async function initPublicProfile() {
        const params =
            new URLSearchParams(
                window.location.search
            );

        const profileId =
            params.get("id");

        if (!profileId) {
            showProfileError(
                "Profil bağlantısında kullanıcı bilgisi bulunamadı."
            );

            return;
        }

        currentProfileId =
            profileId;

        currentOffset = 0;
        totalLoadedListings = 0;

        try {
            /*
             * Önce profil.
             */
            const profile =
                await loadProfile(
                    profileId
                );

            if (!profile) {
                showProfileError(
                    "Bu kullanıcı profili bulunamadı."
                );

                return;
            }

            renderProfile(profile);
            configureProfileActions();

            /*
             * İlan sayısı ve ilk 12 ilan birbirini
             * beklemek zorunda değil.
             */
            await Promise.all([
                updateListingStatistics(
                    profileId
                ),

                loadListingPage()
            ]);

        } catch (error) {
            console.error(
                "Public profil yükleme hatası:",
                error
            );

            showProfileError(
                "Profil şu anda yüklenemedi. Lütfen daha sonra tekrar deneyin."
            );
        }
    }


    /* =====================================================
       DOM READY
       ===================================================== */

    if (
        document.readyState === "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initPublicProfile
        );
    } else {
        initPublicProfile();
    }

})();
