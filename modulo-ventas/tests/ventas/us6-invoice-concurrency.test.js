import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorage, resetVentasStorage, seedVentas, seedConfirmedOrder } from './fixtures.js';
import { createInvoiceFromOrder, listInvoices } from '../../src/ventas/invoices.js';
import { ROLES, setCurrentRole } from '../../src/ventas/roles.js';

let seed;

beforeEach(() => {
  installLocalStorage();
  resetVentasStorage();
  seed = seedVentas();
  setCurrentRole(ROLES.FACTURACION);
});

describe('US6 - invoice idempotency', () => {
  it('persists only one invoice when two requests race for the same order', () => {
    const order = seedConfirmedOrder(seed);
    const results = [];
    for(let attempt = 0; attempt < 2; attempt += 1){
      try{
        results.push(createInvoiceFromOrder(order.id));
      }catch(error){
        results.push(error);
      }
    }
    expect(listInvoices()).toHaveLength(1);
    expect(results.filter(result => !(result instanceof Error))).toHaveLength(1);
    expect(results.filter(result => result instanceof Error)[0].message).toMatch(/ya tiene una factura/);
  });

  it('does not reuse an invoice number across orders', () => {
    const first = seedConfirmedOrder(seed);
    const second = seedConfirmedOrder(seed);
    const a = createInvoiceFromOrder(first.id);
    const b = createInvoiceFromOrder(second.id);
    expect(a.id).not.toBe(b.id);
    expect(a.numero).not.toBe(b.numero);
    expect(listInvoices()).toHaveLength(2);
  });
});
