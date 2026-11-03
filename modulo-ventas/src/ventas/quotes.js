import { COLLECTIONS, generateId, loadCollection, saveCollection } from './collections.js';
import { getConfig } from '../module-config.js';
import { orderTotals } from './money.js';
import { reserveNumber } from './numbering.js';
import { getProducto, getPrecioVigente } from './catalog.js';
import { findVendedor } from './masters.js';
import { findCliente, createOrder, listOrders } from './orders.js';

export const QUOTE_STATUSES = Object.freeze(['borrador', 'enviada', 'aceptada', 'rechazada', 'vencida']);

export const QUOTE_TRANSITIONS = Object.freeze({
  borrador: Object.freeze(['enviada', 'aceptada', 'rechazada']),
  enviada: Object.freeze(['aceptada', 'rechazada', 'vencida']),
  aceptada: Object.freeze([]),
  rechazada: Object.freeze([]),
  vencida: Object.freeze([])
});

function now(){ return new Date().toISOString(); }
function text(value){ return String(value ?? '').trim(); }
function today(){ return new Date().toISOString().slice(0, 10); }
function isEmpty(value){ return value === undefined || value === null || text(value) === ''; }

function read(payload, ...keys){
  for(const key of keys){
    if(payload[key] !== undefined) return payload[key];
  }
  return undefined;
}

function normalizeVendedor(reference){
  const value = text(reference);
  if(!value) return undefined;
  const master = findVendedor(value);
  return master ? master.id : value;
}

