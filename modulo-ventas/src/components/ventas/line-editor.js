import { getPrecioVigente } from '../../ventas/catalog.js';
import { orderTotals, roundMoney } from '../../ventas/money.js';

let lineas = [];
let sequence = 0;

function nextId(){ sequence += 1; return `line-${sequence}`; }

export function resetLineEditor(){
  lineas = [];
  sequence = 0;
}

export function getLines(){
  return lineas.map(line => ({ ...line }));
}

export function addLine(producto, cantidad = 1, moneda = 'CLP'){
  if(!producto) return undefined;
  const existing = lineas.find(line => line.productoId === producto.id);
  if(existing){
    existing.cantidad += Number(cantidad) || 1;
    return existing;
  }
  const price = getPrecioVigente(producto.id);
  const line = {
    id: nextId(),
    productoId: producto.id,
    sku: producto.sku,
    nombre: producto.nombre,
    cantidad: Number(cantidad) || 1,
    precioUnitario: price ? price.precio : 0,
    impuestoPorcentaje: Number(producto.impuestoPorcentaje) || 0,
    moneda
  };
  lineas.push(line);
  return line;
}

export function removeLine(id){
  lineas = lineas.filter(line => line.id !== id);
}

export function setLineQuantity(id, cantidad){
  const line = lineas.find(item => item.id === id);
  if(!line) return;
  const value = Math.floor(Number(cantidad));
  line.cantidad = Number.isFinite(value) && value > 0 ? value : 1;
}

export function getLineTotals(moneda = 'CLP'){
  return orderTotals(lineas, { currency: moneda });
}

export function renderLineEditor(tbody, totalsEl, onChange){
  if(!tbody) return;
  tbody.innerHTML = '';
  if(lineas.length === 0){
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.className = 'empty';
    cell.textContent = 'Aún no has agregado productos a la orden.';
    row.appendChild(cell);
    tbody.appendChild(row);
  }
  for(const line of lineas){
    const row = document.createElement('tr');

    const productCell = document.createElement('td');
    const name = document.createElement('strong');
    name.textContent = line.nombre;
    const sku = document.createElement('span');
    sku.className = 'muted';
    sku.textContent = ` · ${line.sku}`;
    productCell.append(name, sku);

    const quantityCell = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '1';
    input.step = '1';
    input.value = String(line.cantidad);
    input.className = 'line-quantity';
    input.setAttribute('aria-label', `Cantidad de ${line.nombre}`);
    input.addEventListener('change', () => {
      setLineQuantity(line.id, input.value);
      if(onChange) onChange();
    });
    quantityCell.appendChild(input);

    const priceCell = document.createElement('td');
    priceCell.textContent = roundMoney(line.precioUnitario, line.moneda).toLocaleString('es-CL');

    const subtotalCell = document.createElement('td');
    subtotalCell.textContent = roundMoney(line.cantidad * line.precioUnitario, line.moneda).toLocaleString('es-CL');

    const actionCell = document.createElement('td');
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'link-button';
    remove.textContent = 'Quitar';
    remove.setAttribute('aria-label', `Quitar ${line.nombre}`);
    remove.addEventListener('click', () => {
      removeLine(line.id);
      if(onChange) onChange();
    });
    actionCell.appendChild(remove);

    row.append(productCell, quantityCell, priceCell, subtotalCell, actionCell);
    tbody.appendChild(row);
  }
  if(totalsEl){
    const totals = getLineTotals(lineas[0]?.moneda || 'CLP');
    totalsEl.textContent = `Subtotal: ${totals.subtotal.toLocaleString('es-CL')} · IVA: ${totals.impuesto.toLocaleString('es-CL')} · Total: ${totals.total.toLocaleString('es-CL')}`;
  }
}
