import { describe, it, expect, beforeEach } from 'vitest';
import { performance } from 'node:perf_hooks';
import { installLocalStorage, resetVentasStorage, seedVentas } from './fixtures.js';
import { COLLECTIONS, saveCollection } from '../../src/ventas/collections.js';
import { listOrders } from '../../src/ventas/orders.js';
import { buildSummary } from '../../src/ventas/summary.js';
import { ROLES } from '../../src/ventas/roles.js';

let seed;

beforeEach(() => {
  installLocalStorage();
  resetVentasStorage();
  seed = seedVentas();
});

describe('performance with 500 orders', () => {
  it('lists and summarizes 500 orders in under 3 seconds', () => {
    const orders = Array.from({ length: 500 }, (_, index) => ({
      id: `order-${index}`,
      numero: `PED-${index + 1}`,
      clienteId: seed.client.entity_id,
      estado: index % 2 === 0 ? 'pedido' : 'facturado',
      fechaEmision: '2026-11-01',
      moneda: 'CLP',
      subtotal: 1000,
      impuesto: 190,
      total: 1190,
      lineas: [{ id: `line-${index}`, productoId: seed.productos[0].id, cantidad: 1, precioUnitario: 1000 }]
    }));
    saveCollection(COLLECTIONS.pedidos, orders);

    const startList = performance.now();
    expect(listOrders()).toHaveLength(500);
    const listDuration = performance.now() - startList;

    const startSummary = performance.now();
    const summary = buildSummary({ role: ROLES.GERENTE });
    const summaryDuration = performance.now() - startSummary;

    expect(summary.totalOrdenes).toBe(500);
    expect(summary.totalPedidos).toBe(250);
    expect(summary.totalVentas).toBe(250);
    expect(summary.pedidos).toHaveLength(500);
    expect(listDuration).toBeLessThan(3000);
    expect(summaryDuration).toBeLessThan(3000);
  });
});
