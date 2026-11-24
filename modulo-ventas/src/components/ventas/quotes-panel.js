import { loadEntities } from "../../storage.js";
import {
  QUOTE_TRANSITIONS,
  acceptQuote,
  expireQuote,
  listQuotes,
  rejectQuote,
  updateQuoteStatus,
} from "../../ventas/quotes.js";
import { can } from "../../ventas/roles.js";

let wired = false;
let notify = () => {};
let onOrderCreated = () => {};

function qs(id) {
  return document.getElementById(id);
}

function cell(value, className) {
  const td = document.createElement("td");
  if (value && value.nodeType === 1) td.appendChild(value);
  else td.textContent = String(value ?? "");
  if (className) td.className = className;
  return td;
}

function badge(status) {
  const span = document.createElement("span");
  span.className = `status-badge badge-${status}`;
  span.textContent = status;
  return span;
}

const ACTION_LABELS = {
  enviada: "Enviar",
  aceptada: "Convertir a pedido",
  rechazada: "Rechazar",
  vencida: "Vencer",
};

function actionsFor(status) {
  return (QUOTE_TRANSITIONS[status] || []).filter((action) => ACTION_LABELS[action]);
}

export function initQuotesPanel(callbacks = {}) {
  if (wired) return;
  wired = true;
  notify = callbacks.onChanged || notify;
  onOrderCreated = callbacks.onOrderCreated || onOrderCreated;
  const body = qs("quotes-body");
  if (!body) return;
  body.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-quote-action]");
    if (!button) return;
    const feedback = qs("quotes-feedback");
    const quoteId = button.dataset.quoteId;
    const action = button.dataset.quoteAction;
    const permission = ["aceptada", "rechazada"].includes(action)
      ? "aprobar_cotizacion"
      : "editar_cotizacion";
    if (!can(permission)) {
      if (feedback) feedback.textContent = "Tu rol no tiene permiso para esta acción.";
      return;
    }
    try {
      if (action === "aceptada") {
        const { quote, order } = acceptQuote(quoteId);
        if (feedback) {
          feedback.textContent = `Cotización ${quote.numero} aceptada: pedido ${order.numero} generado en estado "${order.estado}". El pedido vinculado está disponible para su revisión en Órdenes de Venta.`;
        }
        renderQuotesPanel();
        notify();
        onOrderCreated(order);
        return;
      }
      if (action === "rechazada") rejectQuote(quoteId);
      else if (action === "vencida") expireQuote(quoteId);
      else if (action === "enviada") updateQuoteStatus(quoteId, "enviada");
      if (feedback) feedback.textContent = "Cotización actualizada correctamente.";
      renderQuotesPanel();
      notify();
    } catch (error) {
      if (feedback) feedback.textContent = error.message;
    }
  });
}

export function renderQuotesPanel() {
  const body = qs("quotes-body");
  if (!body) return;
  const quotes = listQuotes();
  const empty = qs("quotes-empty");
  if (empty) empty.hidden = quotes.length > 0;
  const clients = new Map(loadEntities().map((entity) => [entity.entity_id, entity.name]));
  body.innerHTML = "";
  for (const quote of quotes) {
    const row = document.createElement("tr");
    row.append(
      cell(quote.numero),
      cell(clients.get(quote.clienteId) || "Cliente desconocido"),
      cell(quote.fechaEmision),
      cell(quote.validaHasta),
      cell(badge(quote.estado)),
      cell(`${Number(quote.total).toLocaleString("es-CL")} ${quote.moneda}`, "amount"),
    );
    const actions = document.createElement("td");
    for (const action of actionsFor(quote.estado)) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "row-action";
      button.dataset.quoteAction = action;
      button.dataset.quoteId = quote.id;
      button.textContent = ACTION_LABELS[action] || action;
      const permission = ["aceptada", "rechazada"].includes(action)
        ? "aprobar_cotizacion"
        : "editar_cotizacion";
      button.dataset.permission = permission;
      button.dataset.permissionLocked = String(!can(permission));
      button.disabled = !can(permission);
      if (button.disabled) {
        button.title =
          ["aceptada", "rechazada"].includes(action)
            ? "Solo el Jefe de Ventas puede aprobar una cotización."
            : "Tu rol no puede modificar cotizaciones.";
      }
      actions.appendChild(button);
    }
    row.appendChild(actions);
    body.appendChild(row);
  }
}
