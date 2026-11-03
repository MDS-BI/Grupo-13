import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorage, resetVentasStorage, seedVentas } from './fixtures.js';
import { createQuote, acceptQuote, updateQuoteStatus, listQuotes, getQuote, QUOTE_STATUSES } from '../../src/ventas/quotes.js';
import { getOrder } from '../../src/ventas/orders.js';

let seed;

beforeEach(() => {
  installLocalStorage();
  resetVentasStorage();
  seed = seedVentas();
});

function payload(overrides = {}){
  return {
    clienteId: seed.client.entity_id,
    vendedorId: 'Vendedor Demo',
    fechaEmision: '2026-11-01',
    lineas: [{ productoId: seed.productos[0].id, cantidad: 2 }],
    ...overrides
  };
}

describe('quotes', () => {
  it('creates a numbered draft quote with totals', () => {
    const quote = createQuote(payload());
    expect(quote.numero).toMatch(/^COT-\d+$/);
    expect(quote.estado).toBe('borrador');
    expect(quote.subtotal).toBe(2000);
    expect(quote.impuesto).toBe(380);
    expect(quote.total).toBe(2380);
    expect(listQuotes()).toHaveLength(1);
    expect(QUOTE_STATUSES).toContain('vencida');
  });

  it('validates the client, validity and lines', () => {
    expect(() => createQuote(payload({ clienteId: 'nope' }))).toThrow(/cliente/);
    expect(() => createQuote(payload({ validaHasta: '2026-10-01' }))).toThrow(/posterior/);
    expect(() => createQuote(payload({ lineas: [] }))).toThrow(/producto/);
  });

  it('moves through its own state machine', () => {
    const quote = createQuote(payload());
    const sent = updateQuoteStatus(quote.id, 'enviada');
    expect(sent.estado).toBe('enviada');
    expect(() => updateQuoteStatus(quote.id, 'borrador')).toThrow(/inválida/);
  });

  it('accepting a quote creates exactly one pedido', () => {
    const quote = createQuote(payload());
    const { order } = acceptQuote(quote.id);
    expect(order.estado).toBe('pedido');
    expect(getOrder(order.id).cotizacionId).toBe(quote.id);
    expect(getQuote(quote.id).estado).toBe('aceptada');
    expect(() => acceptQuote(quote.id)).toThrow(/ya originó/);
  });
});
