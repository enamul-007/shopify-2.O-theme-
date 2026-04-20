(function () {
  'use strict';

  var MAX_QTY = 3;

  /* ── Helpers ── */
  function qs(sel, ctx)  { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  function getSectionId() {
    var w = qs('[id^="pt-"]');
    return w ? w.id.replace('pt-', '') : '';
  }

  function getProduct(sid) {
    var el = document.getElementById('ProductJson-' + sid);
    if (!el) return null;
    try { return JSON.parse(el.textContent); } catch(e) { return null; }
  }

  function formatMoney(cents) {
    if (window.Shopify && window.Shopify.formatMoney) return window.Shopify.formatMoney(cents);
    return '$' + (cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function showError(form, msg) {
    var old = qs('.pt-cart-error', form.parentNode);
    if (old) old.remove();
    var el = document.createElement('p');
    el.className = 'pt-cart-error';
    el.style.cssText = 'color:#dc2626;font-size:13px;margin-top:8px;';
    el.textContent = msg;
    var btn = qs('.pt-btn-cart', form);
    if (btn) btn.closest('.pt-buttons').insertAdjacentElement('afterend', el);
    setTimeout(function() { el.remove(); }, 4000);
  }

  /* ── Gallery ── */
  function initGallery() {
    // Single delegated listener on document
    document.addEventListener('click', function(e) {
      var thumb = e.target.closest('.pt-thumb');
      if (!thumb) return;
      var sid = thumb.dataset.section;
      var src = thumb.dataset.src;
      var img = document.getElementById('pt-main-img-' + sid);
      if (!img || !src) return;

      img.style.opacity = '0';
      setTimeout(function() { img.src = src; img.style.opacity = '1'; }, 200);

      qsa('.pt-thumb[data-section="' + sid + '"]').forEach(function(t) {
        t.classList.toggle('active', t === thumb);
        t.setAttribute('aria-selected', t === thumb);
      });
    });
  }

  /* ── Tabs ── */
  function initTabs() {
    var btns = qsa('.pt-tab-btn');
    if (!btns.length) return;

    // Init first active panel
    qsa('.pt-tab-panel').forEach(function(p) { p.style.display = 'none'; p.classList.remove('active'); });
    var first = qs('.pt-tab-btn.active') || btns[0];
    first.classList.add('active');
    var fp = document.getElementById('tab-' + first.dataset.tab);
    if (fp) { fp.style.display = 'block'; fp.classList.add('active'); }

    // Single delegated listener
    var tabNav = qs('.pt-tabs-nav') || qs('.pt-tabs-wrap');
    if (!tabNav) return;

    tabNav.addEventListener('click', function(e) {
      var btn = e.target.closest('.pt-tab-btn');
      if (!btn) return;
      btns.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      qsa('.pt-tab-panel').forEach(function(p) { p.style.display = 'none'; p.classList.remove('active'); });
      var panel = document.getElementById('tab-' + btn.dataset.tab);
      if (panel) { panel.style.display = 'block'; panel.classList.add('active'); }
    });
  }

  /* ── Quantity ── */
  var currentStock = Infinity;

  function clampQty(val, max) {
    var capped = Math.min(isFinite(max) ? Math.min(max, MAX_QTY) : MAX_QTY, val);
    return Math.max(1, capped);
  }

  function updateQtyBtns(wrap, qty) {
    var input    = qs('.pt-qty-input', wrap);
    var stockMax = parseInt(input && input.max, 10) || currentStock;
    var maxLimit = isFinite(stockMax) ? Math.min(stockMax, MAX_QTY) : MAX_QTY;
    var minus    = qs('.pt-qty-minus', wrap);
    var plus     = qs('.pt-qty-plus', wrap);
    if (minus) minus.disabled = qty <= 1;
    if (plus)  plus.disabled  = qty >= maxLimit;
  }

  function initQuantity() {
    // Single delegated listener
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('.pt-qty-btn');
      if (!btn) return;
      var wrap  = btn.closest('.pt-qty-wrap');
      var input = wrap && qs('.pt-qty-input', wrap);
      if (!input) return;
      var v        = parseInt(input.value, 10) || 1;
      var stockMax = parseInt(input.max, 10) || currentStock;
      var maxLimit = isFinite(stockMax) ? Math.min(stockMax, MAX_QTY) : MAX_QTY;
      if (btn.classList.contains('pt-qty-minus')) {
        if (v > 1) input.value = v - 1;
      } else {
        if (v < maxLimit) input.value = v + 1;
      }
      updateQtyBtns(wrap, parseInt(input.value, 10));
    });

    qsa('.pt-qty-input').forEach(function(input) {
      input.addEventListener('change', function() {
        var stockMax = parseInt(this.max, 10) || currentStock;
        this.value   = clampQty(parseInt(this.value, 10) || 1, stockMax);
        var wrap     = this.closest('.pt-qty-wrap');
        if (wrap) updateQtyBtns(wrap, parseInt(this.value, 10));
      });
    });
  }

  /* ── Variants ── */
  function initVariants() {
    var sid     = getSectionId();
    var product = getProduct(sid);
    if (!product) return;

    var variants = product.variants;

    // Cache frequently accessed elements
    var idInput  = document.getElementById('pt-variant-id-' + sid);
    var priceEl  = document.getElementById('pt-price-' + sid);
    var cmpEl    = document.getElementById('pt-compare-price-' + sid);
    var badgeEl  = document.getElementById('pt-discount-badge-' + sid);
    var skuEl    = document.getElementById('pt-sku-' + sid);
    var addBtn   = document.getElementById('pt-add-' + sid);
    var btnText  = addBtn && qs('.pt-btn-text', addBtn);
    var mainImg  = document.getElementById('pt-main-img-' + sid);
    var qtyInput = qs('.pt-qty-input');

    function getOptions() {
      return qsa('[id^="SingleOptionSelector-' + sid + '"]').map(function(s) { return s.value; });
    }

    function findVariant(opts) {
      return variants.find(function(v) {
        return opts.every(function(val, i) { return v['option' + (i + 1)] === val; });
      });
    }

    function updateUI(variant) {
      if (!variant) return;

      if (idInput) idInput.value = variant.id;

      // URL
      try {
        var url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        history.replaceState({}, '', url.toString());
      } catch(e) {}

      // Price
      if (priceEl) priceEl.textContent = formatMoney(variant.price);
      var hasDiscount = variant.compare_at_price > variant.price;
      if (cmpEl) {
        cmpEl.style.display = hasDiscount ? 'inline' : 'none';
        if (hasDiscount) cmpEl.textContent = formatMoney(variant.compare_at_price);
      }
      if (badgeEl) {
        badgeEl.style.display = hasDiscount ? 'inline' : 'none';
        if (hasDiscount) {
          var disc = Math.round((variant.compare_at_price - variant.price) / variant.compare_at_price * 100);
          badgeEl.textContent = 'Save ' + disc + '%';
        }
      }

      // SKU
      if (skuEl) skuEl.textContent = variant.sku || 'N/A';

      // Stock
      currentStock = (variant.inventory_management && variant.inventory_quantity > 0)
        ? variant.inventory_quantity
        : Infinity;

      if (qtyInput) {
        var effectiveMax = isFinite(currentStock) ? Math.min(currentStock, MAX_QTY) : MAX_QTY;
        qtyInput.max = effectiveMax;
        var curQty = parseInt(qtyInput.value, 10) || 1;
        if (curQty > effectiveMax) qtyInput.value = effectiveMax;
        var wrap = qtyInput.closest('.pt-qty-wrap');
        if (wrap) updateQtyBtns(wrap, parseInt(qtyInput.value, 10));
      }

      // Button
      if (addBtn) {
        var avail = variant.available;
        addBtn.disabled = !avail;
        addBtn.classList.toggle('sold-out', !avail);
        if (btnText) {
          if (!addBtn.dataset.origLabel) addBtn.dataset.origLabel = btnText.textContent;
          btnText.textContent = avail ? addBtn.dataset.origLabel : 'Sold Out';
        }
      }

      // Image
      if (variant.featured_image && variant.featured_image.src && mainImg) {
        var newSrc = variant.featured_image.src;
        var baseId = String(variant.featured_image.id);
        if (!mainImg.src.includes(baseId)) {
          mainImg.style.opacity = '0';
          setTimeout(function() { mainImg.src = newSrc; mainImg.style.opacity = '1'; }, 200);
        }
        qsa('.pt-thumb[data-section="' + sid + '"]').forEach(function(th) {
          th.classList.toggle('active', (th.dataset.src || '').includes(baseId));
        });
      }
    }

    function syncAndUpdate(optionIndex, value) {
      var sel = document.getElementById('SingleOptionSelector-' + sid + '-' + optionIndex);
      if (sel) sel.value = value;
      var v = findVariant(getOptions());
      if (v) updateUI(v);
    }

    // Single delegated listener for all variant controls
    var infoWrap = qs('.pt-info') || document;
    infoWrap.addEventListener('click', function(e) {
      // Swatch
      var swatch = e.target.closest('.pt-swatch');
      if (swatch) {
        var group = swatch.closest('.pt-swatches');
        if (group) qsa('.pt-swatch', group).forEach(function(s) {
          s.classList.remove('active');
          s.setAttribute('aria-checked', 'false');
        });
        swatch.classList.add('active');
        swatch.setAttribute('aria-checked', 'true');
        var lbl = document.getElementById(swatch.dataset.labelId);
        if (lbl) lbl.textContent = swatch.dataset.optionValue;
        syncAndUpdate(swatch.dataset.optionIndex, swatch.dataset.optionValue);
        return;
      }

      // Pill
      var pill = e.target.closest('.pt-pill');
      if (pill && !pill.classList.contains('unavailable')) {
        var pgroup = pill.closest('.pt-pills');
        if (pgroup) qsa('.pt-pill', pgroup).forEach(function(p) {
          p.classList.remove('active');
          p.setAttribute('aria-checked', 'false');
          p.style.backgroundColor = '';
          p.style.color           = '';
          p.style.borderColor     = '';
        });
        pill.classList.add('active');
        pill.setAttribute('aria-checked', 'true');
        var plbl = document.getElementById(pill.dataset.labelId);
        if (plbl) plbl.textContent = pill.dataset.optionValue;
        syncAndUpdate(pill.dataset.optionIndex, pill.dataset.optionValue);
      }
    });

    // Selectors
    qsa('.pt-selector').forEach(function(sel) {
      sel.addEventListener('change', function() {
        var lbl = document.getElementById(this.dataset.labelId);
        if (lbl) lbl.textContent = this.value;
        syncAndUpdate(this.dataset.optionIndex, this.value);
      });
    });

    // Init
    var initV = findVariant(getOptions());
    if (initV) updateUI(initV);
  }

  /* ── Cart ── */
  function initCart() {
    document.addEventListener('submit', function(e) {
      if (!e.target.classList.contains('pt-form')) return;
      e.preventDefault();

      var form    = e.target;
      var btn     = qs('.pt-btn-cart', form);
      var btnText = btn && qs('.pt-btn-text', btn);
      if (!btn || btn.disabled || btn.classList.contains('loading')) return;

      var variantId = parseInt((qs('[name="id"]', form) || {}).value, 10);
      var qty       = parseInt((qs('[name="quantity"]', form) || {}).value, 10) || 1;
      if (!variantId) return;

      if (qty > MAX_QTY) {
        showError(form, 'Maximum ' + MAX_QTY + ' items per product');
        return;
      }

      if (!btn.dataset.origLabel) btn.dataset.origLabel = (btnText && btnText.textContent) || 'Add to Cart';
      btn.classList.add('loading');
      btn.disabled = true;

      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ id: variantId, quantity: qty })
      })
      .then(function(res) {
        if (!res.ok) return res.json().then(function(e) { throw e; });
        return res.json();
      })
      .then(function() {
        btn.classList.remove('loading');
        btn.classList.add('success');
        if (btnText) btnText.textContent = '✓ Added!';
        return fetch('/cart.js', { cache: 'no-store' });
      })
      .then(function(res) { return res && res.json(); })
      .then(function(cart) {
        if (!cart) return;
        qsa('#cartCounter, .cart-count, [data-cart-count]').forEach(function(el) {
          el.textContent = cart.item_count || '';
        });
        document.dispatchEvent(new CustomEvent('cart:refresh', { detail: cart }));
        document.dispatchEvent(new CustomEvent('cart:updated', { detail: cart }));
        setTimeout(function() {
          btn.classList.remove('success');
          btn.disabled = false;
          if (btnText) btnText.textContent = btn.dataset.origLabel;
        }, 2500);
      })
      .catch(function(err) {
        btn.classList.remove('loading');
        btn.disabled = false;
        if (btnText) btnText.textContent = btn.dataset.origLabel;
        showError(form, (err && err.description) || 'Could not add to cart. Try again.');
      });
    });
  }

  /* ── Accordion ── */
  function initAccordion() {
    document.addEventListener('click', function(e) {
      var trigger = e.target.closest('.pt-accordion-trigger');
      if (!trigger) return;
      var isOpen = trigger.getAttribute('aria-expanded') === 'true';
      var body   = trigger.nextElementSibling;
      var icon   = qs('.pt-accordion-icon', trigger);
      trigger.setAttribute('aria-expanded', !isOpen);
      if (body) {
        if (!isOpen) { body.style.display = 'block'; setTimeout(function() { body.classList.add('open'); }, 10); }
        else { body.classList.remove('open'); setTimeout(function() { body.style.display = 'none'; }, 280); }
      }
      if (icon) icon.style.transform = isOpen ? '' : 'rotate(180deg)';
    });
  }

  /* ── Read More ── */
  function initReadMore() {
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-read-more]');
      if (!btn) return;
      var desc = btn.previousElementSibling;
      if (!desc) return;
      var exp = desc.classList.contains('expanded');
      desc.classList.toggle('expanded', !exp);
      btn.textContent = exp ? (btn.dataset.labelMore || 'Read more') : (btn.dataset.labelLess || 'Read less');
    });
  }

  /* ── Init ── */
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