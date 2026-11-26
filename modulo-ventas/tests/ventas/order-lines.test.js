import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorage, resetVentasStorage, seedVentas, buildOrderPayload } from './fixtures.js';
import { consolidateLines, validateOrder, createOrder, getOrder } from '../../src/ventas/orders.js';
import { orderTotals } from '../../src/ventas/money.js';

let seed;

beforeEach(() => {
  installLocalStorage();
  resetVentasStorage();
  seed = seedVentas();
});

describe('order lines and totals', () => {
  it('consolidates duplicated products into a single line', () => {
    const lines = consolidateLines([
      { productoId: 'p1', cantidad: 1, precioUnitario: 100 },
      { productoId: 'p1', cantidad: 2, precioUnitario: 100 },
      { productoId: 'p2', cantidad: 1, precioUnitario: 50 }
    ]);
    expect(lines).toHaveLength(2);
    expect(lines[0].cantidad).toBe(3);
    expect(lines[1].linea).toBe(2);
  });

  it('calculates subtotal, tax and total for multiple lines and tax rates', () => {
    const totals = orderTotals([
      { cantidad: 2, precioUnitario: 1000, impuestoPorcentaje: 19 },
      { cantidad: 1, precioUnitario: 500, impuestoPorcentaje: 10 }
    ], { currency: 'CLP' });
    expect(totals.subtotal).toBe(2500);
    expect(totals.impuesto).toBe(430);
    expect(totals.total).toBe(2930);
  });

  it('keeps 19% and 0% tax rates separate on every line and on the order', () => {
    const payload = buildOrderPayload(seed);
    payload.lineas = [
      { productoId: seed.productos[0].id, cantidad: 2, precioUnitario: 1000, impuestoPorcentaje: 19 },
      { productoId: seed.productos[1].id, cantidad: 3, precioUnitario: 500, impuestoPorcentaje: 0 }
    ];
    const order = createOrder(payload);
    expect(order.lineas.map(line => line.impuestoPorcentaje)).toEqual([19, 0]);
    expect(order.lineas.map(line => line.impuestoLinea)).toEqual([380, 0]);
    expect(order.subtotal).toBe(3500);
    expect(order.impuesto).toBe(380);
    expect(order.total).toBe(3880);
  });

  it('consolidates duplicate lines when an order is created', () => {
    const payload = buildOrderPayload(seed);
    payload.lineas = [payload.lineas[0], { ...payload.lineas[0], cantidad: 2 }];
    const order = createOrder(payload);
    expect(order.lineas).toHaveLength(1);
    expect(order.lineas[0].cantidad).toBe(3);
    expect(order.quantity).toBe(3);
  });

  it('rejects empty, duplicate and invalid quantities before saving', () => {
    const payload = buildOrderPayload(seed);
    expect(validateOrder({ ...payload, lineas: [] }).errors.lineas).toMatch(/al menos un producto/);
    payload.lineas = [{ productoId: seed.productos[0].id, cantidad: 0, precioUnitario: 100 }];
    expect(validateOrder(payload).valid).toBe(false);
    payload.lineas = [{ productoId: seed.productos[0].id, cantidad: 1.5, precioUnitario: 100 }];
    expect(validateOrder(payload).valid).toBe(false);
    payload.lineas = [{ productoId: seed.productos[0].id, cantidad: -2, precioUnitario: 100 }];
    expect(validateOrder(payload).valid).toBe(false);
  });

  it('revalidates stock on update', () => {
    const order = createOrder(buildOrderPayload(seed));
    const lineas = [{ productoId: seed.productos[0].id, cantidad: 1000, precioUnitario: 100 }];
    const check = validateOrder({ ...buildOrderPayload(seed), lineas }, { existing: order });
    expect(check.valid).toBe(false);
    expect(Object.values(check.errors).some(message => message.includes('Stock insuficiente'))).toBe(true);
    expect(getOrder(order.id).lineas[0].cantidad).toBe(1);
  });
});
