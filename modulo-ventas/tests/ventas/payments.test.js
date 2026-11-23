import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorage, resetVentasStorage, seedVentas, seedInvoicedOrder } from './fixtures.js';
import { addPayment, listPayments, invoiceBalance, validatePayment, deletePayment } from '../../src/ventas/payments.js';
import { getInvoice, markInvoiceAnnulled } from '../../src/ventas/invoices.js';

let invoice;

function paymentPayload(overrides = {}) {
  return {
    facturaId: invoice.id,
    fecha: '2026-11-02',
    monto: 1000,
    metodo: 'transferencia',
    referencia: 'COMP-001',
    ...overrides
  };
}

beforeEach(() => {
  installLocalStorage();
  resetVentasStorage();
  const seed = seedVentas();
  ({ invoice } = seedInvoicedOrder(seed));
});

describe('payment registration', () => {
  it('rejects missing invoices, non positive amounts and overpayment', () => {
    expect(validatePayment(paymentPayload({ facturaId: 'nope' })).valid).toBe(false);
    expect(validatePayment(paymentPayload({ monto: 0 })).errors.monto).toMatch(/mayor que cero/);
    expect(validatePayment(paymentPayload({ monto: invoice.total + 1 })).errors.monto).toMatch(/no puede superar/);
  });

  it('registers partial payments and recalculates the balance', () => {
    const payment = addPayment(paymentPayload({ monto: 2000, metodo: 'efectivo' }));
    expect(payment.monto).toBe(2000);
    expect(listPayments(invoice.id)).toHaveLength(1);
    expect(invoiceBalance(invoice.id)).toBe(invoice.total - 2000);
    expect(getInvoice(invoice.id).estado).toBe('parcial');
    expect(getInvoice(invoice.id).saldo).toBe(invoice.total - 2000);
  });

  it('marks the invoice as paid when the balance reaches zero', () => {
    addPayment(paymentPayload({ monto: invoice.total }));
    expect(invoiceBalance(invoice.id)).toBe(0);
    expect(getInvoice(invoice.id).estado).toBe('pagada');
  });

  it('reverts to partial when a payment is deleted', () => {
    const first = addPayment(paymentPayload());
    addPayment(paymentPayload({ monto: invoice.total - 1000, referencia: 'COMP-002' }));
    deletePayment(first.id);
    expect(invoiceBalance(invoice.id)).toBe(1000);
    expect(getInvoice(invoice.id).estado).toBe('parcial');
  });

  it('blocks payments on annulled invoices', () => {
    markInvoiceAnnulled(invoice.id);
    expect(validatePayment(paymentPayload()).errors.facturaId).toMatch(/anulada/);
  });

  it.each([
    ['fecha', undefined],
    ['fecha', ''],
    ['fecha', '2026-02-30'],
    ['fecha', '02/11/2026'],
    ['metodo', undefined],
    ['metodo', '   '],
    ['referencia', undefined],
    ['referencia', '   ']
  ])('rejects an invalid %s (%s) without changing payments or balance', (field, value) => {
    const payload = paymentPayload({ [field]: value });
    expect(validatePayment(payload).errors[field]).toBeDefined();
    expect(() => addPayment(payload)).toThrow();
    expect(listPayments(invoice.id)).toHaveLength(0);
    expect(invoiceBalance(invoice.id)).toBe(invoice.total);
    expect(getInvoice(invoice.id).estado).toBe('pendiente de pago');
  });

  it('persists the supplied date and trimmed payment reference', () => {
    const payment = addPayment(paymentPayload({
      fecha: '2026-10-31',
      referencia: '  TRANSF-2026-123  '
    }));
    expect(payment.fecha).toBe('2026-10-31');
    expect(payment.referencia).toBe('TRANSF-2026-123');
    expect(listPayments(invoice.id)[0]).toMatchObject({
      fecha: '2026-10-31',
      referencia: 'TRANSF-2026-123',
      metodo: 'transferencia',
      monto: 1000
    });
  });
});
