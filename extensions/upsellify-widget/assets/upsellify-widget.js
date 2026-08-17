(function () {
  "use strict";
  if (!window.location.pathname.includes("/products/")) return;
  if (window.__selleasyInited) return;
  window.__selleasyInited = true;

  const handle = window.location.pathname.split("/products/")[1]?.split("/")[0]?.split("?")[0];
  if (!handle) return;

  const ROUTES = {
    product: (h) => `/products/${h}.js`,
    campaigns: (pid) => `/apps/selleasy/campaigns?productId=${pid}`,
    cartAdd: "/cart/add.js",
    cart: "/cart",
  };

  const state = {
    trigger: null,
    offers: [],
    campaign: null,
    currency: "USD",
    mountEl: null,
    currentTierIdx: 0,
    layoutType: "FBT_LIST",
    i18n: null,
    popupOverlay: null,
    popupHandled: false,
  };

  // Campaign types shown as a popup on Add to Cart click, instead of inline
  // on the page. Same widget content/logic, different trigger + presentation.
  const POPUP_TYPES = ["FBT_ATC_POPUP", "ADDON_POPUP", "PRODUCT_UPSELL_POPUP"];
  const isPopupType = (t) => POPUP_TYPES.indexOf(t) !== -1;

  const DEFAULT_I18N = {
    note: "Selected items will be added to cart.",
    total: "Total",
    adding: "Adding...",
    select_at_least_one: "Please select at least one item.",
    sold_out_option_suffix: " — Sold out",
    sold_out_items: "%%items%% sold out.",
    could_not_add: "Could not add the bundle.",
    bundle_fallback: "Bundle",
    bundle_property_label: "Bundle",
    tier_buy_get: "Buy %%min_items%%, get %%value%%",
  };

  function readI18n(el) {
    let parsed = {};
    try {
      parsed = JSON.parse(el.dataset.i18n || "{}");
    } catch (e) {
      // fall back to defaults if the theme hasn't re-rendered the block yet
    }
    return { ...DEFAULT_I18N, ...parsed };
  }

  const money = (cents, currency) =>
    new Intl.NumberFormat(document.documentElement.lang || "en", {
      style: "currency", currency: currency || "USD",
    }).format((cents || 0) / 100);
  const escapeHtml = (s) =>
    String(s || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  const getVariant = (p, id) =>
    p.variants.find((v) => v.id === Number(id)) || p.variants[0];

  // ── Bootstrap
  fetch(ROUTES.product(handle))
    .then((r) => r.json())
    .then(async (product) => {
      const res = await fetch(ROUTES.campaigns(product.id), { credentials: "same-origin" })
        .then((r) => r.json()).catch(() => ({ campaigns: [] }));
      const campaign = res.campaigns?.[0];
      if (!campaign) return;

      state.campaign = campaign;
      state.layoutType = campaign.type || "FBT_LIST";

      state.trigger = {
        product,
        selectedVariantId: product.variants[0].id,
        quantity: 1,
        selected: true,
      };

      const offers = await Promise.all(
        campaign.offers.map((o) =>
          fetch(ROUTES.product(o.handle)).then((r) => r.json()).catch(() => null),
        ),
      );

      state.offers = offers.filter(Boolean).map((p) => {
        let variantId = p.variants[0].id;
        if (campaign.settings?.autoMatchVariants) {
          const triggerVariantName = product.variants[0].title;
          const match = p.variants.find((v) => v.title === triggerVariantName);
          if (match) variantId = match.id;
        }
        return {
          product: p,
          selected: !campaign.settings?.doNotPreselect,
          selectedVariantId: variantId,
          quantity: 1,
        };
      });

      mount();
    })
    .catch((e) => console.error("[selleasy]", e));

  function mount() {
    const block = document.querySelector("[data-selleasy-block]");
    const embed = document.querySelector("[data-selleasy-embed]");
    if (block) {
      state.mountEl = block;
      if (embed) embed.style.display = "none";
    } else if (embed) {
      state.mountEl = embed;
      const target =
        document.querySelector("form[action*='/cart/add']") ||
        document.querySelector("main");
      if (target?.parentNode) target.parentNode.insertBefore(embed, target.nextSibling);
    } else return;

    state.i18n = readI18n(state.mountEl);

    if (isPopupType(state.layoutType)) {
      setupPopup();
    } else {
      applyAppearance();
      render();
    }
  }

  // ── Popup presentation (FBT_ATC_POPUP / ADDON_POPUP / PRODUCT_UPSELL_POPUP) ──
  // Same render()/addBundleToCart() logic as the inline widget — only the
  // trigger (intercepting the page's Add to Cart form) and container
  // (a modal instead of the placed block) differ. Inline campaign types are
  // completely untouched by this path.
  function setupPopup() {
    const placedBlock = state.mountEl;
    placedBlock.style.display = "none"; // the block stays in the DOM (theme editor needs it) but is never shown

    const overlay = document.createElement("div");
    overlay.className = "sl-fbt-popup-overlay";
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="sl-fbt-popup" role="dialog" aria-modal="true">
        <button type="button" class="sl-fbt-popup__close" aria-label="Close">&times;</button>
        <div class="sl-fbt-popup__body"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    state.popupOverlay = overlay;
    state.mountEl = overlay.querySelector(".sl-fbt-popup__body");
    applyAppearance();

    overlay.querySelector(".sl-fbt-popup__close").addEventListener("click", () => closePopup(true));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closePopup(true); });

    const form = document.querySelector("form[action*='/cart/add']");
    if (!form) return; // no page ATC form found — nothing to intercept, popup simply never opens

    form.addEventListener("submit", function (e) {
      if (state.popupHandled) return; // shopper already went through the popup — let this submit proceed normally
      e.preventDefault();
      e.stopPropagation();
      openPopup(form);
    }, true);
  }

  function openPopup(form) {
    // Reflect what the shopper actually picked on the page (variant/quantity)
    // as the trigger line, so the bundle matches their real selection.
    const qtyInput = form.querySelector("input[name=quantity]");
    if (qtyInput && Number(qtyInput.value) > 0) state.trigger.quantity = Number(qtyInput.value);
    const variantInput = form.querySelector("input[name=id], select[name=id]");
    if (variantInput && variantInput.value) {
      const vid = Number(variantInput.value);
      if (state.trigger.product.variants.some((v) => v.id === vid)) {
        state.trigger.selectedVariantId = vid;
      }
    }

    render();
    state.popupOverlay.hidden = false;
    document.body.classList.add("sl-fbt-popup-open");
  }

  function closePopup(fallThroughToNativeAdd) {
    if (!state.popupOverlay) return;
    state.popupOverlay.hidden = true;
    document.body.classList.remove("sl-fbt-popup-open");
    if (fallThroughToNativeAdd) {
      const form = document.querySelector("form[action*='/cart/add']");
      if (form) {
        state.popupHandled = true;
        if (typeof form.requestSubmit === "function") form.requestSubmit();
        else form.submit();
      }
    }
  }

  function applyAppearance() {
    const a = state.campaign.appearance || {};
    const root = state.mountEl;
    root.style.setProperty("--sl-accent", a.accentColor || "#000");
    root.style.setProperty("--sl-text", a.textColor || "#202020");
    root.style.setProperty("--sl-radius", `${a.borderRadius || 8}px`);
    if (a.fontFamily && a.fontFamily !== "inherit") {
      root.style.setProperty("--sl-font", a.fontFamily);
    }
  }

  function render() {
    const c = state.campaign;
    state.mountEl.innerHTML = `
      <div class="sl-fbt sl-fbt--${state.layoutType.toLowerCase().replace("fbt_", "")}">
        <div class="sl-fbt__head">
          <h3 class="sl-fbt__title">${escapeHtml(c.title)}</h3>
          ${c.subtitle ? `<p class="sl-fbt__subtitle">${escapeHtml(c.subtitle)}</p>` : ""}
        </div>
        ${renderTierTabs()}
        <div data-role="body"></div>
        <div class="sl-fbt__total" data-role="total"></div>
        <p class="sl-fbt__note">${escapeHtml(state.i18n.note)}</p>
        <div class="sl-fbt__error" data-role="error" hidden></div>
        <button class="sl-fbt__cta" type="button" data-role="cta">${escapeHtml(c.ctaLabel)}</button>
      </div>
    `;
    wireTierTabs();
    renderBody();
    renderTotal();
    state.mountEl.querySelector("[data-role=cta]").addEventListener("click", addBundleToCart);
  }

  function renderTierTabs() {
    const d = state.campaign.discount;
    if (!d || d.type !== "TIERED" || !d.tiers?.length) return "";
    return `
      <div class="sl-fbt__tiers">
        ${d.tiers.map((t, i) => `
          <button class="sl-fbt__tier ${i === state.currentTierIdx ? "is-active" : ""}" data-tier="${i}" type="button">
            ${escapeHtml(t.label || state.i18n.tier_buy_get
              .replace("%%min_items%%", t.minItems)
              .replace("%%value%%", `${t.value}${t.valueType === "PERCENTAGE" ? "%" : ""}`))}
          </button>
        `).join("")}
      </div>
    `;
  }

  function wireTierTabs() {
    state.mountEl.querySelectorAll("[data-tier]").forEach((b) => {
      b.addEventListener("click", () => {
        state.currentTierIdx = Number(b.dataset.tier);
        render();
      });
    });
  }

  function renderBody() {
    const el = state.mountEl.querySelector("[data-role=body]");
    if (state.layoutType === "FBT_AMAZON") return renderAmazonLayout(el);
    if (state.layoutType === "FBT_CLASSIC") return renderClassicLayout(el);
    return renderListLayout(el);
  }

  function renderListLayout(el) {
    el.innerHTML = `
      <div data-role="trigger-row"></div>
      <div class="sl-fbt__plus">
        <svg viewBox="0 0 24 24" width="22" height="22">
          <circle cx="12" cy="12" r="11" fill="#fff" stroke="#d9d9d9"/>
          <line x1="7" y1="12" x2="17" y2="12" stroke="#333" stroke-width="1.6"/>
          <line x1="12" y1="7" x2="12" y2="17" stroke="#333" stroke-width="1.6"/>
        </svg>
      </div>
      <div data-role="offers"></div>
    `;
    renderRow(el.querySelector("[data-role=trigger-row]"), state.trigger, true);
    const offersEl = el.querySelector("[data-role=offers]");
    offersEl.innerHTML = "";
    state.offers.forEach((o, i) => {
      const d = document.createElement("div");
      if (i > 0) d.style.marginTop = "8px";
      offersEl.appendChild(d);
      renderRow(d, o, false, i);
    });
  }

  // function renderAmazonLayout(el) {
  //   const all = [state.trigger, ...state.offers];
  //   el.innerHTML = `
  //     <div class="sl-fbt__amazon">
  //       ${all.map((item, i) => {
  //         const img = item.product.featured_image || item.product.images?.[0];
  //         const isTrigger = i === 0;
  //         return `
  //           ${i > 0 ? `<span class="sl-fbt__amazon-plus">+</span>` : ""}
  //           <div class="sl-fbt__amazon-item ${!item.selected && !isTrigger ? "is-unchecked" : ""}">
  //             ${!isTrigger ? `
  //               <label class="sl-fbt__check sl-fbt__check--overlay">
  //                 <input type="checkbox" data-role="item-check" data-idx="${i - 1}" ${item.selected ? "checked" : ""} />
  //                 <span class="sl-fbt__box"></span>
  //               </label>` : ""}
  //             ${img ? `<img src="${img}" alt="" />` : `<div class="sl-fbt__img--ph"></div>`}
  //             <div class="sl-fbt__amazon-name">${escapeHtml(item.product.title)}</div>
  //             <div class="sl-fbt__price">${priceHTML(getVariant(item.product, item.selectedVariantId))}</div>
  //           </div>
  //         `;
  //       }).join("")}
  //     </div>
  //   `;
  //   el.querySelectorAll("input[data-role=item-check]").forEach((cb) => {
  //     cb.addEventListener("change", (e) => {
  //       state.offers[Number(e.target.dataset.idx)].selected = e.target.checked;
  //       renderBody();
  //       renderTotal();
  //     });
  //   });
  // }

  // function renderClassicLayout(el) {
  //   el.innerHTML = `
  //     <div class="sl-fbt__classic-grid">
  //       ${[state.trigger, ...state.offers].map((item, i, arr) => {
  //         const img = item.product.featured_image || item.product.images?.[0];
  //         return `
  //           <div class="sl-fbt__classic-tile">
  //             ${img ? `<img src="${img}" alt="" />` : `<div class="sl-fbt__img--ph"></div>`}
  //             ${i < arr.length - 1 ? `<span class="sl-fbt__plus-small">+</span>` : ""}
  //           </div>
  //         `;
  //       }).join("")}
  //     </div>
  //     <div data-role="classic-list"></div>
  //   `;
  //   const list = el.querySelector("[data-role=classic-list]");
  //   const tDiv = document.createElement("div");
  //   list.appendChild(tDiv);
  //   renderRow(tDiv, state.trigger, true);
  //   state.offers.forEach((o, i) => {
  //     const d = document.createElement("div");
  //     d.style.marginTop = "8px";
  //     list.appendChild(d);
  //     renderRow(d, o, false, i);
  //   });
  // }

  function renderRow(el, item, isTrigger, offerIdx) {
    const s = state.campaign.settings || {};
    const v = getVariant(item.product, item.selectedVariantId);
    const img = item.product.featured_image || item.product.images?.[0];
    const canToggle = !isTrigger || s.allowDeselectTrigger;
    const showQty = s.showQuantityPicker;

    el.innerHTML = `
      <div class="sl-fbt__row ${isTrigger ? "sl-fbt__row--trigger" : ""} ${!item.selected ? "is-unchecked" : ""}">
        ${canToggle ? `
          <label class="sl-fbt__check">
            <input type="checkbox" data-role="row-check" data-trigger="${isTrigger}" data-idx="${offerIdx ?? ""}" ${item.selected ? "checked" : ""} />
            <span class="sl-fbt__box"></span>
          </label>` : `<span class="sl-fbt__check-placeholder"></span>`}
        ${img ? `<img class="sl-fbt__img" src="${img}" alt="" />` : `<div class="sl-fbt__img sl-fbt__img--ph"></div>`}
        <div class="sl-fbt__meta">
          <div class="sl-fbt__name">${escapeHtml(item.product.title)}</div>
          ${renderVariantSelect(item.product, item.selectedVariantId, isTrigger, offerIdx)}
        </div>
        ${showQty ? `
          <div class="sl-fbt__qty">
            <button type="button" data-role="qty-dec" data-trigger="${isTrigger}" data-idx="${offerIdx ?? ""}">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-role="qty-inc" data-trigger="${isTrigger}" data-idx="${offerIdx ?? ""}">+</button>
          </div>` : ""}
        <div class="sl-fbt__price">${priceHTML(v)}</div>
      </div>
    `;
    wireRow(el);
  }

  function wireRow(el) {
    el.querySelectorAll("input[data-role=row-check]").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const isT = e.target.dataset.trigger === "true";
        const idx = e.target.dataset.idx === "" ? null : Number(e.target.dataset.idx);
        if (isT) state.trigger.selected = e.target.checked;
        else state.offers[idx].selected = e.target.checked;
        renderBody();
        renderTotal();
      });
    });
    el.querySelectorAll("select[data-role=variant]").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const isT = e.target.dataset.trigger === "true";
        const idx = e.target.dataset.idx === "" ? null : Number(e.target.dataset.idx);
        const id = Number(e.target.value);
        if (isT) state.trigger.selectedVariantId = id;
        else state.offers[idx].selectedVariantId = id;
        renderBody();
        renderTotal();
      });
    });
    el.querySelectorAll("[data-role=qty-inc], [data-role=qty-dec]").forEach((b) => {
      b.addEventListener("click", () => {
        const isT = b.dataset.trigger === "true";
        const idx = b.dataset.idx === "" ? null : Number(b.dataset.idx);
        const target = isT ? state.trigger : state.offers[idx];
        const delta = b.dataset.role === "qty-inc" ? 1 : -1;
        target.quantity = Math.max(1, target.quantity + delta);
        renderBody();
        renderTotal();
      });
    });
  }

  function renderVariantSelect(product, selectedId, isTrigger, offerIdx) {
    if (!product.variants || product.variants.length <= 1) return "";
    const opts = product.variants.map((v) =>
      `<option value="${v.id}" ${v.id === selectedId ? "selected" : ""}>${escapeHtml(v.title)}${v.available ? "" : escapeHtml(state.i18n.sold_out_option_suffix)}</option>`,
    ).join("");
    return `<select class="sl-fbt__variant" data-role="variant" data-trigger="${isTrigger}" data-idx="${offerIdx ?? ""}">${opts}</select>`;
  }

  function priceHTML(v) {
    if (!v) return "";
    const hasCompare = v.compare_at_price && v.compare_at_price > v.price;
    return `${hasCompare ? `<span class="sl-fbt__compare">${money(v.compare_at_price, state.currency)}</span>` : ""}<span class="sl-fbt__current">${money(v.price, state.currency)}</span>`;
  }

  function renderTotal() {
    const el = state.mountEl.querySelector("[data-role=total]");
    const items = buildCartItems();
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);

    const d = state.campaign.discount;
    let discountAmt = 0;
    let discountLabel = "";
    if (d && d.type !== "NONE") {
      let tier = null;
      if (d.type === "TIERED") {
        tier = [...d.tiers].filter((t) => totalQty >= t.minItems).sort((a, b) => b.minItems - a.minItems)[0];
      } else if (d.value) {
        tier = { value: d.value, valueType: d.type };
      }
      if (tier) {
        if (tier.valueType === "PERCENTAGE") {
          discountAmt = Math.round(subtotal * (tier.value / 100));
          discountLabel = `-${tier.value}%`;
        } else {
          discountAmt = Math.round(tier.value * 100);
          discountLabel = `-${money(discountAmt, state.currency)}`;
        }
      }
    }
    const total = Math.max(0, subtotal - discountAmt);

    el.innerHTML = `
      <div class="sl-fbt__total-row">
        <span class="sl-fbt__total-label">${escapeHtml(state.i18n.total)}</span>
        <span>
          ${discountAmt > 0 ? `<span class="sl-fbt__compare">${money(subtotal, state.currency)}</span> <span class="sl-fbt__discount-tag">${discountLabel}</span>` : ""}
          <span class="sl-fbt__total-val">${money(total, state.currency)}</span>
        </span>
      </div>
    `;
  }

  // function buildCartItems() {
  //   const raw = [];
  //   if (state.trigger.selected) {
  //     const v = getVariant(state.trigger.product, state.trigger.selectedVariantId);
  //     if (v) {
  //       raw.push({
  //         id: v.id, quantity: state.trigger.quantity,
  //         price: v.price, title: state.trigger.product.title, available: v.available,
  //       });
  //     }
  //   }
  //   state.offers.forEach((o) => {
  //     if (!o.selected) return;
  //     const v = getVariant(o.product, o.selectedVariantId);
  //     if (v) {
  //       raw.push({
  //         id: v.id, quantity: o.quantity,
  //         price: v.price, title: o.product.title, available: v.available,
  //       });
  //     }
  //   });
  //   const map = new Map();
  //   for (const it of raw) {
  //     if (map.has(it.id)) map.get(it.id).quantity += it.quantity;
  //     else map.set(it.id, { ...it });
  //   }
  //   return Array.from(map.values());
  // }

  // async function addBundleToCart() {
  //   const btn = state.mountEl.querySelector("[data-role=cta]");
  //   const errEl = state.mountEl.querySelector("[data-role=error]");
  //   errEl.hidden = true;
  //   const original = btn.textContent;
  //   btn.disabled = true;
  //   btn.textContent = "Adding...";

  //   try {
  //     const items = buildCartItems();
  //     if (!items.length) throw new Error("Please select at least one item.");
  //     const unavail = items.filter((i) => !i.available);
  //     if (unavail.length) {
  //       throw new Error(`${unavail.map((u) => `"${u.title}"`).join(", ")} sold out.`);
  //     }

  //     const res = await fetch(ROUTES.cartAdd, {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         Accept: "application/json",
  //         "X-Requested-With": "XMLHttpRequest",
  //       },
  //       body: JSON.stringify({
  //         items: items.map((i) => ({ id: i.id, quantity: i.quantity })),
  //       }),
  //     });
  //     const data = await res.json();
  //     if (!res.ok) throw new Error(data.description || data.message || `HTTP ${res.status}`);

  //     window.location.href = ROUTES.cart;
  //   } catch (e) {
  //     console.error("[selleasy]", e);
  //     errEl.textContent = e.message || "Could not add the bundle.";
  //     errEl.hidden = false;
  //     btn.disabled = false;
  //     btn.textContent = original;
  //   }
  // }
  function buildCartItems() {
    const items = [];

    if (state.trigger.selected) {
      const v = getVariant(state.trigger.product, state.trigger.selectedVariantId);
      if (v) {
        items.push({
          id: v.id,
          quantity: state.trigger.quantity,
          price: v.price,
          title: state.trigger.product.title,
          available: v.available,
        });
      }
    }

    state.offers.forEach((o) => {
      if (!o.selected) return;
      const v = getVariant(o.product, o.selectedVariantId);
      if (v) {
        items.push({
          id: v.id,
          quantity: o.quantity,
          price: v.price,
          title: o.product.title,
          available: v.available,
        });
      }
    });

    // Note: NO deduplication. Each bundle item is a distinct cart line
    // because of the _bundle_id property.
    return items;
  }

  async function addBundleToCart() {
    const btn = state.mountEl.querySelector("[data-role=cta]");
    const errEl = state.mountEl.querySelector("[data-role=error]");
    errEl.hidden = true;
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = state.i18n.adding;

    try {
      const items = buildCartItems();
      if (!items.length) throw new Error(state.i18n.select_at_least_one);
      const unavail = items.filter((i) => !i.available);
      if (unavail.length) {
        const itemsStr = unavail.map((u) => `"${u.title}"`).join(", ");
        throw new Error(state.i18n.sold_out_items.replace("%%items%%", itemsStr));
      }

      const bundleId = `bundle_${state.campaign.id}_${Date.now()}`;
      const campaignName = state.campaign.title || state.i18n.bundle_fallback;

      // Detect which sections the theme uses
      const sectionsToRender = [];
      if (document.querySelector("cart-drawer") || document.querySelector("cart-drawer-component")) {
        sectionsToRender.push("cart-drawer");
      }
      if (document.getElementById("cart-icon-bubble") ||
          document.querySelector("[id*='cart-icon-bubble']")) {
        sectionsToRender.push("cart-icon-bubble");
      }

      const body = {
        items: items.map((i, index) => ({
          id: i.id,
          quantity: i.quantity,
          properties: {
            "_bundle_id": bundleId,
            "_bundle_campaign_id": state.campaign.id,
            "_bundle_role": index === 0 ? "trigger" : "offer",
            [state.i18n.bundle_property_label]: campaignName,
          },
        })),
      };

      // Ask Shopify to render the sections atomically with the add
      if (sectionsToRender.length) {
        body.sections = sectionsToRender.join(",");
        body.sections_url = window.location.pathname;
      }

      const addRes = await fetch(ROUTES.cartAdd, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify(body),
      });

      const addData = await addRes.json();
      if (!addRes.ok) {
        throw new Error(addData.description || addData.message || `HTTP ${addRes.status}`);
      }

      if (isPopupType(state.layoutType)) closePopup(false);

      // addData.sections is a map: { "cart-drawer": "<html>...</html>", "cart-icon-bubble": "..." }
      const opened = await openCartDrawer(addData.sections);
      if (!opened) {
        window.location.href = ROUTES.cart;
        return;
      }

      btn.disabled = false;
      btn.textContent = original;
    } catch (e) {
      console.error("[selleasy]", e);
      errEl.textContent = e.message || state.i18n.could_not_add;
      errEl.hidden = false;
      btn.disabled = false;
      btn.textContent = original;
    }
  }

  /**
   * Open the theme's cart drawer using section HTML returned from /cart/add.js.
   * Returns true if a drawer was opened, false if no drawer was found.
   */
  async function openCartDrawer(sections) {
    const cartDrawer = document.querySelector("cart-drawer") || document.querySelector("cart-drawer-component");

    if (cartDrawer && sections?.["cart-drawer"]) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(sections["cart-drawer"], "text/html");

        // Shopify returns the full section wrapper. The <cart-drawer> (or, on
        // Horizon, <cart-drawer-component>) element is usually nested one level inside that.
        const freshDrawer = doc.querySelector("cart-drawer") || doc.querySelector("cart-drawer-component");
        if (freshDrawer) {
          // Swap INNER contents of the live element (preserves the custom element
          // and its class listeners; replaces the empty-state template with items)
          cartDrawer.innerHTML = freshDrawer.innerHTML;

          // Remove the "is-empty" class if Dawn was showing empty state
          cartDrawer.classList.remove("is-empty");

          // Some Dawn forks use <cart-drawer-items> inside; re-trigger its connected logic
          cartDrawer.querySelectorAll("cart-drawer-items, cart-items").forEach((el) => {
            // Force the custom element to re-run its constructor-bound init
            if (typeof el.connectedCallback === "function") {
              try { el.connectedCallback(); } catch (e) {}
            }
          });
        }

        // Update the cart icon bubble
        if (sections["cart-icon-bubble"]) {
          const bubble = document.getElementById("cart-icon-bubble") ||
                         document.querySelector("[id*='cart-icon-bubble']");
          if (bubble) {
            const bubbleDoc = parser.parseFromString(sections["cart-icon-bubble"], "text/html");
            const freshBubble = bubbleDoc.querySelector("#cart-icon-bubble") ||
                                bubbleDoc.querySelector(".shopify-section");
            if (freshBubble) {
              bubble.innerHTML = freshBubble.innerHTML;
            }
          }
        }

        // Open the drawer
        if (typeof cartDrawer.open === "function") {
          cartDrawer.open();
        } else {
          cartDrawer.classList.add("active", "animate", "is-open");
          document.body.classList.add("overflow-hidden");
        }
        return true;
      } catch (e) {
        console.error("[selleasy] Dawn drawer update failed:", e);
      }
    }

    // ── Fallback: dispatch events and try theme APIs ──
    const eventNames = ["cart:refresh", "cart:updated", "cart:added", "cart:open", "cart-drawer:open"];
    eventNames.forEach((name) => {
      document.dispatchEvent(new CustomEvent(name, { bubbles: true }));
    });

    if (window.theme?.CartDrawer) {
      try { new window.theme.CartDrawer().open(); return true; } catch (e) {}
    }

    const triggerSelectors = [
      "[data-cart-drawer-toggle]",
      ".js-drawer-open-cart",
      "#CartDrawer-trigger",
      ".header__icon--cart",
      "a[href='/cart']",
    ];
    for (const sel of triggerSelectors) {
      const el = document.querySelector(sel);
      if (el) { try { el.click(); return true; } catch (e) {} }
    }

    return false;
  }
})();

