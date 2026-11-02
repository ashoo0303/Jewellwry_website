(() => {
  "use strict";

  const STORAGE_KEY = "aurelia.products.v1";
  const LEGACY_KEY = "aurelia.catalogue.v1";
  const CATEGORIES = ["rings", "necklaces", "earrings", "bracelets", "sets"];
  const MAX_IMAGE_BYTES = 800 * 1024;

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const rootPrefix = document.body?.dataset.root || "";

  const form = $("#admin-form");
  const listEl = $("#admin-list");
  const emptyEl = $("#admin-empty");
  const searchInput = $("#admin-search");
  const categoryFilter = $("#admin-category-filter");
  const countEl = $("#admin-count");
  const submitBtn = $("#admin-submit");
  const cancelBtn = $("#admin-cancel");
  const formTitle = $("#admin-form-title");
  const idField = $("#admin-record-id");
  const statsTotal = $("#admin-stat-total");
  const statsValue = $("#admin-stat-value");
  const imageFileInput = $("#admin-image-file");
  const imageUrlInput = $("#admin-image-url");
  const imagePreview = $("#admin-image-preview");
  const imagePreviewWrap = $("#admin-image-preview-wrap");
  const imageClearBtn = $("#admin-image-clear");

  if (!form || !listEl) return;

  let pendingImage = "";

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

  function readRaw(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  const CATEGORY_IMAGES = {
    rings: "assets/images/ring-teal.jpg",
    earrings: "assets/images/earrings-white-box.jpg",
    sets: "assets/images/jewelry-set-green.jpg",
    necklaces: "assets/images/necklace-pastel.jpg",
    bracelets: "assets/images/bracelet-white.jpg",
  };

  function withDefaultImages(list) {
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
    const current = readRaw(STORAGE_KEY);
    if (current) {
      const hydrated = withDefaultImages(current);
      if (hydrated.some((item, index) => item.image && item.image !== current[index]?.image)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(hydrated));
      }
      return hydrated;
    }

    const legacy = readRaw(LEGACY_KEY);
    if (legacy) {
      const hydrated = withDefaultImages(legacy);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(hydrated));
      return hydrated;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return [...seed];
  }

  function saveRecords(records) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      return true;
    } catch {
      toast("Storage is full. Use a smaller image (under 800 KB) or an image URL.");
      return false;
    }
  }

  let records = loadRecords();

  function formatPrice(amount) {
    return `Rs. ${Number(amount).toLocaleString("en-US")}`;
  }

  function toast(message) {
    const region = $("#toast-region");
    if (!region) return;
    const el = document.createElement("div");
    el.className =
      "pointer-events-auto flex max-w-md items-center gap-2 rounded-full bg-ink-900 px-5 py-3 text-sm text-white shadow-soft";
    el.textContent = message;
    region.append(el);
    window.setTimeout(() => el.remove(), 2600);
  }

  function setPreview(src) {
    pendingImage = src || "";
    if (!imagePreview || !imagePreviewWrap) return;
    if (pendingImage) {
      imagePreview.src = resolveImage(pendingImage);
      imagePreviewWrap.classList.remove("hidden");
    } else {
      imagePreview.removeAttribute("src");
      imagePreviewWrap.classList.add("hidden");
    }
  }

  function resetForm() {
    form.reset();
    idField.value = "";
    formTitle.textContent = "Add product";
    submitBtn.textContent = "Add product";
    cancelBtn.classList.add("hidden");
    setPreview("");
  }

  function validatePayload(payload) {
    const requiredFilled = [payload.name, payload.category, payload.metal, payload.price].every(
      (value) => value !== "" && value !== null && value !== undefined,
    );
    if (!requiredFilled) {
      toast("Please fill in name, category, metal and price.");
      return false;
    }
    if (!Number.isFinite(payload.price) || payload.price <= 0) {
      toast("Price must be a positive number.");
      return false;
    }
    if (!Number.isFinite(payload.stock) || payload.stock < 0) {
      toast("Stock must be zero or a positive number.");
      return false;
    }
    if (!CATEGORIES.includes(payload.category)) {
      toast("Please choose a valid category.");
      return false;
    }
    const duplicate = records.some(
      (item) =>
        item.id !== payload.id &&
        item.name.trim().toLowerCase() === payload.name.trim().toLowerCase(),
    );
    if (duplicate) {
      toast("A product with this name already exists.");
      return false;
    }
    return true;
  }

  function getFilteredRecords() {
    const query = (searchInput?.value || "").trim().toLowerCase();
    const category = categoryFilter?.value || "all";

    return records.filter((item) => {
      const matchesCategory = category === "all" || item.category === category;
      if (!matchesCategory) return false;
      if (!query) return true;
      return [item.name, item.category, item.metal, item.notes, String(item.price)].some((field) =>
        String(field || "")
          .toLowerCase()
          .includes(query),
      );
    });
  }

  function updateStats() {
    if (statsTotal) statsTotal.textContent = String(records.length);
    if (statsValue) {
      const total = records.reduce((sum, item) => sum + Number(item.price || 0), 0);
      statsValue.textContent = formatPrice(total);
    }
  }

  function render() {
    const filtered = getFilteredRecords();
    updateStats();

    if (countEl) {
      countEl.textContent = `${filtered.length} of ${records.length} product${records.length === 1 ? "" : "s"}`;
    }

    if (emptyEl) emptyEl.classList.toggle("hidden", filtered.length > 0);
    listEl.classList.toggle("hidden", filtered.length === 0);

    listEl.replaceChildren(
      ...filtered.map((item) => {
        const article = document.createElement("article");
        article.className =
          "card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-soft";
        article.dataset.id = item.id;

        const imageSrc = resolveImage(item.image);
        const media = imageSrc
          ? `<img src="${imageSrc}" alt="" class="size-full object-cover transition duration-500 group-hover:scale-105">`
          : `<div class="grid size-full place-items-center text-sm text-ink-400">
               <span class="flex flex-col items-center gap-2">
                 <svg class="size-8 text-ink-300" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#i-sparkles"/></svg>
                 Add an image
               </span>
             </div>`;

        article.innerHTML = `
          <figure class="relative aspect-[4/5] overflow-hidden bg-sand">${media}</figure>
          <div class="p-5">
            <p data-meta class="text-xs uppercase tracking-widest text-ink-400"></p>
            <div class="mt-2 flex items-start justify-between gap-3">
              <h3 data-name class="font-serif text-xl leading-snug text-ink-900"></h3>
              <p data-price class="shrink-0 pt-1 text-sm font-semibold text-ink-900"></p>
            </div>
            <p data-stock class="mt-1 text-xs font-medium text-ink-500"></p>
            <p data-notes class="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-600"></p>
            <div class="mt-5 flex gap-2">
              <button type="button" class="btn btn-outline !flex-1 !px-4 !py-2.5 !text-xs" data-edit>Edit</button>
              <button type="button" class="btn btn-dark !flex-1 !px-4 !py-2.5 !text-xs" data-delete>Delete</button>
            </div>
          </div>
        `;

        const stockQty = Number.isFinite(Number(item.stock)) ? Number(item.stock) : 0;
        article.querySelector("[data-meta]").textContent = `${item.category} · ${item.metal}`;
        article.querySelector("[data-name]").textContent = item.name;
        article.querySelector("[data-notes]").textContent = item.notes || "No description added.";
        article.querySelector("[data-price]").textContent = formatPrice(item.price);
        article.querySelector("[data-stock]").textContent =
          stockQty > 0 ? `Stock: ${stockQty}` : "Out of stock";
        return article;
      }),
    );
  }

  function fillForm(record) {
    idField.value = record.id;
    form.elements.name.value = record.name;
    form.elements.category.value = record.category;
    form.elements.metal.value = record.metal;
    form.elements.price.value = record.price;
    form.elements.stock.value = Number.isFinite(Number(record.stock)) ? record.stock : 0;
    form.elements.notes.value = record.notes || "";
    if (imageFileInput) imageFileInput.value = "";
    if (imageUrlInput) {
      imageUrlInput.value =
        record.image && /^(https?:)/i.test(record.image) ? record.image : "";
    }
    setPreview(record.image || "");
    formTitle.textContent = "Update product";
    submitBtn.textContent = "Save changes";
    cancelBtn.classList.remove("hidden");
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not read image file."));
      reader.readAsDataURL(file);
    });
  }

  imageFileInput?.addEventListener("change", async () => {
    const file = imageFileInput.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Please choose an image file.");
      imageFileInput.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast("Image is too large. Please use a file under 800 KB.");
      imageFileInput.value = "";
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (imageUrlInput) imageUrlInput.value = "";
      setPreview(dataUrl);
      toast("Image ready to save with the product.");
    } catch {
      toast("Could not read that image. Try another file.");
      imageFileInput.value = "";
    }
  });

  imageUrlInput?.addEventListener("input", () => {
    const url = imageUrlInput.value.trim();
    if (!url) {
      if (!imageFileInput?.files?.length) setPreview("");
      return;
    }
    if (imageFileInput) imageFileInput.value = "";
    setPreview(url);
  });

  imageClearBtn?.addEventListener("click", () => {
    if (imageFileInput) imageFileInput.value = "";
    if (imageUrlInput) imageUrlInput.value = "";
    setPreview("");
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const editingId = idField.value || null;
    const urlValue = imageUrlInput?.value.trim() || "";
    const image = pendingImage || urlValue || "";

    const payload = {
      id: editingId,
      name: form.elements.name.value.trim(),
      category: form.elements.category.value,
      metal: form.elements.metal.value,
      price: Number(form.elements.price.value),
      stock: Number(form.elements.stock.value),
      notes: form.elements.notes.value.trim(),
      image,
    };

    if (!validatePayload(payload)) return;

    if (editingId) {
      const existing = records.find((item) => item.id === editingId);
      if (!existing) {
        toast("Product not found.");
        resetForm();
        render();
        return;
      }
      const next = records.map((item) =>
        item.id === editingId ? { ...item, ...payload, updatedAt: Date.now() } : item,
      );
      if (!saveRecords(next)) return;
      records = next;
      toast("Product updated.");
    } else {
      const next = [
        {
          ...payload,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
        },
        ...records,
      ];
      if (!saveRecords(next)) return;
      records = next;
      toast("Product added.");
    }

    resetForm();
    render();
  });

  cancelBtn?.addEventListener("click", resetForm);

  listEl.addEventListener("click", (event) => {
    const card = event.target.closest("[data-id]");
    if (!card) return;
    const id = card.dataset.id;

    if (event.target.closest("[data-edit]")) {
      const record = records.find((item) => item.id === id);
      if (record) fillForm(record);
      return;
    }

    if (event.target.closest("[data-delete]")) {
      const record = records.find((item) => item.id === id);
      if (!record) return;
      if (!window.confirm(`Delete "${record.name}" from the store?`)) return;
      records = records.filter((item) => item.id !== id);
      saveRecords(records);
      if (idField.value === id) resetForm();
      toast("Product deleted.");
      render();
    }
  });

  searchInput?.addEventListener("input", render);
  categoryFilter?.addEventListener("change", render);

  $("#admin-clear-all")?.addEventListener("click", () => {
    if (!records.length) return;
    if (!window.confirm("Clear all products? This also clears the public catalogue.")) return;
    records = [];
    saveRecords(records);
    resetForm();
    toast("All products cleared.");
    render();
  });

  $("#admin-reset-seed")?.addEventListener("click", () => {
    records = seed.map((item) => ({ ...item, id: crypto.randomUUID() }));
    saveRecords(records);
    resetForm();
    toast("Sample products restored.");
    render();
  });

  render();
})();
