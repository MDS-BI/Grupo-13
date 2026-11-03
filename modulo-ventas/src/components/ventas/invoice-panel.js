import { listOrders } from '../../ventas/orders.js';
import { listInvoices, getInvoice, createInvoiceFromOrder } from '../../ventas/invoices.js';
import { addPayment, invoiceBalance, listPayments } from '../../ventas/payments.js';
import { can } from '../../ventas/roles.js';

let wired = false;
let onInvoiced = () => {};

function qs(id){ return document.getElementById(id); }

function populateEligibleOrders(){
  const select = qs('invoice-order');
  if(!select) return;
  const previous = select.value;
  select.innerHTML = '';
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = '-- Selecciona un pedido confirmado --';
  select.appendChild(empty);
  for(const order of listOrders().filter(item => item.estado === 'pedido')){
    const opt = document.createElement('option');
    opt.value = order.id;
    opt.textContent = `${order.numero} · ${order.clienteId} · ${order.total.toLocaleString('es-CL')} ${order.moneda}`;
    select.appendChild(opt);
  }
  if(previous && [...select.options].some(item => item.value === previous)) select.value = previous;
}

function populateInvoices(){
  const select = qs('invoice-select');
  if(!select) return;
  const previous = select.value;
  select.innerHTML = '';
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = '-- Selecciona una factura --';
  select.appendChild(empty);
  for(const invoice of listInvoices()){
    const opt = document.createElement('option');
    opt.value = invoice.id;
    opt.textContent = `${invoice.numero} · ${invoice.estado} · saldo ${Number(invoice.saldo || 0).toLocaleString('es-CL')} ${invoice.moneda}`;
    select.appendChild(opt);
  }
  if(previous && [...select.options].some(item => item.value === previous)) select.value = previous;
}

function renderInvoiceDetail(){
  const select = qs('invoice-select');
  const detail = qs('invoice-detail');
  if(!detail) return;
  detail.innerHTML = '';
  const invoice = select && select.value ? getInvoice(select.value) : undefined;
  if(!invoice){
    detail.textContent = 'Selecciona una factura para ver su detalle y registrar pagos.';
    return;
  }
  const header = document.createElement('p');
  header.textContent = `${invoice.numero} · Cliente ${invoice.clienteId} · Emitida ${invoice.fechaEmision} · Vence ${invoice.fechaVencimiento} · Estado: ${invoice.estado}`;
  const totals = document.createElement('p');
  totals.textContent = `Subtotal ${invoice.subtotal.toLocaleString('es-CL')} · IVA ${invoice.impuesto.toLocaleString('es-CL')} · Total ${invoice.total.toLocaleString('es-CL')} ${invoice.moneda} · Saldo ${invoiceBalance(invoice.id).toLocaleString('es-CL')}`;
  const lineList = document.createElement('ul');
  for(const line of invoice.lineas || []){
    const item = document.createElement('li');
    item.textContent = `${line.nombre || line.productoId} · ${line.cantidad} × ${line.precioUnitario.toLocaleString('es-CL')} · IVA ${line.impuestoPorcentaje}%`;
    lineList.appendChild(item);
  }
  const payments = document.createElement('p');
  const count = listPayments(invoice.id).length;
  payments.textContent = count === 0 ? 'Sin pagos registrados.' : `${count} pago(s) registrado(s).`;
  detail.append(header, totals, lineList, payments);
}

function handleCreate(){
  const feedback = qs('invoice-feedback');
  try{
    const invoice = createInvoiceFromOrder(qs('invoice-order').value);
    if(feedback) feedback.textContent = `Factura ${invoice.numero} generada por ${invoice.total.toLocaleString('es-CL')} ${invoice.moneda}.`;
    renderInvoicePanel();
    onInvoiced(invoice);
  }catch(error){
    if(feedback) feedback.textContent = error.message;
  }
}

function handlePayment(event){
  event.preventDefault();
  const feedback = qs('payment-feedback');
  try{
    addPayment({
      facturaId: qs('invoice-select').value,
      monto: Number(qs('payment-amount').value),
      metodo: qs('payment-method').value
    });
    if(feedback) feedback.textContent = 'Pago registrado correctamente.';
    if(qs('payment-amount')) qs('payment-amount').value = '';
    renderInvoicePanel();
  }catch(error){
    if(feedback) feedback.textContent = error.message;
  }
}

export function initInvoicePanel(options = {}){
  onInvoiced = options.onInvoiced || (() => {});
  if(wired) return;
  wired = true;
  const create = qs('invoice-create');
  if(create) create.addEventListener('click', handleCreate);
  const select = qs('invoice-select');
  if(select) select.addEventListener('change', renderInvoiceDetail);
  const form = qs('payment-form');
  if(form) form.addEventListener('submit', handlePayment);
}

export function renderInvoicePanel(){
  const restricted = qs('invoice-restricted');
  const content = qs('invoice-content');
  const allowed = can('facturar');
  if(restricted) restricted.hidden = allowed;
  if(content) content.hidden = !allowed;
  if(!allowed) return;
  populateEligibleOrders();
  populateInvoices();
  renderInvoiceDetail();
}
