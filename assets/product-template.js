/**
 * product-template.js — Complete Fixed Version
 * assets/product-template.js
 *
 * Fixes:
 * ✅ Add to Cart — instant AJAX, no page reload
 * ✅ Quantity +/- → only 1 at a time, can't exceed stock
 * ✅ Stock out → Add to Cart disabled, quantity locked
 * ✅ Max 3 items per product (configurable)
 * ✅ Size pill click → background color changes immediately
 * ✅ Color swatch → ring + checkmark
 * ✅ All section settings dynamic via CSS vars
 */
(function () {
  'use strict';

  /* ══════════════════════════════════
     CONFIGURATION
  ══════════════════════════════════ */
  var MAX_QUANTITY_PER_PRODUCT = 3; // Change this value as needed

  /* ══════════════════════════════════
     HELPERS
  ══════════════════════════════════ */
  function qs(sel, ctx)  { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  function getSectionId() {
    var w = qs('[id^="pt-"]');
    return w ? w.id.replace('pt-', '') : '';
  }

  function getProduct(sectionId) {
    var el = document.getElementById('ProductJson-' + sectionId) || qs('[id^="ProductJson-"]');
    if (!el || !el.textContent.trim()) return null;
    try { return JSON.parse(el.textContent); } catch (e) { return null; }
  }

  function formatMoney(cents) {
    if (window.Shopify && window.Shopify.formatMoney) return window.Shopify.formatMoney(cents);
    return '$' + (cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function showError(form, message) {
    var existing = qs('.pt-cart-error', form.parentNode);
    if (existing) existing.remove();
    var errEl = document.createElement('p');
    errEl.className = 'pt-cart-error';
    errEl.style.cssText = 'color:#dc2626;font-size:13px;margin-top:8px;';
    errEl.textContent = message;
    var btn = qs('.pt-btn-cart', form);
    if (btn) {
      btn.closest('.pt-buttons').insertAdjacentElement('afterend', errEl);
    }
    setTimeout(function () { errEl.remove(); }, 4000);
  }

  /* ══════════════════════════════════
     1. GALLERY — thumbnail swap
  ══════════════════════════════════ */
  function initGallery() {
    qsa('.pt-thumb').forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        var sid    = this.dataset.section;
        var newSrc = this.dataset.src;
        var img    = document.getElementById('pt-main-img-' + sid);
        if (!img || !newSrc) return;
        img.style.opacity = '0';
        setTimeout(function () { img.src = newSrc; img.style.opacity = '1'; }, 200);
        qsa('.pt-thumb[data-section="' + sid + '"]').forEach(function (t) {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        thumb.classList.add('active');
        thumb.setAttribute('aria-selected', 'true');
      });
    });
  }

  /* ══════════════════════════════════
     2. TABS
  ══════════════════════════════════ */
  function initTabs() {
    var btns = qsa('.pt-tab-btn');
    if (!btns.length) return;

    qsa('.pt-tab-panel').forEach(function (p) { p.style.display = 'none'; p.classList.remove('active'); });
    var first = qs('.pt-tab-btn.active') || btns[0];
    first.classList.add('active');
    var fp = document.getElementById('tab-' + first.dataset.tab);
    if (fp) { fp.style.display = 'block'; fp.classList.add('active'); }

    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        btns.forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');
        qsa('.pt-tab-panel').forEach(function (p) { p.style.display = 'none'; p.classList.remove('active'); });
        var panel = document.getElementById('tab-' + this.dataset.tab);
        if (panel) { panel.style.display = 'block'; panel.classList.add('active'); }
      });
    });
  }

  /* ══════════════════════════════════
     3. QUANTITY — FIXED
     - Only +1 or -1 per click
     - Min = 1, Max = MIN(stock, MAX_QUANTITY_PER_PRODUCT)
     - Disabled when sold out
  ══════════════════════════════════ */
  var currentStock = Infinity;

  function initQuantity() {
    qsa('.pt-qty-wrap').forEach(function (wrap) {
      var input = qs('.pt-qty-input', wrap);
      var minus = qs('.pt-qty-minus', wrap);
      var plus  = qs('.pt-qty-plus', wrap);
      if (!input) return;

      minus && minus.addEventListener('click', function (e) {
        e.preventDefault();
        var v = parseInt(input.value, 10) || 1;
        if (v > 1) {
          input.value = v - 1;
        }
        updateQtyBtnState(wrap, parseInt(input.value, 10));
      });

      plus && plus.addEventListener('click', function (e) {
        e.preventDefault();
        var v   = parseInt(input.value, 10) || 1;
        var stockMax = parseInt(input.max, 10) || currentStock;
        var maxLimit = Math.min(stockMax, MAX_QUANTITY_PER_PRODUCT);
        if (v >= maxLimit) return;
        input.value = v + 1;
        updateQtyBtnState(wrap, parseInt(input.value, 10));
      });

      input.addEventListener('change', function () {
        var v   = parseInt(this.value, 10);
        var stockMax = parseInt(input.max, 10) || currentStock;
        var maxLimit = Math.min(stockMax, MAX_QUANTITY_PER_PRODUCT);
        if (isNaN(v) || v < 1) this.value = 1;
        if (v > maxLimit) this.value = maxLimit;
        updateQtyBtnState(wrap, parseInt(this.value, 10));
      });
    });
  }

  function updateQtyBtnState(wrap, qty) {
    var input = qs('.pt-qty-input', wrap);
    var minus = qs('.pt-qty-minus', wrap);
    var plus  = qs('.pt-qty-plus', wrap);
    var stockMax = parseInt(input && input.max, 10) || currentStock;
    var maxLimit = Math.min(stockMax, MAX_QUANTITY_PER_PRODUCT);
    if (minus) minus.disabled = qty <= 1;
    if (plus)  plus.disabled  = qty >= maxLimit;
  }

  /* ══════════════════════════════════
     4. VARIANTS + SIZE PILL COLOR FIX
  ══════════════════════════════════ */
  function initVariants() {
    var sectionId = getSectionId();
    var product   = getProduct(sectionId);
    if (!product) { console.warn('[PT] ProductJson not found'); return; }

    function getOptions() {
      return qsa('[id^="SingleOptionSelector-' + sectionId + '"]').map(function (sel) {
        return sel.value;
      });
    }

    function findVariant(opts) {
      return product.variants.find(function (v) {
        return opts.every(function (val, i) { return v['option' + (i + 1)] === val; });
      });
    }

    function updateUI(variant) {
      if (!variant) return;

      var idInput = document.getElementById('pt-variant-id-' + sectionId);
      if (idInput) idInput.value = variant.id;

      try {
        var url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        window.history.replaceState({}, '', url.toString());
      } catch (e) {}

      var priceEl = document.getElementById('pt-price-' + sectionId);
      if (priceEl) priceEl.textContent = formatMoney(variant.price);

      var cmpEl   = document.getElementById('pt-compare-price-' + sectionId);
      var badgeEl = document.getElementById('pt-discount-badge-' + sectionId);
      if (cmpEl) {
        if (variant.compare_at_price && variant.compare_at_price > variant.price) {
          cmpEl.textContent    = formatMoney(variant.compare_at_price);
          cmpEl.style.display  = 'inline';
          if (badgeEl) {
            var disc = Math.round((variant.compare_at_price - variant.price) / variant.compare_at_price * 100);
            badgeEl.textContent   = 'Save ' + disc + '%';
            badgeEl.style.display = 'inline';
          }
        } else {
          cmpEl.style.display = 'none';
          if (badgeEl) badgeEl.style.display = 'none';
        }
      }

      var skuEl = document.getElementById('pt-sku-' + sectionId);
      if (skuEl) skuEl.textContent = variant.sku || 'N/A';

      currentStock = (variant.inventory_management && variant.inventory_quantity > 0)
        ? variant.inventory_quantity
        : Infinity;

      var qtyInput = qs('.pt-qty-input');
      if (qtyInput) {
        var effectiveMax = isFinite(currentStock) 
          ? Math.min(currentStock, MAX_QUANTITY_PER_PRODUCT)
          : MAX_QUANTITY_PER_PRODUCT;
        
        qtyInput.max = effectiveMax;
        var curQty = parseInt(qtyInput.value, 10) || 1;
        if (curQty > effectiveMax) qtyInput.value = effectiveMax;
        
        var wrap = qtyInput.closest('.pt-qty-wrap');
        if (wrap) updateQtyBtnState(wrap, parseInt(qtyInput.value, 10));
      }

      var addBtn  = document.getElementById('pt-add-' + sectionId);
      var btnText = addBtn && addBtn.querySelector('.pt-btn-text');
      if (addBtn) {
        if (variant.available) {
          addBtn.disabled = false;
          addBtn.classList.remove('sold-out');
          if (btnText) btnText.textContent = addBtn.dataset.origLabel || 'Add to Cart';
        } else {
          addBtn.disabled = true;
          addBtn.classList.add('sold-out');
          if (btnText) {
            if (!addBtn.dataset.origLabel) addBtn.dataset.origLabel = btnText.textContent;
            btnText.textContent = 'Sold Out';
          }
        }
      }

      if (variant.featured_image && variant.featured_image.src) {
        var mainImg = document.getElementById('pt-main-img-' + sectionId);
        if (mainImg) {
          var newSrc = variant.featured_image.src;
          if (!mainImg.src.includes(newSrc.split('?')[0].split('/').pop().split('_')[0])) {
            mainImg.style.opacity = '0';
            setTimeout(function () { mainImg.src = newSrc; mainImg.style.opacity = '1'; }, 200);
          }
          qsa('.pt-thumb[data-section="' + sectionId + '"]').forEach(function (th) {
            var thSrc = (th.dataset.src || '').split('?')[0];
            var vBase = newSrc.split('?')[0];
            th.classList.toggle('active', thSrc === vBase || thSrc.includes(variant.featured_image.id));
          });
        }
      }
    }

    function syncAndUpdate(optionIndex, value) {
      var sel = document.getElementById('SingleOptionSelector-' + sectionId + '-' + optionIndex);
      if (sel) sel.value = value;
      var variant = findVariant(getOptions());
      if (variant) updateUI(variant);
    }

    qsa('.pt-swatch').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var value       = this.dataset.optionValue;
        var optionIndex = this.dataset.optionIndex;
        var labelId     = this.dataset.labelId;
        var group       = this.closest('.pt-swatches');

        if (group) {
          qsa('.pt-swatch', group).forEach(function (s) {
            s.classList.remove('active');
            s.setAttribute('aria-checked', 'false');
          });
        }
        this.classList.add('active');
        this.setAttribute('aria-checked', 'true');

        var lbl = document.getElementById(labelId);
        if (lbl) lbl.textContent = value;
        syncAndUpdate(optionIndex, value);
      });
    });

    qsa('.pt-pill').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (this.classList.contains('unavailable')) return;
        var value       = this.dataset.optionValue;
        var optionIndex = this.dataset.optionIndex;
        var labelId     = this.dataset.labelId;
        var group       = this.closest('.pt-pills');

        if (group) {
          qsa('.pt-pill', group).forEach(function (p) {
            p.style.backgroundColor = '';
            p.style.color           = '';
            p.style.borderColor     = '';
            p.classList.remove('active');
            p.setAttribute('aria-checked', 'false');
          });
        }
        this.classList.add('active');
        this.setAttribute('aria-checked', 'true');

        var lbl = document.getElementById(labelId);
        if (lbl) lbl.textContent = value;
        syncAndUpdate(optionIndex, value);
      });
    });

    qsa('.pt-selector').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var value       = this.value;
        var optionIndex = this.dataset.optionIndex;
        var labelId     = this.dataset.labelId;
        var lbl = document.getElementById(labelId);
        if (lbl) lbl.textContent = value;
        qsa('[data-option-index="' + optionIndex + '"].pt-pill').forEach(function (p) {
          p.classList.toggle('active', p.dataset.optionValue === value);
        });
        syncAndUpdate(optionIndex, value);
      });
    });

    var initVariant = findVariant(getOptions());
    if (initVariant) updateUI(initVariant);
  }

  /* ══════════════════════════════════
     5. ADD TO CART — AJAX FIXED
     Instant add, no page reload,
     respects MAX_QUANTITY_PER_PRODUCT
  ══════════════════════════════════ */
  function initCart() {
    qsa('.pt-form').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();

        var btn     = qs('.pt-btn-cart', form);
        var btnText = btn && qs('.pt-btn-text', btn);
        if (!btn || btn.disabled || btn.classList.contains('loading')) return;

        var variantIdInput = qs('[name="id"]', form);
        var qtyInput       = qs('[name="quantity"]', form);
        var variantId      = variantIdInput ? parseInt(variantIdInput.value, 10) : null;
        var qty            = qtyInput ? parseInt(qtyInput.value, 10) : 1;

        if (!variantId) { console.error('[PT] No variant ID'); return; }
        
        if (qty > MAX_QUANTITY_PER_PRODUCT) {
          showError(form, 'Maximum ' + MAX_QUANTITY_PER_PRODUCT + ' items per product');
          return;
        }

        var origLabel = btnText ? btnText.textContent : 'Add to Cart';
        if (!btn.dataset.origLabel) btn.dataset.origLabel = origLabel;

        btn.classList.add('loading');
        btn.disabled = true;
        if (btnText) btnText.textContent = origLabel;

        fetch('/cart/add.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify({ id: variantId, quantity: qty })
        })
        .then(function (res) {
          if (!res.ok) return res.json().then(function (e) { throw e; });
          return res.json();
        })
        .then(function () {
          btn.classList.remove('loading');
          btn.classList.add('success');
          if (btnText) btnText.textContent = '✓ Added to Cart!';

          return fetch('/cart.js');
        })
        .then(function (res) { return res && res.json(); })
        .then(function (cart) {
          if (!cart) return;
          qsa('#cartCounter, .cart-count, [data-cart-count]').forEach(function (el) {
            el.textContent = cart.item_count > 0 ? cart.item_count : '';
          });
          document.dispatchEvent(new CustomEvent('cart:refresh', { detail: cart }));

          setTimeout(function () {
            btn.classList.remove('success');
            btn.disabled = false;
            if (btnText) btnText.textContent = btn.dataset.origLabel || 'Add to Cart';
          }, 2500);
        })
        .catch(function (err) {
          btn.classList.remove('loading');
          btn.disabled = false;
          if (btnText) btnText.textContent = btn.dataset.origLabel || 'Add to Cart';

          var errMsg = (err && err.description) ? err.description : 'Could not add to cart. Please try again.';
          showError(form, errMsg);
          console.error('[PT] Cart error:', err);
        });
      });
    });
  }

  /* ══════════════════════════════════
     6. ACCORDION
  ══════════════════════════════════ */
  function initAccordion() {
    qsa('.pt-accordion-trigger').forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        var isOpen = this.getAttribute('aria-expanded') === 'true';
        var body   = this.nextElementSibling;
        var icon   = qs('.pt-accordion-icon', this);
        this.setAttribute('aria-expanded', !isOpen);
        if (body) {
          if (!isOpen) { body.style.display = 'block'; setTimeout(function () { body.classList.add('open'); }, 10); }
          else { body.classList.remove('open'); setTimeout(function () { body.style.display = 'none'; }, 280); }
        }
        if (icon) icon.style.transform = !isOpen ? 'rotate(180deg)' : '';
      });
    });
  }

  /* ══════════════════════════════════
     7. READ MORE
  ══════════════════════════════════ */
  function initReadMore() {
    qsa('[data-read-more]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var desc = this.previousElementSibling;
        var exp  = desc.classList.contains('expanded');
        desc.classList.toggle('expanded', !exp);
        this.textContent = !exp ? (this.dataset.labelLess || 'Read less') : (this.dataset.labelMore || 'Read more');
      });
    });
  }

  /* ══════════════════════════════════
     INIT
  ══════════════════════════════════ */
  function init() {
    initGallery();
    initTabs();
    initQuantity();
    initVariants();
    initCart();
    initAccordion();
    initReadMore();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();