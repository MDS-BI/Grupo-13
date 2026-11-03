import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorage, resetVentasStorage, seedVentas, seedQuoteOrder } from './fixtures.js';
import { getClientHistory, findClienteInHistory, refreshClientHistory } from '../../src/ventas/history.js';
import { updateOrderStatus } from '../../src/ventas/orders.js';

let seed;

beforeEach(() => {
  installLocalStorage();
  resetVentasStorage();
  seed = seedVentas();
});

describe('client history aggregation', () => {
  it('returns a clear empty state for unknown clients', () => {
    const history = getClientHistory('desconocido');
    expect(history.vacio).toBe(true);
    expect(history.items).toEqual([]);
    expect(history.importeTotal).toBe(0);
    expect(history.clienteNombre).toBe('Cliente desconocido');
  });

  it('sorts transactions by date and keeps number, amount and state', () => {
    const order = seedQuoteOrder(seed);
    const history = getClientHistory(seed.client.entity_id);
    expect(history.items).toHaveLength(1);
    expect(history.items[0]).toMatchObject({
      id: order.id,
      tipo: 'pedido',
      numero: order.numero,
      fecha: order.fechaEmision,
      importe: order.total,
      estado: 'cotización'
    });
  });

  it('reflects lifecycle changes without duplicating records', () => {
    const order = seedQuoteOrder(seed);
    updateOrderStatus(order.id, 'pedido');
    const history = refreshClientHistory(seed.client.entity_id);
    expect(history.items).toHaveLength(1);
    expect(history.items[0].estado).toBe('pedido');
  });

  it('resolves an existing client by entity id', () => {
    expect(findClienteInHistory(seed.client.entity_id).name).toBe('Cliente Demo');
  });
});
