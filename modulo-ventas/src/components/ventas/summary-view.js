import { buildSummary } from "../../ventas/summary.js";
import { SALES_STATES } from "../../ventas/analytics.js";
import { listOrders } from "../../ventas/orders.js";
import { listQuotes } from "../../ventas/quotes.js";
import { filterPanelRecords, salesDateRange } from "../../ventas/panel-metrics.js";
import { can, getCurrentRole, ROLES } from "../../ventas/roles.js";
import { clearSalesAnalytics, renderSalesAnalytics } from "./sales-analytics.js";
import { clearPanelDetails, initPanelDetails, renderPanelDetails } from "./panel-details.js";

function qs(id) {
  return document.getElementById(id);
}

function fill(id, value) {
  const el = qs(id);
  if (el) el.textContent = String(value);
}

export function initSummaryView() {
  initPanelDetails();
  qs("panel-range")?.addEventListener("change", () => renderSummaryView());
}

export function renderSummaryView({ showRestricted = false } = {}) {
  const panel = qs("view-summary");
  if (!panel) return;
  const allowed = can("ver_resumen");
  const sellerPanel = qs("seller-panel");
  const seller = getCurrentRole() === ROLES.VENDEDOR;
  sellerPanel.hidden = !seller;
  if (seller) {
    fill(
      "seller-open-quotes",
      listQuotes().filter(({ estado }) => ["borrador", "enviada"].includes(estado)).length,
    );
    fill(
      "seller-pending-orders",
      listOrders().filter(({ estado }) => estado === "cotización").length,
    );
  }
  panel.hidden = !allowed && !showRestricted;
  const restricted = qs("summary-restricted");
  const content = qs("summary-content");
  if (restricted) restricted.hidden = allowed;
  if (content) content.hidden = !allowed;
  if (!allowed) {
    clearPanelDetails();
    clearSalesAnalytics();
    return;
  }

  const range = salesDateRange(qs("panel-range").value);
  fill("panel-range-label", range.from ? `${range.from} a ${range.to}` : "");
  const orders = filterPanelRecords(listOrders(), range);
  const quotes = filterPanelRecords(listQuotes(), range);
  const sales = orders.filter(({ estado }) => SALES_STATES.includes(estado));
  const summary = buildSummary({ role: ROLES.GERENTE, orders, quotes });
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

  renderPanelDetails(orders, sales);
  renderSalesAnalytics({ orders, quotes, sales });
}