function addDays(date, days){
  const dt = new Date(`${date}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + Number(days || 0));
  return dt.toISOString().slice(0, 10);
}

function normalizeLines(lines, fecha, listaId){
  return (Array.isArray(lines) ? lines : []).map((line, index) => {
    const productRef = read(line, 'productoId', 'producto_id', 'productId', 'sku');
    const producto = getProducto(productRef);
    const providedPrice = read(line, 'precioUnitario', 'precio_unitario', 'precio');
    let precioUnitario = providedPrice;
    if(isEmpty(precioUnitario) && producto){
      const price = getPrecioVigente(producto, fecha, listaId);
      precioUnitario = price ? price.precio : 0;
    }
    return {
      id: generateId(),
      linea: index + 1,
      productoId: producto ? producto.id : text(productRef),
      producto_id: producto ? producto.id : text(productRef),
      cantidad: Number(read(line, 'cantidad', 'quantity')),
      precioUnitario: Number(precioUnitario || 0),
      precio_unitario: Number(precioUnitario || 0),
      descuentoLinea: Number(read(line, 'descuentoLinea', 'descuento_linea', 'descuento') || 0),
      descuento_linea: Number(read(line, 'descuentoLinea', 'descuento_linea', 'descuento') || 0),
      impuestoPorcentaje: Number(read(line, 'impuestoPorcentaje', 'impuesto_porcentaje') ?? producto?.impuestoPorcentaje ?? 0),
      impuesto_porcentaje: Number(read(line, 'impuestoPorcentaje', 'impuesto_porcentaje') ?? producto?.impuestoPorcentaje ?? 0)
    };
  });
}

export function validateQuote(payload = {}, options = {}){
  const errors = {};
  const cliente = findCliente(read(payload, 'clienteId', 'cliente_id', 'entityId', 'entity_id'));
  if(!cliente) errors.clienteId = 'Selecciona un cliente válido para la cotización';
  const fechaEmision = text(read(payload, 'fechaEmision', 'fecha_emision')) || today();
  const dias = getConfig().businessRules?.quoteValidityDays ?? 30;
  const validaHasta = text(read(payload, 'validaHasta', 'valida_hasta')) || addDays(fechaEmision, dias);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(fechaEmision)) errors.fechaEmision = 'La fecha de emisión debe tener el formato YYYY-MM-DD';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(validaHasta)) errors.validaHasta = 'La fecha de validez debe tener el formato YYYY-MM-DD';
  if(!errors.fechaEmision && !errors.validaHasta && validaHasta < fechaEmision){
    errors.validaHasta = 'La validez debe ser igual o posterior a la fecha de emisión';
  }
  const rawLines = read(payload, 'lineas', 'lines', 'detalles') || [];
  if(!Array.isArray(rawLines) || rawLines.length === 0) errors.lineas = 'Agrega al menos un producto a la cotización';
  const lineas = normalizeLines(rawLines, fechaEmision, read(payload, 'listaId', 'lista_precio_id'));
  lineas.forEach((line, index) => {
    if(!getProducto(line.productoId)) errors[`linea_${index}`] = 'El producto seleccionado no existe';
    if(!Number.isInteger(line.cantidad) || line.cantidad <= 0) errors[`linea_${index}`] = 'La cantidad debe ser un entero positivo';
    if(!Number.isFinite(line.precioUnitario) || line.precioUnitario < 0) errors[`linea_${index}`] = 'El precio unitario debe ser un número no negativo';
  });
  const estado = text(read(payload, 'estado', 'status')) || 'borrador';
  if(!QUOTE_STATUSES.includes(estado)) errors.estado = `El estado debe ser uno de: ${QUOTE_STATUSES.join(', ')}`;
  if(options.existing && estado !== options.existing.estado){
    const allowed = QUOTE_TRANSITIONS[options.existing.estado] || [];
    if(!allowed.includes(estado)) errors.estado = `Transición de cotización inválida de "${options.existing.estado}" a "${estado}"`;
  }
  return { valid: Object.keys(errors).length === 0, errors, cliente, fechaEmision, validaHasta, estado, lineas };
}

export function createQuote(payload = {}){
  const check = validateQuote(payload);
  if(!check.valid) throw new Error(Object.values(check.errors)[0]);
  const timestamp = now();
  const serie = text(read(payload, 'serie')) || 'COT';
  const { folio, numero } = reserveNumber({ serie, collection: COLLECTIONS.cotizaciones });
  const moneda = text(read(payload, 'moneda', 'currency')) || getConfig().businessRules?.defaultCurrency || 'CLP';
  const descuento = Number(read(payload, 'descuento', 'discount') || 0);
  const totals = orderTotals(check.lineas, { currency: moneda, descuento });
  const quote = {
    id: generateId(),
    numero,
    serie,
    folio,
    clienteId: check.cliente.entity_id,
    cliente_id: check.cliente.entity_id,
    vendedorId: normalizeVendedor(read(payload, 'vendedorId', 'vendedor_id', 'vendedor')),
    fechaEmision: check.fechaEmision,
    fecha_emision: check.fechaEmision,
    validaHasta: check.validaHasta,
    valida_hasta: check.validaHasta,
    estado: check.estado,
    status: check.estado,
    moneda,
    subtotal: totals.subtotal,
    descuento: totals.descuento,
    impuesto: totals.impuesto,
    total: totals.total,
    notas: text(read(payload, 'notas', 'notes')) || undefined,
    lineas: totals.lineas,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  const list = loadCollection(COLLECTIONS.cotizaciones);
  list.push(quote);
  saveCollection(COLLECTIONS.cotizaciones, list);
  return quote;
}

export function listQuotes(){
  return loadCollection(COLLECTIONS.cotizaciones);
}

export function getQuote(id){
  return loadCollection(COLLECTIONS.cotizaciones).find(quote => quote.id === id);
}

export function updateQuote(id, updates = {}){
  const list = loadCollection(COLLECTIONS.cotizaciones);
  const idx = list.findIndex(quote => quote.id === id);
  if(idx === -1) throw new Error('Cotización no encontrada');
  const prev = list[idx];
  const payload = {
    clienteId: updates.clienteId ?? prev.clienteId,
    vendedorId: updates.vendedorId ?? prev.vendedorId,
    fechaEmision: updates.fechaEmision ?? prev.fechaEmision,
    validaHasta: updates.validaHasta ?? prev.validaHasta,
    lineas: updates.lineas ?? prev.lineas,
    moneda: updates.moneda ?? prev.moneda,
    descuento: updates.descuento ?? prev.descuento,
    notas: updates.notas ?? prev.notas,
    estado: updates.estado ?? updates.status ?? prev.estado
  };
  const check = validateQuote(payload, { existing: prev });
  if(!check.valid) throw new Error(Object.values(check.errors)[0]);
  const totals = orderTotals(check.lineas, { currency: payload.moneda, descuento: payload.descuento });
  list[idx] = {
    ...prev,
    clienteId: check.cliente.entity_id,
    cliente_id: check.cliente.entity_id,
    vendedorId: normalizeVendedor(payload.vendedorId),
    fechaEmision: check.fechaEmision,
    validaHasta: check.validaHasta,
    estado: check.estado,
    status: check.estado,
    moneda: payload.moneda,
    subtotal: totals.subtotal,
    descuento: totals.descuento,
    impuesto: totals.impuesto,
    total: totals.total,
    notas: text(payload.notas) || undefined,
    lineas: totals.lineas,
    updatedAt: now()
  };
  saveCollection(COLLECTIONS.cotizaciones, list);
  return list[idx];
}

export function updateQuoteStatus(id, estado){
  const quote = getQuote(id);
  if(!quote) throw new Error('Cotización no encontrada');
  if(quote.estado === estado) return quote;
  const allowed = QUOTE_TRANSITIONS[quote.estado] || [];
  if(!allowed.includes(estado)){
    throw new Error(`Transición de cotización inválida de "${quote.estado}" a "${estado}"`);
  }
  return updateQuote(id, { estado });
}

export function acceptQuote(id){
  const quote = getQuote(id);
  if(!quote) throw new Error('Cotización no encontrada');
  const existingOrder = listOrders().find(order => order.cotizacionId === quote.id);
  if(existingOrder) throw new Error('Esta cotización ya originó un pedido de venta');
  const accepted = quote.estado === 'aceptada' ? quote : updateQuoteStatus(id, 'aceptada');
  const order = createOrder({
    clienteId: accepted.clienteId,
    vendedorId: accepted.vendedorId,
    canal: 'Tienda',
    condicionesPago: 'contado',
    fechaEmision: accepted.fechaEmision,
    lineas: accepted.lineas,
    moneda: accepted.moneda,
    descuento: accepted.descuento,
    cotizacionId: accepted.id,
    estado: 'pedido'
  });
  return { quote: getQuote(id), order };
}

export function rejectQuote(id){
  return updateQuoteStatus(id, 'rechazada');
}

export function expireQuote(id){
  return updateQuoteStatus(id, 'vencida');
}

export function resetQuotes(){
  saveCollection(COLLECTIONS.cotizaciones, []);
}
