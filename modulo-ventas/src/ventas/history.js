import { loadEntities } from '../storage.js';
import { listOrders } from './orders.js';
import { listQuotes } from './quotes.js';
import { roundMoney } from './money.js';

function text(value){ return String(value ?? '').trim(); }
function number(value){ const n = Number(value); return Number.isFinite(n) ? n : 0; }

export function findClienteInHistory(reference){
  const value = text(reference);
  if(!value) return undefined;
  return loadEntities().find(entity => entity.entity_id === value || entity.id === value);
}

export function getClientHistory(reference){
  const cliente = findClienteInHistory(reference);
  const clienteId = cliente ? cliente.entity_id : text(reference);
  const quotes = listQuotes()
    .filter(quote => quote.clienteId === clienteId || quote.cliente_id === clienteId)
    .map(quote => ({
      id: quote.id,
      tipo: 'cotizacion',
      numero: quote.numero,
      fecha: quote.fechaEmision,
      importe: number(quote.total),
      total: number(quote.total),
      moneda: quote.moneda,
      estado: quote.estado
    }));
  const orders = listOrders()
    .filter(order => order.clienteId === clienteId || order.cliente_id === clienteId)
    .map(order => ({
      id: order.id,
      tipo: 'pedido',
      numero: order.numero,
      fecha: order.fechaEmision,
      importe: number(order.total),
      total: number(order.total),
      moneda: order.moneda,
      estado: order.estado
    }));
  const items = [...quotes, ...orders].sort((a, b) => {
    const byDate = String(b.fecha || '').localeCompare(String(a.fecha || ''));
    if(byDate !== 0) return byDate;
    return String(a.numero || '').localeCompare(String(b.numero || ''));
  });
  return {
    clienteId,
    cliente,
    clienteNombre: cliente ? cliente.name : 'Cliente desconocido',
    items,
    cantidad: items.length,
    total: items.length,
    importeTotal: roundMoney(items.reduce((sum, item) => sum + number(item.importe), 0)),
    vacio: items.length === 0
  };
}

export function listClientHistory(reference){
  return getClientHistory(reference);
}

export function refreshClientHistory(reference){
  return getClientHistory(reference);
}
