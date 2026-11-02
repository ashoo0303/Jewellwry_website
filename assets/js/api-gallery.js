(() => {
  "use strict";

  /**
   * Single free public jewellery ecommerce API (no key):
   * Mejuri — Shopify storefront catalogue (fine jewellery)
   * GET https://www.mejuri.com/products.json?limit=250&page=1
   * CORS enabled. Hundreds of real jewellery products.
   */
  const API_BASE = "https://www.mejuri.com/products.json";
  const USD_TO_PKR = 280;
  const PAGES_TO_FETCH = 2;
  const STORAGE_KEY = "aurelia.products.v1";
  const LEGACY_KEY = "aurelia.catalogue.v1";

  const $ = (selector, scope = document) => scope.querySelector(selector);

  const section = $("#api-jewellery") || $("#trending");
  const grid = $("#api-grid");
  const loading = $("#api-loading");
  const errorBox = $("#api-error");
  const emptyBox = $("#api-empty");
  const refreshBtn = $("#api-refresh");
  const statusEl = $("#api-status");
  const rootPrefix = document.body?.dataset.root || "";

  if (!grid) return;

  if (typeof axios === "undefined") {
    if (errorBox) {
      errorBox.classList.remove("hidden");
      errorBox.textContent = "Axios library failed to load. Check the CDN link in the page head.";
    }
    return;
  }

  const limitAttr = Number(section?.dataset.apiLimit || grid.dataset.apiLimit || 0);
  const showLimit = Number.isFinite(limitAttr) && limitAttr > 0 ? limitAttr : 0;
  const includeAdmin = section?.dataset.includeAdmin === "true";

  // Shop filter (catalogue only): show 4–13, skip 14–32, then remaining from 33+.
  const showStartAttr = section?.dataset.apiShowStart;
  const showEndAttr = section?.dataset.apiShowEnd;
  const resumeFromAttr = section?.dataset.apiResumeFrom;
  const hasShopFilter =
    showStartAttr !== undefined &&
    showStartAttr !== "" &&
    showEndAttr !== undefined &&
    showEndAttr !== "" &&
    resumeFromAttr !== undefined &&
    resumeFromAttr !== "";
  const shopShowStart = Number(showStartAttr);
  const shopShowEnd = Number(showEndAttr);
  const shopResumeFrom = Number(resumeFromAttr);

  let lastApiProducts = [];

  function setState({ isLoading = false, error = "", items = null, total = 0 } = {}) {
    loading?.classList.toggle("hidden", !isLoading);
    errorBox?.classList.toggle("hidden", !error);
    if (errorBox && error) errorBox.textContent = error;

    const hasItems = Array.isArray(items) && items.length > 0;
    emptyBox?.classList.toggle("hidden", isLoading || Boolean(error) || hasItems || items === null);
    grid.classList.toggle("hidden", isLoading || Boolean(error) || !hasItems);

    if (statusEl) {
      if (isLoading) statusEl.textContent = "Loading jewellery from Mejuri API…";
      else if (error) statusEl.textContent = "Unable to load jewellery right now.";
      else if (hasItems) {
        statusEl.textContent = includeAdmin
          ? `${items.length} products · API jewellery + Admin stock`
          : `Mejuri jewellery catalogue loaded via Axios · ${items.length} products`;
      } else statusEl.textContent = "No jewellery available.";
    }

    if (refreshBtn) refreshBtn.disabled = isLoading;
  }

  function formatPrice(amount) {
    return `Rs. ${Number(amount).toLocaleString("en-US")}`;
  }

  function toPkr(usd) {
    return Math.round(Number(usd || 0) * USD_TO_PKR);
  }

  function stripHtml(html) {
    const tmp = document.createElement("div");
    tmp.innerHTML = String(html || "");
    return (tmp.textContent || tmp.innerText || "").trim();
  }

  function resolveImage(src) {
    if (!src) return "";
    if (/^(data:|https?:|blob:)/i.test(src) || src.startsWith("../") || src.startsWith("/")) {
      return src;
    }
    return `${rootPrefix}${src}`;
  }

  function normalizeProduct(raw) {
    const variant = Array.isArray(raw.variants) ? raw.variants[0] : null;
    const priceUsd = Number(variant?.price ?? raw.price ?? 0);
    const image =
      raw.images?.[0]?.src ||
      raw.image?.src ||
      variant?.featured_image?.src ||
      "";
    const description =
      stripHtml(raw.body_html) || "Fine jewellery from the Mejuri catalogue.";

    return {
      id: `mejuri-${raw.id}`,
      title: raw.title || "Jewellery piece",
      image,
      priceUsd,
      pricePkr: toPkr(priceUsd),
      category: raw.product_type || "Jewellery",
      vendor: raw.vendor || "Mejuri",
      description,
      available: variant ? Boolean(variant.available) : true,
      fromAdmin: false,
    };
  }

  function loadAdminProducts() {
    if (!includeAdmin) return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item) => ({
        id: String(item.id),
        title: item.name || "Store product",
        image: resolveImage(item.image || ""),
        priceUsd: 0,
        pricePkr: Number(item.price) || 0,
        category: item.category || "Jewellery",
        vendor: "Aurelia Admin",
        description: item.notes || `${item.metal || "Jewellery"} · from our store inventory`,
        available: Number(item.stock) > 0,
        fromAdmin: true,
      }));
    } catch {
      return [];
    }
  }

  function mergeProducts(apiProducts) {
    const admin = loadAdminProducts();
    return [...admin, ...apiProducts];
  }

  function renderProducts(products) {
    const cards = products.map((product) => {
      const article = document.createElement("article");
      article.className = "card overflow-hidden transition hover:-translate-y-1";

      const figure = document.createElement("figure");
      figure.className = "relative aspect-[4/5] overflow-hidden bg-sand";

      if (product.image) {
        const img = document.createElement("img");
        img.src = product.image;
        img.alt = product.title;
        img.loading = "lazy";
        img.className = "size-full object-cover";
        figure.append(img);
      } else {
        figure.classList.add("grid", "place-items-center", "text-ink-400", "p-6");
        figure.textContent = "No image";
      }

      const badge = document.createElement("span");
      badge.className =
        "absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider " +
        (product.fromAdmin
          ? "bg-ink-900 text-white"
          : "bg-white/95 text-ink-700");
      badge.textContent = product.fromAdmin ? "Admin" : product.category || "Jewellery";
      figure.append(badge);

      const body = document.createElement("div");
      body.className = "p-5";

      const meta = document.createElement("p");
      meta.className = "text-xs uppercase tracking-widest text-ink-400";
      meta.textContent = product.vendor;

      const title = document.createElement("h3");
      title.className = "mt-2 font-serif text-lg leading-snug text-ink-900";
      title.textContent = product.title;

      const description = document.createElement("p");
      description.className = "mt-3 line-clamp-3 text-sm leading-relaxed text-ink-600";
      description.textContent =
        product.description.slice(0, 130) + (product.description.length > 130 ? "…" : "");

      const footer = document.createElement("div");
      footer.className = "mt-4 flex items-center justify-between gap-3";

      const price = document.createElement("p");
      price.className = "font-semibold text-ink-900";
      price.textContent = formatPrice(product.pricePkr);

      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "btn btn-dark !px-4 !py-2 !text-xs";
      addBtn.textContent = product.available ? "Add to bag" : "Unavailable";
      addBtn.disabled = !product.available;
      if (product.available) {
        addBtn.dataset.addToCart = "";
        addBtn.dataset.id = product.id;
        addBtn.dataset.name = product.title;
        addBtn.dataset.price = String(product.pricePkr);
        addBtn.dataset.img = product.image;
      }

      footer.append(price, addBtn);
      body.append(meta, title, description, footer);
      article.append(figure, body);
      return article;
    });

    grid.replaceChildren(...cards);
  }

  async function fetchPage(page) {
    const response = await axios.get(API_BASE, {
      params: { limit: 250, page },
      timeout: 15000,
    });
    const list = Array.isArray(response.data?.products) ? response.data.products : [];
    return list.map(normalizeProduct);
  }

  async function fetchJewellery() {
    setState({ isLoading: true, error: "", items: null });
    grid.replaceChildren();

    try {
      const pages = showLimit
        ? [1]
        : Array.from({ length: PAGES_TO_FETCH }, (_, i) => i + 1);

      const results = await Promise.all(pages.map((page) => fetchPage(page)));
      let products = results.flat();

      if (
        hasShopFilter &&
        Number.isFinite(shopShowStart) &&
        Number.isFinite(shopShowEnd) &&
        Number.isFinite(shopResumeFrom)
      ) {
        // e.g. keep [4..13], drop [0..3] and [14..32], keep [33..]
        products = [
          ...products.slice(shopShowStart, shopShowEnd),
          ...products.slice(shopResumeFrom),
        ];
      }

      lastApiProducts = products;
      const merged = mergeProducts(showLimit ? products.slice(0, showLimit) : products);

      if (!merged.length) {
        setState({ isLoading: false, error: "", items: [], total: 0 });
        return;
      }

      renderProducts(merged);
      setState({ isLoading: false, error: "", items: merged, total: merged.length });
    } catch (err) {
      console.error("Axios Mejuri jewellery fetch failed", err);
      // Still show Admin products if API fails on shop page.
      const adminOnly = loadAdminProducts();
      if (adminOnly.length) {
        lastApiProducts = [];
        renderProducts(adminOnly);
        setState({
          isLoading: false,
          error: "",
          items: adminOnly,
          total: adminOnly.length,
        });
        if (statusEl) {
          statusEl.textContent = `${adminOnly.length} Admin products · API unavailable`;
        }
        return;
      }
      let message = "We could not load the jewellery catalogue. Check your connection and try again.";
      if (err?.code === "ECONNABORTED") {
        message = "Loading took too long. Please refresh and try again.";
      } else if (err?.response?.status) {
        message = "Something went wrong while loading jewellery. Please try again.";
      }
      setState({ isLoading: false, error: message, items: null });
    }
  }

  function refreshMergedFromStorage() {
    if (!includeAdmin) return;
    const merged = mergeProducts(
      showLimit ? lastApiProducts.slice(0, showLimit) : lastApiProducts,
    );
    if (!merged.length && !lastApiProducts.length) return;
    renderProducts(merged);
    setState({ isLoading: false, error: "", items: merged, total: merged.length });
  }

  refreshBtn?.addEventListener("click", fetchJewellery);
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY || event.key === LEGACY_KEY) {
      refreshMergedFromStorage();
    }
  });
  // Same-tab Admin updates: poll storage lightly when returning to Shop.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && includeAdmin) {
      refreshMergedFromStorage();
    }
  });
  fetchJewellery();
})();
