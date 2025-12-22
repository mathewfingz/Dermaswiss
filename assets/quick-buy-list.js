(function () {
  var fallbackMoneyFormat = "";
  var soldOutText = "Sold out";
  var selectors = {
    list: '[data-quick-buy-list]',
    item: '[data-quick-buy-item]',
    variantSelect: '[data-variant-select]',
    variantInput: '[data-variant-input]',
    quantityInput: '[data-quantity-input]',
    decrease: '[data-quantity-decrease]',
    increase: '[data-quantity-increase]',
    subtotal: '[data-subtotal]',
    unitPrice: '[data-unit-price]',
    comparePrice: '[data-compare-price]',
    discount: '[data-discount-label]',
    addButton: '[data-add-button]',
    statusText: '[data-status-text]'
  };

  function formatMoney(value, format) {
    var moneyFormat = format || fallbackMoneyFormat;
    if (window.Shopify && typeof window.Shopify.formatMoney === 'function') {
      return window.Shopify.formatMoney(value, moneyFormat);
    }
    var price = (value / 100).toFixed(2);
    return '$' + price;
  }

  function sanitizeQuantity(value) {
    var quantity = parseInt(value, 10);
    if (isNaN(quantity) || quantity < 1) {
      return 1;
    }
    return quantity;
  }

  function updateSubtotal(item, moneyFormat) {
    var subtotalEl = item.querySelector(selectors.subtotal);
    var quantityInput = item.querySelector(selectors.quantityInput);
    if (!subtotalEl || !quantityInput) return;
    var quantity = sanitizeQuantity(quantityInput.value);
    quantityInput.value = quantity;
    var unitPrice = parseInt(item.dataset.currentPrice || '0', 10);
    subtotalEl.textContent = formatMoney(unitPrice * quantity, moneyFormat);
  }

  function updatePriceUI(item, price, comparePrice, moneyFormat) {
    var priceEl = item.querySelector(selectors.unitPrice);
    var compareEl = item.querySelector(selectors.comparePrice);
    var discountEl = item.querySelector(selectors.discount);
    if (priceEl) {
      priceEl.textContent = formatMoney(price, moneyFormat);
    }
    if (compareEl) {
      if (comparePrice > price && comparePrice > 0) {
        compareEl.textContent = formatMoney(comparePrice, moneyFormat);
        compareEl.classList.remove('quick-buy-item__compare--hidden');
      } else {
        compareEl.textContent = '';
        compareEl.classList.add('quick-buy-item__compare--hidden');
      }
    }
    if (discountEl) {
      if (comparePrice > price && comparePrice > 0) {
        var percent = Math.round(((comparePrice - price) / comparePrice) * 100);
        discountEl.textContent = 'Save ' + percent + '%';
        discountEl.classList.remove('quick-buy-item__discount--hidden');
      } else {
        discountEl.textContent = '';
        discountEl.classList.add('quick-buy-item__discount--hidden');
      }
    }
  }

  function toggleAvailability(item, available) {
    var button = item.querySelector(selectors.addButton);
    var statusText = item.querySelector(selectors.statusText);
    if (!button) return;
    if (available) {
      button.removeAttribute('disabled');
      if (statusText) {
        statusText.textContent = '';
      }
    } else {
      button.setAttribute('disabled', 'disabled');
      if (statusText) {
        statusText.textContent = soldOutText;
      }
    }
  }

  function bindQuantityButtons(item, moneyFormat) {
    var decreaseBtn = item.querySelector(selectors.decrease);
    var increaseBtn = item.querySelector(selectors.increase);
    var quantityInput = item.querySelector(selectors.quantityInput);
    if (decreaseBtn && quantityInput) {
      decreaseBtn.addEventListener('click', function () {
        var nextValue = sanitizeQuantity(quantityInput.value) - 1;
        quantityInput.value = nextValue < 1 ? 1 : nextValue;
        updateSubtotal(item, moneyFormat);
      });
    }
    if (increaseBtn && quantityInput) {
      increaseBtn.addEventListener('click', function () {
        var nextValue = sanitizeQuantity(quantityInput.value) + 1;
        quantityInput.value = nextValue;
        updateSubtotal(item, moneyFormat);
      });
    }
    if (quantityInput) {
      quantityInput.addEventListener('change', function () {
        quantityInput.value = sanitizeQuantity(quantityInput.value);
        updateSubtotal(item, moneyFormat);
      });
      quantityInput.addEventListener('input', function () {
        if (quantityInput.value === '') return;
        updateSubtotal(item, moneyFormat);
      });
    }
  }

  function initItem(item, moneyFormat) {
    var variantSelect = item.querySelector(selectors.variantSelect);
    var variantInput = item.querySelector(selectors.variantInput);

    var updateVariant = function () {
      if (!variantSelect) return;
      var selectedOption = variantSelect.options[variantSelect.selectedIndex];
      if (!selectedOption) return;
      var price = parseInt(selectedOption.dataset.price || '0', 10);
      var compare = parseInt(selectedOption.dataset.compare || '0', 10);
      var available = selectedOption.dataset.available === 'true';
      if (variantInput) {
        variantInput.value = selectedOption.value;
      }
      item.dataset.currentPrice = price;
      item.dataset.currentCompare = compare;
      item.dataset.currentAvailable = available;
      updatePriceUI(item, price, compare, moneyFormat);
      toggleAvailability(item, available);
      updateSubtotal(item, moneyFormat);
    };

    if (variantSelect) {
      variantSelect.addEventListener('change', updateVariant);
    }

    bindQuantityButtons(item, moneyFormat);
    updatePriceUI(
      item,
      parseInt(item.dataset.currentPrice || '0', 10),
      parseInt(item.dataset.currentCompare || '0', 10),
      moneyFormat
    );
    toggleAvailability(item, item.dataset.currentAvailable === 'true');
    updateSubtotal(item, moneyFormat);
  }

  function initList(list) {
    var moneyFormat = list.dataset.moneyFormat || fallbackMoneyFormat;
    var items = list.querySelectorAll(selectors.item);
    items.forEach(function (item) {
      if (item.dataset.quickBuyReady === 'true') return;
      initItem(item, moneyFormat);
      item.dataset.quickBuyReady = 'true';
    });
  }

  function init(root) {
    var scope = root || document;
    var lists = scope.querySelectorAll(selectors.list);
    lists.forEach(function (list) {
      initList(list);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      init(document);
    });
  } else {
    init(document);
  }

  document.addEventListener('shopify:section:load', function (event) {
    init(event.target);
  });
  document.addEventListener('product-grid:updated', function (event) {
    init(event.target ? event.target : document);
  });
})();
