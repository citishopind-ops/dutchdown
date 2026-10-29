"use strict";

(() => {
  const grid = document.querySelector("#products");
  if (!grid) return;

  const cards = [...grid.querySelectorAll(".card")];
  const filters = document.querySelector(".filters");
  const search = document.querySelector("#product-search");
  const clear = document.querySelector("#clear-search");
  const notice = document.querySelector("#notice");
  const empty = document.querySelector("#catalog-empty");
  const pagination = document.querySelector("#catalog-pagination");
  const previous = document.querySelector("#previous-page");
  const next = document.querySelector("#next-page");
  const pageStatus = document.querySelector("#page-status");
  const pageSize = 12;
  let category = "All";
  let query = "";
  let page = 1;
  let searchTimer;

  const normalize = value => String(value).normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, " ").trim();
  const records = cards.map(card => ({
    card,
    category: card.dataset.category || "Other",
    text: normalize([
      card.querySelector("h3")?.textContent || "",
      card.querySelector(".description")?.textContent || "",
      card.dataset.category || "",
      card.dataset.productId || ""
    ].join(" "))
  }));

  // Categories expand automatically when products are added.
  const knownCategories = new Set([...filters.querySelectorAll("button[data-category]")].map(button => button.dataset.category));
  for (const item of records) {
    if (knownCategories.has(item.category)) continue;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.category = item.category;
    button.textContent = item.category;
    button.setAttribute("aria-pressed", "false");
    filters.append(button);
    knownCategories.add(item.category);
  }

  function render() {
    const terms = normalize(query).split(" ").filter(Boolean);
    const matches = records.filter(item => (category === "All" || item.category === category) && terms.every(term => item.text.includes(term)));
    const pages = Math.max(1, Math.ceil(matches.length / pageSize));
    page = Math.max(1, Math.min(page, pages));
    const start = (page - 1) * pageSize;
    const visible = new Set(matches.slice(start, start + pageSize).map(item => item.card));
    cards.forEach(card => { card.hidden = !visible.has(card); });
    filters.querySelectorAll("button[data-category]").forEach(button => {
      const active = button.dataset.category === category;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    clear.hidden = !query;
    empty.hidden = matches.length !== 0;
    pagination.hidden = matches.length <= pageSize;
    previous.disabled = page === 1;
    next.disabled = page === pages;
    pageStatus.textContent = "Page " + page + " of " + pages;
    const noun = matches.length === 1 ? "product" : "products";
    const scope = category === "All" ? "" : " in " + category;
    notice.textContent = matches.length > pageSize
      ? "Showing " + (start + 1) + "–" + Math.min(start + pageSize, matches.length) + " of " + matches.length + " " + noun + scope
      : matches.length + " " + noun + scope + (terms.length ? " found" : "");
  }

  function refresh() {
    clearTimeout(searchTimer);
    query = search.value.trim();
    page = 1;
    render();
  }

  search.addEventListener("input", () => {
    clearTimeout(searchTimer);
    clear.hidden = !search.value;
    searchTimer = setTimeout(refresh, 120);
  });
  search.addEventListener("search", refresh);
  clear.addEventListener("click", () => {
    search.value = "";
    refresh();
    search.focus();
  });
  filters.addEventListener("click", event => {
    const button = event.target.closest("button[data-category]");
    if (!button) return;
    category = button.dataset.category;
    refresh();
  });
  document.querySelector("#reset-catalog").addEventListener("click", () => {
    category = "All";
    search.value = "";
    refresh();
    search.focus();
  });
  function changePage(delta) {
    page += delta;
    render();
    document.querySelector("#collection").scrollIntoView({ block: "start", behavior: "auto" });
    notice.tabIndex = -1;
    notice.focus({ preventScroll: true });
  }
  previous.addEventListener("click", () => changePage(-1));
  next.addEventListener("click", () => changePage(1));

  document.querySelector("#collection-count").textContent = cards.length + " thoughtful finds";
  document.querySelector(".catalog-tools").hidden = false;
  filters.hidden = false;
  render();

  document.querySelectorAll(".photo img").forEach(img => {
    const fallback = () => {
      img.hidden = true;
      img.parentElement.classList.add("image-failed");
    };
    img.addEventListener("error", fallback, { once: true });
    if (img.complete && img.naturalWidth === 0) fallback();
  });
  document.querySelectorAll(".product-reel").forEach(reel => {
    reel.addEventListener("toggle", () => {
      if (!reel.open) reel.querySelector("video")?.pause();
    });
  });
})();
