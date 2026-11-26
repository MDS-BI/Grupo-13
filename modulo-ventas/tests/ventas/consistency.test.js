import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorage, resetVentasStorage, seedVentas, seedQuoteOrder, seedConfirmedOrder, seedInvoicedOrder, seedDeliveredOrder } from './fixtures.js';
import { loadEntities, updateEntity } from '../../src/storage.js';
import { listOrders, assertClienteEliminable } from '../../src/ventas/orders.js';
import { listInvoices } from '../../src/ventas/invoices.js';
import { createReturn, listReturns, getReturnDetails } from '../../src/ventas/returns.js';
import { getClientHistory } from '../../src/ventas/history.js';
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

  it('keeps historical orders consultable after a client is logically deactivated', () => {
    const order = seedQuoteOrder(seed);
    updateEntity(seed.client.id, { estado: 'inactivo' });

    const client = loadEntities().find((entity) => entity.id === seed.client.id);
    expect(client.estado).toBe('inactivo');

    const orders = listOrders();
    expect(orders.some((item) => item.id === order.id)).toBe(true);
    expect(orders.every((item) => loadEntities().some((entity) => entity.entity_id === item.clienteId))).toBe(true);
  });

  it('blocks deleting a client that still has associated orders', () => {
    seedQuoteOrder(seed);
    expect(() => assertClienteEliminable(seed.client.entity_id)).toThrow(/no puede eliminarse/);
  });

  it.each(['inactivo', 'bloqueado'])(
    'keeps every historical record consultable when the client is %s',
    (estado) => {
      const quoteOrder = seedQuoteOrder(seed);
      const confirmed = seedConfirmedOrder(seed);
      const { order: invoiced, invoice } = seedInvoicedOrder(seed);
      const { order: delivered } = seedDeliveredOrder(seed);
      setCurrentRole(ROLES.DEVOLUCIONES);
      const returned = createReturn({
        facturaId: invoice.id,
        motivo: 'Producto con falla',
        fecha: '2026-11-10',
        lineas: [{ productoId: seed.productos[1].id, cantidad: 1 }]
      });
      updateEntity(seed.client.id, { estado });

      const client = loadEntities().find((entity) => entity.id === seed.client.id);
      expect(client.estado).toBe(estado);

      const expectedOrderIds = [quoteOrder.id, confirmed.id, invoiced.id, delivered.id];
      const orders = listOrders();
      expect(expectedOrderIds.every((id) => orders.some((order) => order.id === id))).toBe(true);
      const entityIds = new Set(loadEntities().map((entity) => entity.entity_id));
      expect(orders.every((order) => entityIds.has(order.clienteId))).toBe(true);

      const orderIds = new Set(orders.map((order) => order.id));
      const invoices = listInvoices();
      expect(invoices.every((item) => orderIds.has(item.pedidoId))).toBe(true);
      const invoiceIds = new Set(invoices.map((item) => item.id));
      const returns = listReturns();
      expect(
        returns.every(
          (item) => invoiceIds.has(item.facturaId) && orderIds.has(item.pedidoId)
        )
      ).toBe(true);
      expect(getReturnDetails(returned.devolucion.id)).toHaveLength(1);

      expect(() => assertClienteEliminable(seed.client.entity_id)).toThrow(/no puede eliminarse/);
      expect(loadEntities().some((entity) => entity.id === seed.client.id)).toBe(true);

      const history = getClientHistory(seed.client.entity_id);
      expect(history.clienteNombre).toBe('Cliente Demo');
      expect(history.cantidad).toBe(orders.length);
      expect(expectedOrderIds.every((id) => history.items.some((item) => item.id === id))).toBe(
        true
      );
    }
  );

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
