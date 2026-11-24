import { buildSummary } from "../../ventas/summary.js";
import { listReturns } from "../../ventas/returns.js";
import { can, getCurrentRole, ROLES } from "../../ventas/roles.js";
import { clearSalesAnalytics, renderSalesAnalytics } from "./sales-analytics.js";

function qs(id) {
  return document.getElementById(id);
}

function fill(id, value) {
  const el = qs(id);
  if (el) el.textContent = String(value);
}

export function renderSummaryView() {
  const role = getCurrentRole();
  const postventa = role === ROLES.DEVOLUCIONES;
  const restricted = qs("summary-restricted");
  const content = qs("summary-content");
  if (restricted) restricted.hidden = can("ver_resumen");
  if (content) content.hidden = !can("ver_resumen");
  if (!can("ver_resumen")) {
    clearSalesAnalytics();
    return;
  }

  const summary = buildSummary({ role });
  if (postventa) {
    fill("summary-delivered-count", summary.pedidos.filter((order) => order.estado === "entregado").length);
    fill("summary-returns-count", listReturns().length);
    for (const id of [
      "summary-total-ventas",
      "summary-total-cotizaciones",
      "summary-total-pedidos",
      "summary-monto-total",
      "summary-monto-ventas",
      "summary-monto-cotizaciones",
      "summary-monto-pedidos",
    ]) fill(id, "");
    const ordersBody = qs("summary-orders-body");
    const statesBody = qs("summary-states-body");
    if (ordersBody) ordersBody.innerHTML = "";
    if (statesBody) statesBody.innerHTML = "";
    const empty = qs("summary-empty");
    if (empty) empty.hidden = summary.pedidos.some((order) => order.estado === "entregado") || listReturns().length > 0;
    clearSalesAnalytics();
    return;
  }

  fill("summary-total-ventas", summary.totalVentas);
  fill("summary-total-cotizaciones", summary.totalCotizaciones);
  fill("summary-total-pedidos", summary.totalPedidos);
  fill("summary-monto-ventas", summary.montoVentas.toLocaleString("es-CL"));
  fill("summary-monto-cotizaciones", summary.montoCotizaciones.toLocaleString("es-CL"));
  fill("summary-monto-pedidos", summary.montoPedidos.toLocaleString("es-CL"));
  fill("summary-monto-total", summary.montoTotal.toLocaleString("es-CL"));

  const empty = qs("summary-empty");
  if (empty) empty.hidden = !summary.vacio;

  const statesBody = qs("summary-states-body");
  if (statesBody) {
    statesBody.innerHTML = "";
    for (const [estado, cantidad] of Object.entries(summary.estados)) {
      const row = document.createElement("tr");
      const name = document.createElement("td");
      name.textContent = estado;
      const total = document.createElement("td");
      total.textContent = String(cantidad);
      row.append(name, total);
      statesBody.appendChild(row);
    }
  }

  const ordersBody = qs("summary-orders-body");
  if (ordersBody) {
    ordersBody.innerHTML = "";
    if (role === ROLES.AUDITOR) return renderSalesAnalytics();
    if (summary.pedidos.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 5;
      cell.className = "empty";
      cell.textContent = "No hay pedidos registrados todavía.";
      row.appendChild(cell);
      ordersBody.appendChild(row);
    }
    for (const order of summary.pedidos) {
      const row = document.createElement("tr");
      for (const value of [
        order.numero,
        order.cliente,
        order.fecha,
        order.estado,
        `${order.total.toLocaleString("es-CL")} ${order.moneda}`,
      ]) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      }
      ordersBody.appendChild(row);
    }
  }

  renderSalesAnalytics();
}
