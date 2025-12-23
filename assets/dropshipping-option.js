if (!customElements.get('dropshipping-component')) {
  class DropshippingComponent extends HTMLElement {
    constructor() {
      super();
      if (!document.getElementById('f-dropshipping-yes')) return;
      
      this.inputs = this.querySelectorAll('input[type="radio"]');
      this.loadingIcon = this.querySelector('.f-dropshipping--loading');
      this.deliveryNote = document.getElementById('dropshipping-delivery-note');

      this.inputs.forEach(input => {
        input.addEventListener('change', (event) => {
          if (event.target.checked) {
            this.updateA11y(event.target);
            this.updateDropshipping(event.target.value === 'yes');
          }
        });
      });
    }

    updateA11y(checkedInput) {
      this.inputs.forEach(input => {
        input.setAttribute('aria-checked', input === checkedInput ? 'true' : 'false');
      });
      
      if (this.deliveryNote) {
        if (checkedInput.value === 'yes') {
          this.deliveryNote.classList.remove('hidden');
        } else {
          this.deliveryNote.classList.add('hidden');
        }
      }
    }

    updateDropshipping(isDropshipping) {
      if (this.loadingIcon) this.loadingIcon.style.display = 'block';
      
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      });

      const body = {
        attributes: {
          'dropshipping': isDropshipping ? 'yes' : 'no'
        }
      };

      // If we are in the cart drawer or main cart, we might want to refresh sections
      const cartDrawer = document.querySelector('cart-drawer');
      const mainCart = document.querySelector('cart-items');

      if (cartDrawer) {
        body.sections = cartDrawer.getSectionsToRender().map((section) => section.id);
        body.sections_url = window.location.pathname;
      } else if (mainCart) {
        body.sections = mainCart.getSectionsToRender().map((section) => section.section);
        body.sections_url = window.location.pathname;
      }

      fetch(`${window.FoxThemeSettings.routes.cart_update_url}`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
      })
      .then((response) => response.json())
      .then((cart) => {
        // Update FoxTheme cart state
        if (window.FoxThemeEvents && typeof PUB_SUB_EVENTS !== 'undefined') {
          window.FoxThemeEvents.emit(PUB_SUB_EVENTS.cartUpdate, cart);
        }
        
        if (cartDrawer && cartDrawer.renderContents) {
          cartDrawer.renderContents(cart);
        }
        if (mainCart && mainCart.renderContents) {
          mainCart.renderContents(cart);
        }
      })
      .catch((error) => {
        console.error('Error updating dropshipping attribute:', error);
      })
      .finally(() => {
        if (this.loadingIcon) this.loadingIcon.style.display = 'none';
      });
    }
  }

  customElements.define('dropshipping-component', DropshippingComponent);
}

