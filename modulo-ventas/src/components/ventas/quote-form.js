import { loadEntities } from "../../storage.js";
import { getConfig } from "../../module-config.js";
import { can } from "../../ventas/roles.js";
import { createQuote } from "../../ventas/quotes.js";
import { orderTotals } from "../../ventas/money.js";
import { getPrecioVigente } from "../../ventas/catalog.js";
import { renderProductPicker } from "./product-picker.js";
import { runWithBusy } from "./loading-feedback.js";

let wired = false;
let lines = [];
let notify = () => {};

function qs(id) {
  return document.getElementById(id);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function populateClients() {
  const select = qs("quote-client");
  if (!select) return;
  const previous = select.value;
  select.innerHTML = "";
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "-- Selecciona un cliente --";
  select.appendChild(empty);
  for (const entity of loadEntities()) {
    const option = document.createElement("option");
    option.value = entity.entity_id;
    option.textContent = `${entity.name} · ${entity.code}`;
    select.appendChild(option);
  }
  if (previous && [...select.options].some((option) => option.value === previous))
    select.value = previous;
}

function renderLines() {
  const body = qs("quote-lines-body");
  if (!body) return;
  body.innerHTML = "";
  for (const line of lines) {
    const row = document.createElement("tr");
    const product = document.createElement("td");
    product.textContent = `${line.nombre} · ${line.sku}`;
    const quantity = document.createElement("td");
    quantity.textContent = String(line.cantidad);
    const price = document.createElement("td");
    price.textContent = line.sinPrecio
      ? "Sin precio vigente"
      : line.precioUnitario.toLocaleString("es-CL");
    const removeCell = document.createElement("td");
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "link-button";
    remove.textContent = "Quitar";
    remove.setAttribute("aria-label", `Quitar ${line.nombre} de la cotización`);
    remove.addEventListener("click", () => {
      lines = lines.filter((item) => item.id !== line.id);
      renderLines();
    });
    removeCell.appendChild(remove);
    row.append(product, quantity, price, removeCell);
    body.appendChild(row);
  }
  if (lines.length === 0) {
    const row = document.createElement("tr");
    const empty = document.createElement("td");
    empty.colSpan = 4;
    empty.className = "empty";
    empty.textContent = "Aún no has agregado productos a la cotización.";
    row.appendChild(empty);
    body.appendChild(row);
  }

  const totals = orderTotals(lines, {
    currency: qs("quote-currency")?.value || "CLP",
    descuento: Number(qs("quote-discount")?.value || 0),
  });
  const totalsElement = qs("quote-totals");
  if (totalsElement) {
    totalsElement.textContent = `Subtotal: ${totals.subtotal.toLocaleString("es-CL")} · IVA: ${totals.impuesto.toLocaleString("es-CL")} · Total: ${totals.total.toLocaleString("es-CL")}`;
  }
}

function clearForm({ clearFeedback = true } = {}) {
  lines = [];
  const form = qs("quote-form");
  if (form) form.reset();
  const date = qs("quote-date");
  if (date) date.value = today();
  const currency = qs("quote-currency");
  if (currency) currency.value = getConfig().businessRules?.defaultCurrency || "CLP";
  const feedback = qs("quote-feedback");
  if (clearFeedback && feedback) feedback.textContent = "";
  renderLines();
  renderProductPicker(qs("quote-product-results"), "", addProduct);
}

function addProduct(product) {
  const existing = lines.find((line) => line.productoId === product.id);
  if (existing) {
    existing.cantidad += 1;
  } else {
    const price = getPrecioVigente(product.id, qs("quote-date")?.value || today());
    lines.push({
      id: `${Date.now()}-${lines.length}`,
      productoId: product.id,
      sku: product.sku,
      nombre: product.nombre,
      cantidad: 1,
      precioUnitario: Number(price?.precio) || 0,
      sinPrecio: !price,
      impuestoPorcentaje: Number(product.impuestoPorcentaje) || 0,
    });
  }
  renderLines();
}

function refreshLinePrices() {
  const date = qs("quote-date")?.value || today();
  lines = lines.map((line) => {
    const price = getPrecioVigente(line.productoId, date);
    return {
      ...line,
      precioUnitario: Number(price?.precio) || 0,
      sinPrecio: !price,
    };
  });
  renderLines();
}

function handleSubmit(event) {
  event.preventDefault();
  runWithBusy(qs("quote-save"), () => {
    const feedback = qs("quote-feedback");
    if (!can("crear_cotizacion")) {
      if (feedback) feedback.textContent = "Tu rol no tiene permiso para crear cotizaciones.";
      return;
    }
    if (lines.some((line) => line.sinPrecio)) {
      if (feedback)
        feedback.textContent = "Cada producto debe tener un precio vigente en la fecha de emisión.";
      return;
    }
    try {
      const quote = createQuote({
        clienteId: qs("quote-client")?.value,
        vendedorId: qs("quote-seller")?.value.trim(),
        fechaEmision: qs("quote-date")?.value || today(),
        validaHasta: qs("quote-valid-until")?.value || undefined,
        moneda: qs("quote-currency")?.value.trim() || "CLP",
        descuento: Number(qs("quote-discount")?.value || 0),
        notas: qs("quote-notes")?.value.trim(),
        lineas: lines.map((line) => ({
          productoId: line.productoId,
          cantidad: line.cantidad,
          precioUnitario: line.precioUnitario,
          impuestoPorcentaje: line.impuestoPorcentaje,
        })),
      });
      clearForm({ clearFeedback: false });
      if (feedback)
        feedback.textContent = `Cotización ${quote.numero} creada en estado "${quote.estado}".`;
      populateClients();
      notify(quote);
    } catch (error) {
      if (feedback) feedback.textContent = error.message;
    }
  });
}

export function initQuoteForm(options = {}) {
  notify = options.onCreated || (() => {});
  if (wired) return;
  wired = true;
  const search = qs("quote-product-search");
  if (search) {
    search.addEventListener("input", () =>
      renderProductPicker(qs("quote-product-results"), search.value, addProduct),
    );
  }
  qs("quote-currency")?.addEventListener("input", renderLines);
  qs("quote-discount")?.addEventListener("input", renderLines);
  qs("quote-date")?.addEventListener("change", refreshLinePrices);
  qs("quote-form")?.addEventListener("submit", handleSubmit);
  qs("quote-reset")?.addEventListener("click", clearForm);
}

export function refreshQuoteForm() {
  populateClients();
  const seller = qs("quote-seller");
  if (seller && !seller.value) {
    const sellers = getConfig().businessRules?.vendedores;
    seller.value = (Array.isArray(sellers) && sellers[0]?.nombre) || "Vendedor";
  }
  const date = qs("quote-date");
  if (date && !date.value) date.value = today();
  const currency = qs("quote-currency");
  if (currency && !currency.value)
    currency.value = getConfig().businessRules?.defaultCurrency || "CLP";
  renderProductPicker(
    qs("quote-product-results"),
    qs("quote-product-search")?.value || "",
    addProduct,
  );
  renderLines();
}
