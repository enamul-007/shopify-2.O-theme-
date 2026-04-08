// /**
//  * product-variant.js — Complete Fixed Version
//  * assets/product-variant.js
//  *
//  * Fixes:
//  * ✅ Max 3 items per product (configurable)
//  * ✅ Stock out handling
//  * ✅ AJAX add to cart with quantity limits
//  * ✅ Variant selection with UI updates
//  */
// (function() {
//     'use strict';
    
//     /* ══════════════════════════════════
//        CONFIGURATION
//     ══════════════════════════════════ */
//     var MAX_QUANTITY_PER_PRODUCT = 3; // Change this value as needed
    
//     // Wait for Shopify's product model to be ready
//     function waitForProductJson(callback) {
//         if (window.productJson) {
//             callback();
//         } else {
//             var productJsonEl = document.querySelector('[id^="ProductJson-"]');
//             if (productJsonEl && productJsonEl.textContent) {
//                 try {
//                     window.productJson = JSON.parse(productJsonEl.textContent);
//                     callback();
//                 } catch(e) {
//                     console.warn('Failed to parse product JSON', e);
//                     callback();
//                 }
//             } else {
//                 setTimeout(function() { waitForProductJson(callback); }, 100);
//             }
//         }
//     }
    
//     function showError($form, message) {
//         var $error = $form.find('.pt-cart-error');
//         if ($error.length) $error.remove();
//         var errHtml = '<p class="pt-cart-error" style="color:#dc2626;font-size:13px;margin-top:8px;">' + message + '</p>';
//         $form.find('.pt-buttons').after(errHtml);
//         setTimeout(function() { $form.find('.pt-cart-error').fadeOut(300, function() { $(this).remove(); }); }, 4000);
//     }
    
//     function init() {
//         $('.pt-wrap').each(function() {
//             var sectionId = $(this).attr('id').replace('pt-', '');
//             initSection(sectionId);
//         });
//     }
    
//     function initSection(sectionId) {
//         const $section = $(`#pt-${sectionId}`);
//         const $form = $(`#product-form-${sectionId}`);
//         const $variantInput = $(`#pt-variant-id-${sectionId}`);
//         const $priceElement = $(`#pt-price-${sectionId}`);
//         const $comparePriceElement = $section.find('.pt-compare-price');
//         const $skuElement = $(`#pt-sku-${sectionId}`);
//         const $mainImage = $(`#pt-main-img-${sectionId}`);
//         const $addButton = $section.find('.pt-btn-cart');
//         const $btnText = $addButton.find('.pt-btn-text');
//         const $qtyInput = $section.find('.pt-qty-input');
//         const $qtyMinus = $section.find('.pt-qty-minus');
//         const $qtyPlus = $section.find('.pt-qty-plus');
        
//         var productData = window.productJson;
//         if (!productData) {
//             var productJsonEl = document.getElementById(`ProductJson-${sectionId}`);
//             if (productJsonEl && productJsonEl.textContent) {
//                 try {
//                     productData = JSON.parse(productJsonEl.textContent);
//                     window.productJson = productData;
//                 } catch(e) {
//                     console.error('Failed to parse product JSON', e);
//                     return;
//                 }
//             } else {
//                 console.error('Product JSON not found for section', sectionId);
//                 return;
//             }
//         }
        
//         function findVariantById(variantId) {
//             return productData.variants.find(function(v) {
//                 return v.id == variantId;
//             });
//         }
        
//         function findVariantByOptions(selectedValues) {
//             return productData.variants.find(function(variant) {
//                 return selectedValues.every(function(option, index) {
//                     return variant.options[index] === option;
//                 });
//             });
//         }
        
//         function formatMoney(price) {
//             if (typeof Shopify !== 'undefined' && Shopify.formatMoney) {
//                 return Shopify.formatMoney(price, '{{ shop.money_format }}');
//             }
//             var amount = price / 100;
//             return '$' + amount.toFixed(2);
//         }
        
//         function updateUrlParam(param, value) {
//             var url = new URL(window.location.href);
//             url.searchParams.set(param, value);
//             window.history.replaceState({}, '', url);
//         }
        
//         function updateQtyButtonStates() {
//             var currentQty = parseInt($qtyInput.val(), 10) || 1;
//             var maxQty = parseInt($qtyInput.attr('max'), 10) || MAX_QUANTITY_PER_PRODUCT;
            
