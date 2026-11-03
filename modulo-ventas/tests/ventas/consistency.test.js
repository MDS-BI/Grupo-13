import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorage, resetVentasStorage, seedVentas, seedQuoteOrder, seedConfirmedOrder, seedInvoicedOrder, seedDeliveredOrder } from './fixtures.js';
import { loadEntities } from '../../src/storage.js';
import { listOrders } from '../../src/ventas/orders.js';
import { listInvoices } from '../../src/ventas/invoices.js';
import { createReturn } from '../../src/ventas/returns.js';
import { ROLES, setCurrentRole } from '../../src/ventas/roles.js';

let seed;

beforeEach(() => {
  installLocalStorage();
  resetVentasStorage();
  seed = seedVentas();
});

describe('cross-cutting consistency', () => {
  it('never leaves orphan orders or invoices', () => {
    seedQuoteOrder(seed);
    seedConfirmedOrder(seed);
    seedInvoicedOrder(seed);
    seedDeliveredOrder(seed);

    const clients = new Set(loadEntities().map(entity => entity.entity_id));
    const orders = listOrders();
    expect(orders.every(order => clients.has(order.clienteId))).toBe(true);
    const orderIds = new Set(orders.map(order => order.id));
    expect(listInvoices().every(invoice => orderIds.has(invoice.pedidoId))).toBe(true);
  });

  it('keeps at most one invoice per order', () => {
    seedInvoicedOrder(seed);
    seedDeliveredOrder(seed);
    const invoices = listInvoices();
    const orderIds = invoices.map(invoice => invoice.pedidoId);
    expect(new Set(orderIds).size).toBe(orderIds.length);
  });

  it('never allows returning more units than sold', () => {
    const { order, invoice } = seedInvoicedOrder(seed);
    setCurrentRole(ROLES.DEVOLUCIONES);
    const payload = {
      facturaId: invoice.id,
      motivo: 'Producto dañado',
      fecha: '2026-11-10',
      lineas: [{ productoId: seed.productos[1].id, cantidad: 2 }]
    };
    createReturn(payload);
    expect(() => createReturn({ ...payload, lineas: [{ productoId: seed.productos[1].id, cantidad: 1 }] })).toThrow(/máxima devolvible/);
    expect(order.id).toBe(invoice.pedidoId);
  });
});
