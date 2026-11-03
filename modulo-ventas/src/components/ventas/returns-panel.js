import { listInvoices, getInvoice } from '../../ventas/invoices.js';
import { createReturn, listReturns } from '../../ventas/returns.js';

let wired = false;
let onReturned = () => {};

function qs(id){ return document.getElementById(id); }
function today(){ return new Date().toISOString().slice(0, 10); }

function populateInvoices(){
  const select = qs('return-invoice');
  if(!select) return;
  const previous = select.value;
  select.innerHTML = '';
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = '-- Selecciona una factura --';
  select.appendChild(empty);
  for(const invoice of listInvoices().filter(item => item.estado !== 'anulada')){
    const opt = document.createElement('option');
    opt.value = invoice.id;
    opt.textContent = `${invoice.numero} · ${invoice.clienteId} · ${invoice.total.toLocaleString('es-CL')} ${invoice.moneda}`;
    select.appendChild(opt);
  }
  if(previous && [...select.options].some(item => item.value === previous)) select.value = previous;
}

function renderInvoiceLines(){
  const select = qs('return-invoice');
  const container = qs('return-lines');
  const empty = qs('return-empty');
  if(!container) return;
  container.innerHTML = '';
  const invoice = select && select.value ? getInvoice(select.value) : undefined;
  if(empty) empty.hidden = Boolean(invoice);
  if(!invoice) return;
  for(const line of invoice.lineas || []){
    const row = document.createElement('div');
    row.className = 'return-line';
    const label = document.createElement('label');
    label.textContent = `${line.nombre || line.productoId} · ${line.precioUnitario.toLocaleString('es-CL')} ${invoice.moneda}`;
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.max = String(line.cantidad);
    input.value = '0';
    input.step = '1';
    input.dataset.lineId = line.id;
    input.dataset.productId = line.productoId;
    input.setAttribute('aria-label', `Cantidad a devolver de ${line.nombre || line.productoId}`);
    label.appendChild(input);
    row.appendChild(label);
    container.appendChild(row);
  }
}

function handleSubmit(event){
  event.preventDefault();
  const feedback = qs('return-feedback');
  const lineas = [...document.querySelectorAll('#return-lines input')]
    .map(input => ({ detallePedidoId: input.dataset.lineId, productoId: input.dataset.productId, cantidad: Number(input.value) }))
    .filter(line => line.cantidad > 0);
  try{
    const result = createReturn({
      facturaId: qs('return-invoice')?.value,
      motivo: qs('return-reason')?.value.trim(),
      fecha: qs('return-date')?.value || today(),
      lineas
    });
    if(feedback) feedback.textContent = `Devolución ${result.numero} registrada en estado "${result.devolucion.estado}" por ${result.total.toLocaleString('es-CL')} ${result.devolucion.moneda}.`;
    renderReturnsPanel();
    if(qs('return-reason')) qs('return-reason').value = '';
    onReturned(result);
  }catch(error){
    if(feedback) feedback.textContent = error.message;
  }
}

export function initReturnsPanel(options = {}){
  onReturned = options.onReturned || (() => {});
  if(wired) return;
  wired = true;
  const select = qs('return-invoice');
  if(select) select.addEventListener('change', renderInvoiceLines);
  const form = qs('return-form');
  if(form) form.addEventListener('submit', handleSubmit);
}

export function renderReturnsPanel(){
  populateInvoices();
  const date = qs('return-date');
  if(date && !date.value) date.value = today();
  renderInvoiceLines();
  const list = qs('returns-list');
  if(list){
    list.innerHTML = '';
    const returns = listReturns();
    if(returns.length === 0){
      const empty = document.createElement('li');
      empty.className = 'empty';
      empty.textContent = 'No hay devoluciones registradas.';
      list.appendChild(empty);
    }
    for(const item of returns){
      const entry = document.createElement('li');
      entry.textContent = `${item.numero} · ${item.fecha} · ${item.motivo} · ${item.estado}`;
      list.appendChild(entry);
    }
  }
}
