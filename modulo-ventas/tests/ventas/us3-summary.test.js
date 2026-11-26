import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorage, resetVentasStorage, seedVentas, seedQuoteOrder, seedConfirmedOrder, seedInvoicedOrder, seedDeliveredOrder } from './fixtures.js';
import { buildSummary, getSummaryForRole, emptySummary, MASKED_AMOUNT } from '../../src/ventas/summary.js';
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

  it('allows commercial roles to consult the aggregate summary', () => {
    seedConfirmedOrder(seed);
    setCurrentRole(ROLES.VENDEDOR);
    expect(buildSummary({ role: ROLES.VENDEDOR }).totalPedidos).toBe(1);
    setCurrentRole(ROLES.GERENTE);
    expect(buildSummary({ role: ROLES.GERENTE }).totalPedidos).toBe(1);
    expect(getSummaryForRole(ROLES.GERENTE).totalPedidos).toBe(1);
    expect(getSummaryForRole(ROLES.JEFE_VENTAS).totalPedidos).toBe(1);
    expect(emptySummary().vacio).toBe(true);
  });

  it('masks amounts and removes record details for Postventa and Auditor only', () => {
    seedConfirmedOrder(seed);
    const full = buildSummary();
    for (const role of [ROLES.DEVOLUCIONES, ROLES.AUDITOR]) {
      const summary = getSummaryForRole(role);
      expect(summary.totalVentas).toBe(full.totalVentas);
      expect(summary.totalCotizaciones).toBe(full.totalCotizaciones);
      expect(summary.totalPedidos).toBe(full.totalPedidos);
      expect(summary.totalOrdenes).toBe(full.totalOrdenes);
      expect(summary.estados).toEqual(full.estados);
      expect(summary.montoVentas).toBe(MASKED_AMOUNT);
      expect(summary.montoCotizaciones).toBe(MASKED_AMOUNT);
      expect(summary.montoPedidos).toBe(MASKED_AMOUNT);
      expect(summary.montoTotal).toBe(MASKED_AMOUNT);
      expect(summary.pedidos).toEqual([]);
      expect(summary.ventas).toEqual([]);
      expect(summary.cotizaciones).toEqual([]);
    }
    const manager = getSummaryForRole(ROLES.GERENTE);
    expect(manager.montoTotal).toBe(full.montoTotal);
    expect(manager.pedidos).toEqual(full.pedidos);
  });
});
