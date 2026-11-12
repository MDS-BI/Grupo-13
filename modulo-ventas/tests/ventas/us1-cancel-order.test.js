import { describe, it, expect, beforeEach } from "vitest";
import {
  installLocalStorage,
  resetVentasStorage,
  seedVentas,
  seedQuoteOrder,
  seedConfirmedOrder,
  seedInvoicedOrder,
} from "./fixtures.js";
import { cancelOrder, getOrder } from "../../src/ventas/orders.js";

let seed;

beforeEach(() => {
  installLocalStorage();
  resetVentasStorage();
  seed = seedVentas();
});

describe("cancel transitions", () => {
  it("cancels an order from «cotización» and persists the terminal state", () => {
    const order = seedQuoteOrder(seed);
    const cancelled = cancelOrder(order.id);

    expect(cancelled.estado).toBe("cancelado");
    expect(getOrder(order.id).estado).toBe("cancelado");
  });

  it("cancels an order from «pedido»", () => {
    const order = seedConfirmedOrder(seed);
    expect(cancelOrder(order.id).estado).toBe("cancelado");
  });

  it("rejects cancelling an already invoiced order", () => {
    const { order } = seedInvoicedOrder(seed);
    expect(() => cancelOrder(order.id)).toThrow(/Transición de estado inválida/);
    expect(getOrder(order.id).estado).toBe("facturado");
  });
});
