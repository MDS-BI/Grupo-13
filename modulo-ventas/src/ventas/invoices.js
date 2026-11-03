import { COLLECTIONS, generateId, loadCollection, saveCollection } from './collections.js';
import { getConfig } from '../module-config.js';
import { reserveNumber } from './numbering.js';
import { orderTotals, roundMoney } from './money.js';
import { getOrder, updateOrderStatus } from './orders.js';
import { assertCan } from './roles.js';

const inProgress = new Set();

function now(){ return new Date().toISOString(); }
function today(){ return new Date().toISOString().slice(0, 10); }
function text(value){ return String(value ?? '').trim(); }

function addDays(date, days){
  const dt = new Date(`${date}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + Number(days || 0));
  return dt.toISOString().slice(0, 10);
}

export function listInvoices(){
  return loadCollection(COLLECTIONS.facturas);
}

export function getInvoice(id){
  return listInvoices().find(invoice => invoice.id === id);
}

export function getInvoiceByOrder(pedidoId){
  return listInvoices().find(invoice => invoice.pedidoId === pedidoId || invoice.pedido_id === pedidoId);
}

export function invoiceForOrder(pedidoId){
  return getInvoiceByOrder(pedidoId);
}

export function validateInvoiceForOrder(order){
  const errors = {};
  if(!order){
    errors.pedido = 'Pedido no encontrado';
    return { valid: false, errors };
  }
  if(getInvoiceByOrder(order.id)){
    errors.pedido = 'Este pedido ya tiene una factura asociada';
  }
  if(order.estado === 'cotización'){
    errors.estado = 'La orden requiere confirmación previa para poder facturarse';
  } else if(order.estado !== 'pedido'){
    errors.estado = `Solo se puede facturar un pedido en estado "pedido"; estado actual: "${order.estado}"`;
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function isOrderInvoiceable(order){
  return validateInvoiceForOrder(order).valid;
}

export function createInvoiceFromOrder(orderId, options = {}){
  if(!options.skipRoleCheck){
    assertCan('facturar', options.role);
  }
  if(inProgress.has(orderId)){
    throw new Error('Ya se está generando una factura para este pedido');
  }
  inProgress.add(orderId);
  try{
    const order = getOrder(orderId);
    const check = validateInvoiceForOrder(order);
    if(!check.valid) throw new Error(Object.values(check.errors)[0]);

    const timestamp = now();
    const serie = text(options.serie) || 'FAC';
    const { folio, numero } = reserveNumber({ serie, collection: COLLECTIONS.facturas });
    const fechaEmision = text(options.fechaEmision) || today();
    const fechaVencimiento = text(options.fechaVencimiento) || addDays(fechaEmision, options.diasVencimiento ?? 30);
    const moneda = order.moneda || getConfig().businessRules?.defaultCurrency || 'CLP';
    const totals = orderTotals(order.lineas || [], { currency: moneda, descuento: order.descuento || 0 });
    const subtotal = roundMoney(order.subtotal ?? totals.subtotal, moneda);
    const impuesto = roundMoney(order.impuesto ?? totals.impuesto, moneda);
    const total = roundMoney(order.total ?? totals.total, moneda);
    const lineas = (order.lineas || []).map((line, index) => ({
      ...line,
      id: generateId(),
      facturaId: undefined,
      linea: index + 1
    }));
    const invoice = {
      id: generateId(),
      numero,
      serie,
      folio,
      pedidoId: order.id,
      pedido_id: order.id,
      clienteId: order.clienteId,
      cliente_id: order.clienteId,
      fechaEmision,
      fecha_emision: fechaEmision,
      fechaVencimiento,
      fecha_vencimiento: fechaVencimiento,
      estado: 'pendiente de pago',
      status: 'pendiente de pago',
      moneda,
      subtotal,
      impuesto,
      total,
      saldo: total,
      lineas,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    const list = listInvoices();
    list.push(invoice);
    saveCollection(COLLECTIONS.facturas, list);
    updateOrderStatus(order.id, 'facturado');
    return invoice;
  } finally {
    inProgress.delete(orderId);
  }
}

export function updateInvoice(id, updates = {}){
  const list = listInvoices();
  const idx = list.findIndex(invoice => invoice.id === id);
  if(idx === -1) throw new Error('Factura no encontrada');
  list[idx] = { ...list[idx], ...updates, updatedAt: now() };
  saveCollection(COLLECTIONS.facturas, list);
  return list[idx];
}

export function markInvoicePaid(id){
  return updateInvoice(id, { estado: 'pagada', status: 'pagada', saldo: 0 });
}

export function markInvoiceAnnulled(id){
  return updateInvoice(id, { estado: 'anulada', status: 'anulada' });
}

export function resetInvoices(){
  saveCollection(COLLECTIONS.facturas, []);
  inProgress.clear();
}
