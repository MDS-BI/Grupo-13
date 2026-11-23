import { describe, it, expect, beforeEach } from "vitest";
import { setupDom, resetVentasStorage, seedVentas, buildOrderPayload } from "./fixtures.js";
import { createOrder, updateOrderStatus } from "../../src/ventas/orders.js";
import { buildSalesEvolution, buildTopProducts } from "../../src/ventas/analytics.js";

function order(estado, fechaEmision, total, lineas = []) {
  return { estado, fechaEmision, total, lineas };
}

describe("buildSalesEvolution", () => {
  it("clasifica pedidos y cotizaciones, rellena períodos y calcula totales", () => {
    const orders = [
      order("facturado", "2026-09-05", 1000),
      order("pedido", "2026-09-20", 2000),
      order("entregado", "2026-11-02", 3000),
      order("cotización", "2026-11-10", 500),
      order("cancelado", "2026-11-11", 999),
    ];
    const quotes = [{ fechaEmision: "2026-11-03", total: 700, estado: "enviada" }];

    const result = buildSalesEvolution({ orders, quotes, period: "mes" });

    expect(result.labels).toEqual(["sep 26", "oct 26", "nov 26"]);
    expect(result.series.map((serie) => serie.key)).toEqual([
      "ventas",
      "pedidos",
      "cotizaciones",
    ]);
    expect(result.series[0].data).toEqual([1000, 0, 3000]);
    expect(result.series[1].data).toEqual([2000, 0, 0]);
    expect(result.series[2].data).toEqual([0, 0, 1200]);
    expect(result.series.map((serie) => serie.total)).toEqual([4000, 2000, 1200]);
    expect(result.vacio).toBe(false);
  });

  it("respeta el período elegido y devuelve un estado vacío coherente", () => {
    const orders = [
      order("pedido", "2026-11-02", 1000),
      order("facturado", "2026-11-05", 2500),
    ];
    const daily = buildSalesEvolution({ orders, quotes: [], period: "dia" });

    expect(daily.labels).toEqual(["02 nov", "03 nov", "04 nov", "05 nov"]);
    expect(daily.series[0].data).toEqual([0, 0, 0, 2500]);
    expect(daily.series[1].data).toEqual([1000, 0, 0, 0]);

    const weekly = buildSalesEvolution({ orders, quotes: [], period: "semana" });
    expect(weekly.labels).toEqual(["sem 02 nov"]);

    const empty = buildSalesEvolution({ orders: [], quotes: [] });
    expect(empty.vacio).toBe(true);
    expect(empty.labels).toEqual([]);
    expect(empty.series.every((serie) => serie.total === 0)).toBe(true);
  });
});

describe("buildTopProducts", () => {
  let seed;

  beforeEach(() => {
    setupDom();
    resetVentasStorage();
    seed = seedVentas();
  });

  it("suma unidades y montos de los pedidos confirmados, sin cotizaciones", () => {
    const [first, second] = seed.productos;
    createOrder(
      buildOrderPayload(seed, {
        estado: "pedido",
        lineas: [
          { productoId: first.id, cantidad: 3, precioUnitario: 1000 },
          { productoId: second.id, cantidad: 1, precioUnitario: 2000 },
        ],
      }),
    );
    const invoiced = createOrder(
      buildOrderPayload(seed, {
        estado: "pedido",
        lineas: [{ productoId: first.id, cantidad: 2, precioUnitario: 1000 }],
      }),
    );
    updateOrderStatus(invoiced.id, "facturado");
    createOrder(
      buildOrderPayload(seed, {
        estado: "cotización",
        lineas: [{ productoId: second.id, cantidad: 50, precioUnitario: 2000 }],
      }),
    );

    const byUnits = buildTopProducts({ metric: "cantidad" });
    expect(byUnits).toHaveLength(2);
    expect(byUnits[0]).toMatchObject({ nombre: "Producto 1", cantidad: 5, monto: 5000 });
    expect(byUnits[1]).toMatchObject({ nombre: "Producto 2", cantidad: 1, monto: 2000 });

    const byAmount = buildTopProducts({ metric: "monto", limit: 1 });
    expect(byAmount).toEqual([
      { id: first.id, nombre: "Producto 1", sku: first.sku, cantidad: 5, monto: 5000 },
    ]);
  });
});
