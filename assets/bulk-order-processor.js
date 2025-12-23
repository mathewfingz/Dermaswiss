document.addEventListener('DOMContentLoaded', function() {
  const fileInput = document.getElementById('bulk-order-file-input');
  const selectBtn = document.getElementById('bulk-order-select-btn');
  const fileNameDisplay = document.getElementById('bulk-order-filename');
  const previewZone = document.getElementById('bulk-order-preview');
  const previewBody = document.getElementById('bulk-order-preview-body');
  const addToCartBtn = document.getElementById('bulk-order-add-to-cart');
  const downloadTemplateBtn = document.getElementById('bulk-order-download-template');
  const statusZone = document.getElementById('bulk-order-status');
  const statusMsg = document.getElementById('bulk-order-status-message');

  let validItems = [];

  // 1. Download Template Logic
  downloadTemplateBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const csvContent = "data:text/csv;charset=utf-8,SKU,Quantity\nSKU-123,1\nSKU-456,5";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "bulk_order_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // 2. File Selection
  selectBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    fileNameDisplay.textContent = file.name;
    const reader = new FileReader();

    reader.onload = function(e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      processBulkData(jsonData);
    };
    reader.readAsArrayBuffer(file);
  });

  // 3. Process Data and Match with Shopify
  async function processBulkData(data) {
    previewZone.classList.remove('hidden');
    previewBody.innerHTML = '<tr><td colspan="5" class="p-8 text-center">Validando productos...</td></tr>';
    validItems = [];
    addToCartBtn.disabled = true;

    for (const item of data) {
      const sku = (item.SKU || item.sku || '').toString().trim();
      const qty = parseInt(item.Quantity || item.quantity || item.Cantidad || 0);

      if (!sku) continue;

      const row = document.createElement('tr');
      row.className = 'border-b';
      row.innerHTML = `<td class="p-3 border">${sku}</td><td class="p-3 border" colspan="3">Buscando...</td><td class="p-3 border">...</td>`;
      previewBody.appendChild(row); // Initial placeholder

      try {
        const productData = await fetchProductBySKU(sku);
        if (productData) {
          validItems.push({ id: productData.variantId, quantity: qty });
          row.innerHTML = `
            <td class="p-3 border">${sku}</td>
            <td class="p-3 border">${productData.title}</td>
            <td class="p-3 border text-center">${qty}</td>
            <td class="p-3 border text-right">${productData.price}</td>
            <td class="p-3 border text-green-600 font-semibold">✓ Listo</td>
          `;
        } else {
          row.innerHTML = `<td class="p-3 border">${sku}</td><td class="p-3 border text-red-500" colspan="3">SKU no encontrado</td><td class="p-3 border text-red-500">✕ Error</td>`;
        }
      } catch (err) {
        row.innerHTML = `<td class="p-3 border">${sku}</td><td class="p-3 border text-red-500" colspan="3">Error en validación</td><td class="p-3 border text-red-500">✕ Error</td>`;
      }
    }

    // Remove the initial "Validando" row if it exists
    if (previewBody.firstChild && previewBody.firstChild.textContent.includes('Validando')) {
      previewBody.removeChild(previewBody.firstChild);
    }

    if (validItems.length > 0) {
      addToCartBtn.disabled = false;
    }
  }

  async function fetchProductBySKU(sku) {
    const response = await fetch(`/search/suggest.json?q=sku:${sku}&resources[type]=product&resources[options][fields]=variants.sku`);
    const data = await response.json();
    const products = data.resources.results.products;

    if (products && products.length > 0) {
      const product = products[0];
      // We need to find the exact variant if multiple exist
      // Simplified: return the first one found for now
      return {
        variantId: product.variants[0].id,
        title: product.title,
        price: product.price,
        image: product.image
      };
    }
    return null;
  }

  // 4. Add to Cart
  addToCartBtn.addEventListener('click', async () => {
    addToCartBtn.classList.add('btn--loading');
    statusZone.classList.remove('hidden');
    statusMsg.textContent = 'Añadiendo productos al carrito...';

    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: validItems })
      });

      if (response.ok) {
        statusMsg.className = 'alert alert--success';
        statusMsg.textContent = '¡Productos añadidos correctamente! Redirigiendo al carrito...';
        setTimeout(() => window.location.href = '/cart', 1500);
      } else {
        throw new Error('Error al añadir');
      }
    } catch (err) {
      statusMsg.className = 'alert alert--error';
      statusMsg.textContent = 'Hubo un error al añadir los productos al carrito.';
    } finally {
      addToCartBtn.classList.remove('btn--loading');
    }
  });
});

