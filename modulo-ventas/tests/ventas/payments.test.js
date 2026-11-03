import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorage, resetVentasStorage, seedVentas, seedInvoicedOrder } from './fixtures.js';
import { addPayment, listPayments, invoiceBalance, validatePayment, deletePayment } from '../../src/ventas/payments.js';
import { getInvoice, markInvoiceAnnulled } from '../../src/ventas/invoices.js';

let invoice;

beforeEach(() => {
  installLocalStorage();
  resetVentasStorage();
  const seed = seedVentas();
  ({ invoice } = seedInvoicedOrder(seed));
});

describe('payment registration', () => {
  it('rejects missing invoices, non positive amounts and overpayment', () => {
    expect(validatePayment({ facturaId: 'nope', monto: 10 }).valid).toBe(false);
    expect(validatePayment({ facturaId: invoice.id, monto: 0 }).errors.monto).toMatch(/mayor que cero/);
    expect(validatePayment({ facturaId: invoice.id, monto: invoice.total + 1 }).errors.monto).toMatch(/no puede superar/);
  });

  it('registers partial payments and recalculates the balance', () => {
    const payment = addPayment({ facturaId: invoice.id, monto: 2000, metodo: 'efectivo' });
    expect(payment.monto).toBe(2000);
    expect(listPayments(invoice.id)).toHaveLength(1);
    expect(invoiceBalance(invoice.id)).toBe(invoice.total - 2000);
    expect(getInvoice(invoice.id).estado).toBe('parcial');
    expect(getInvoice(invoice.id).saldo).toBe(invoice.total - 2000);
  });

  it('marks the invoice as paid when the balance reaches zero', () => {
    addPayment({ facturaId: invoice.id, monto: invoice.total });
    expect(invoiceBalance(invoice.id)).toBe(0);
    expect(getInvoice(invoice.id).estado).toBe('pagada');
  });

  it('reverts to partial when a payment is deleted', () => {
    const first = addPayment({ facturaId: invoice.id, monto: 1000 });
    addPayment({ facturaId: invoice.id, monto: invoice.total - 1000 });
    deletePayment(first.id);
    expect(invoiceBalance(invoice.id)).toBe(1000);
    expect(getInvoice(invoice.id).estado).toBe('parcial');
  });

  it('blocks payments on annulled invoices', () => {
    markInvoiceAnnulled(invoice.id);
    expect(validatePayment({ facturaId: invoice.id, monto: 10 }).errors.facturaId).toMatch(/anulada/);
  });
});
