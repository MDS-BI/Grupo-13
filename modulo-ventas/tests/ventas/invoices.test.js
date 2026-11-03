import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorage, resetVentasStorage, seedVentas, seedQuoteOrder, seedConfirmedOrder } from './fixtures.js';
import {
  createInvoiceFromOrder,
  validateInvoiceForOrder,
  isOrderInvoiceable,
  getInvoiceByOrder,
  listInvoices
} from '../../src/ventas/invoices.js';
import { getOrder } from '../../src/ventas/orders.js';
import { ROLES, setCurrentRole } from '../../src/ventas/roles.js';

let seed;

beforeEach(() => {
  installLocalStorage();
  resetVentasStorage();
  seed = seedVentas();
  setCurrentRole(ROLES.FACTURACION);
});

describe('invoice rules', () => {
  it('only allows confirmed pedidos', () => {
    const quote = seedQuoteOrder(seed);
    expect(isOrderInvoiceable(quote)).toBe(false);
    expect(validateInvoiceForOrder(quote).errors.estado).toMatch(/confirmación/);
    const confirmed = seedConfirmedOrder(seed);
    expect(isOrderInvoiceable(confirmed)).toBe(true);
  });

  it('copies client, lines, prices and taxes from the order', () => {
    const order = seedConfirmedOrder(seed);
    const invoice = createInvoiceFromOrder(order.id, { fechaVencimiento: '2026-12-15' });
    expect(invoice.clienteId).toBe(order.clienteId);
    expect(invoice.lineas.map(line => line.productoId)).toEqual(order.lineas.map(line => line.productoId));
    expect(invoice.lineas.map(line => line.precioUnitario)).toEqual([1000, 2000]);
    expect(invoice.subtotal).toBe(order.subtotal);
    expect(invoice.impuesto).toBe(order.impuesto);
    expect(invoice.total).toBe(order.total);
    expect(invoice.fechaVencimiento).toBe('2026-12-15');
    expect(invoice.saldo).toBe(order.total);
    expect(getOrder(order.id).estado).toBe('facturado');
  });

  it('creates exactly one invoice per order', () => {
    const order = seedConfirmedOrder(seed);
    const invoice = createInvoiceFromOrder(order.id);
    expect(getInvoiceByOrder(order.id).id).toBe(invoice.id);
    expect(() => createInvoiceFromOrder(order.id)).toThrow(/ya tiene una factura/);
    expect(listInvoices()).toHaveLength(1);
  });

  it('requires the facturacion role', () => {
    const order = seedConfirmedOrder(seed);
    setCurrentRole(ROLES.VENDEDOR);
    expect(() => createInvoiceFromOrder(order.id)).toThrow(/permiso/);
    expect(listInvoices()).toHaveLength(0);
  });
});
