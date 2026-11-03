import { loadEntities } from '../storage.js';
import { listOrders } from './orders.js';
import { listQuotes } from './quotes.js';
import { ORDER_STATUSES } from './lifecycle.js';
import { roundMoney } from './money.js';
import { can } from './roles.js';

function text(value){ return String(value ?? '').trim(); }
function number(value){ const n = Number(value); return Number.isFinite(n) ? n : 0; }

function clientName(clienteId){
  const entity = loadEntities().find(e => e.entity_id === clienteId);
  return entity ? entity.name : 'Cliente desconocido';
}

export function emptySummary(){
  return {
    totalVentas: 0,
    totalCotizaciones: 0,
    totalPedidos: 0,
    totalOrdenes: 0,
    montoVentas: 0,
    montoCotizaciones: 0,
    montoPedidos: 0,
    montoTotal: 0,
    estados: Object.fromEntries(ORDER_STATUSES.map(status => [status, 0])),
    pedidos: [],
    ventas: [],
    cotizaciones: [],
    vacio: true
  };
}

export function buildSummary(options = {}){
  if(options.role && !can('ver_resumen', options.role)){
    throw new Error('El rol actual no tiene permiso para consultar el resumen general de ventas');
  }
  const orders = listOrders();
  const quotes = listQuotes();
  const summary = emptySummary();

  const statusCounts = Object.fromEntries(ORDER_STATUSES.map(status => [status, 0]));
  for(const order of orders){
    if(statusCounts[order.estado] !== undefined) statusCounts[order.estado] += 1;
  }

  const quoteOrders = orders.filter(order => order.estado === 'cotización');
  const confirmedOrders = orders.filter(order => order.estado === 'pedido');
  const salesOrders = orders.filter(order => order.estado === 'facturado' || order.estado === 'entregado');

  const quoteAmount = roundMoney(quotes.reduce((sum, quote) => sum + number(quote.total), 0) + quoteOrders.reduce((sum, order) => sum + number(order.total), 0));
  const pedidoAmount = roundMoney(confirmedOrders.reduce((sum, order) => sum + number(order.total), 0));
  const ventasAmount = roundMoney(salesOrders.reduce((sum, order) => sum + number(order.total), 0));

  summary.totalVentas = salesOrders.length;
  summary.totalCotizaciones = quotes.length + quoteOrders.length;
  summary.totalPedidos = confirmedOrders.length;
  summary.totalOrdenes = orders.length;
  summary.montoVentas = ventasAmount;
  summary.montoCotizaciones = quoteAmount;
  summary.montoPedidos = pedidoAmount;
  summary.montoTotal = roundMoney(ventasAmount + pedidoAmount + quoteAmount);
  summary.estados = statusCounts;
  summary.pedidos = orders.map(order => ({
    id: order.id,
    numero: order.numero,
    clienteId: order.clienteId,
    cliente: clientName(order.clienteId),
    fecha: order.fechaEmision,
    estado: order.estado,
    total: number(order.total),
    moneda: order.moneda
  }));
  summary.ventas = salesOrders.map(order => summary.pedidos.find(p => p.id === order.id));
  summary.cotizaciones = quotes.map(quote => ({
    id: quote.id,
    numero: quote.numero,
    clienteId: quote.clienteId,
    cliente: clientName(quote.clienteId),
    fecha: quote.fechaEmision,
    estado: quote.estado,
    total: number(quote.total),
    moneda: quote.moneda
  }));
  summary.vacio = orders.length === 0 && quotes.length === 0;
  return summary;
}

export function getSummaryForRole(role){
  return buildSummary({ role });
}

export function resetSummary(){
  // Summary is derived from persisted collections; nothing to reset.
}
