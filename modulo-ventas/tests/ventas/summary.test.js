import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorage, resetVentasStorage, seedVentas, seedQuoteOrder, seedConfirmedOrder, seedDeliveredOrder } from './fixtures.js';
import { buildSummary, emptySummary } from '../../src/ventas/summary.js';
import { createOrder } from '../../src/ventas/orders.js';
import { buildOrderPayload } from './fixtures.js';
import { ROLES } from '../../src/ventas/roles.js';

let seed;

beforeEach(() => {
  installLocalStorage();
  resetVentasStorage();
  seed = seedVentas();
});

describe('summary aggregation', () => {
  it('returns zeroed totals when there is nothing registered', () => {
    const summary = buildSummary();
    expect(summary).toEqual(emptySummary());
    expect(Object.values(summary.estados).every(value => value === 0)).toBe(true);
  });

  it('aggregates quantities and amounts by state', () => {
    const quote = seedQuoteOrder(seed);
    const confirmed = seedConfirmedOrder(seed);
    const delivered = seedDeliveredOrder(seed);
    const summary = buildSummary();
    expect(summary.totalCotizaciones).toBe(1);
    expect(summary.totalPedidos).toBe(1);
    expect(summary.totalVentas).toBe(1);
    expect(summary.totalOrdenes).toBe(3);
    expect(summary.montoCotizaciones).toBe(quote.total);
    expect(summary.montoPedidos).toBe(confirmed.total);
    expect(summary.montoVentas).toBe(delivered.order.total);
    expect(summary.montoTotal).toBe(quote.total + confirmed.total + delivered.order.total);
  });

  it('reflects the latest persisted data on every call', () => {
    expect(buildSummary().totalOrdenes).toBe(0);
    createOrder(buildOrderPayload(seed));
    expect(buildSummary().totalOrdenes).toBe(1);
  });

  it('enforces the gerente role for the aggregate', () => {
    expect(() => buildSummary({ role: ROLES.VENDEDOR })).toThrow(/permiso/);
    expect(buildSummary({ role: ROLES.GERENTE }).totalOrdenes).toBe(0);
  });
});
