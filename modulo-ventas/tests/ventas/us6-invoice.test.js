import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorage, resetVentasStorage, seedVentas, seedQuoteOrder, seedConfirmedOrder } from './fixtures.js';
import { createInvoiceFromOrder, getInvoiceByOrder, listInvoices } from '../../src/ventas/invoices.js';
import { addPayment, invoiceBalance } from '../../src/ventas/payments.js';
import { getOrder, updateOrderStatus } from '../../src/ventas/orders.js';
import { deliverOrder } from '../../src/ventas/delivery.js';
import { buildSummary } from '../../src/ventas/summary.js';
import { ROLES, setCurrentRole } from '../../src/ventas/roles.js';

let seed;

beforeEach(() => {
  installLocalStorage();
  resetVentasStorage();
  seed = seedVentas();
  setCurrentRole(ROLES.FACTURACION);
});

describe('US6 - generate invoice from a confirmed order', () => {
  it('runs the full flow invoice -> payment -> delivery', () => {
    const order = seedConfirmedOrder(seed);
    const invoice = createInvoiceFromOrder(order.id, { fechaEmision: '2026-11-03' });
    expect(getInvoiceByOrder(order.id).id).toBe(invoice.id);
    expect(invoice.estado).toBe('pendiente de pago');

    addPayment({ facturaId: invoice.id, monto: invoice.total });
    expect(invoiceBalance(invoice.id)).toBe(0);

    setCurrentRole(ROLES.OPERACIONES);
    const delivered = deliverOrder(order.id);
    expect(delivered.estado).toBe('entregado');

    setCurrentRole(ROLES.GERENTE);
    const summary = buildSummary({ role: ROLES.GERENTE });
    expect(summary.totalVentas).toBe(1);
    expect(summary.estados.entregado).toBe(1);
  });

  it('blocks an invoice attempt from a quote', () => {
    const quote = seedQuoteOrder(seed);
    expect(() => createInvoiceFromOrder(quote.id)).toThrow(/confirmación/);
    expect(listInvoices()).toHaveLength(0);
  });

  it('keeps the order, delivery and summary in sync after invoicing', () => {
    const order = seedConfirmedOrder(seed);
    createInvoiceFromOrder(order.id);
    expect(getOrder(order.id).estado).toBe('facturado');
    expect(() => updateOrderStatus(order.id, 'pedido')).toThrow();
    setCurrentRole(ROLES.GERENTE);
    expect(buildSummary().estados.facturado).toBe(1);
  });
});
