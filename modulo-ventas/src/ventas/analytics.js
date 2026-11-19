import { getProducto } from "./catalog.js";
import { listOrders } from "./orders.js";
import { listQuotes } from "./quotes.js";
import { roundMoney } from "./money.js";

export const SALES_STATES = Object.freeze(["facturado", "entregado"]);
export const CONFIRMED_STATES = Object.freeze(["pedido", ...SALES_STATES]);
export const PERIOD_OPTIONS = Object.freeze([
  { value: "mes", label: "Por mes" },
  { value: "semana", label: "Por semana" },
  { value: "dia", label: "Por día" },
]);
export const PRODUCT_METRICS = Object.freeze([
  { value: "cantidad", label: "Unidades vendidas" },
  { value: "monto", label: "Monto vendido" },
]);

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const pad = (value) => String(value).padStart(2, "0");

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function dateOf(value) {
  if (value instanceof Date)
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ""));
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function periodKey(date, period) {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  if (period === "dia") return `${year}-${month}-${pad(date.getDate())}`;
  if (period === "semana") {
    const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
  }
  return `${year}-${month}`;
}

function sortKey(key) {
  return key.length === 7 ? `${key}-01` : key;
}

function advance(date, period) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (period === "mes") next.setMonth(next.getMonth() + 1);
  else next.setDate(next.getDate() + (period === "semana" ? 7 : 1));
  return next;
}

function labelFor(key, period) {
  if (period === "mes") {
    const [year, month] = key.split("-");
    return `${MONTHS[Number(month) - 1] || month} ${year.slice(-2)}`;
  }
  const date = dateOf(key);
  if (!date) return key;
  const day = pad(date.getDate());
  const month = MONTHS[date.getMonth()];
  return period === "semana" ? `sem ${day} ${month}` : `${day} ${month}`;
}

export function buildSalesEvolution(options = {}) {
  const period = PERIOD_OPTIONS.some((item) => item.value === options.period)
    ? options.period
    : "mes";
  const orders = options.orders ?? listOrders();
  const quotes = options.quotes ?? listQuotes();
  const byKey = new Map();
  const series = [
    { key: "ventas", label: "Ventas", data: [], total: 0 },
    { key: "pedidos", label: "Pedidos", data: [], total: 0 },
    { key: "cotizaciones", label: "Cotizaciones", data: [], total: 0 },
  ];

  function add(document, seriesKey) {
    const date = dateOf(document?.fechaEmision);
    if (!date) return;
    const key = periodKey(date, period);
    if (!byKey.has(key)) {
      byKey.set(key, Object.fromEntries(series.map((item) => [item.key, 0])));
    }
    byKey.get(key)[seriesKey] += number(document.total);
  }

  for (const order of orders) {
    if (SALES_STATES.includes(order.estado)) add(order, "ventas");
    else if (order.estado === "pedido") add(order, "pedidos");
    else if (order.estado === "cotización") add(order, "cotizaciones");
  }
  for (const quote of quotes) add(quote, "cotizaciones");

  const keys = [...byKey.keys()].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  if (keys.length > 0) {
    const first = dateOf(sortKey(keys[0]));
    const last = sortKey(keys[keys.length - 1]);
    const allKeys = new Set(keys);
    for (
      let cursor = first;
      sortKey(periodKey(cursor, period)) <= last;
      cursor = advance(cursor, period)
    ) {
      allKeys.add(periodKey(cursor, period));
    }
    const completeKeys = [...allKeys].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
    for (const item of series) {
      item.data = completeKeys.map((key) => roundMoney(byKey.get(key)?.[item.key] || 0));
      item.total = roundMoney(item.data.reduce((sum, value) => sum + value, 0));
    }
    return {
      period,
      labels: completeKeys.map((key) => labelFor(key, period)),
      series,
      vacio: series.every((item) => item.total === 0),
    };
  }

  return {
    period,
    labels: [],
    series,
    vacio: true,
  };
}

export function buildTopProducts(options = {}) {
  const orders = options.orders ?? listOrders();
  const metric = PRODUCT_METRICS.some((item) => item.value === options.metric)
    ? options.metric
    : "cantidad";
  const limit = Math.max(1, number(options.limit) || 6);
  const byProduct = new Map();

  for (const order of orders) {
    if (!CONFIRMED_STATES.includes(order.estado)) continue;
    for (const line of order.lineas || []) {
      const id = line.productoId || line.producto_id || line.sku;
      if (!id) continue;
      const producto = getProducto(id);
      const cantidad = number(line.cantidad);
      const lineTotal = number(line.subtotalLinea ?? line.subtotal_linea);
      const monto = lineTotal || roundMoney(cantidad * number(line.precioUnitario));
      const entry = byProduct.get(id) || {
        id,
        nombre: producto?.nombre || id,
        sku: producto?.sku || "",
        cantidad: 0,
        monto: 0,
      };
      entry.cantidad += cantidad;
      entry.monto += monto;
      byProduct.set(id, entry);
    }
  }

  return [...byProduct.values()]
    .map((item) => ({ ...item, monto: roundMoney(item.monto) }))
    .sort((a, b) => b[metric] - a[metric] || a.nombre.localeCompare(b.nombre, "es"))
    .slice(0, limit);
}
