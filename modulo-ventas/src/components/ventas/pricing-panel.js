import {
  createListaPrecio,
  createPrecioProducto,
  listListasPrecio,
  listPreciosProducto,
  listProductos,
  updateListaPrecio,
  updatePrecioProducto,
} from "../../ventas/catalog.js";
import { can } from "../../ventas/roles.js";
import { runWithBusy } from "./loading-feedback.js";

let wired = false;

function qs(id) {
  return document.getElementById(id);
}

function option(value, label) {
  const element = document.createElement("option");
  element.value = value;
  element.textContent = label;
  return element;
}

function fillSelect(select, emptyLabel, items, getValue, getLabel, selectedValue) {
  if (!select) return;
  select.innerHTML = "";
  select.appendChild(option("", emptyLabel));
  for (const item of items) select.appendChild(option(getValue(item), getLabel(item)));
  if (selectedValue && [...select.options].some((item) => item.value === selectedValue))
    select.value = selectedValue;
}

function populateSelectors() {
  const lists = listListasPrecio();
  const products = listProductos();
  const prices = listPreciosProducto();
  fillSelect(
    qs("price-list-edit-select"),
    "-- Crear una lista nueva --",
    lists,
    (item) => item.id,
    (item) => `${item.codigo} · ${item.nombre}`,
    qs("price-list-edit-select")?.value,
  );
  fillSelect(
    qs("price-item-list"),
    "-- Selecciona una lista --",
    lists,
    (item) => item.id,
    (item) => `${item.codigo} · ${item.nombre}`,
    qs("price-item-list")?.value,
  );
  fillSelect(
    qs("price-item-product"),
    "-- Selecciona un producto --",
    products,
    (item) => item.id,
    (item) => `${item.sku} · ${item.nombre}`,
    qs("price-item-product")?.value,
  );
  fillSelect(
    qs("price-record-edit-select"),
    "-- Crear un precio nuevo --",
    prices,
    (item) => item.id,
    (item) => {
      const list = lists.find((entry) => entry.id === item.listaId);
      const product = products.find((entry) => entry.id === item.productoId);
      return `${list?.codigo || "Lista"} · ${product?.sku || "Producto"} · ${item.vigenteDesde}`;
    },
    qs("price-record-edit-select")?.value,
  );
}

function renderPriceTable() {
  const body = qs("price-management-body");
  if (!body) return;
  const lists = new Map(listListasPrecio().map((item) => [item.id, item]));
  const products = new Map(listProductos().map((item) => [item.id, item]));
  body.innerHTML = "";
  for (const price of listPreciosProducto()) {
    const row = document.createElement("tr");
    const values = [
      lists.get(price.listaId)?.nombre || "Lista no disponible",
      products.get(price.productoId)?.nombre || "Producto no disponible",
      `${Number(price.precio).toLocaleString("es-CL")} ${price.moneda}`,
      `${price.vigenteDesde}${price.vigenteHasta ? ` – ${price.vigenteHasta}` : ""}`,
    ];
    for (const value of values) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    }
    const actionCell = document.createElement("td");
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "row-action";
    edit.textContent = "Editar";
    edit.dataset.priceEditId = price.id;
    edit.dataset.permission = "gestionar_precios";
    edit.disabled = !can("gestionar_precios");
    if (edit.disabled) edit.title = "Solo el Jefe de Ventas puede editar precios.";
    actionCell.appendChild(edit);
    row.appendChild(actionCell);
    body.appendChild(row);
  }
  const empty = qs("price-management-empty");
  if (empty) empty.hidden = listPreciosProducto().length > 0;
}

function setCurrencyFromList() {
  const priceList = listListasPrecio().find((item) => item.id === qs("price-item-list")?.value);
  const currency = qs("price-item-currency");
  if (currency) currency.value = priceList?.moneda || "";
}

function loadList(id) {
  const list = listListasPrecio().find((item) => item.id === id);
  const form = qs("price-list-form");
  if (!form) return;
  form.reset();
  if (!list) {
    qs("price-list-id").value = "";
    return;
  }
  qs("price-list-id").value = list.id;
  qs("price-list-code").value = list.codigo;
  qs("price-list-name").value = list.nombre;
  qs("price-list-currency").value = list.moneda;
  qs("price-list-start").value = list.vigenteDesde;
  qs("price-list-end").value = list.vigenteHasta || "";
  qs("price-list-active").checked = list.activa !== false;
  qs("price-list-save").textContent = "Guardar cambios";
}

