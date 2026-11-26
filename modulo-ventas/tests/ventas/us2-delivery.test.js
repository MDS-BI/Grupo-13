import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorage, resetVentasStorage, seedVentas, seedInvoicedOrder } from './fixtures.js';
import { deliverOrder, listDeliverableOrders } from '../../src/ventas/delivery.js';
import { listOrders, getOrder } from '../../src/ventas/orders.js';
import { getStock, updateProducto } from '../../src/ventas/catalog.js';
import { buildSummary } from '../../src/ventas/summary.js';
import { setCurrentRole, ROLES } from '../../src/ventas/roles.js';

let seed;

beforeEach(() => {
  installLocalStorage();
  resetVentasStorage();
  seed = seedVentas();
});

describe('US2 - mark a pedido as entregado', () => {
  it('completes the commercial cycle and reflects the state in lists and summary', () => {
    const { order } = seedInvoicedOrder(seed);
    setCurrentRole(ROLES.OPERACIONES);
    expect(listDeliverableOrders().map(item => item.id)).toContain(order.id);

    const delivered = deliverOrder(order.id, { usuario: ROLES.OPERACIONES });
    expect(delivered.estado).toBe('entregado');
    const listed = listOrders().find(item => item.id === order.id);
    expect(listed.estado).toBe('entregado');
    expect(buildSummary().estados.entregado).toBe(1);
    expect(buildSummary().totalVentas).toBe(1);

    expect(() => deliverOrder(order.id)).toThrow(/terminal/);
    expect(getOrder(order.id).estado).toBe('entregado');
  });

  it('keeps stock untouched until delivery and deducts every line atomically', () => {
    const { order } = seedInvoicedOrder(seed);
    const [primero, segundo] = seed.productos;
    expect(getStock(primero.id)).toBe(100);
    expect(getStock(segundo.id)).toBe(100);

    setCurrentRole(ROLES.OPERACIONES);
    const delivered = deliverOrder(order.id, { usuario: ROLES.OPERACIONES });

    expect(delivered.estado).toBe('entregado');
    expect(delivered.stockDescontado).toBe(true);
    expect(getStock(primero.id)).toBe(99);
    expect(getStock(segundo.id)).toBe(98);
  });

  it('blocks delivery without changing stock when any line runs out of stock', () => {
    const { order } = seedInvoicedOrder(seed);
    const [primero, segundo] = seed.productos;
    updateProducto(segundo.id, { stockActual: 1 });

    setCurrentRole(ROLES.OPERACIONES);
    expect(() => deliverOrder(order.id)).toThrow(/stock/i);

    expect(getOrder(order.id).estado).toBe('facturado');
    expect(getOrder(order.id).stockDescontado).toBe(false);
    expect(getStock(primero.id)).toBe(100);
    expect(getStock(segundo.id)).toBe(1);
  });
});
