import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorage, resetVentasStorage, seedVentas, seedQuoteOrder, seedConfirmedOrder } from './fixtures.js';
import { createInvoiceFromOrder, listInvoices, getInvoice, getInvoiceByOrder, validateInvoiceForOrder, isOrderInvoiceable } from '../../src/ventas/invoices.js';
import { addPayment, listPayments, invoiceBalance, validatePayment, deletePayment } from '../../src/ventas/payments.js';
import { getOrder } from '../../src/ventas/orders.js';
import { ROLES, setCurrentRole } from '../../src/ventas/roles.js';

let seed;

beforeEach(() => {
  installLocalStorage();
  resetVentasStorage();
  seed = seedVentas();
});

describe('US6 - facturación y pagos', () => {
  it('only invoices confirmed orders and only with the facturacion role', () => {
    const order = seedQuoteOrder(seed);
    setCurrentRole(ROLES.FACTURACION);
    expect(isOrderInvoiceable(order)).toBe(false);
    expect(validateInvoiceForOrder(order).errors.estado).toMatch(/confirmación/);
    expect(() => createInvoiceFromOrder(order.id)).toThrow(/confirmación/);

    const confirmed = seedConfirmedOrder(seed);
    setCurrentRole(ROLES.VENDEDOR);
    expect(() => createInvoiceFromOrder(confirmed.id)).toThrow(/permiso/);
    setCurrentRole(ROLES.FACTURACION);
    const invoice = createInvoiceFromOrder(confirmed.id);
    expect(invoice.numero).toMatch(/^FAC-\d+$/);
    expect(invoice.estado).toBe('pendiente de pago');
    expect(invoice.saldo).toBe(confirmed.total);
    expect(invoice.lineas).toHaveLength(2);
    expect(invoice.lineas.map(line => line.precioUnitario)).toEqual([1000, 2000]);
    expect(getOrder(confirmed.id).estado).toBe('facturado');
    expect(getInvoiceByOrder(confirmed.id).id).toBe(invoice.id);
    expect(listInvoices()).toHaveLength(1);
  });

  it('prevents a second invoice for the same order', () => {
    const order = seedConfirmedOrder(seed);
    setCurrentRole(ROLES.FACTURACION);
    const invoice = createInvoiceFromOrder(order.id);
    expect(() => createInvoiceFromOrder(order.id)).toThrow(/ya tiene una factura/);
    expect(listInvoices()).toHaveLength(1);
    expect(getInvoice(invoice.id)).toBeDefined();
  });

  it('applies partial and full payments and recalculates the balance', () => {
    const order = seedConfirmedOrder(seed);
    setCurrentRole(ROLES.FACTURACION);
    const invoice = createInvoiceFromOrder(order.id);

    const first = addPayment({ facturaId: invoice.id, monto: 1000, metodo: 'transferencia' });
    expect(first.monto).toBe(1000);
    expect(listPayments(invoice.id)).toHaveLength(1);
    expect(invoiceBalance(invoice.id)).toBe(invoice.total - 1000);
    expect(getInvoice(invoice.id).estado).toBe('parcial');

    addPayment({ facturaId: invoice.id, monto: invoice.total - 1000 });
    expect(invoiceBalance(invoice.id)).toBe(0);
    expect(getInvoice(invoice.id).estado).toBe('pagada');

    expect(() => addPayment({ facturaId: invoice.id, monto: 1 })).toThrow(/no puede superar/);
    expect(validatePayment({ facturaId: invoice.id, monto: -5 }).valid).toBe(false);

    deletePayment(first.id);
    expect(invoiceBalance(invoice.id)).toBe(1000);
    expect(getInvoice(invoice.id).estado).toBe('parcial');
  });

  it('blocks payments on an unknown or annulled invoice', () => {
    expect(() => addPayment({ facturaId: 'no-existe', monto: 10 })).toThrow(/no existe/);
  });
});
