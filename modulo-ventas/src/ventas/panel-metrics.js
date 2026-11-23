import { roundMoney } from "./money.js";
import { isValidDate } from "../storage.js";

function localDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function salesDateRange(value, today = new Date()) {
  if (value !== "month" && value !== "semester") return { from: "", to: "" };
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();
  const daysInTargetMonth = new Date(year, month - 5, 0).getDate();
  const start =
    value === "month"
      ? new Date(year, month, day - 29)
      : new Date(year, month - 6, Math.min(day, daysInTargetMonth));
  return { from: localDate(start), to: localDate(today) };
}

export function filterPanelRecords(records, { from, to }) {
  if (!from && !to) return records;
  return records.filter(
    ({ fechaEmision }) => isValidDate(fechaEmision) && fechaEmision >= from && fechaEmision <= to,
  );
}

export function buildCustomerMetrics(sales) {
  const customers = new Map();
  for (const { clienteId, fechaEmision, moneda = "CLP", total } of sales) {
    if (!clienteId) continue;
    if (!customers.has(clienteId)) {
      customers.set(clienteId, { count: 0, lastDate: "", totals: new Map() });
    }
    const customer = customers.get(clienteId);
    customer.count += 1;
    if (fechaEmision > customer.lastDate) customer.lastDate = fechaEmision;
    customer.totals.set(moneda, (customer.totals.get(moneda) ?? 0) + (Number(total) || 0));
  }

  let repeatBuyers = 0;
  for (const { count, totals } of customers.values()) {
    if (count > 1) repeatBuyers += 1;
    for (const [code, amount] of totals) totals.set(code, roundMoney(amount, code));
  }
  const buyers = customers.size;
  return {
    customers,
    buyers,
    repeatBuyers,
    repeatRate: buyers ? (100 * repeatBuyers) / buyers : 0,
  };
}