//             if ($qtyMinus.length) $qtyMinus.prop('disabled', currentQty <= 1);
//             if ($qtyPlus.length) $qtyPlus.prop('disabled', currentQty >= maxQty);
//         }
        
//         function updateUI(variant) {
//             if (!variant) return;
            
//             $variantInput.val(variant.id);
            
//             if ($priceElement.length) {
//                 $priceElement.html(formatMoney(variant.price));
//             }
            
//             if ($comparePriceElement.length) {
//                 if (variant.compare_at_price && variant.compare_at_price > variant.price) {
//                     $comparePriceElement.html(formatMoney(variant.compare_at_price));
//                     $comparePriceElement.show();
//                     var $savingsBadge = $section.find('.pt-discount-badge');
//                     if ($savingsBadge.length) {
//                         var discount = Math.round((variant.compare_at_price - variant.price) / variant.compare_at_price * 100);
//                         $savingsBadge.text('Save ' + discount + '%');
//                         $savingsBadge.show();
//                     }
//                 } else {
//                     $comparePriceElement.hide();
//                     $section.find('.pt-discount-badge').hide();
//                 }
//             }
            
//             if ($skuElement.length) {
//                 $skuElement.text(variant.sku || 'N/A');
//             }
            
//             // Handle quantity limits - respect both stock AND max per product
//             if ($qtyInput.length) {
//                 var stockQty = (variant.inventory_management && variant.inventory_quantity > 0) 
//                     ? variant.inventory_quantity 
//                     : Infinity;
//                 var maxQty = Math.min(stockQty, MAX_QUANTITY_PER_PRODUCT);
                
//                 if (!variant.available || maxQty <= 0) {
//                     $qtyInput.attr('max', 0);
//                     $qtyInput.val(0);
//                     $qtyInput.prop('disabled', true);
//                     if ($qtyMinus.length) $qtyMinus.prop('disabled', true);
//                     if ($qtyPlus.length) $qtyPlus.prop('disabled', true);
//                 } else {
//                     $qtyInput.attr('max', maxQty);
//                     $qtyInput.prop('disabled', false);
//                     var currentQty = parseInt($qtyInput.val(), 10) || 1;
//                     if (currentQty > maxQty) $qtyInput.val(maxQty);
//                     updateQtyButtonStates();
//                 }
//             }
            
//             if ($mainImage.length && variant.featured_image) {
//                 var newSrc = variant.featured_image.src;
//                 if ($mainImage.attr('src') !== newSrc) {
//                     $mainImage.css('opacity', '0');
//                     setTimeout(function() {
//                         $mainImage.attr({
//                             src: newSrc,
//                             alt: variant.featured_image.alt || productData.title
//                         });
//                         $mainImage.css('opacity', '1');
//                     }, 200);
//                 }
//             }
            
//             if ($addButton.length) {
//                 if (variant.available) {
//                     $addButton.prop('disabled', false);
//                     if ($btnText.length) {
//                         var originalText = $btnText.data('original-text') || 'Add to Cart';
//                         $btnText.text(originalText);
//                     }
//                 } else {
//                     $addButton.prop('disabled', true);
//                     if ($btnText.length) {
//                         if (!$btnText.data('original-text')) {
//                             $btnText.data('original-text', $btnText.text());
//                         }
//                         $btnText.text('Sold Out');
//                     }
//                 }
//             }
            
//             updateUrlParam('variant', variant.id);
//             $(document).trigger('variantChanged', [variant]);
//         }
        
//         function updateSelection() {
//             var selectedValues = [];
//             $section.find('.visually-hidden[data-index]').each(function() {
//                 var val = $(this).val();
//                 if (val) selectedValues.push(val);
//             });
            
//             if (selectedValues.length === 0) {
//                 $section.find('.pt-option-group').each(function(index) {
//                     var $activeBtn = $(this).find('[data-option-index="' + index + '"].active');
//                     if ($activeBtn.length) {
//                         selectedValues.push($activeBtn.data('option-value'));
//                     } else {
//                         var $firstBtn = $(this).find('[data-option-index="' + index + '"]').first();
//                         if ($firstBtn.length) {
//                             selectedValues.push($firstBtn.data('option-value'));
//                         }
//                     }
//                 });
//             }
            
