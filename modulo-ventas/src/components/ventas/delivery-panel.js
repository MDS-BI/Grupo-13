import { deliverOrder, listDeliverableOrders, validateDelivery } from '../../ventas/delivery.js';

let wired = false;
let onDelivered = () => {};

function qs(id){ return document.getElementById(id); }

function renderDetail(order){
  const detail = qs('delivery-detail');
  if(!detail) return;
  if(!order){
    detail.textContent = 'Selecciona un pedido facturado para confirmar su entrega.';
    return;
  }
  const check = validateDelivery(order);
  detail.textContent = `${order.numero} · ${order.clienteId} · Total ${order.total.toLocaleString('es-CL')} ${order.moneda} · Estado: ${order.estado}${check.valid ? '' : ` · ${Object.values(check.errors)[0]}`}`;
}

export function renderDeliveryPanel(){
  const select = qs('delivery-order');
  if(!select) return;
  const previous = select.value;
  select.innerHTML = '';
  const option = document.createElement('option');
  option.value = '';
  option.textContent = '-- Selecciona un pedido facturado --';
  select.appendChild(option);
  const eligible = listDeliverableOrders();
  for(const order of eligible){
    const opt = document.createElement('option');
    opt.value = order.id;
    opt.textContent = `${order.numero} · ${order.clienteId} · ${order.total.toLocaleString('es-CL')} ${order.moneda}`;
    select.appendChild(opt);
  }
  if(previous && [...select.options].some(item => item.value === previous)) select.value = previous;
  const empty = qs('delivery-empty');
  if(empty) empty.hidden = eligible.length > 0;
  renderDetail(eligible.find(order => order.id === select.value));
}

export function initDeliveryPanel(options = {}){
  onDelivered = options.onDelivered || (() => {});
  if(wired) return;
  wired = true;
  const select = qs('delivery-order');
  if(select) select.addEventListener('change', () => renderDetail(listDeliverableOrders().find(order => order.id === select.value)));
  const button = qs('delivery-confirm');
  if(button) button.addEventListener('click', () => {
    const feedback = qs('delivery-feedback');
    try{
      const delivered = deliverOrder(qs('delivery-order').value);
      if(feedback) feedback.textContent = `Pedido ${delivered.numero} marcado como entregado.`;
      renderDeliveryPanel();
      onDelivered(delivered);
    }catch(error){
      if(feedback) feedback.textContent = error.message;
    }
  });
}
