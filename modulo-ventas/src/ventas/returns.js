import { COLLECTIONS, generateId, loadCollection, saveCollection } from './collections.js';
import { getConfig } from '../module-config.js';
import { roundMoney } from './money.js';
import { reserveNumber } from './numbering.js';
import { getOrder } from './orders.js';
import { getInvoice } from './invoices.js';
import { getProducto, setProductoEstado } from './catalog.js';
import { assertCan } from './roles.js';
import { logReturnAudit } from './audit.js';

export const RETURN_STATUSES = Object.freeze(['solicitada', 'aprobada', 'rechazada', 'completada']);

export const RETURN_TRANSITIONS = Object.freeze({
  solicitada: Object.freeze(['aprobada', 'rechazada']),
  aprobada: Object.freeze(['completada']),
  rechazada: Object.freeze([]),
  completada: Object.freeze([])
});

function now(){ return new Date().toISOString(); }
function today(){ return new Date().toISOString().slice(0, 10); }
function text(value){ return String(value ?? '').trim(); }
function isEmpty(value){ return value === undefined || value === null || text(value) === ''; }
function number(value){ const n = Number(value); return Number.isFinite(n) ? n : 0; }

function read(payload, ...keys){
  for(const key of keys){
    if(payload[key] !== undefined) return payload[key];
  }
  return undefined;
}

function parseDate(value){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return undefined;
  const dt = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(dt.getTime()) ? undefined : dt;
}

export function daysBetween(later, earlier){
  const a = parseDate(later);
  const b = parseDate(earlier);
  if(!a || !b) return NaN;
  return Math.floor((a.getTime() - b.getTime()) / 86400000);
}

export function getReturnWindowDays(){
  return Number(getConfig().businessRules?.returnWindowDays ?? 30);
}

export function listReturns(){
  return loadCollection(COLLECTIONS.devoluciones);
}

export function getReturn(id){
  return listReturns().find(item => item.id === id);
}

export function getReturnDetails(devolucionId){
  return loadCollection(COLLECTIONS.detallesDevolucion).filter(detail => detail.devolucionId === devolucionId);
}

function activeReturns(){
  return listReturns().filter(item => item.estado !== 'rechazada');
}

export function previousReturnedQuantity(detallePedidoId){
  const details = loadCollection(COLLECTIONS.detallesDevolucion)
    .filter(detail => detail.detallePedidoId === detallePedidoId);
  return details.reduce((sum, detail) => {
    const parent = getReturn(detail.devolucionId);
    if(parent && parent.estado === 'rechazada') return sum;
    return sum + number(detail.cantidad);
  }, 0);
}

export function returnableQuantity(detallePedidoId){
  for(const order of loadCollection(COLLECTIONS.pedidos)){
    const detail = loadCollection(COLLECTIONS.detallesPedido).find(d => d.id === detallePedidoId && d.pedidoId === order.id);
    if(detail){
      return Math.max(0, number(detail.cantidad) - previousReturnedQuantity(detallePedidoId));
    }
  }
  return 0;
}

function resolveOrderDetail(order, line, invoice){
  const detalleRef = read(line, 'detallePedidoId', 'detalle_pedido_id', 'detalleId');
  const productRef = read(line, 'productoId', 'producto_id', 'productId');
  const orderLines = order.lineas || [];
  if(!isEmpty(detalleRef)){
    const direct = orderLines.find(detail => detail.id === detalleRef);
    if(direct) return direct;
    const invoiceLine = (invoice?.lineas || []).find(item => item.id === detalleRef);
    if(invoiceLine){
      return orderLines.find(detail => detail.productoId === invoiceLine.productoId);
    }
  }
  if(!isEmpty(productRef)){
    return orderLines.find(detail => detail.productoId === productRef);
  }
  return undefined;
}