function clearListForm() {
  qs("price-list-form")?.reset();
  if (qs("price-list-id")) qs("price-list-id").value = "";
  if (qs("price-list-save")) qs("price-list-save").textContent = "Crear lista";
  if (qs("price-list-feedback")) qs("price-list-feedback").textContent = "";
  if (qs("price-list-edit-select")) qs("price-list-edit-select").value = "";
}

function loadPrice(id) {
  const price = listPreciosProducto().find((item) => item.id === id);
  const form = qs("price-item-form");
  if (!form) return;
  form.reset();
  if (!price) {
    qs("price-item-id").value = "";
    setCurrencyFromList();
    return;
  }
  qs("price-item-id").value = price.id;
  qs("price-item-list").value = price.listaId;
  qs("price-item-product").value = price.productoId;
  qs("price-item-amount").value = String(price.precio);
  qs("price-item-currency").value = price.moneda;
  qs("price-item-start").value = price.vigenteDesde;
  qs("price-item-end").value = price.vigenteHasta || "";
  qs("price-item-save").textContent = "Guardar cambios";
}

function clearPriceForm() {
  qs("price-item-form")?.reset();
  if (qs("price-item-id")) qs("price-item-id").value = "";
  if (qs("price-item-save")) qs("price-item-save").textContent = "Agregar precio";
  if (qs("price-item-feedback")) qs("price-item-feedback").textContent = "";
  if (qs("price-record-edit-select")) qs("price-record-edit-select").value = "";
  setCurrencyFromList();
}

function handleListSubmit(event) {
  event.preventDefault();
  runWithBusy(qs("price-list-save"), () => {
    const feedback = qs("price-list-feedback");
    if (!can("gestionar_precios")) {
      if (feedback)
        feedback.textContent = "Solo el Jefe de Ventas puede crear o editar listas de precios.";
      return;
    }
    const id = qs("price-list-id").value;
    const payload = {
      codigo: qs("price-list-code").value,
      nombre: qs("price-list-name").value,
      moneda: qs("price-list-currency").value,
      vigenteDesde: qs("price-list-start").value,
      vigenteHasta: qs("price-list-end").value,
      activa: qs("price-list-active").checked,
    };
    try {
      const list = id ? updateListaPrecio(id, payload) : createListaPrecio(payload);
      clearListForm();
      if (feedback) feedback.textContent = `Lista ${list.codigo} guardada.`;
      populateSelectors();
      renderPriceTable();
    } catch (error) {
      if (feedback) feedback.textContent = error.message;
    }
  });
}

function handlePriceSubmit(event) {
  event.preventDefault();
  runWithBusy(qs("price-item-save"), () => {
    const feedback = qs("price-item-feedback");
    if (!can("gestionar_precios")) {
      if (feedback) feedback.textContent = "Solo el Jefe de Ventas puede crear o editar precios.";
      return;
    }
    const id = qs("price-item-id").value;
    const payload = {
      listaId: qs("price-item-list").value,
      productoId: qs("price-item-product").value,
      precio: Number(qs("price-item-amount").value),
      moneda: qs("price-item-currency").value,
      vigenteDesde: qs("price-item-start").value,
      vigenteHasta: qs("price-item-end").value,
    };
    try {
      const price = id ? updatePrecioProducto(id, payload) : createPrecioProducto(payload);
      clearPriceForm();
      if (feedback) feedback.textContent = `Precio guardado desde ${price.vigenteDesde}.`;
      populateSelectors();
      renderPriceTable();
    } catch (error) {
      if (feedback) feedback.textContent = error.message;
    }
  });
}

export function initPricingPanel() {
  if (wired) return;
  wired = true;
  qs("price-list-edit-select")?.addEventListener("change", (event) => loadList(event.target.value));
  qs("price-list-form")?.addEventListener("submit", handleListSubmit);
  qs("price-list-reset")?.addEventListener("click", clearListForm);
  qs("price-record-edit-select")?.addEventListener("change", (event) =>
    loadPrice(event.target.value),
  );
  qs("price-item-list")?.addEventListener("change", setCurrencyFromList);
  qs("price-item-form")?.addEventListener("submit", handlePriceSubmit);
  qs("price-item-reset")?.addEventListener("click", clearPriceForm);
  qs("price-management-body")?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-price-edit-id]");
    if (!button || !can("gestionar_precios")) return;
    const selector = qs("price-record-edit-select");
    if (selector) selector.value = button.dataset.priceEditId;
    loadPrice(button.dataset.priceEditId);
  });
}

export function renderPricingPanel() {
  populateSelectors();
  renderPriceTable();
  setCurrencyFromList();
}
