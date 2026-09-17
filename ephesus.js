// ==========================================================
// ROYALE2 MARKET
// EPHESUS MARKET MODULE
// ==========================================================

(() => {
  "use strict";

  const EPHESUS_SERVER_ID = 1;

  const state = {
    listings: [],
    filteredListings: [],
    category: "Tümü",
    search: "",
    sort: "newest",
    page: 1,
    perPage: 20
  };

  const elements = {
    grid: document.getElementById("ephesusListings"),
    search: document.getElementById("ephesusSearch"),
    sort: document.getElementById("ephesusSort"),
    count: document.getElementById("ephesusListingCount"),
    status: document.getElementById("ephesusMarketStatus"),
    empty: document.getElementById("ephesusEmptyState"),
    filters: document.querySelectorAll(".ephesus-filter")
  };

  // Bu dosya yalnızca ephesus.html üzerinde çalışır.
  if (!elements.grid) {
    return;
  }

  console.log(
    "Royale2 Market: Ephesus modülü hazır.",
    {
      serverId: EPHESUS_SERVER_ID
    }
  );
})();
