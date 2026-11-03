import { searchProductos, getStock } from '../../ventas/catalog.js';

export function productStockLabel(producto){
  const stock = getStock(producto.id);
  return stock > 0 ? `Stock: ${stock}` : 'Sin stock';
}

export function renderProductPicker(listEl, query, onPick){
  if(!listEl) return;
  listEl.innerHTML = '';
  const productos = searchProductos(query);
  if(productos.length === 0){
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.textContent = query ? 'Sin productos que coincidan con la búsqueda.' : 'No hay productos registrados.';
    listEl.appendChild(empty);
    return;
  }
  for(const producto of productos){
    const stock = getStock(producto.id);
    const item = document.createElement('li');
    item.className = 'product-option';
    if(stock <= 0) item.classList.add('is-disabled');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'product-option-button';
    button.disabled = stock <= 0;
    button.setAttribute('aria-label', `Agregar ${producto.nombre} (${producto.sku})`);

    const name = document.createElement('strong');
    name.textContent = producto.nombre;
    const meta = document.createElement('span');
    meta.className = 'muted';
    meta.textContent = `${producto.sku} · ${stock > 0 ? `Stock: ${stock}` : 'Sin stock'}`;

    button.append(name, meta);
    if(stock > 0) button.addEventListener('click', () => onPick(producto));
    item.appendChild(button);
    listEl.appendChild(item);
  }
}
