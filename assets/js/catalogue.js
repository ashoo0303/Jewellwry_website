(() => {
  "use strict";

  const STORAGE_KEY = "aurelia.catalogue.v1";
  const CATEGORIES = ["rings", "necklaces", "earrings", "bracelets", "sets"];
  const METALS = ["22K gold", "18K gold", "14K gold", "white gold", "rose gold", "pearl", "diamond"];

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const form = $("#catalogue-form");
  const listEl = $("#catalogue-list");
  const emptyEl = $("#catalogue-empty");
  const searchInput = $("#catalogue-search");
  const categoryFilter = $("#catalogue-category-filter");
  const countEl = $("#catalogue-count");
  const submitBtn = $("#catalogue-submit");
  const cancelBtn = $("#catalogue-cancel");
  const formTitle = $("#catalogue-form-title");
  const idField = $("#record-id");

  if (!form || !listEl) return;

  const seed = [
    {
      id: crypto.randomUUID(),
      name: "Aurora Solitaire Ring",
      category: "rings",
      metal: "white gold",
      price: 148000,
      notes: "Certified diamond, bridal favourite",
      createdAt: Date.now(),
    },
    {
      id: crypto.randomUUID(),
      name: "Perle Drop Earrings",
      category: "earrings",
      metal: "pearl",
      price: 38000,
      notes: "Freshwater pearls with gold posts",
      createdAt: Date.now(),
    },
    {
      id: crypto.randomUUID(),
      name: "Blush Clover Set",
      category: "sets",
      metal: "18K gold",
      price: 124000,
      notes: "Necklace, earrings and ring set",
      createdAt: Date.now(),
    },
  ];

  function loadRecords() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
        return [...seed];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [...seed];
    } catch {
      return [...seed];
    }
  }

  function saveRecords(records) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
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

  function resetForm() {
    form.reset();
    idField.value = "";
    formTitle.textContent = "Add a new piece";
    submitBtn.textContent = "Add to catalogue";
    cancelBtn.classList.add("hidden");
    $$("[aria-invalid]", form).forEach((field) => field.removeAttribute("aria-invalid"));
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
      toast("A piece with this name already exists.");
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

  function render() {
    const filtered = getFilteredRecords();

    if (countEl) {
      countEl.textContent = `${filtered.length} of ${records.length} piece${records.length === 1 ? "" : "s"}`;
    }

    if (emptyEl) emptyEl.classList.toggle("hidden", filtered.length > 0);
    listEl.classList.toggle("hidden", filtered.length === 0);

    listEl.replaceChildren(
      ...filtered.map((item) => {
        const article = document.createElement("article");
        article.className = "card overflow-hidden p-5";
        article.dataset.id = item.id;

        article.innerHTML = `
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs uppercase tracking-widest text-ink-400">${item.category} · ${item.metal}</p>
              <h3 class="mt-1 font-serif text-xl text-ink-900"></h3>
              <p class="mt-2 text-sm leading-relaxed text-ink-600"></p>
            </div>
            <p class="font-semibold text-ink-900">${formatPrice(item.price)}</p>
          </div>
          <div class="mt-5 flex flex-wrap gap-2">
            <button type="button" class="btn btn-outline !px-4 !py-2 !text-xs" data-edit>Edit</button>
            <button type="button" class="btn btn-dark !px-4 !py-2 !text-xs" data-delete>Delete</button>
          </div>
        `;

        article.querySelector("h3").textContent = item.name;
        article.querySelector("p.mt-2").textContent = item.notes || "No notes added.";
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
    form.elements.notes.value = record.notes || "";
    formTitle.textContent = "Update piece";
    submitBtn.textContent = "Save changes";
    cancelBtn.classList.remove("hidden");
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const editingId = idField.value || null;
    const payload = {
      id: editingId,
      name: form.elements.name.value.trim(),
      category: form.elements.category.value,
      metal: form.elements.metal.value,
      price: Number(form.elements.price.value),
      notes: form.elements.notes.value.trim(),
    };

    if (!validatePayload(payload)) return;

    if (editingId) {
      const existing = records.find((item) => item.id === editingId);
      if (!existing) {
        toast("Record not found.");
        resetForm();
        render();
        return;
      }
      records = records.map((item) =>
        item.id === editingId
          ? { ...item, ...payload, updatedAt: Date.now() }
          : item,
      );
      toast("Piece updated successfully.");
    } else {
      records = [
        {
          ...payload,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
        },
        ...records,
      ];
      toast("Piece added to catalogue.");
    }

    saveRecords(records);
    resetForm();
    render();
  });

  cancelBtn?.addEventListener("click", () => {
    resetForm();
  });

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
      const confirmed = window.confirm(`Delete "${record.name}" from the catalogue?`);
      if (!confirmed) return;
      records = records.filter((item) => item.id !== id);
      saveRecords(records);
      if (idField.value === id) resetForm();
      toast("Piece deleted.");
      render();
    }
  });

  searchInput?.addEventListener("input", render);
  categoryFilter?.addEventListener("change", render);

  $("#catalogue-clear-all")?.addEventListener("click", () => {
    if (!records.length) return;
    const confirmed = window.confirm("Clear the entire catalogue? This cannot be undone.");
    if (!confirmed) return;
    records = [];
    saveRecords(records);
    resetForm();
    toast("Catalogue cleared.");
    render();
  });

  $("#catalogue-reset-seed")?.addEventListener("click", () => {
    records = seed.map((item) => ({ ...item, id: crypto.randomUUID() }));
    saveRecords(records);
    resetForm();
    toast("Sample pieces restored.");
    render();
  });

  void METALS;
  render();
})();