//             if (selectedValues.length === productData.options.length) {
//                 var variant = findVariantByOptions(selectedValues);
//                 if (variant) {
//                     updateUI(variant);
//                     return variant;
//                 }
//             }
            
//             var currentVariantId = $variantInput.val();
//             if (currentVariantId) {
//                 var currentVariant = findVariantById(currentVariantId);
//                 if (currentVariant) {
//                     updateUI(currentVariant);
//                     return currentVariant;
//                 }
//             }
            
//             var firstAvailable = productData.variants.find(function(v) { return v.available; });
//             if (firstAvailable) {
//                 updateUI(firstAvailable);
//                 return firstAvailable;
//             }
            
//             if (productData.variants[0]) {
//                 updateUI(productData.variants[0]);
//                 return productData.variants[0];
//             }
//         }
        
//         function syncHiddenSelects() {
//             $section.find('.pt-option-group').each(function(groupIndex) {
//                 var $activeBtn = $(this).find('[data-option-index="' + groupIndex + '"].active');
//                 if ($activeBtn.length) {
//                     var value = $activeBtn.data('option-value');
//                     var $hiddenSelect = $section.find('#SingleOptionSelector-' + sectionId + '-' + groupIndex);
//                     if ($hiddenSelect.length && $hiddenSelect.val() !== value) {
//                         $hiddenSelect.val(value);
//                     }
//                 }
//             });
//         }
        
//         // Quantity button handlers
//         $qtyMinus.off('click').on('click', function(e) {
//             e.preventDefault();
//             var currentVal = parseInt($qtyInput.val(), 10) || 1;
//             if (currentVal > 1) {
//                 $qtyInput.val(currentVal - 1).trigger('change');
//             }
//         });
        
//         $qtyPlus.off('click').on('click', function(e) {
//             e.preventDefault();
//             var currentVal = parseInt($qtyInput.val(), 10) || 1;
//             var maxVal = parseInt($qtyInput.attr('max'), 10) || MAX_QUANTITY_PER_PRODUCT;
//             if (currentVal < maxVal) {
//                 $qtyInput.val(currentVal + 1).trigger('change');
//             }
//         });
        
//         $qtyInput.off('change').on('change', function() {
//             var val = parseInt($(this).val(), 10) || 1;
//             var maxVal = parseInt($(this).attr('max'), 10) || MAX_QUANTITY_PER_PRODUCT;
//             if (val < 1) val = 1;
//             if (val > maxVal) val = maxVal;
//             $(this).val(val);
//             updateQtyButtonStates();
//         });
        
//         // Swatch/Pill click handler
//         $section.off('click', '[data-option-index]').on('click', '[data-option-index]', function(e) {
//             e.preventDefault();
//             var $target = $(this);
//             var optionIndex = $target.data('option-index');
//             var optionValue = $target.data('option-value');
//             var $group = $target.closest('.pt-option-group');
            
//             if ($target.hasClass('active')) return;
            
//             $group.find('[data-option-index="' + optionIndex + '"]').removeClass('active');
//             $target.addClass('active');
            
//             var $hiddenSelect = $section.find('#SingleOptionSelector-' + sectionId + '-' + optionIndex);
//             if ($hiddenSelect.length) {
//                 $hiddenSelect.val(optionValue).trigger('change');
//             }
            
//             var labelId = $target.data('label-id');
//             if (labelId) {
//                 $('#' + labelId).text(optionValue);
//             }
            
//             updateSelection();
//         });
        
//         $section.off('change', '.visually-hidden[data-index]').on('change', '.visually-hidden[data-index]', function() {
//             updateSelection();
//         });
        
//         $section.off('change', '.pt-selector').on('change', '.pt-selector', function() {
//             var optionIndex = $(this).data('option-index');
//             var optionValue = $(this).val();
//             var labelId = $(this).data('label-id');
            
//             var $targetBtn = $section.find('[data-option-index="' + optionIndex + '"][data-option-value="' + optionValue + '"]');
//             if ($targetBtn.length) {
//                 var $group = $targetBtn.closest('.pt-option-group');
//                 $group.find('[data-option-index="' + optionIndex + '"]').removeClass('active');
//                 $targetBtn.addClass('active');
//             }
            
//             if (labelId) {
//                 $('#' + labelId).text(optionValue);
//             }
            
//             var $hiddenSelect = $section.find('#SingleOptionSelector-' + sectionId + '-' + optionIndex);
//             if ($hiddenSelect.length) {
//                 $hiddenSelect.val(optionValue).trigger('change');
//             }
            
