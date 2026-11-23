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
  it('lists and summarizes 500 orders in under 500 ms per operation (SC-011)', () => {
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
    saveCollection(COLLECTIONS.detallesPedido, orders.flatMap(order =>
      order.lineas.map(line => ({ ...line, pedidoId: order.id }))
    ));

    const startList = performance.now();
    const listedOrders = listOrders();
    const listDuration = performance.now() - startList;

    const startSummary = performance.now();
    const summary = buildSummary({ role: ROLES.GERENTE });
    const summaryDuration = performance.now() - startSummary;

    expect(listedOrders).toHaveLength(500);
    expect(listedOrders[0].lineas).toHaveLength(1);
    expect(summary.totalOrdenes).toBe(500);
    expect(summary.totalPedidos).toBe(250);
    expect(summary.totalVentas).toBe(250);
    expect(summary.pedidos).toHaveLength(500);
    console.info(`SC-011: listado ${listDuration.toFixed(1)} ms; resumen ${summaryDuration.toFixed(1)} ms`);
    expect(listDuration).toBeLessThan(500);
    expect(summaryDuration).toBeLessThan(500);
  });
});
