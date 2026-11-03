import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorage, resetVentasStorage, seedVentas, seedInvoicedOrder } from './fixtures.js';
import { deliverOrder, listDeliverableOrders } from '../../src/ventas/delivery.js';
import { listOrders, getOrder } from '../../src/ventas/orders.js';
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
});