export function validateReturn(payload = {}, options = {}){
  const errors = {};
  const facturaId = read(payload, 'facturaId', 'factura_id');
  const pedidoId = read(payload, 'pedidoId', 'pedido_id');
  const invoice = facturaId ? getInvoice(facturaId) : undefined;
  if(facturaId && !invoice) errors.facturaId = 'La factura indicada no existe';
  const resolvedOrderId = pedidoId || invoice?.pedidoId;
  if(!facturaId && !resolvedOrderId) errors.facturaId = 'Selecciona una factura o un pedido para la devolución';
  const order = resolvedOrderId ? getOrder(resolvedOrderId) : undefined;
  if(resolvedOrderId && !order) errors.pedidoId = 'El pedido indicado no existe';
  if(invoice && order && invoice.pedidoId !== order.id) errors.pedidoId = 'La factura no corresponde al pedido indicado';

  const fecha = text(read(payload, 'fecha')) || today();
  if(!parseDate(fecha)) errors.fecha = 'La fecha de devolución debe tener el formato YYYY-MM-DD';
  const referenceDate = invoice?.fechaEmision || order?.fechaEmision;
  const windowDays = getReturnWindowDays();
  if(!errors.fecha && referenceDate){
    const diff = daysBetween(fecha, referenceDate);
    if(Number.isFinite(diff) && diff > windowDays){
      errors.fecha = `El período de devolución ha expirado: la compra fue hace ${diff} días y el plazo es de ${windowDays} días`;
    }
  }

  const motivo = text(read(payload, 'motivo', 'reason'));
  if(!motivo) errors.motivo = 'El motivo de la devolución es obligatorio';

  const rawLines = read(payload, 'lineas', 'lines', 'detalles') || [];
  if(!Array.isArray(rawLines) || rawLines.length === 0) errors.lineas = 'Selecciona al menos un producto a devolver';

  const resolvedLines = [];
  if(order){
    (rawLines || []).forEach((line, index) => {
      const detail = resolveOrderDetail(order, line, invoice);
      if(!detail){
        errors[`linea_${index}`] = 'La línea indicada no pertenece al pedido';
        return;
      }
      const cantidad = Number(read(line, 'cantidad', 'quantity'));
      if(!Number.isInteger(cantidad) || cantidad <= 0){
        errors[`linea_${index}`] = 'La cantidad a devolver debe ser un entero positivo';
        return;
      }
      const already = previousReturnedQuantity(detail.id);
      const available = number(detail.cantidad) - already;
      if(cantidad > available){
        errors[`linea_${index}`] = `La cantidad máxima devolvible para "${getProducto(detail.productoId)?.nombre || detail.productoId}" es ${Math.max(0, available)}`;
        return;
      }
      const unit = number(detail.cantidad) > 0 ? number(detail.subtotalLinea) / number(detail.cantidad) : 0;
      resolvedLines.push({
        detail,
        cantidad,
        monto: roundMoney(cantidad * unit, order.moneda || 'CLP')
      });
    });
  }

  const total = roundMoney(resolvedLines.reduce((sum, line) => sum + line.monto, 0), order?.moneda || 'CLP');
  if(invoice && !errors.lineas){
    const priorTotal = activeReturns()
      .filter(item => item.facturaId === invoice.id)
      .reduce((sum, item) => sum + number(item.total), 0);
    if(roundMoney(priorTotal + total, invoice.moneda) > roundMoney(number(invoice.total), invoice.moneda)){
      errors.total = 'El total devuelto no puede superar el total facturado';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    invoice,
    order,
    fecha,
    motivo,
    lineas: resolvedLines,
    total,
    windowDays
  };
}

export function createReturn(payload = {}, options = {}){
  if(!options.skipRoleCheck){
    assertCan('devolver', options.role);
  }
  const check = validateReturn(payload);
  if(!check.valid) throw new Error(Object.values(check.errors)[0]);
  const timestamp = now();
  const { folio, numero } = reserveNumber({ serie: 'DEV', collection: COLLECTIONS.devoluciones });
  const devolucion = {
    id: generateId(),
    numero,
    serie: 'DEV',
    folio,
    facturaId: check.invoice?.id,
    factura_id: check.invoice?.id,
    pedidoId: check.order.id,
    pedido_id: check.order.id,
    fecha: check.fecha,
    motivo: check.motivo,
    estado: 'solicitada',
    status: 'solicitada',
    moneda: check.order.moneda || 'CLP',
    total: check.total,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  const returns = listReturns();
  returns.push(devolucion);
  saveCollection(COLLECTIONS.devoluciones, returns);

  const details = check.lineas.map(line => ({
    id: generateId(),
    devolucionId: devolucion.id,
    devolucion_id: devolucion.id,
    detallePedidoId: line.detail.id,
    detalle_pedido_id: line.detail.id,
    productoId: line.detail.productoId,
    cantidad: line.cantidad,
    monto: line.monto,
    createdAt: timestamp
  }));
  const allDetails = loadCollection(COLLECTIONS.detallesDevolucion);
  saveCollection(COLLECTIONS.detallesDevolucion, [...allDetails, ...details]);

  const orderDetails = loadCollection(COLLECTIONS.detallesPedido);
  const updatedOrderDetails = orderDetails.map(detail => {
    const returned = check.lineas.find(line => line.detail.id === detail.id);
    if(!returned) return detail;
    return { ...detail, estado: 'en proceso de devolución', updatedAt: timestamp };
  });
  saveCollection(COLLECTIONS.detallesPedido, updatedOrderDetails);

  for(const line of check.lineas){
    const product = getProducto(line.detail.productoId);
    if(product){
      try{
        setProductoEstado(product.id, 'en proceso de devolución');
      }catch(e){
        // The product may be read-only in a given test fixture; the order line keeps the state.
      }
    }
  }

  logReturnAudit({
    ventaId: check.order.id,
    pedidoId: check.order.id,
    facturaId: check.invoice?.id,
    devolucionId: devolucion.id,
    productos: check.lineas.map(line => ({
      productoId: line.detail.productoId,
      nombre: getProducto(line.detail.productoId)?.nombre,
      cantidad: line.cantidad
    })),
    cantidad: check.lineas.reduce((sum, line) => sum + line.cantidad, 0),
    motivo: check.motivo,
    fecha: check.fecha,
    usuario: options.usuario || options.role
  });

  return {
    devolucion,
    detalles: details,
    numero,
    total: devolucion.total
  };
}

export function updateReturnStatus(id, estado){
  const list = listReturns();
  const idx = list.findIndex(item => item.id === id);
  if(idx === -1) throw new Error('Devolución no encontrada');
  const prev = list[idx];
  if(prev.estado === estado) return prev;
  const allowed = RETURN_TRANSITIONS[prev.estado] || [];
  if(!allowed.includes(estado)){
    throw new Error(`Transición de devolución inválida de "${prev.estado}" a "${estado}"`);
  }
  list[idx] = { ...prev, estado, status: estado, updatedAt: now() };
  saveCollection(COLLECTIONS.devoluciones, list);
  return list[idx];
}

export function resetReturns(){
  saveCollection(COLLECTIONS.devoluciones, []);
  saveCollection(COLLECTIONS.detallesDevolucion, []);
}
