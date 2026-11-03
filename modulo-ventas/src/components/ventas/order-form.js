import { loadEntities } from '../../storage.js';
import { getConfig } from '../../module-config.js';
import { createOrder, validateOrder, canEditOrder, getOrder } from '../../ventas/orders.js';
import { renderProductPicker } from './product-picker.js';
import { addLine, getLines, renderLineEditor, resetLineEditor, setLineQuantity } from './line-editor.js';

let wired = false;
let onCreated = () => {};

function qs(id){ return document.getElementById(id); }
function today(){ return new Date().toISOString().slice(0, 10); }

function option(value, label){
  const opt = document.createElement('option');
  opt.value = value;
  opt.textContent = label;
  return opt;
}

function populateClients(){
  const select = qs('order-client');
  if(!select) return;
  const previous = select.value;
  select.innerHTML = '';
  select.appendChild(option('', '-- Selecciona un cliente --'));
  for(const entity of loadEntities()){
    select.appendChild(option(entity.entity_id, `${entity.name} · ${entity.code}`));
  }
  if(previous && [...select.options].some(item => item.value === previous)) select.value = previous;
}

function clearErrors(){
  for(const id of ['order-client-error', 'order-seller-error', 'order-channel-error', 'order-payment-error', 'order-date-error', 'order-lines-error']){
    const el = qs(id);
    if(el) el.textContent = '';
  }
}

function showErrors(errors = {}){
  clearErrors();
  const map = {
    clienteId: 'order-client-error',
    vendedorId: 'order-seller-error',
    canal: 'order-channel-error',
    condicionesPago: 'order-payment-error',
    fechaEmision: 'order-date-error',
    lineas: 'order-lines-error'
  };
  for(const [key, id] of Object.entries(map)){
    const el = qs(id);
    if(el && errors[key]) el.textContent = String(errors[key]);
  }
  const other = Object.entries(errors).find(([key]) => !(key in map));
  const banner = qs('order-feedback');
  if(banner){
    banner.textContent = other ? String(other[1]) : '';
  }
}

function refreshEditor(){
  const moneda = qs('order-currency')?.value || getConfig().businessRules?.defaultCurrency || 'CLP';
  for(const line of getLines()) line.moneda = moneda;
  renderLineEditor(qs('order-lines-body'), qs('order-totals'), refreshEditor);
}

function collectPayload(){
  return {
    clienteId: qs('order-client')?.value,
    vendedorId: qs('order-seller')?.value.trim(),
    canal: qs('order-channel')?.value,
    condicionesPago: qs('order-payment')?.value,
    fechaEmision: qs('order-date')?.value || today(),
    fechaEntrega: qs('order-delivery-date')?.value || undefined,
    moneda: qs('order-currency')?.value.trim() || getConfig().businessRules?.defaultCurrency || 'CLP',
    descuento: Number(qs('order-discount')?.value || 0),
    lineas: getLines().map(line => ({
      productoId: line.productoId,
      cantidad: line.cantidad,
      precioUnitario: line.precioUnitario,
      impuestoPorcentaje: line.impuestoPorcentaje
    }))
  };
}

function handleSubmit(event){
  event.preventDefault();
  const payload = collectPayload();
  const check = validateOrder(payload);
  showErrors(check.errors);
  if(!check.valid) return;
  try{
    const order = createOrder(payload);
    const feedback = qs('order-feedback');
    if(feedback) feedback.textContent = `Pedido ${order.numero} registrado en estado "${order.estado}" por un total de ${order.total.toLocaleString('es-CL')} ${order.moneda}.`;
    resetLineEditor();
    refreshEditor();
    populateClients();
    onCreated(order);
  }catch(error){
    const feedback = qs('order-feedback');
    if(feedback) feedback.textContent = error.message;
  }
}

export function initOrderForm(options = {}){
  onCreated = options.onCreated || (() => {});
  if(wired) return;
  wired = true;
  const search = qs('order-product-search');
  if(search){
    search.addEventListener('input', () => renderProductPicker(qs('order-product-results'), search.value, (producto) => {
      addLine(producto, 1, qs('order-currency')?.value || 'CLP');
      refreshEditor();
    }));
  }
  const currency = qs('order-currency');
  if(currency) currency.addEventListener('input', refreshEditor);
  const form = qs('order-form');
  if(form) form.addEventListener('submit', handleSubmit);
  const reset = qs('order-reset');
  if(reset) reset.addEventListener('click', () => {
    resetLineEditor();
    clearErrors();
    if(qs('order-feedback')) qs('order-feedback').textContent = '';
    refreshEditor();
    renderProductPicker(qs('order-product-results'), '', () => {});
  });
}

export function refreshOrderForm(){
  populateClients();
  const seller = qs('order-seller');
  if(seller && !seller.value){
    const sellers = getConfig().businessRules?.vendedores;
    seller.value = (Array.isArray(sellers) && sellers[0]?.nombre) || 'Vendedor';
  }
  const date = qs('order-date');
  if(date && !date.value) date.value = today();
  const currency = qs('order-currency');
  if(currency && !currency.value) currency.value = getConfig().businessRules?.defaultCurrency || 'CLP';
  refreshEditor();
  renderProductPicker(qs('order-product-results'), qs('order-product-search')?.value || '', () => {});
}

export function loadOrderIntoForm(id){
  const order = getOrder(id);
  if(!order) return false;
  if(!canEditOrder(order)){
    const feedback = qs('order-feedback');
    if(feedback) feedback.textContent = 'El pedido está en un estado terminal y no puede modificarse.';
    return false;
  }
  qs('order-client').value = order.clienteId;
  qs('order-seller').value = order.vendedorId || '';
  qs('order-channel').value = order.canal || 'Tienda';
  qs('order-payment').value = order.condicionesPago || 'contado';
  qs('order-date').value = order.fechaEmision || today();
  if(qs('order-delivery-date')) qs('order-delivery-date').value = order.fechaEntrega || '';
  if(qs('order-currency')) qs('order-currency').value = order.moneda || 'CLP';
  if(qs('order-discount')) qs('order-discount').value = String(order.descuento || 0);
  resetLineEditor();
  for(const line of order.lineas || []){
    const added = addLine({ id: line.productoId, nombre: line.nombre || line.productoId, sku: line.sku || '', impuestoPorcentaje: line.impuestoPorcentaje }, line.cantidad, order.moneda);
    if(added){
      added.precioUnitario = line.precioUnitario;
      setLineQuantity(added.id, line.cantidad);
    }
  }
  refreshEditor();
  return true;
}
