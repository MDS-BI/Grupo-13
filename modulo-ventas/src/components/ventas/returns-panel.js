import { listInvoices, getInvoice } from "../../ventas/invoices.js";
import { createReturn, listReturns, updateReturnStatus } from "../../ventas/returns.js";
import { can, getCurrentRole } from "../../ventas/roles.js";

let wired = false;
let onReturned = () => {};

function qs(id) {
  return document.getElementById(id);
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

function populateInvoices() {
  const select = qs("return-invoice");
  if (!select) return;
  const previous = select.value;
  select.innerHTML = "";
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "-- Selecciona una factura --";
  select.appendChild(empty);
  for (const invoice of listInvoices().filter((item) => item.estado !== "anulada")) {
    const opt = document.createElement("option");
    opt.value = invoice.id;
    opt.textContent = can("ver_montos_financieros")
      ? `${invoice.numero} · ${invoice.clienteId} · ${invoice.total.toLocaleString("es-CL")} ${invoice.moneda}`
      : `${invoice.numero} · ${invoice.clienteId}`;
    select.appendChild(opt);
  }
  if (previous && [...select.options].some((item) => item.value === previous))
    select.value = previous;
}

function renderInvoiceLines() {
  const select = qs("return-invoice");
  const container = qs("return-lines");
  const empty = qs("return-empty");
  if (!container) return;
  container.innerHTML = "";
  const invoice = select && select.value ? getInvoice(select.value) : undefined;
  if (empty) empty.hidden = Boolean(invoice);
  if (!invoice) return;
  for (const line of invoice.lineas || []) {
    const row = document.createElement("div");
    row.className = "return-line";
    const label = document.createElement("label");
    label.textContent = can("ver_montos_financieros")
      ? `${line.nombre || line.productoId} · ${line.precioUnitario.toLocaleString("es-CL")} ${invoice.moneda}`
      : line.nombre || line.productoId;
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.max = String(line.cantidad);
    input.value = "0";
    input.step = "1";
    input.dataset.lineId = line.id;
    input.dataset.productId = line.productoId;
    input.setAttribute("aria-label", `Cantidad a devolver de ${line.nombre || line.productoId}`);
    label.appendChild(input);
    row.appendChild(label);
    container.appendChild(row);
  }
}

function handleSubmit(event) {
  event.preventDefault();
  const feedback = qs("return-feedback");
  const lineas = [...document.querySelectorAll("#return-lines input")]
    .map((input) => ({
      detallePedidoId: input.dataset.lineId,
      productoId: input.dataset.productId,
      cantidad: Number(input.value),
    }))
    .filter((line) => line.cantidad > 0);
  try {
    const result = createReturn({
      facturaId: qs("return-invoice")?.value,
      motivo: qs("return-reason")?.value.trim(),
      fecha: qs("return-date")?.value || today(),
      lineas,
    });
    if (feedback) {
      feedback.textContent = can("ver_montos_financieros")
        ? `Devolución ${result.numero} registrada en estado "${result.devolucion.estado}" por ${result.total.toLocaleString("es-CL")} ${result.devolucion.moneda}.`
        : `Devolución ${result.numero} registrada en estado "${result.devolucion.estado}".`;
    }
    renderReturnsPanel();
    if (qs("return-reason")) qs("return-reason").value = "";
    onReturned(result);
  } catch (error) {
    if (feedback) feedback.textContent = error.message;
  }
}

function addReturnAction(entry, item, label, status, permission) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "row-action";
  button.textContent = label;
  button.dataset.returnId = item.id;
  button.dataset.returnStatus = status;
  button.dataset.permission = permission;
  button.disabled = !can(permission);
  if (button.disabled) button.title = "🔒 Bloqueado para este rol.";
  entry.appendChild(button);
}

function handleReturnAction(event) {
  const button = event.target.closest("button[data-return-id]");
  if (!button) return;
  const feedback = qs("return-feedback");
  const { returnId, returnStatus: status } = button.dataset;
  try {
    const updated = updateReturnStatus(returnId, status, { role: getCurrentRole() });
    if (feedback) feedback.textContent = `Devolución ${updated.numero}: estado "${status}".`;
    renderReturnsPanel();
    onReturned({ devolucion: updated });
  } catch (error) {
    if (feedback) feedback.textContent = error.message;
  }
}

export function initReturnsPanel(options = {}) {
  onReturned = options.onReturned || (() => {});
  if (wired) return;
  wired = true;
  const select = qs("return-invoice");
  if (select) select.addEventListener("change", renderInvoiceLines);
  const form = qs("return-form");
  if (form) form.addEventListener("submit", handleSubmit);
  qs("returns-list")?.addEventListener("click", handleReturnAction);
}

export function renderReturnsPanel() {
  populateInvoices();
  const date = qs("return-date");
  if (date && !date.value) date.value = today();
  renderInvoiceLines();
  const list = qs("returns-list");
  if (list) {
    list.innerHTML = "";
    const returns = listReturns();
    if (returns.length === 0) {
      const empty = document.createElement("li");
      empty.className = "empty";
      empty.textContent = "No hay devoluciones registradas.";
      list.appendChild(empty);
    }
    for (const item of returns) {
      const entry = document.createElement("li");
      const description = document.createElement("span");
      description.textContent = `${item.numero} · ${item.fecha} · ${item.motivo} · ${item.estado}`;
      entry.appendChild(description);
      if (item.estado === "solicitada") {
        addReturnAction(entry, item, "Aprobar", "aprobada", "aprobar_devolucion");
        addReturnAction(entry, item, "Rechazar", "rechazada", "aprobar_devolucion");
      } else if (item.estado === "aprobada") {
        addReturnAction(entry, item, "Completar", "completada", "gestionar_devoluciones");
      }
      list.appendChild(entry);
    }
  }
}
