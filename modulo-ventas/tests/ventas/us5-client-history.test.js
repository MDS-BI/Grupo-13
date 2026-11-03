import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorage, resetVentasStorage, seedVentas, seedQuoteOrder, seedConfirmedOrder, seedDeliveredOrder } from './fixtures.js';
import { getClientHistory } from '../../src/ventas/history.js';

let seed;

beforeEach(() => {
  installLocalStorage();
  resetVentasStorage();
  seed = seedVentas();
});

describe('US5 - commercial client profile', () => {
  it('shows every quote and order with its current state', () => {
    const quote = seedQuoteOrder(seed);
    const confirmed = seedConfirmedOrder(seed);
    const delivered = seedDeliveredOrder(seed);

    const history = getClientHistory(seed.client.entity_id);
    expect(history.clienteNombre).toBe('Cliente Demo');
    expect(history.items).toHaveLength(3);
    expect(history.items.filter(item => item.estado === 'cotización')[0].id).toBe(quote.id);
    expect(history.items.filter(item => item.estado === 'pedido')[0].id).toBe(confirmed.id);
    expect(history.items.filter(item => item.estado === 'entregado')[0].id).toBe(delivered.order.id);
    expect(history.importeTotal).toBe(quote.total + confirmed.total + delivered.order.total);
  });

  it('shows an explicit empty state for a client without movement', () => {
    const history = getClientHistory(seed.client.entity_id);
    expect(history.vacio).toBe(true);
    expect(history.cantidad).toBe(0);
  });
});
