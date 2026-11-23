import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

const charts = vi.hoisted(() => ({ created: [] }));

vi.mock("chart.js/auto", () => ({
  default: class {
    constructor(context, config) {
      this.context = context;
      this.config = config;
      this.destroy = vi.fn();
      charts.created.push(this);
    }
  },
}));

import { setupDom, resetVentasStorage, seedVentas, buildOrderPayload } from "./fixtures.js";
import { createOrder, updateOrderStatus } from "../../src/ventas/orders.js";
import {
  clearSalesAnalytics,
  initSalesAnalytics,
  renderSalesAnalytics,
} from "../../src/components/ventas/sales-analytics.js";

const fireChange = (id, value) => {
  const select = document.getElementById(id);
  select.value = value;
  select.dispatchEvent(new window.Event("change", { bubbles: true }));
};

describe("sales analytics charts", () => {
  beforeAll(() => {
    setupDom();
    window.HTMLCanvasElement.prototype.getContext = () => ({});
    initSalesAnalytics();
  });

  beforeEach(() => {
    charts.created.length = 0;
    resetVentasStorage();
    const seed = seedVentas();
    const [first, second] = seed.productos;
    const order = createOrder(
      buildOrderPayload(seed, {
        estado: "pedido",
        fechaEmision: "2026-11-02",
        lineas: [
          { productoId: first.id, cantidad: 3, precioUnitario: 1000 },
          { productoId: second.id, cantidad: 1, precioUnitario: 2000 },
        ],
      }),
    );
    updateOrderStatus(order.id, "facturado");
    createOrder(
      buildOrderPayload(seed, {
        estado: "pedido",
        fechaEmision: "2026-11-05",
        lineas: [{ productoId: second.id, cantidad: 1, precioUnitario: 2000 }],
      }),
    );
  });

  it("crea un gráfico de líneas y otro de barras con los datos simulados", () => {
    renderSalesAnalytics();

    expect(document.getElementById("analytics-empty").hidden).toBe(true);
    expect(charts.created).toHaveLength(2);
    const [evolution, products] = charts.created;
    expect(evolution.config.type).toBe("line");
    expect(evolution.config.data.datasets).toHaveLength(3);
    expect(evolution.config.data.labels).toEqual(["nov 26"]);
    expect(products.config.type).toBe("bar");
    expect(products.config.data.labels).toEqual(["Producto 1", "Producto 2"]);
    expect(products.config.data.datasets[0].data).toEqual([3, 2]);
    expect(document.getElementById("analytics-products-total").textContent).toContain("5 unidades");
  });

  it("reacciona a los controles de período, métrica y tipo de gráfico", () => {
    renderSalesAnalytics();
    const [firstEvolution, firstProducts] = charts.created;

    fireChange("analytics-period", "semana");
    expect(firstEvolution.destroy).toHaveBeenCalled();
    expect(firstProducts.destroy).toHaveBeenCalled();
    expect(charts.created.at(-2).config.data.labels).toEqual(["sem 02 nov"]);

    fireChange("analytics-metric", "monto");
    expect(charts.created.at(-1).config.data.datasets[0].data).toEqual([4000, 3000]);

    fireChange("analytics-type", "doughnut");
    expect(charts.created.at(-1).config.type).toBe("doughnut");
  });

  it("muestra el estado vacío y libera los gráficos cuando no hay datos", () => {
    renderSalesAnalytics();
    const previous = [...charts.created];

    resetVentasStorage();
    renderSalesAnalytics();

    expect(document.getElementById("analytics-empty").hidden).toBe(false);
    expect(document.getElementById("analytics-evolution-card").hidden).toBe(true);
    expect(document.getElementById("analytics-products-card").hidden).toBe(true);
    expect(previous.every((chart) => chart.destroy.mock.calls.length === 1)).toBe(true);
    expect(charts.created).toHaveLength(2);
    clearSalesAnalytics();
  });
});
