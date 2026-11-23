import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setupDom,
  bootApp,
  resetVentasStorage,
  seedVentas,
  seedInvoicedOrder
} from './fixtures.js';
import { listPayments, invoiceBalance } from '../../src/ventas/payments.js';
import { ROLES, setCurrentRole } from '../../src/ventas/roles.js';

let invoice;

beforeEach(async () => {
  vi.resetModules();
  setupDom();
  resetVentasStorage();
  ({ invoice } = seedInvoicedOrder(seedVentas()));
  setCurrentRole(ROLES.FACTURACION);
  await bootApp();
  document.getElementById('nav-invoices').click();
  const select = document.getElementById('invoice-select');
  select.value = invoice.id;
  select.dispatchEvent(new window.Event('change', { bubbles: true }));
});

function submitPayment() {
  document.getElementById('payment-form').dispatchEvent(
    new window.Event('submit', { bubbles: true, cancelable: true })
  );
}

describe('payment form (T069 / FR-048)', () => {
  it('requires the date, amount, method and payment reference', () => {
    for (const id of ['payment-date', 'payment-amount', 'payment-method', 'payment-reference']) {
      expect(document.getElementById(id).required).toBe(true);
    }
    expect(document.getElementById('payment-form').checkValidity()).toBe(false);
  });

  it('persists the entered date and reference and updates the invoice balance', () => {
    document.getElementById('payment-date').value = '2026-11-12';
    document.getElementById('payment-amount').value = '1000';
    document.getElementById('payment-method').value = 'transferencia';
    document.getElementById('payment-reference').value = '  COMPROBANTE-123  ';
    expect(document.getElementById('payment-form').checkValidity()).toBe(true);

    submitPayment();

    expect(listPayments(invoice.id)).toHaveLength(1);
    expect(listPayments(invoice.id)[0]).toMatchObject({
      fecha: '2026-11-12',
      referencia: 'COMPROBANTE-123',
      monto: 1000,
      metodo: 'transferencia'
    });
    expect(invoiceBalance(invoice.id)).toBe(invoice.total - 1000);
    expect(document.getElementById('payment-feedback').textContent).toMatch(/correctamente/);
    expect(document.getElementById('payment-date').value).toBe('');
    expect(document.getElementById('payment-reference').value).toBe('');
  });

  it.each([
    ['payment-date', '', /fecha.*obligatoria/],
    ['payment-reference', '   ', /referencia.*obligatoria/]
  ])('rejects an incomplete %s without changing the invoice', (id, value, message) => {
    document.getElementById('payment-date').value = '2026-11-12';
    document.getElementById('payment-amount').value = '1000';
    document.getElementById('payment-reference').value = 'COMPROBANTE-123';
    document.getElementById(id).value = value;

    submitPayment();

    expect(document.getElementById('payment-feedback').textContent).toMatch(message);
    expect(listPayments(invoice.id)).toHaveLength(0);
    expect(invoiceBalance(invoice.id)).toBe(invoice.total);
  });
});