// ── Cart Drawer Upsell ────────────────────────────────────────────────────
// Wrapped in an init() that can safely re-run: some themes (e.g. Shopify's
// newer component-based reference themes) navigate between pages by fetching
// and swapping in new HTML without a full page reload. A <script> tag inside
// that freshly-inserted HTML does NOT auto-execute (browsers only run
// <script> elements present at real load/parse time), so a plain run-once
// IIFE would silently stop working after the first soft navigation — the
// embed <div> reappears on each new page, but nothing re-initializes it. A
// MutationObserver watching for a fresh copy of that <div> re-runs init()
// whenever that happens, regardless of the theme's specific navigation
// mechanism.
(function () {
  "use strict";

  var watchedRoot = null;

  function init() {
  let busy = false; // one render at a time — no timers racing
  // Bumped on every render() call so an older, slower call can detect a
  // newer one has since started and skip painting its now-stale result —
  // otherwise out-of-order network responses (e.g. from Airdog's multiple
  // near-simultaneous cart-update triggers) can let an old render overwrite
  // a newer, correct one.
  let renderGen = 0;
  // Set right before WE mutate the drawer DOM (paint/removeWidget), so the
  // childList observer below can tell "our own injection/removal" apart from
  // a genuine external cart change — otherwise painting the widget triggers
  // the same observer that is supposed to react to the theme rebuilding the
  // cart, causing an endless render loop.
  let ignoreNextDrawerMutation = false;
  // If a DOM mutation arrives while a render is already in flight, that
  // in-flight render fetched /cart.js BEFORE this mutation happened, so it
  // cannot reflect it. Queue a follow-up render instead of dropping the
  // trigger — otherwise a removal during a busy window never gets picked
  // up until something else (like closing/reopening the drawer) forces a
  // fresh render.
  let needsRerender = false;

  // Product IDs added via this widget within the last few seconds, kept
  // client-side so a briefly-stale /cart.js response (CDN/edge caching) can't
  // cause the same item to reappear as an offer right after it was added.
  // Entries expire on their own, so once the shopper actually removes the
  // item, the exclusion naturally lifts and it's offered again.
  var recentAdds = new Map(); // productId (string) -> timestamp
  var RECENT_ADD_TTL_MS = 6000;

  function markRecentlyAdded(id) {
    recentAdds.set(String(id), Date.now());
  }
  function pruneAndCollectRecentAdds(freshCartIds) {
    var now = Date.now();
    var ids = [];
    // Once a fresh /cart.js fetch (cache-busted, so genuinely current) has had
    // a moment to reflect the add, trust it — if the id is no longer present,
    // the shopper removed it, and the exclusion should lift immediately rather
    // than waiting out the rest of the TTL. The short grace period only guards
    // against Shopify backend write-then-read propagation lag right after the
    // add itself, not CDN staleness (already defeated by the cache-bust param).
    var CONFIRM_GRACE_MS = 1500;
    recentAdds.forEach(function (ts, id) {
      var age = now - ts;
      if (age > RECENT_ADD_TTL_MS) { recentAdds.delete(id); return; }
      if (freshCartIds && age > CONFIRM_GRACE_MS && !freshCartIds.has(id)) {
        recentAdds.delete(id);
        return;
      }
      ids.push(id);
    });
    return ids;
  }

  // ── Tiny helpers ────────────────────────────────────────────────────────
  const fmt = (cents, cur) =>
    new Intl.NumberFormat(document.documentElement.lang || "en", {
      style: "currency", currency: cur || "USD",
    }).format((cents || 0) / 100);

  const esc = (s) =>
    String(s || "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  // ── DOM helpers ─────────────────────────────────────────────────────────
  const getDrawer = () =>
    document.querySelector("cart-drawer") ||
    document.querySelector("cart-drawer-component") ||
    document.querySelector(".cart-drawer") ||
    document.querySelector("#CartDrawer") ||
    document.querySelector("#AirdogCartDrawer"); // custom Airdog theme drawer

  // Some themes (Dawn-style) nest a <dialog> INSIDE the drawer custom element.
  // Newer theme frameworks (e.g. Shopify's `@theme/component`-based themes) do the
  // opposite: <cart-drawer-component> lives INSIDE an ancestor <dialog>, owned by a
  // <theme-drawer> wrapper. Check both directions.
  const getDialogOrSelf = (d) => {
    if (d.tagName === "DIALOG") return d;
    return d.closest("dialog") || d.querySelector("dialog") || d;
  };

  const getFooter = (d) => {
    const scope = getDialogOrSelf(d);
    return (
      scope.querySelector(".cart-drawer__summary") ||
      scope.querySelector(".drawer__footer") ||
      scope.querySelector(".cart__footer") ||
      scope.querySelector("[class*='subtotal']")
    );
  };

  const isOpen = (d) => {
    if (
      d.classList.contains("active") ||
      d.classList.contains("is-open") ||
      d.classList.contains("drawer--is-open") // Archetype themes (Motion, Impulse, Turbo, etc.)
    ) return true;
    if (d.getAttribute("aria-hidden") === "false") return true;
    // Airdog theme: the drawer's own aria-hidden never updates (a bug in
    // that theme) — visibility is actually tracked by removing `hidden`
    // from a separate overlay element instead.
    var airdogUI = document.getElementById("AirdogCartUI");
    if (airdogUI && airdogUI.classList.contains("is-open")) return true;
    var airdogOverlay = document.querySelector(".airdog-cart-overlay");
    if (airdogOverlay && !airdogOverlay.hasAttribute("hidden")) return true;
    // Ancestor <theme-drawer> tracks open state via an `open` attribute.
    const themeDrawer = d.closest("theme-drawer");
    if (themeDrawer && themeDrawer.hasAttribute("open")) return true;
    // The actual <dialog> — whether ancestor or descendant — reflects native `.open`.
    var dialog = d.tagName === "DIALOG" ? d : getDialogOrSelf(d);
    return !!(dialog && dialog.tagName === "DIALOG" && dialog.open);
  };

  const getWidget = () => document.querySelector("[data-sl-cu]");

  // ── Render ───────────────────────────────────────────────────────────────
  // forceExclude: Set of product ID strings to filter out even if /cart.js is stale
  async function render(forceExclude) {
    if (busy) return;
    busy = true;
    var myGen = ++renderGen;
    try {
      const d = getDrawer();
      if (!d || !isOpen(d)) return;

      // Timestamp busts Shopify's Fastly CDN cache on /cart.js
      const cart = await fetch("/cart.js?_=" + Date.now()).then((r) => r.json());
      if (myGen !== renderGen) return; // a newer render has since started — do not paint stale data
      if (!cart.items || !cart.items.length) { removeWidget(); return; }

      // Build three filter sets — any one match excludes the offer
      const byId    = new Set(cart.items.map((i) => String(i.product_id)));
      const byVar   = new Set(cart.items.map((i) => String(i.variant_id)));
      const byTitle = new Set(cart.items.map((i) => (i.product_title || i.title || "").toLowerCase().trim()));
      // Merge caller-supplied IDs and any not-yet-expired recent adds (guards
      // against a briefly-stale /cart.js response on any render trigger, not
      // just the one right after this widget's own "Add to Cart" click).
      if (forceExclude) forceExclude.forEach((id) => byId.add(id));
      const freshCartIds = new Set(cart.items.map((i) => String(i.product_id)));
      pruneAndCollectRecentAdds(freshCartIds).forEach((id) => byId.add(id));

      // Find campaign — check every cart item in parallel instead of one at a
      // time (this was the main source of slowness with multiple cart items).
      let campaign = null;
      try {
        var campaignResults = await Promise.all(
          cart.items.map((item) =>
            fetch(
              "/apps/selleasy/campaigns?productId=" + item.product_id + "&placement=CART_DRAWER",
              { credentials: "same-origin" }
            )
              .then((r) => r.json())
              .catch(() => null)
          )
        );
        for (var ri = 0; ri < campaignResults.length; ri++) {
          var found = campaignResults[ri] && campaignResults[ri].campaigns && campaignResults[ri].campaigns[0];
          if (found) { campaign = found; break; }
        }
      } catch (e) {}
      if (myGen !== renderGen) return; // a newer render has since started — do not paint stale data
      if (!campaign) { removeWidget(); return; }

      const cur = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || cart.currency || "USD";

      console.log("[selleasy cart] campaign:", campaign.id, "offer handles:", campaign.offers.map((o) => o.handle));

      // Fetch all offer products in parallel
      const products = await Promise.all(
        campaign.offers.map((o) =>
          fetch("/products/" + o.handle + ".js")
            .then((r) => r.json())
            .catch((e) => {
              console.error("[selleasy cart] failed to fetch product:", o.handle, e);
              return null;
            })
        )
      );

      console.log("[selleasy cart] fetched products:", products.map((p) => p && { id: p.id, title: p.title }));

      // Filter: exclude anything already in cart (three checks)
      const offers = products.filter(Boolean).filter((p) => {
        if (byId.has(String(p.id))) return false;
        if (p.variants && p.variants[0] && byVar.has(String(p.variants[0].id))) return false;
        if (byTitle.has((p.title || "").toLowerCase().trim())) return false;
        return true;
      });

      console.log("[selleasy cart] offers after filtering:", offers.map((p) => p.title));

      if (!offers.length) { removeWidget(); return; }

      if (myGen !== renderGen) return; // a newer render has since started — do not paint stale data
      paint(getDrawer(), campaign, offers, cur); // re-query drawer in case DOM changed during awaits
    } catch (e) {
      console.error("[selleasy cart] render() failed:", e);
    } finally {
      busy = false;
      if (needsRerender) { needsRerender = false; trigger(); }
    }
  }

  function removeWidget() {
    var w = getWidget();
    if (w) {
      ignoreNextDrawerMutation = true;
      w.parentNode.removeChild(w);
    }
  }

  function paint(d, campaign, offers, cur) {
    if (!d) return;

    // Campaign discount (percentage-only here, matching the same simplified
    // pattern already used for the add-on layouts elsewhere in this file).
    var cDiscount = campaign.discount;
    var discountPct = cDiscount && cDiscount.type === "PERCENTAGE" && cDiscount.value ? cDiscount.value : 0;

    // "HORIZONTAL" (default) is the existing card carousel; "VERTICAL" reuses
    // the exact same card markup/classes (so ATC/variant-select wiring below
    // needs no changes) with a row modifier class laid out via CSS instead.
    var layout = (campaign.settings && campaign.settings.cartOfferLayout) === "VERTICAL" ? "VERTICAL" : "HORIZONTAL";
    var cardClass = layout === "VERTICAL" ? "sl-cu__card sl-cu__card--row" : "sl-cu__card";

    var cardsHtml = offers.map((p) => {
      console.log("[selleasy cart] painting card for product:", p.id, "title:", p.title);
      var variants = p.variants || [];
      var multiVariant = variants.length > 1;
      // Start with first available variant so the button isn't disabled by default
      var v = variants.find(function(vv) { return vv.available; }) || variants[0];
      var img = p.featured_image || (p.images && p.images[0]);

      var rawPrice = (v && v.price) || 0;
      var effectivePrice = discountPct > 0 ? Math.round(rawPrice * (1 - discountPct / 100)) : rawPrice;
      var compareValue = discountPct > 0 ? rawPrice : (v && v.compare_at_price) || 0;
      var showCompare = discountPct > 0 ? true : !!(v && v.compare_at_price && v.compare_at_price > v.price);

      var varSelectHtml = "";
      if (multiVariant) {
        varSelectHtml =
          '<select class="sl-cu__var" data-pid="' + p.id + '">' +
          variants.map(function(vv) {
            return (
              '<option value="' + vv.id + '"' +
              ' data-price="' + (vv.price || 0) + '"' +
              ' data-compare="' + (vv.compare_at_price || 0) + '"' +
              ' data-avail="' + (vv.available ? "1" : "0") + '"' +
              (vv.id === (v && v.id) ? " selected" : "") + ">" +
              esc(vv.title) +
              (vv.available ? "" : " — Sold out") +
              "</option>"
            );
          }).join("") +
          "</select>";
      }

      var imgHtml = img ? '<img class="sl-cu__img" src="' + img + '" alt="">' : '<div class="sl-cu__img sl-cu__img--ph"></div>';
      var nameHtml = '<p class="sl-cu__name">' + esc(p.title) + "</p>";
      var pctBadgeHtml = discountPct > 0 ? '<span class="sl-cu__pct-badge">-' + discountPct + '%</span>' : "";
      var priceHtml =
        '<p class="sl-cu__price">' +
        (showCompare ? '<s class="sl-cu__compare">' + fmt(compareValue, cur) + "</s> " : "") +
        '<span class="sl-cu__cur-price">' + fmt(effectivePrice, cur) + "</span>" +
        "</p>";
      var atcHtml =
        '<button class="sl-cu__atc" type="button"' +
        ' data-vid="' + (v && v.id) + '"' +
        ' data-pid="' + p.id + '"' +
        ' data-ptitle="' + esc(p.title) + '"' +
        ' data-campaign-id="' + campaign.id + '"' +
        ' data-qty="1"' +
        (v && !v.available ? " disabled" : "") + ">" +
        (v && v.available ? "Add to Cart" : "Sold out") +
        "</button>";

      if (layout === "VERTICAL") {
        var showQty = !!(campaign.settings && campaign.settings.showQuantityPicker);
        var qtyHtml = showQty
          ? '<div class="sl-fbt__qty" data-pid="' + p.id + '">' +
            '<button type="button" class="sl-cu__qty-btn sl-cu__qty-btn--dec" aria-label="Decrease quantity">−</button>' +
            '<span class="sl-cu__qty-val">1</span>' +
            '<button type="button" class="sl-cu__qty-btn sl-cu__qty-btn--inc" aria-label="Increase quantity">+</button>' +
            "</div>"
          : "";
        return (
          '<div class="' + cardClass + '">' +
          imgHtml +
          '<div class="sl-cu__vmeta">' + nameHtml + pctBadgeHtml + priceHtml + "</div>" +
          '<div class="sl-cu__vctrls">' + qtyHtml + varSelectHtml + atcHtml + "</div>" +
          "</div>"
        );
      }

      return (
        '<div class="' + cardClass + '">' +
        imgHtml + nameHtml + pctBadgeHtml + priceHtml + varSelectHtml + atcHtml +
        "</div>"
      );
    }).join("");

    // The strip/list only fits ~3 offers at a time (see max-width/max-height
    // in the CSS) — arrows are wired unconditionally below and hidden after
    // paint if there's nothing to actually scroll (so 1-3 offers show no
    // dead arrows).
    var inner =
      '<div class="sl-cu__head"><span class="sl-cu__title">' +
      esc((campaign.title) || "Frequently bought together") +
      "</span></div>" +
      (layout === "VERTICAL"
        ? '<div class="sl-cu__vlist">' + cardsHtml + "</div>"
        : '<div class="sl-cu__row">' +
          '<button type="button" class="sl-cu__nav sl-cu__nav--prev" aria-label="Scroll offers left">&lsaquo;</button>' +
          '<div class="sl-cu__scroll">' + cardsHtml + "</div>" +
          '<button type="button" class="sl-cu__nav sl-cu__nav--next" aria-label="Scroll offers right">&rsaquo;</button>' +
          "</div>");

    var scrollSelector = layout === "VERTICAL" ? ".sl-cu__vlist" : ".sl-cu__scroll";
    var w = getWidget();
    ignoreNextDrawerMutation = true;
    if (w) {
      // Preserve scroll position across repaints — innerHTML replacement
      // would otherwise reset it every time (e.g. on any unrelated cart
      // mutation), snapping the offer strip/list back after the shopper
      // scrolled it.
      var prevScrollEl = w.querySelector(scrollSelector);
      var prevScrollLeft = prevScrollEl ? prevScrollEl.scrollLeft : 0;
      var prevScrollTop = prevScrollEl ? prevScrollEl.scrollTop : 0;

      // Update in-place — no re-insertion, no flicker
      w.innerHTML = inner;

      if (prevScrollLeft || prevScrollTop) {
        var newScrollEl = w.querySelector(scrollSelector);
        if (newScrollEl) {
          newScrollEl.scrollLeft = prevScrollLeft;
          newScrollEl.scrollTop = prevScrollTop;
        }
      }
    } else {
      w = document.createElement("div");
      w.setAttribute("data-sl-cu", "");
      w.className = "sl-cart-upsell";
      w.innerHTML = inner;
      var f = getFooter(d);
      if (f && f.parentNode) {
        f.parentNode.insertBefore(w, f);
      } else {
        getDialogOrSelf(d).appendChild(w);
      }
    }

    // Wire ATC buttons
    var btns = w.querySelectorAll(".sl-cu__atc");
    for (var bi = 0; bi < btns.length; bi++) {
      btns[bi].addEventListener("click", onATC);
    }

    // Wire quantity steppers (vertical layout only, when enabled) — keep the
    // displayed count and the row's Add to Cart button's data-qty in sync.
    var qtyGroups = w.querySelectorAll(".sl-fbt__qty");
    for (var qi = 0; qi < qtyGroups.length; qi++) {
      (function (group) {
        var card = group.closest(".sl-cu__card");
        var valEl = group.querySelector(".sl-cu__qty-val");
        var atcBtn = card && card.querySelector(".sl-cu__atc");
        var dec = group.querySelector(".sl-cu__qty-btn--dec");
        var inc = group.querySelector(".sl-cu__qty-btn--inc");
        function setQty(n) {
          n = Math.max(1, n);
          if (valEl) valEl.textContent = String(n);
          if (atcBtn) atcBtn.dataset.qty = String(n);
        }
        if (dec) dec.addEventListener("click", function () {
          setQty((Number(valEl && valEl.textContent) || 1) - 1);
        });
        if (inc) inc.addEventListener("click", function () {
          setQty((Number(valEl && valEl.textContent) || 1) + 1);
        });
      })(qtyGroups[qi]);
    }

    // Wire prev/next (or up/down) arrows — scroll by one card's size at a time
    var scrollEl = w.querySelector(scrollSelector);
    var isVertical = layout === "VERTICAL";
    var prevBtn = w.querySelector(isVertical ? ".sl-cu__nav--up" : ".sl-cu__nav--prev");
    var nextBtn = w.querySelector(isVertical ? ".sl-cu__nav--down" : ".sl-cu__nav--next");
    // Measure the actual rendered card size (+ its gap) at click time instead
    // of a fixed pixel value — so this keeps scrolling exactly one product
    // per click even if custom CSS changes the card size.
    function cardStep() {
      var firstCard = scrollEl && scrollEl.querySelector(".sl-cu__card");
      if (!firstCard) return 92;
      var gap = parseFloat(getComputedStyle(scrollEl).rowGap || getComputedStyle(scrollEl).columnGap || getComputedStyle(scrollEl).gap || "8") || 8;
      var rect = firstCard.getBoundingClientRect();
      return (isVertical ? rect.height : rect.width) + gap;
    }
    if (prevBtn && scrollEl) {
      prevBtn.addEventListener("click", function () {
        var step = -cardStep();
        scrollEl.scrollBy(isVertical ? { top: step, behavior: "smooth" } : { left: step, behavior: "smooth" });
      });
    }
    if (nextBtn && scrollEl) {
      nextBtn.addEventListener("click", function () {
        var step = cardStep();
        scrollEl.scrollBy(isVertical ? { top: step, behavior: "smooth" } : { left: step, behavior: "smooth" });
      });
    }
    // Hide an arrow once there's nothing left to scroll toward, and hide
    // both when the strip/list doesn't overflow at all (e.g. only 1-3 offers).
    if (scrollEl && prevBtn && nextBtn) {
      var updateNav = function () {
        var canScroll = isVertical
          ? scrollEl.scrollHeight > scrollEl.clientHeight + 1
          : scrollEl.scrollWidth > scrollEl.clientWidth + 1;
        var pos = isVertical ? scrollEl.scrollTop : scrollEl.scrollLeft;
        var max = (isVertical ? scrollEl.scrollHeight - scrollEl.clientHeight : scrollEl.scrollWidth - scrollEl.clientWidth) - 1;
        prevBtn.style.display = canScroll && pos > 1 ? "" : "none";
        nextBtn.style.display = canScroll && pos < max ? "" : "none";
      };
      updateNav();
      scrollEl.addEventListener("scroll", updateNav);
    }

    // Wire variant selects — update button vid, price, and availability on change
    var sels = w.querySelectorAll(".sl-cu__var");
    for (var si = 0; si < sels.length; si++) {
      sels[si].addEventListener("change", function (e) {
        var sel = e.target;
        var card = sel.closest(".sl-cu__card");
        if (!card) return;
        var btn = card.querySelector(".sl-cu__atc");
        var opt = sel.options[sel.selectedIndex];
        if (!btn || !opt) return;

        var avail = opt.dataset.avail === "1";
        var rawPrice = Number(opt.dataset.price) || 0;
        var rawCompare = Number(opt.dataset.compare) || 0;
        var price = discountPct > 0 ? Math.round(rawPrice * (1 - discountPct / 100)) : rawPrice;
        var compare2 = discountPct > 0 ? rawPrice : rawCompare;

        btn.dataset.vid = opt.value;
        btn.disabled = !avail;
        btn.textContent = avail ? "Add to Cart" : "Sold out";

        var priceEl = card.querySelector(".sl-cu__cur-price");
        if (priceEl) priceEl.textContent = fmt(price, cur);

        var compareEl = card.querySelector(".sl-cu__compare");
        if (compareEl) {
          if (discountPct > 0 || (compare2 && compare2 > price)) {
            compareEl.textContent = fmt(compare2, cur);
            compareEl.style.display = "";
          } else {
            compareEl.style.display = "none";
          }
        }
      });
    }
  }

  // Dispatch Shopify's standard "shopify:cart:lines-update" storefront event so
  // theme components (cart drawer, header cart count, etc.) refresh themselves
  // live instead of requiring a page reload. See:
  // https://shopify.dev/docs/storefronts/themes/best-practices/standard-events
  function dispatchCartLinesUpdate(action, lines) {
    var resolvePromise, rejectPromise;
    var promise = new Promise(function (res, rej) { resolvePromise = res; rejectPromise = rej; });
    var evt = new CustomEvent("shopify:cart:lines-update", { bubbles: true, cancelable: true });
    evt.action = action;
    evt.context = "cart";
    evt.lines = lines;
    evt.promise = promise;
    document.dispatchEvent(evt);
    return {
      settle: function (didError, extraDetail) {
        var detail = { didError: !!didError };
        if (extraDetail) {
          for (var k in extraDetail) detail[k] = extraDetail[k];
        }
        resolvePromise({ detail: detail });
      },
      fail: function (err) {
        rejectPromise(err);
      },
    };
  }

  // ── Add to cart ──────────────────────────────────────────────────────────
async function onATC(e) {
  var btn = e.currentTarget;

  if (btn.disabled) return;

  var vid = btn.dataset.vid;
  var pid = btn.dataset.pid;
  var campaignId = btn.dataset.campaignId;
  var qty = Math.max(1, Number(btn.dataset.qty) || 1);

  if (!vid) return;

  btn.disabled = true;
  btn.classList.add("sl-cu__atc--loading");

  var updateEvent = dispatchCartLinesUpdate("add", [
    {
      merchandiseId: vid,
      quantity: qty
    }
  ]);

  try {
    // ---------------------------------------------------------
    // Generate bundle ID
    // ---------------------------------------------------------
    var bundleId = "bundle_" + campaignId + "_" + Date.now();



    // ---------------------------------------------------------
    // Build FormData
    // ---------------------------------------------------------
    var formData = new FormData();

    formData.append("id", String(vid));
    formData.append("quantity", String(qty));

    // Bundle line item properties
    formData.append(
      "properties[_bundle_id]",
      bundleId
    );

    formData.append(
      "properties[_bundle_campaign_id]",
      campaignId
    );

    formData.append(
      "properties[_bundle_role]",
      "offer"
    );



    // ---------------------------------------------------------
    // Request Shopify sections
    // ---------------------------------------------------------
    formData.append(
      "sections",
      "cart-drawer,cart-icon-bubble"
    );

    formData.append(
      "sections_url",
      window.location.pathname
    );



    // ---------------------------------------------------------
    // Add product to cart
    // ---------------------------------------------------------
    var res = await fetch("/cart/add.js", {
      method: "POST",

      headers: {
        "Accept": "application/json",
        "X-Requested-With": "XMLHttpRequest"
      },

      body: formData
    });



    // ---------------------------------------------------------
    // Safely read response
    // ---------------------------------------------------------
    var responseText = await res.text();

    var data = {};

    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error(
          "[selleasy cart] Invalid JSON response:",
          responseText
        );
      }
    }



    // ---------------------------------------------------------
    // Handle Shopify error
    // ---------------------------------------------------------
    if (!res.ok) {
      throw new Error(
        data.description ||
        data.message ||
        "Add to cart failed (" + res.status + ")"
      );
    }



    // ---------------------------------------------------------
    // Update classic Dawn cart drawer
    // ---------------------------------------------------------
    var d = getDrawer();
    var isClassicDrawer = d && (d.tagName.toLowerCase() === "cart-drawer" || d.id === "CartDrawer");

    if (
      isClassicDrawer &&
      data.sections &&
      data.sections["cart-drawer"]
    ) {
      var tmp = new DOMParser().parseFromString(
        data.sections["cart-drawer"],
        "text/html"
      );

      var fresh = tmp.querySelector("cart-drawer") || tmp.getElementById("CartDrawer");

      if (fresh) {
        d.innerHTML = fresh.innerHTML;
      }
    }



    // ---------------------------------------------------------
    // Update classic Dawn cart icon bubble
    // ---------------------------------------------------------
    if (
      isClassicDrawer
    ) {
      var bubble = document.getElementById(
        "CartIconBubble"
      );

      if (
        bubble &&
        data.sections &&
        data.sections["cart-icon-bubble"]
      ) {
        var tmp2 = new DOMParser().parseFromString(
          data.sections["cart-icon-bubble"],
          "text/html"
        );

        var fresh2 = tmp2.getElementById(
          "CartIconBubble"
        );

        if (fresh2) {
          bubble.innerHTML = fresh2.innerHTML;
        }
      }
    }



    // ---------------------------------------------------------
    // Update button
    // ---------------------------------------------------------
    btn.classList.remove(
      "sl-cu__atc--loading"
    );

    btn.textContent = "Added!";



    // ---------------------------------------------------------
    // Remember recently added product
    // ---------------------------------------------------------
    markRecentlyAdded(pid);



    // ---------------------------------------------------------
    // Find component-based cart items
    // Horizon / newer Shopify themes
    // ---------------------------------------------------------
    var liveCartItemsEl =
      document.querySelector(
        "cart-drawer-component cart-items-component"
      ) ||
      document.querySelector(
        "cart-drawer cart-items-component"
      ) ||
      document.querySelector(
        "cart-items-component"
      );



    var liveSectionId =
      liveCartItemsEl &&
      liveCartItemsEl.dataset &&
      liveCartItemsEl.dataset.sectionId;



    // ---------------------------------------------------------
    // Fetch the actual cart section if Shopify did not return it
    // ---------------------------------------------------------
    if (
      liveSectionId &&
      (
        !data.sections ||
        !data.sections[liveSectionId]
      )
    ) {
      try {
        var sectionUrl = new URL(
          window.location.href
        );

        sectionUrl.searchParams.set(
          "section_id",
          liveSectionId
        );



        var sectionHtml = await fetch(
          sectionUrl.toString()
        )
          .then(function (r) {
            return r.ok
              ? r.text()
              : null;
          })
          .catch(function () {
            return null;
          });



        if (sectionHtml) {
          data.sections =
            data.sections || {};

          data.sections[
            liveSectionId
          ] = sectionHtml;
        }

      } catch (e3) {
        console.warn(
          "[selleasy cart] Section fetch failed:",
          e3
        );
      }
    }



    // ---------------------------------------------------------
    // Update component-based cart items directly
    // ---------------------------------------------------------
    if (
      liveCartItemsEl &&
      liveSectionId &&
      data.sections &&
      data.sections[liveSectionId]
    ) {
      try {
        var freshDoc =
          new DOMParser().parseFromString(
            data.sections[liveSectionId],
            "text/html"
          );



        var freshCartItems =
          freshDoc.querySelector(
            'cart-items-component[data-section-id="' +
            liveSectionId +
            '"]'
          ) ||
          freshDoc.querySelector(
            "cart-items-component"
          );



        if (freshCartItems) {
          liveCartItemsEl.innerHTML =
            freshCartItems.innerHTML;
        }

      } catch (e4) {
        console.warn(
          "[selleasy cart] Cart items update failed:",
          e4
        );
      }
    }



    // Airdog theme: its own AJAX cart fully replaceWith()s the
    // #shopify-section-cart-drawer element on every change instead of
    // patching it, so its native cart item list only updates if WE do the
    // same replacement — the generic paths above don't target this id.
    // Gated on that exact element existing, so it's a no-op on every other
    // theme (they don't have an element with this id).
    function applyAirdogSection() {
      var section = document.getElementById("shopify-section-cart-drawer");
      if (!section || !data.sections || !data.sections["cart-drawer"]) return;
      try {
        var parsed = new DOMParser().parseFromString(data.sections["cart-drawer"], "text/html");
        var fresh = parsed.getElementById("shopify-section-cart-drawer");
        if (fresh) {
          section.replaceWith(fresh);
          // The fresh server-rendered section defaults to closed — restore the
          // open state, since the shopper is mid-interaction with an open
          // drawer (they just clicked Add to Cart on an offer inside it). The
          // real open/closed signal is the "is-open" class on the STABLE
          // #AirdogCartUI wrapper (which the section swap does not replace),
          // not the overlay hidden attribute (that was a red herring).
          var airdogUIEl = document.getElementById("AirdogCartUI");
          if (airdogUIEl) airdogUIEl.classList.add("is-open");
        }
      } catch (eAirdog) { /* best-effort */ }
    }
    applyAirdogSection();
    // Airdog's own cart script also reacts to the "airdog:cart-updated" event
    // we dispatch below (it needs to, to stay in sync with adds we trigger)
    // by re-rendering itself asynchronously — and if that lands after us, it
    // can overwrite our correct (just-fetched) snapshot with a stale one,
    // visibly dropping a line that was already in the cart. Re-apply our
    // known-good snapshot once more after giving that theme re-render time to
    // finish, so ours always wins last.
    if (document.getElementById("shopify-section-cart-drawer")) {
      setTimeout(applyAirdogSection, 400);
    }



    // ---------------------------------------------------------
    // Notify theme that cart update succeeded
    // ---------------------------------------------------------
    updateEvent.settle(
      false,
      data.sections
        ? {
            sections: data.sections
          }
        : undefined
    );

      // Archetype-family themes (Motion, Impulse, Turbo, etc.) rebuild their
      // cart drawer purely client-side from their OWN ajaxProduct:added event —
      // they do not read Shopify sections HTML or the shopify:cart:lines-update
      // event at all. Dispatching this is a no-op on every other theme (nothing
      // listens for it), so it cannot affect Dawn/Horizon/Tinker behavior.
      document.dispatchEvent(new CustomEvent("ajaxProduct:added", { detail: data }));

      // Airdog theme: dispatch its own cart-update signal too, so its
      // native code (and our own listener for it) both stay in sync with an
      // add that WE triggered, not just ones the theme itself triggered.
      // No-op on every other theme (nothing listens for this event name).
      document.dispatchEvent(new CustomEvent("airdog:cart-updated", { detail: { source: "add", response: data } }));



  } catch (e2) {

    // ---------------------------------------------------------
    // Error handling
    // ---------------------------------------------------------
    console.error(
      "[selleasy cart]",
      e2
    );

    updateEvent.settle(true);

    btn.disabled = false;

    btn.classList.remove(
      "sl-cu__atc--loading"
    );

    btn.textContent =
      "Add to Cart";
  }
}

  // ── Watch the drawer ─────────────────────────────────────────────────────
  function watch() {
    var d = getDrawer();
    if (!d) return;

    var debounce = null;
    function trigger() {
      clearTimeout(debounce);
      debounce = setTimeout(function () { render(); }, 80);
    }

    // 1a. Drawer opens/closes (Dawn toggles "active" class on cart-drawer; some
    // themes toggle the "open" attribute on a nested <dialog>, hence subtree: true)
    new MutationObserver(function () {
      if (isOpen(d)) trigger();
    }).observe(d, { attributes: true, subtree: true, attributeFilter: ["class", "aria-hidden", "open"] });

    // 1b. Newer theme frameworks put the drawer's open state on an ANCESTOR
    // <theme-drawer>/<dialog>, which the subtree observer above can't see
    // (subtree only watches descendants). Watch those ancestors directly too.
    var themeDrawer = d.closest("theme-drawer");
    if (themeDrawer) {
      new MutationObserver(function () {
        if (isOpen(d)) trigger();
      }).observe(themeDrawer, { attributes: true, attributeFilter: ["open", "class"] });
    }
    var ancestorDialog = d.closest("dialog");
    if (ancestorDialog && ancestorDialog !== themeDrawer) {
      new MutationObserver(function () {
        if (isOpen(d)) trigger();
      }).observe(ancestorDialog, { attributes: true, attributeFilter: ["open", "class"] });
    }

    // Airdog theme: open/closed is signaled on a separate overlay element
    // (not the drawer itself or any of its ancestors), so it needs its own
    // watcher — the observers above can't see it at all.
    var airdogOverlayEl = document.querySelector(".airdog-cart-overlay");
    if (airdogOverlayEl) {
      new MutationObserver(function () {
        if (isOpen(d)) trigger();
      }).observe(airdogOverlayEl, { attributes: true, attributeFilter: ["hidden"] });
    }
    // The real open/closed signal is the "is-open" class on #AirdogCartUI —
    // a stable wrapper that survives the section replaceWith(), so this
    // observer keeps working across cart updates unlike ones on the swapped
    // section's own descendants.
    var airdogUIWatch = document.getElementById("AirdogCartUI");
    if (airdogUIWatch) {
      new MutationObserver(function () {
        if (isOpen(getDrawer())) trigger();
      }).observe(airdogUIWatch, { attributes: true, attributeFilter: ["class"] });
    }

    // 2. Drawer content changed — either our own widget got wiped out (Dawn
    // section render) or a cart line was added/removed by the theme's own
    // controls. Some themes don't reliably dispatch shopify:cart:lines-update
    // for their remove/quantity buttons, so watching the DOM directly is the
    // only dependable way to catch that (this replaces the old /cart.js
    // polling safety net — event-driven instead of a timer).
    new MutationObserver(function (mutations) {
      if (ignoreNextDrawerMutation) { ignoreNextDrawerMutation = false; return; }
      if (!isOpen(d)) return;
      // Ignore any mutation that originates from inside our own widget (its
      // own repaint, or incidental DOM churn from scrolling/interacting with
      // it) — only mutations OUTSIDE the widget represent a real cart change.
      // Checking every record (not just a single "ignore next" flag) avoids
      // getting out of sync when multiple mutations land in one batch.
      var widget = getWidget();
      var external = mutations.some(function (m) {
        return !(widget && (m.target === widget || widget.contains(m.target)));
      });
      if (!external) return;
      if (busy) { needsRerender = true; return; } // queue — the in-flight render pre-dates this mutation
      trigger();
    }).observe(d, { childList: true, subtree: true });

    // 3. Any cart mutation — including removals via the theme's own quantity/
    // remove controls, which don't otherwise touch our widget's DOM at all.
    // Shopify's standard storefront event, dispatched by both this widget and
    // (on newer themes) the theme's own cart controls.
    document.addEventListener("shopify:cart:lines-update", function (evt) {
      if (!isOpen(d)) return;
      // Wait for the mutation to actually finish (event.promise) before
      // re-rendering — otherwise we'd render against the cart's pre-change
      // state, which is what caused the flicker / "still shows" bugs.
      if (evt.promise && typeof evt.promise.then === "function") {
        evt.promise.then(function () { trigger(); }).catch(function () { trigger(); });
      } else {
        trigger();
      }
    });

    // Airdog theme: its own cart JS fully replaceWith()s the entire cart
    // drawer section on every change, which detaches (and permanently
    // silences) any MutationObserver watching the old nodes. Its own code
    // dispatches this event right after that replacement, so it's the only
    // reliable signal for this theme — re-check freshly via getDrawer()/
    // isOpen() rather than the closured `d`, since that reference may now
    // point at a detached node.
    document.addEventListener("airdog:cart-updated", function () {
      if (isOpen(getDrawer())) trigger();
    });

    // 5. If drawer is already open when script loads
    if (isOpen(d)) render();
  }

  watch();
  }

  function tryInit() {
    var root = document.querySelector("[data-selleasy-cart-upsell]");
    if (!root || root === watchedRoot) return;
    watchedRoot = root;
    init();
  }

  tryInit();
  // Re-run whenever a fresh copy of the embed div shows up (soft navigation).
  new MutationObserver(tryInit).observe(document.documentElement, { childList: true, subtree: true });
})();

