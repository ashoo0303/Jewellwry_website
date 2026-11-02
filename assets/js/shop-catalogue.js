(() => {
  "use strict";

  const STORAGE_KEY = "aurelia.products.v1";
  const LEGACY_KEY = "aurelia.catalogue.v1";

  const $ = (selector, scope = document) => scope.querySelector(selector);

  const grid = $("#shop-grid");
  const emptyEl = $("#shop-empty");
  const searchInput = $("#shop-search");
  const categoryFilter = $("#shop-category-filter");
  const metalFilter = $("#shop-metal-filter");
  const sortSelect = $("#shop-sort");
  const countEl = $("#shop-count");

  if (!grid) return;

  const rootPrefix = document.body?.dataset.root || "";

  const seed = [
    {
      id: crypto.randomUUID(),
      name: "Aurora Solitaire Ring",
      category: "rings",
      metal: "white gold",
      price: 148000,
      stock: 4,
      notes: "Certified diamond, bridal favourite",
      image: "assets/images/ring-teal.jpg",
      createdAt: Date.now(),
    },
    {
      id: crypto.randomUUID(),
      name: "Perle Drop Earrings",
      category: "earrings",
      metal: "pearl",
      price: 38000,
      stock: 8,
      notes: "Freshwater pearls with gold posts",
      image: "assets/images/earrings-white-box.jpg",
      createdAt: Date.now(),
    },
    {
      id: crypto.randomUUID(),
      name: "Blush Clover Set",
      category: "sets",
      metal: "18K gold",
      price: 124000,
      stock: 3,
      notes: "Necklace, earrings and ring set",
      image: "assets/images/jewelry-set-green.jpg",
      createdAt: Date.now(),
    },
  ];

  function resolveImage(src) {
    if (!src) return "";
    if (/^(data:|https?:|blob:)/i.test(src) || src.startsWith("../") || src.startsWith("/")) {
      return src;
    }
    return `${rootPrefix}${src}`;
  }

  const CATEGORY_IMAGES = {
    rings: "assets/images/ring-teal.jpg",
    earrings: "assets/images/earrings-white-box.jpg",
    sets: "assets/images/jewelry-set-green.jpg",
    necklaces: "assets/images/necklace-pastel.jpg",
    bracelets: "assets/images/bracelet-white.jpg",
  };

  function withDefaults(list) {
    const byName = Object.fromEntries(seed.map((item) => [item.name.toLowerCase(), item]));
    return list.map((item) => {
      const fallback = byName[String(item.name || "").toLowerCase()];
      return {
        ...item,
        stock: Number.isFinite(Number(item.stock)) ? Number(item.stock) : fallback?.stock ?? 5,
        image: item.image || fallback?.image || CATEGORY_IMAGES[item.category] || "",
      };
    });
  }

  function loadRecords() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
      if (!raw) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
        return [...seed];
      }
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : [...seed];
      return withDefaults(list);
    } catch {
      return [...seed];
    }
  }

  function formatPrice(amount) {
    return `Rs. ${Number(amount).toLocaleString("en-US")}`;
  }

  function applyUrlCategory() {
    const params = new URLSearchParams(window.location.search);
    const category = params.get("category");
    if (category && categoryFilter && [...categoryFilter.options].some((opt) => opt.value === category)) {
      categoryFilter.value = category;
    }
  }

  function getFiltered(records) {
    const query = (searchInput?.value || "").trim().toLowerCase();
    const category = categoryFilter?.value || "all";
    const metal = metalFilter?.value || "all";
    const sort = sortSelect?.value || "newest";

    const filtered = records.filter((item) => {
      const matchesCategory = category === "all" || item.category === category;
      const matchesMetal = metal === "all" || item.metal === metal;
      if (!matchesCategory || !matchesMetal) return false;
      if (!query) return true;
      return [item.name, item.category, item.metal, item.notes, String(item.price)].some((field) =>
        String(field || "")
          .toLowerCase()
          .includes(query),
      );
    });

    const sorted = [...filtered];
    if (sort === "price-asc") sorted.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") sorted.sort((a, b) => b.price - a.price);
    else if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else sorted.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return sorted;
  }

  function render() {
    const records = loadRecords();
    const filtered = getFiltered(records);
    const inStockCount = filtered.filter((item) => Number(item.stock) > 0).length;

    if (countEl) {
      countEl.textContent =
        records.length === 0
          ? "No products yet — open Admin to add pieces."
          : `${filtered.length} of ${records.length} piece${records.length === 1 ? "" : "s"} · ${inStockCount} in stock`;
    }

    emptyEl?.classList.toggle("hidden", filtered.length > 0);
    grid.classList.toggle("hidden", filtered.length === 0);

    grid.replaceChildren(
      ...filtered.map((item) => {
        const article = document.createElement("article");
        article.className = "card group overflow-hidden transition hover:-translate-y-1";

        const imageSrc = resolveImage(item.image);
        const inStock = Number(item.stock) > 0;

        const figure = document.createElement("figure");
        figure.className = "relative aspect-[4/5] overflow-hidden bg-sand";
        if (imageSrc) {
          const img = document.createElement("img");
          img.src = imageSrc;
          img.alt = item.name;
          img.loading = "lazy";
          img.className = "size-full object-cover transition duration-500 group-hover:scale-105";
          figure.append(img);
        } else {
          figure.classList.add("grid", "place-items-center", "text-ink-400");
          figure.textContent = "No image";
        }

        const badge = document.createElement("span");
        badge.className =
          "absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider " +
          (inStock ? "bg-white/95 text-ink-800" : "bg-ink-900/90 text-white");
        badge.textContent = inStock ? `${item.stock} in stock` : "Sold out";
        figure.append(badge);
        article.append(figure);

        const body = document.createElement("div");
        body.className = "p-6";

        const meta = document.createElement("p");
        meta.className = "text-xs uppercase tracking-widest text-ink-400";
        meta.textContent = `${item.category} · ${item.metal}`;

        const title = document.createElement("h3");
        title.className = "mt-2 font-serif text-xl text-ink-900";
        title.textContent = item.name;

        const notes = document.createElement("p");
        notes.className = "mt-3 line-clamp-2 text-sm leading-relaxed text-ink-600";
        notes.textContent = item.notes || "Handcrafted jewellery from Aurelia Jewels.";

        const footer = document.createElement("div");
        footer.className = "mt-5 flex items-center justify-between gap-3";

        const price = document.createElement("p");
        price.className = "font-semibold text-ink-900";
        price.textContent = formatPrice(item.price);

        const addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.className = "btn btn-dark !px-4 !py-2 !text-xs";
        addBtn.textContent = inStock ? "Add to bag" : "Unavailable";
        addBtn.disabled = !inStock;
        if (inStock) {
          addBtn.dataset.addToCart = "";
          addBtn.dataset.id = item.id;
          addBtn.dataset.name = item.name;
          addBtn.dataset.price = String(item.price);
          addBtn.dataset.img = imageSrc || item.image || "";
        }

        footer.append(price, addBtn);
        body.append(meta, title, notes, footer);
        article.append(body);
        return article;
      }),
    );
  }

  applyUrlCategory();
  searchInput?.addEventListener("input", render);
  categoryFilter?.addEventListener("change", render);
  metalFilter?.addEventListener("change", render);
  sortSelect?.addEventListener("change", render);
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY || event.key === LEGACY_KEY) render();
  });

  render();
})();
