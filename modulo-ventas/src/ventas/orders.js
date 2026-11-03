import { COLLECTIONS, generateId, loadCollection, saveCollection } from './collections.js';
import { loadEntities } from '../storage.js';
import { getConfig } from '../module-config.js';
import { orderTotals, roundMoney } from './money.js';
import { reserveNumber } from './numbering.js';
import {
  assertModifiable,
  assertTransition,
  canTransition,
  isKnownStatus,
  isTerminal,
  transitionError
} from './lifecycle.js';
import { getProducto, getPrecioVigente, hasStock, deductStock, validateStock } from './catalog.js';
import { findVendedor } from './masters.js';

function now(){ return new Date().toISOString(); }
function text(value){ return String(value ?? '').trim(); }
function isEmpty(value){ return value === undefined || value === null || text(value) === ''; }
function today(){ return new Date().toISOString().slice(0, 10); }

function read(payload, ...keys){
  for(const key of keys){
    if(payload[key] !== undefined) return payload[key];
  }
  return undefined;
}

export function findCliente(reference){
  const value = text(reference);
  if(!value) return undefined;
  return loadEntities().find(entity => entity.entity_id === value
    || entity.id === value
    || text(entity.code).toLowerCase() === value.toLowerCase());
}

function allowedCanales(){
  const field = (getConfig().customFields || []).find(f => f.target === 'document' && f.key === 'canal');
  return field?.options || null;
}

function normalizeVendedor(reference){
  const value = text(reference);
  if(!value) return undefined;
  const master = findVendedor(value);
  return master ? master.id : value;
}

function normalizeLines(lines, fecha, listaId){
  return (Array.isArray(lines) ? lines : []).map((line, index) => {
    const productRef = read(line, 'productoId', 'producto_id', 'productId', 'sku');
    const producto = getProducto(productRef);
    const cantidad = Number(read(line, 'cantidad', 'quantity'));
    const providedPrice = read(line, 'precioUnitario', 'precio_unitario', 'precio');
    let precioUnitario = providedPrice;
    if(isEmpty(precioUnitario) && producto){
      const price = getPrecioVigente(producto, fecha, listaId);
      precioUnitario = price ? price.precio : undefined;
    }
    return {
      productoId: producto ? producto.id : text(productRef),
      producto_id: producto ? producto.id : text(productRef),
      precioProductoId: read(line, 'precioProductoId', 'precio_producto_id') || undefined,
      linea: Number(read(line, 'linea')) || index + 1,
      cantidad,
      precioUnitario: isEmpty(precioUnitario) ? 0 : Number(precioUnitario),
      descuentoLinea: Number(read(line, 'descuentoLinea', 'descuento_linea', 'descuento') || 0),
      impuestoPorcentaje: Number(read(line, 'impuestoPorcentaje', 'impuesto_porcentaje') ?? producto?.impuestoPorcentaje ?? 0)
    };
  });
}

export function consolidateLines(lines){
  const output = [];
  for(const line of lines || []){
    const existing = output.find(item => item.productoId === line.productoId);
    if(existing){
      existing.cantidad += Number(line.cantidad) || 0;
    } else {
      output.push({ ...line });
    }
  }
  return output.map((line, index) => ({ ...line, linea: index + 1 }));
}

