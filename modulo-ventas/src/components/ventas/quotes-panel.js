import { loadEntities } from "../../storage.js";
import {
  QUOTE_TRANSITIONS,
  acceptQuote,
  expireQuote,
  listQuotes,
  rejectQuote,
} from "../../ventas/quotes.js";

let wired = false;
let notify = () => {};

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

function actionsFor(status) {
  const labels = {
    enviada: "Enviar",
    aceptada: "Aceptar",
    rechazada: "Rechazar",
    vencida: "Vencer",
  };
  return (QUOTE_TRANSITIONS[status] || []).filter((action) => labels[action]);
}

export function initQuotesPanel(callbacks = {}) {
  if (wired) return;
  wired = true;
  notify = callbacks.onChanged || notify;
  const body = qs("quotes-body");
  if (!body) return;
  body.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-quote-action]");
    if (!button) return;
    const feedback = qs("quotes-feedback");
    try {
      if (button.dataset.quoteAction === "accept") acceptQuote(button.dataset.quoteId);
      if (button.dataset.quoteAction === "reject") rejectQuote(button.dataset.quoteId);
      if (button.dataset.quoteAction === "expire") expireQuote(button.dataset.quoteId);
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
  const count = qs("quotes-count");
  if (count) count.textContent = `${quotes.length} cotización(es) registrada(s)`;

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
      button.textContent =
        action === "aceptada"
          ? "Aceptar"
          : action === "rechazada"
            ? "Rechazar"
            : action === "vencida"
              ? "Vencer"
              : "Enviar";
      actions.appendChild(button);
    }
    row.appendChild(actions);
    body.appendChild(row);
  }
}
