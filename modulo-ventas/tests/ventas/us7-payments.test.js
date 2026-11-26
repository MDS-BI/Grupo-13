import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorage, resetVentasStorage, seedVentas, seedConfirmedOrder } from './fixtures.js';
import { createInvoiceFromOrder, getInvoice } from '../../src/ventas/invoices.js';
import { addPayment, listPayments, invoiceBalance } from '../../src/ventas/payments.js';

let seed;

beforeEach(() => {
  installLocalStorage();
  resetVentasStorage();
  seed = seedVentas();
});

function payment(overrides = {}) {
  return {
    fecha: '2026-11-02',
    metodo: 'transferencia',
    referencia: 'US7-PAGO',
    ...overrides
  };
}

describe('US7 - registrar pagos sobre una factura', () => {
  it('goes from partial to paid and rejects an overpayment without persisting it', () => {
    const order = seedConfirmedOrder(seed);
    const invoice = createInvoiceFromOrder(order.id, { skipRoleCheck: true, role: 'facturacion' });
    expect(invoice.estado).toBe('pendiente de pago');
    expect(invoice.saldo).toBe(invoice.total);

    const partial = Math.round(invoice.total / 2);
    addPayment({ ...payment({ monto: partial, referencia: 'US7-PARCIAL' }), facturaId: invoice.id });
    expect(getInvoice(invoice.id).estado).toBe('parcial');
    expect(getInvoice(invoice.id).saldo).toBe(invoice.total - partial);
    expect(invoiceBalance(invoice.id)).toBe(invoice.total - partial);

    addPayment({
      ...payment({ monto: invoice.total - partial, metodo: 'tarjeta', referencia: 'US7-FINAL' }),
      facturaId: invoice.id
    });
    expect(getInvoice(invoice.id).estado).toBe('pagada');
    expect(getInvoice(invoice.id).saldo).toBe(0);
    expect(invoiceBalance(invoice.id)).toBe(0);
    expect(listPayments(invoice.id)).toHaveLength(2);

    const before = {
      payments: listPayments(invoice.id),
      estado: getInvoice(invoice.id).estado,
      saldo: getInvoice(invoice.id).saldo
    };
    expect(() =>
      addPayment({ ...payment({ monto: 1 }), facturaId: invoice.id })
    ).toThrow(/no puede superar/);
    expect(listPayments(invoice.id)).toEqual(before.payments);
    expect(getInvoice(invoice.id).estado).toBe(before.estado);
    expect(getInvoice(invoice.id).saldo).toBe(before.saldo);
  });
});