export function validateOrder(payload = {}, options = {}){
  const errors = {};
  const cliente = findCliente(read(payload, 'clienteId', 'cliente_id', 'entityId', 'entity_id'));
  if(!cliente) errors.clienteId = 'Selecciona un cliente válido para el pedido';

  const vendedorId = normalizeVendedor(read(payload, 'vendedorId', 'vendedor_id', 'vendedor'));
  if(!vendedorId) errors.vendedorId = 'El vendedor es obligatorio';

  const canal = text(read(payload, 'canal', 'channel'));
  if(!canal){
    errors.canal = 'El canal de venta es obligatorio';
  } else {
    const optionsList = allowedCanales();
    if(optionsList && !optionsList.includes(canal)){
      errors.canal = `El canal de venta debe ser uno de: ${optionsList.join(', ')}`;
    }
  }

  const condicionesPago = text(read(payload, 'condicionesPago', 'condiciones_pago', 'condicionPago', 'paymentTerms'));
  if(!condicionesPago) errors.condicionesPago = 'La condición de pago es obligatoria';

  const fechaEmision = text(read(payload, 'fechaEmision', 'fecha_emision')) || today();
  const fechaEntrega = text(read(payload, 'fechaEntrega', 'fecha_entrega', 'endDate')) || fechaEmision;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(fechaEmision)) errors.fechaEmision = 'La fecha de emisión debe tener el formato YYYY-MM-DD';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(fechaEntrega)) errors.fechaEntrega = 'La fecha de entrega debe tener el formato YYYY-MM-DD';
  if(!errors.fechaEmision && !errors.fechaEntrega && fechaEntrega < fechaEmision){
    errors.fechaEntrega = 'La fecha de entrega debe ser igual o posterior a la fecha de emisión';
  }

  const rawLines = read(payload, 'lineas', 'lines', 'detalles') || [];
  if(!Array.isArray(rawLines) || rawLines.length === 0){
    errors.lineas = 'Agrega al menos un producto al pedido';
  }

  const normalized = consolidateLines(normalizeLines(rawLines, fechaEmision, read(payload, 'listaId', 'lista_precio_id')));
  normalized.forEach((line, index) => {
    if(!getProducto(line.productoId)){
      errors[`linea_${index}`] = 'El producto seleccionado no existe';
      return;
    }
    if(!Number.isInteger(Number(line.cantidad)) || Number(line.cantidad) <= 0){
      errors[`linea_${index}`] = 'La cantidad debe ser un entero positivo';
    }
    if(!Number.isFinite(Number(line.precioUnitario)) || Number(line.precioUnitario) < 0){
      errors[`linea_${index}`] = 'El precio unitario debe ser un número no negativo';
    }
  });

  if(Object.keys(errors).length === 0){
    const stock = validateStock(normalized);
    Object.assign(errors, stock.errors);
  }

  const estado = text(read(payload, 'estado', 'status')) || 'cotización';
  if(!isKnownStatus(estado)){
    errors.estado = `El estado debe ser uno de: cotización, pedido, facturado, entregado, cancelado`;
  } else if(options.existing && !canTransition(options.existing.estado, estado)){
    errors.estado = transitionError(options.existing.estado, estado);
  }

  return { valid: Object.keys(errors).length === 0, errors, lineas: normalized, cliente, fechaEmision, fechaEntrega, estado, vendedorId, canal, condicionesPago };
}

