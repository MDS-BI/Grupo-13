import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorage, resetVentasStorage, seedVentas, seedQuoteOrder, seedConfirmedOrder, seedInvoicedOrder, seedDeliveredOrder } from './fixtures.js';
import { buildSummary, getSummaryForRole, emptySummary } from '../../src/ventas/summary.js';
import { ROLES, setCurrentRole } from '../../src/ventas/roles.js';

let seed;

beforeEach(() => {
  installLocalStorage();
  resetVentasStorage();
  seed = seedVentas();
});

describe('US3 - resumen general de ventas', () => {
  it('starts empty with zeroed state counters', () => {
    const summary = buildSummary();
    expect(summary).toMatchObject({
      totalVentas: 0,
      totalCotizaciones: 0,
      totalPedidos: 0,
      totalOrdenes: 0,
      montoVentas: 0,
      montoTotal: 0,
      vacio: true
    });
    expect(summary.estados['cotización']).toBe(0);
    expect(summary.estados.entregado).toBe(0);
  });

  it('counts quotes, pedidos and sales by state and amount', () => {
    const quote = seedQuoteOrder(seed);
    const confirmed = seedConfirmedOrder(seed);
    const invoiced = seedInvoicedOrder(seed);
    const delivered = seedDeliveredOrder(seed);

    const summary = buildSummary();
    expect(summary.totalCotizaciones).toBe(1);
    expect(summary.montoCotizaciones).toBe(quote.total);
    expect(summary.totalPedidos).toBe(1);
    expect(summary.montoPedidos).toBe(confirmed.total);
    expect(summary.totalVentas).toBe(2);
    expect(summary.montoVentas).toBe(invoiced.invoice.total + delivered.order.total);
    expect(summary.totalOrdenes).toBe(4);
    expect(summary.estados['cotización']).toBe(1);
    expect(summary.estados.pedido).toBe(1);
    expect(summary.estados.facturado).toBe(1);
    expect(summary.estados.entregado).toBe(1);
    expect(summary.vacio).toBe(false);
    expect(summary.pedidos).toHaveLength(4);
    expect(summary.pedidos[0].cliente).toBe('Cliente Demo');
  });

  it('includes the delivered order in ventas', () => {
    const { order } = seedDeliveredOrder(seed);
    const summary = buildSummary();
    expect(summary.ventas.map(item => item.id)).toContain(order.id);
    expect(summary.ventas[0].estado).toBe('entregado');
  });

  it('restricts the general summary to roles with the ver_resumen permission', () => {
    seedConfirmedOrder(seed);
    setCurrentRole(ROLES.VENDEDOR);
    expect(() => buildSummary({ role: ROLES.VENDEDOR })).toThrow(/permiso/);
    setCurrentRole(ROLES.GERENTE);
    expect(buildSummary({ role: ROLES.GERENTE }).totalPedidos).toBe(1);
    expect(getSummaryForRole(ROLES.GERENTE).totalPedidos).toBe(1);
    expect(() => getSummaryForRole(ROLES.JEFE_VENTAS)).toThrow(/permiso/);
    expect(emptySummary().vacio).toBe(true);
  });
});
