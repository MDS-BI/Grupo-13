import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorage, resetVentasStorage, seedVentas, seedQuoteOrder, seedConfirmedOrder, seedInvoicedOrder } from './fixtures.js';
import { getClientHistory, listClientHistory, findClienteInHistory, refreshClientHistory } from '../../src/ventas/history.js';
import { buildOrderPayload } from './fixtures.js';
import { createOrder } from '../../src/ventas/orders.js';
import { addEntity } from '../../src/storage.js';

let seed;

beforeEach(() => {
  installLocalStorage();
  resetVentasStorage();
  seed = seedVentas();
});

describe('US5 - historial por cliente', () => {
  it('returns an empty history for a client without sales', () => {
    const history = getClientHistory(seed.client.entity_id);
    expect(history.clienteId).toBe(seed.client.entity_id);
    expect(history.clienteNombre).toBe('Cliente Demo');
    expect(history.items).toEqual([]);
    expect(history.vacio).toBe(true);
    expect(history.importeTotal).toBe(0);
  });

  it('lists quotes and orders for the client with date, amount and state', () => {
    const quote = seedQuoteOrder(seed);
    const confirmed = seedConfirmedOrder(seed);
    const { order: delivered } = seedInvoicedOrder(seed);

    const history = getClientHistory(seed.client.entity_id);
    expect(history.cantidad).toBe(3);
    expect(history.items.map(item => item.id)).toEqual(expect.arrayContaining([quote.id, confirmed.id, delivered.id]));
    expect(history.items.some(item => item.estado === 'cotización')).toBe(true);
    expect(history.items.some(item => item.estado === 'pedido')).toBe(true);
    expect(history.items.some(item => item.estado === 'facturado')).toBe(true);
    expect(history.importeTotal).toBe(quote.total + confirmed.total + delivered.total);
    expect(history.items[0].fecha).toBeDefined();
  });

  it('reflects state changes without duplicating entries', () => {
    const order = seedQuoteOrder(seed);
    const before = getClientHistory(seed.client.entity_id);
    expect(before.items).toHaveLength(1);
    expect(before.items[0].estado).toBe('cotización');
  });

  it('resolves clients by entity id or name and exposes aliases', () => {
    expect(findClienteInHistory(seed.client.entity_id).name).toBe('Cliente Demo');
    expect(findClienteInHistory(seed.client.entity_id).entity_id).toBe(seed.client.entity_id);
    expect(findClienteInHistory('no-existe')).toBeUndefined();
    seedQuoteOrder(seed);
    expect(listClientHistory(seed.client.entity_id).cantidad).toBe(1);
    expect(refreshClientHistory(seed.client.entity_id).cantidad).toBe(1);
    expect(getClientHistory('no-existe').vacio).toBe(true);
  });

  it('ignores orders from other clients', () => {
    seedQuoteOrder(seed);
    const otherClient = addEntity({ name: 'Otro Cliente', code: 'CLI-002' });
    const other = createOrder(buildOrderPayload(seed, { clienteId: otherClient.entity_id }));
    expect(other).toBeDefined();
    expect(getClientHistory(seed.client.entity_id).items).toHaveLength(1);
  });
});