// ── Bundle badge injector ──────────────────────────────────────────────────
// Scans the cart (drawer or page) and styles our bundle type labels as badges.
(function () {
  "use strict";
  const BADGE_LABELS = new Set([
    "FBT List", "FBT Amazon", "FBT Classic", "FBT Popup",
    "Add-on List", "Add-on Carousel", "Add-on Grid", "Cart Upsell", "Bundle",
  ]);

  function injectBadges(root) {
    // Dawn-style: <dl class="..."><dt>Label</dt><dd>value</dd></dl>
    root.querySelectorAll("dt").forEach((dt) => {
      const text = dt.textContent.trim();
      if (!BADGE_LABELS.has(text) || dt.dataset.slBadged) return;
      dt.dataset.slBadged = "1";
      const dd = dt.nextElementSibling;
      // Hide the empty dd (empty value we set)
      if (dd && dd.tagName === "DD" && !dd.textContent.trim()) {
        dd.style.display = "none";
      }
      // Wrap dt content as badge
      dt.innerHTML = `<span class="sl-badge">${text}</span>`;
    });

    // Some themes use <p class="product-option">Label: value</p>
    root.querySelectorAll(".product-option, [class*='cart-item__property']").forEach((el) => {
      if (el.dataset.slBadged) return;
      const raw = el.textContent.trim();
      const colonIdx = raw.indexOf(":");
      if (colonIdx === -1) return;
      const key = raw.slice(0, colonIdx).trim();
      if (!BADGE_LABELS.has(key)) return;
      el.dataset.slBadged = "1";
      el.innerHTML = `<span class="sl-badge">${key}</span>`;
    });
  }

  function observe() {
    const cartAreas = [
      document.querySelector("cart-drawer"),
      document.querySelector("cart-drawer-component"),
      document.querySelector(".cart-drawer"),
      document.querySelector("#CartDrawer"),
      document.querySelector("#cart"),
      document.querySelector("main"),
    ].filter(Boolean);

    cartAreas.forEach((area) => {
      injectBadges(area);
      new MutationObserver(() => injectBadges(area))
        .observe(area, { childList: true, subtree: true });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observe);
  } else {
    observe();
  }
})();
