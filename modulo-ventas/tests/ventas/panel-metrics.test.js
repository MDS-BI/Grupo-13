import { describe, expect, it } from "vitest";
import {
  buildCustomerMetrics,
  filterPanelRecords,
  salesDateRange,
} from "../../src/ventas/panel-metrics.js";

describe("métricas del panel", () => {
  it("incluye hoy y ajusta el inicio del semestre al último día válido", () => {
    const today = new Date(2026, 7, 31);
    expect(salesDateRange("month", today)).toEqual({ from: "2026-08-02", to: "2026-08-31" });
    expect(salesDateRange("semester", today)).toEqual({ from: "2026-02-28", to: "2026-08-31" });
    const records = ["2026-02-27", "2026-02-28", "2026-02-30", "2026-08-31", "2026-09-01"].map(
      (fechaEmision) => ({ fechaEmision }),
    );
    expect(filterPanelRecords(records, salesDateRange("semester", today))).toEqual([
      { fechaEmision: "2026-02-28" },
      { fechaEmision: "2026-08-31" },
    ]);
    expect(filterPanelRecords(records, salesDateRange("all", today))).toEqual(records);
  });

  it("mide recompra por cliente y conserva montos por moneda", () => {
    const result = buildCustomerMetrics([
      { clienteId: "a", fechaEmision: "2026-08-11", moneda: "USD", total: 12.25 },
      { clienteId: "a", fechaEmision: "2026-08-10", moneda: "CLP", total: 1300 },
      { clienteId: "b", fechaEmision: "2026-08-11", moneda: "CLP", total: 1000 },
      { clienteId: "", fechaEmision: "2026-08-11", moneda: "CLP", total: 999 },
    ]);
    expect(result).toMatchObject({ buyers: 2, repeatBuyers: 1, repeatRate: 50 });
    expect(result.customers.get("a")).toEqual({
      count: 2,
      lastDate: "2026-08-11",
      totals: new Map([
        ["USD", 12.25],
        ["CLP", 1300],
      ]),
    });
    expect(buildCustomerMetrics([])).toMatchObject({ buyers: 0, repeatBuyers: 0, repeatRate: 0 });
  });
});
