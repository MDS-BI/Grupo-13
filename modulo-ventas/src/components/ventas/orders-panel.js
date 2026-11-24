import { loadEntities } from "../../storage.js";
import { can, getCurrentRole, ROLES } from "../../ventas/roles.js";
import { canEditOrder, listOrders } from "../../ventas/orders.js";

function qs(id) {
  return document.getElementById(id);
}

function cell(value, className) {
  const element = document.createElement("td");
  element.textContent = String(value ?? "");
  if (className) element.className = className;
  return element;
}

function badge(status) {
  const element = document.createElement("span");
  element.className = `status-badge badge-${status}`;
  element.textContent = status;
  return element;
}

export function renderSalesOrders() {
  const body = qs("sales-orders-body");
  if (!body) return;

  const postventa = getCurrentRole() === ROLES.DEVOLUCIONES;
  const financialVisible = can("ver_montos_financieros");
  const orders = listOrders().filter((order) => !postventa || order.estado === "entregado");
  const clients = new Map(loadEntities().map((client) => [client.entity_id, client.name]));
  const empty = qs("sales-orders-empty");
  if (empty) empty.hidden = orders.length > 0;
  body.innerHTML = "";

  for (const order of orders) {
    const row = document.createElement("tr");
    const status = document.createElement("td");
    status.appendChild(badge(order.estado));
    const total = cell(
      financialVisible ? `${Number(order.total).toLocaleString("es-CL")} ${order.moneda}` : "",
      "amount",
    );
    total.hidden = !financialVisible;
    const action = document.createElement("button");
    action.type = "button";
    action.className = "row-action";
    action.textContent = can("editar_orden") && canEditOrder(order.id) ? "Editar" : "Solo lectura";
    action.dataset.orderEditId = order.id;
    action.disabled = !can("editar_orden") || !canEditOrder(order.id);
    if (action.disabled) {
      action.dataset.permissionLocked = "true";
      action.title = can("editar_orden")
        ? "Esta orden ya no admite cambios."
        : "🔒 Tu rol no puede editar órdenes.";
    }
    const actions = document.createElement("td");
    actions.appendChild(action);
    row.append(
      cell(order.numero),
      cell(clients.get(order.clienteId) || "Cliente desconocido"),
      cell(order.fechaEmision),
      status,
      total,
      actions,
    );
    body.appendChild(row);
  }
}