//             updateSelection();
//         });
        
//         $section.off('click', '.pt-thumb').on('click', '.pt-thumb', function() {
//             var imgSrc = $(this).data('src');
//             if (imgSrc && $mainImage.length) {
//                 $mainImage.css('opacity', '0');
//                 setTimeout(function() {
//                     $mainImage.attr('src', imgSrc);
//                     $mainImage.css('opacity', '1');
//                 }, 200);
//             }
//             $section.find('.pt-thumb').removeClass('active');
//             $(this).addClass('active');
//         });
        
//         $section.off('click', '.pt-accordion-trigger').on('click', '.pt-accordion-trigger', function() {
//             var $trigger = $(this);
//             var $body = $trigger.next('.pt-accordion-body');
//             var isOpen = $body.is(':visible');
//             $trigger.attr('aria-expanded', !isOpen);
//             $body.slideToggle(200);
//         });
        
//         $section.off('click', '[data-read-more]').on('click', '[data-read-more]', function() {
//             var $btn = $(this);
//             var $desc = $btn.prev('.pt-desc');
//             var isExpanded = $desc.hasClass('expanded');
//             $desc.toggleClass('expanded', !isExpanded);
//             $btn.text(isExpanded ? $btn.data('label-more') : $btn.data('label-less'));
//         });
        
//         $section.off('click', '.pt-tab-btn').on('click', '.pt-tab-btn', function() {
//             var tab = $(this).data('tab');
//             $section.find('.pt-tab-btn').removeClass('active');
//             $section.find('.pt-tab-panel').removeClass('active');
//             $(this).addClass('active');
//             $('#tab-' + tab).addClass('active');
//         });
        
//         // AJAX Add to Cart
//         $form.off('submit').on('submit', function(e) {
//             e.preventDefault();
            
//             if ($addButton.prop('disabled') || $addButton.hasClass('loading')) return;
            
//             var variantId = $variantInput.val();
//             var qty = parseInt($qtyInput.val(), 10) || 1;
//             var maxAllowed = parseInt($qtyInput.attr('max'), 10) || MAX_QUANTITY_PER_PRODUCT;
            
//             if (!variantId) {
//                 showError($form, 'Please select a product option');
//                 return;
//             }
            
//             if (qty > maxAllowed) {
//                 showError($form, 'Maximum ' + maxAllowed + ' items per product');
//                 return;
//             }
            
//             var variant = findVariantById(variantId);
//             if (variant && variant.inventory_management && variant.inventory_quantity > 0 && qty > variant.inventory_quantity) {
//                 showError($form, 'Only ' + variant.inventory_quantity + ' items in stock');
//                 return;
//             }
            
//             var originalText = $btnText.text();
//             $addButton.addClass('loading').prop('disabled', true);
            
//             $.ajax({
//                 url: '/cart/add.js',
//                 type: 'POST',
//                 dataType: 'json',
//                 contentType: 'application/json',
//                 data: JSON.stringify({ id: parseInt(variantId), quantity: qty }),
//                 success: function() {
//                     $addButton.removeClass('loading').addClass('success');
//                     $btnText.text('✓ Added to Cart!');
                    
//                     $.get('/cart.js', function(cart) {
//                         $('.cart-count, #cartCounter, [data-cart-count]').text(cart.item_count || '');
//                         $(document).trigger('cart:refresh', cart);
//                     });
                    
//                     setTimeout(function() {
//                         $addButton.removeClass('success').prop('disabled', false);
//                         $btnText.text(originalText);
//                     }, 2500);
//                 },
//                 error: function(xhr) {
//                     $addButton.removeClass('loading').prop('disabled', false);
//                     $btnText.text(originalText);
                    
//                     var errorMsg = 'Could not add to cart. Please try again.';
//                     try {
//                         var response = JSON.parse(xhr.responseText);
//                         if (response.description) errorMsg = response.description;
//                     } catch(e) {}
//                     showError($form, errorMsg);
//                 }
//             });
//         });
        
//         $(document).on('variantChange' + sectionId, function(event, variant) {
//             if (variant) updateUI(variant);
//         });
        
//         syncHiddenSelects();
//         updateSelection();
//     }
    
//     $(document).ready(function() {
//         waitForProductJson(function() {
//             init();
//         });
//     });
    
// })();