import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorage, resetVentasStorage, seedVentas, seedInvoicedOrder } from './fixtures.js';
import { daysBetween, getReturnWindowDays, validateReturn, returnableQuantity, RETURN_STATUSES } from '../../src/ventas/returns.js';

let seed;
let invoice;

beforeEach(() => {
  installLocalStorage();
  resetVentasStorage();
  seed = seedVentas();
  ({ invoice } = seedInvoicedOrder(seed));
});

function payload(overrides = {}){
  return {
    facturaId: invoice.id,
    motivo: 'Empaque dañado',
    fecha: '2026-11-10',
    lineas: [{ productoId: seed.productos[0].id, cantidad: 1 }],
    ...overrides
  };
}

describe('return validation rules', () => {
  it('computes whole days and reads the configured window', () => {
    expect(daysBetween('2026-11-10', '2026-11-01')).toBe(9);
    expect(daysBetween('2026-11-01', '2026-11-10')).toBe(-9);
    expect(getReturnWindowDays()).toBe(30);
    expect(RETURN_STATUSES).toContain('solicitada');
  });

  it('accepts a valid request and resolves invoice, order and amounts', () => {
    const check = validateReturn(payload());
    expect(check.valid).toBe(true);
    expect(check.order.id).toBe(invoice.pedidoId);
    expect(check.total).toBe(1000);
    expect(check.lineas[0].cantidad).toBe(1);
  });

  it('reports window, motive, date and quantity errors together', () => {
    const check = validateReturn(payload({
      fecha: '2027-02-01',
      motivo: ' ',
      lineas: [{ productoId: seed.productos[0].id, cantidad: 99 }]
    }));
    expect(check.valid).toBe(false);
    expect(check.errors.fecha).toMatch(/expirado/);
    expect(check.errors.motivo).toMatch(/obligatorio/);
    expect(Object.values(check.errors).some(message => message.includes('máxima devolvible'))).toBe(true);
  });

  it('requires an existing invoice or order', () => {
    expect(validateReturn({ fecha: '2026-11-10', motivo: 'x', lineas: [] }).valid).toBe(false);
    expect(validateReturn(payload({ facturaId: 'no-existe' })).errors.facturaId).toMatch(/no existe/);
  });

  it('knows the remaining returnable quantity', () => {
    const line = validateReturn(payload()).lineas[0].detail;
    expect(returnableQuantity(line.id)).toBe(1);
  });
});