function buildOrder(payload, normalized){
  const timestamp = now();
  const serie = text(read(payload, 'serie')) || 'PED';
  const { folio, numero } = reserveNumber({ serie, collection: COLLECTIONS.pedidos });
  const moneda = text(read(payload, 'moneda', 'currency')) || getConfig().businessRules?.defaultCurrency || 'CLP';
  const descuento = Number(read(payload, 'descuento', 'discount') || 0);
  const totals = orderTotals(normalized.lineas, { currency: moneda, descuento });
  const lineas = totals.lineas.map((line, index) => ({
    id: generateId(),
    linea: index + 1,
    productoId: line.productoId,
    producto_id: line.productoId,
    precioProductoId: line.precioProductoId,
    cantidad: line.cantidad,
    precioUnitario: line.precioUnitario,
    precio_unitario: line.precioUnitario,
    descuentoLinea: line.descuentoLinea,
    descuento_linea: line.descuentoLinea,
    impuestoPorcentaje: line.impuestoPorcentaje,
    impuesto_porcentaje: line.impuestoPorcentaje,
    impuestoLinea: line.impuestoLinea,
    impuesto_linea: line.impuestoLinea,
    subtotalLinea: line.subtotalLinea,
    subtotal_linea: line.subtotalLinea,
    estado: 'vendido',
    createdAt: timestamp,
    updatedAt: timestamp
  }));
  return {
    id: generateId(),
    clienteId: normalized.cliente.entity_id,
    cliente_id: normalized.cliente.entity_id,
    cotizacionId: read(payload, 'cotizacionId', 'cotizacion_id') || undefined,
    vendedorId: normalized.vendedorId,
    vendedor_id: normalized.vendedorId,
    serie,
    folio,
    numero,
    fechaEmision: normalized.fechaEmision,
    fecha_emision: normalized.fechaEmision,
    fechaEntrega: normalized.fechaEntrega,
    fecha_entrega: normalized.fechaEntrega,
    canal: normalized.canal,
    estado: normalized.estado,
    status: normalized.estado,
    moneda,
    subtotal: totals.subtotal,
    descuento: totals.descuento,
    impuesto: totals.impuesto,
    total: totals.total,
    condicionesPago: normalized.condicionesPago,
    condiciones_pago: normalized.condicionesPago,
    notas: text(read(payload, 'notas', 'notes')) || undefined,
    lineas,
    quantity: lineas.reduce((sum, line) => sum + line.cantidad, 0),
    stockDescontado: false,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function saveDetails(order){
  const all = loadCollection(COLLECTIONS.detallesPedido).filter(d => d.pedidoId !== order.id);
  const details = order.lineas.map(line => ({
    ...line,
    pedidoId: order.id,
    pedido_id: order.id
  }));
  saveCollection(COLLECTIONS.detallesPedido, [...all, ...details]);
  return details;
}

function hydrate(order){
  if(!order) return undefined;
  const details = loadCollection(COLLECTIONS.detallesPedido).filter(d => d.pedidoId === order.id);
  return { ...order, lineas: details.length > 0 ? details : (order.lineas || []) };
}

function maybeDeductStock(order){
  if(order.stockDescontado) return order;
  const lines = hydrate(order).lineas || [];
  for(const line of lines){
    if(!hasStock(line.productoId, line.cantidad)){
      throw new Error(`Stock insuficiente para "${line.productoId}"`);
    }
  }
  for(const line of lines){
    deductStock(line.productoId, line.cantidad);
  }
  const list = loadCollection(COLLECTIONS.pedidos);
  const idx = list.findIndex(o => o.id === order.id);
  if(idx !== -1){
    list[idx] = { ...list[idx], stockDescontado: true, updatedAt: now() };
    saveCollection(COLLECTIONS.pedidos, list);
    return list[idx];
  }
  return order;
}

export function createOrder(payload = {}){
  const check = validateOrder(payload);
  if(!check.valid) throw new Error(Object.values(check.errors)[0]);
  const order = buildOrder(payload, check);
  const list = loadCollection(COLLECTIONS.pedidos);
  list.push(order);
  saveCollection(COLLECTIONS.pedidos, list);
  saveDetails(order);
  if(['pedido', 'facturado', 'entregado'].includes(order.estado)){
    maybeDeductStock(order);
  }
  return getOrder(order.id);
}

export function listOrders(){
  return loadCollection(COLLECTIONS.pedidos).map(hydrate);
}

export function getOrder(id){
  return hydrate(loadCollection(COLLECTIONS.pedidos).find(order => order.id === id));
}

export function getOrderByNumber(numero){
  return hydrate(loadCollection(COLLECTIONS.pedidos).find(order => order.numero === numero));
}

export function getOrderDetails(orderId){
  return loadCollection(COLLECTIONS.detallesPedido).filter(d => d.pedidoId === orderId);
}

export function recalculateOrder(order){
  const moneda = order.moneda || 'CLP';
  const totals = orderTotals(order.lineas || [], { currency: moneda, descuento: order.descuento || 0 });
  const lineas = totals.lineas.map((line, index) => ({
    ...line,
    linea: index + 1,
    impuestoLinea: line.impuestoLinea,
    impuesto_linea: line.impuestoLinea,
    subtotalLinea: line.subtotalLinea,
    subtotal_linea: line.subtotalLinea
  }));
  return {
    ...order,
    lineas,
    subtotal: totals.subtotal,
    descuento: totals.descuento,
    impuesto: totals.impuesto,
    total: totals.total,
    quantity: lineas.reduce((sum, line) => sum + Number(line.cantidad), 0)
  };
}

export function updateOrder(id, updates = {}){
  const list = loadCollection(COLLECTIONS.pedidos);
  const idx = list.findIndex(order => order.id === id);
  if(idx === -1) throw new Error('Pedido no encontrado');
  const prev = list[idx];
  assertModifiable(prev.estado);

  const current = getOrder(id);
  const payload = {
    clienteId: updates.clienteId ?? current.clienteId,
    vendedorId: updates.vendedorId ?? current.vendedorId,
    canal: updates.canal ?? current.canal,
    condicionesPago: updates.condicionesPago ?? current.condicionesPago,
    fechaEmision: updates.fechaEmision ?? current.fechaEmision,
    fechaEntrega: updates.fechaEntrega ?? current.fechaEntrega,
    lineas: updates.lineas ?? current.lineas,
    moneda: updates.moneda ?? current.moneda,
    descuento: updates.descuento ?? current.descuento,
    notas: updates.notas ?? current.notas,
    estado: updates.estado ?? updates.status ?? current.estado,
    serie: current.serie,
    cotizacionId: current.cotizacionId
  };
  const check = validateOrder(payload, { existing: current });
  if(!check.valid) throw new Error(Object.values(check.errors)[0]);

  const timestamp = now();
  const updated = recalculateOrder({
    ...prev,
    clienteId: check.cliente.entity_id,
    cliente_id: check.cliente.entity_id,
    vendedorId: check.vendedorId,
    vendedor_id: check.vendedorId,
    canal: check.canal,
    condicionesPago: check.condicionesPago,
    condiciones_pago: check.condicionesPago,
    fechaEmision: check.fechaEmision,
    fecha_emision: check.fechaEmision,
    fechaEntrega: check.fechaEntrega,
    fecha_entrega: check.fechaEntrega,
    estado: check.estado,
    status: check.estado,
    moneda: payload.moneda,
    notas: payload.notas,
    lineas: check.lineas,
    updatedAt: timestamp
  });
  if(isTerminal(updated.estado) && updated.estado !== prev.estado){
    // Allowed by the lifecycle guard above; keep timestamps consistent.
  }
  list[idx] = updated;
  saveCollection(COLLECTIONS.pedidos, list);
  saveDetails(updated);
  if(['pedido', 'facturado', 'entregado'].includes(updated.estado)){
    maybeDeductStock(updated);
  }
  return getOrder(id);
}

export function updateOrderStatus(id, estado, options = {}){
  const list = loadCollection(COLLECTIONS.pedidos);
  const idx = list.findIndex(order => order.id === id);
  if(idx === -1) throw new Error('Pedido no encontrado');
  const prev = list[idx];
  if(prev.estado === estado) return getOrder(id);
  assertTransition(prev.estado, estado);
  list[idx] = { ...prev, estado, status: estado, updatedAt: now() };
  saveCollection(COLLECTIONS.pedidos, list);
  if(['pedido', 'facturado', 'entregado'].includes(estado)){
    maybeDeductStock(list[idx]);
  }
  return getOrder(id);
}

export function confirmOrder(id){
  return updateOrderStatus(id, 'pedido');
}

export function cancelOrder(id){
  return updateOrderStatus(id, 'cancelado');
}

export function markOrderInvoiced(id){
  return updateOrderStatus(id, 'facturado');
}

export function deleteOrder(id){
  const next = loadCollection(COLLECTIONS.pedidos).filter(order => order.id !== id);
  saveCollection(COLLECTIONS.pedidos, next);
  const details = loadCollection(COLLECTIONS.detallesPedido).filter(d => d.pedidoId !== id);
  saveCollection(COLLECTIONS.detallesPedido, details);
  return next;
}

export function ordersForClient(clienteId){
  const value = text(clienteId);
  return listOrders().filter(order => order.clienteId === value || order.cliente_id === value);
}

export function canEditOrder(order){
  return !!order && !isTerminal(order.estado);
}

export function resetOrders(){
  saveCollection(COLLECTIONS.pedidos, []);
  saveCollection(COLLECTIONS.detallesPedido, []);
}
