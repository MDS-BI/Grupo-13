import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorage, resetVentasStorage, seedVentas, seedInvoicedOrder, seedConfirmedOrder } from './fixtures.js';
import { deliverOrder, listDeliverableOrders, validateDelivery, canDeliver } from '../../src/ventas/delivery.js';
import { getOrder } from '../../src/ventas/orders.js';
import { ROLES, setCurrentRole } from '../../src/ventas/roles.js';

let seed;

beforeEach(() => {
  installLocalStorage();
  resetVentasStorage();
  seed = seedVentas();
});

describe('US2 - delivery rules', () => {
  it('moves a facturado order to entregado and persists it', () => {
    const { order } = seedInvoicedOrder(seed);
    setCurrentRole(ROLES.OPERACIONES);
    const delivered = deliverOrder(order.id);
    expect(delivered.estado).toBe('entregado');
    expect(getOrder(order.id).estado).toBe('entregado');
    expect(listDeliverableOrders()).toHaveLength(0);
  });

  it('rejects delivering an order that is not facturado', () => {
    const order = seedConfirmedOrder(seed);
    setCurrentRole(ROLES.OPERACIONES);
    expect(canDeliver(order)).toBe(false);
    expect(validateDelivery(order).valid).toBe(false);
    expect(() => deliverOrder(order.id)).toThrow(/facturado/);
    expect(getOrder(order.id).estado).toBe('pedido');
  });

  it('blocks reverting or modifying an entregado order', () => {
    const { order } = seedInvoicedOrder(seed);
    setCurrentRole(ROLES.OPERACIONES);
    deliverOrder(order.id);
    expect(() => deliverOrder(order.id)).toThrow(/terminal/);
  });

  it('requires the operations role', () => {
    const { order } = seedInvoicedOrder(seed);
    setCurrentRole(ROLES.VENDEDOR);
    expect(() => deliverOrder(order.id)).toThrow(/permiso/);
    expect(getOrder(order.id).estado).toBe('facturado');
  });
});
