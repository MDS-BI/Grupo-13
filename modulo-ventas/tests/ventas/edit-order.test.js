import { describe, it, expect, beforeEach } from "vitest";
import {
  installLocalStorage,
  resetVentasStorage,
  seedVentas,
  seedQuoteOrder,
  seedDeliveredOrder,
  buildOrderPayload,
} from "./fixtures.js";
import { createOrder, updateOrder, getOrder, canEditOrder } from "../../src/ventas/orders.js";

let seed;

beforeEach(() => {
  installLocalStorage();
  resetVentasStorage();
  seed = seedVentas();
});

describe("order editing", () => {
  it("recalculates subtotal, tax and total when lines change", () => {
    const order = createOrder(buildOrderPayload(seed));
    const [first, second] = seed.productos;

    const updated = updateOrder(order.id, {
      lineas: [
        { productoId: first.id, cantidad: 2, precioUnitario: 1000 },
        { productoId: second.id, cantidad: 3, precioUnitario: 2000 },
      ],
    });

    expect(updated.lineas).toHaveLength(2);
    expect(updated.subtotal).toBe(8000);
    expect(updated.impuesto).toBe(1520);
    expect(updated.total).toBe(9520);
    expect(updated.quantity).toBe(5);
  });

  it("revalidates stock and keeps the previous order when the new quantity exceeds it", () => {
    const order = createOrder(buildOrderPayload(seed));
    const [first] = seed.productos;

    expect(() =>
      updateOrder(order.id, {
        lineas: [{ productoId: first.id, cantidad: 1000, precioUnitario: 1000 }],
      }),
    ).toThrow(/Stock insuficiente/);

    expect(getOrder(order.id).lineas[0].cantidad).toBe(1);
  });

  it("allows editing modifiable states and blocks terminal ones", () => {
    const quote = seedQuoteOrder(seed);
    expect(canEditOrder(quote)).toBe(true);

    const { order } = seedDeliveredOrder(seed);
    expect(canEditOrder(order)).toBe(false);
    expect(() => updateOrder(order.id, { canal: "Web" })).toThrow(/terminal/);
  });
});
