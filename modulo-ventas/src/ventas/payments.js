import { COLLECTIONS, generateId, loadCollection, saveCollection } from './collections.js';
import { roundMoney, sumPayments } from './money.js';
import { getInvoice, updateInvoice } from './invoices.js';

function now(){ return new Date().toISOString(); }
function today(){ return new Date().toISOString().slice(0, 10); }
function text(value){ return String(value ?? '').trim(); }

export function listPayments(facturaId){
  const payments = loadCollection(COLLECTIONS.pagos);
  if(!facturaId) return payments;
  return payments.filter(payment => payment.facturaId === facturaId || payment.factura_id === facturaId);
}

export function invoiceBalance(facturaId){
  const invoice = getInvoice(facturaId);
  if(!invoice) return 0;
  const paid = sumPayments(listPayments(facturaId));
  return roundMoney(Number(invoice.total) - paid, invoice.moneda);
}

export function validatePayment(payload = {}){
  const errors = {};
  const invoice = getInvoice(payload.facturaId ?? payload.factura_id);
  if(!invoice){
    errors.facturaId = 'La factura no existe';
    return { valid: false, errors, invoice };
  }
  if(invoice.estado === 'anulada'){
    errors.facturaId = 'No se pueden registrar pagos sobre una factura anulada';
  }
  const monto = Number(payload.monto);
  if(!Number.isFinite(monto) || monto <= 0) errors.monto = 'El monto del pago debe ser mayor que cero';
  const paid = sumPayments(listPayments(invoice.id));
  if(!errors.monto && roundMoney(paid + monto, invoice.moneda) > roundMoney(Number(invoice.total), invoice.moneda)){
    errors.monto = 'La suma de los pagos no puede superar el total facturado';
  }
  return { valid: Object.keys(errors).length === 0, errors, invoice };
}

export function addPayment(payload = {}){
  const check = validatePayment(payload);
  if(!check.valid) throw new Error(Object.values(check.errors)[0]);
  const invoice = check.invoice;
  const timestamp = now();
  const payment = {
    id: generateId(),
    facturaId: invoice.id,
    factura_id: invoice.id,
    fecha: text(payload.fecha) || today(),
    monto: roundMoney(payload.monto, invoice.moneda),
    metodo: text(payload.metodo) || 'efectivo',
    referencia: text(payload.referencia) || undefined,
    createdAt: timestamp
  };
  const list = loadCollection(COLLECTIONS.pagos);
  list.push(payment);
  saveCollection(COLLECTIONS.pagos, list);
  recalculateInvoice(invoice.id);
  return payment;
}

export function recalculateInvoice(facturaId){
  const invoice = getInvoice(facturaId);
  if(!invoice) throw new Error('Factura no encontrada');
  const paid = sumPayments(listPayments(facturaId));
  const saldo = Math.max(0, roundMoney(Number(invoice.total) - paid, invoice.moneda));
  const estado = saldo <= 0 ? 'pagada' : (paid > 0 ? 'parcial' : invoice.estado === 'pendiente de pago' ? 'pendiente de pago' : 'emitida');
  return updateInvoice(facturaId, { saldo, estado, status: estado });
}

export function deletePayment(id){
  const list = loadCollection(COLLECTIONS.pagos);
  const payment = list.find(p => p.id === id);
  const next = list.filter(p => p.id !== id);
  saveCollection(COLLECTIONS.pagos, next);
  if(payment) recalculateInvoice(payment.facturaId);
  return next;
}

export function resetPayments(){
  saveCollection(COLLECTIONS.pagos, []);
}
