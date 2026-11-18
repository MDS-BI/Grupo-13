import { loadModuleConfig, normalizeConfig, setActiveConfig, labelFor } from "./module-config.js";
import {
  loadEntities,
  addEntity,
  updateEntity,
  deleteEntity,
  validateEntity,
  searchEntities,
  loadDocuments,
  addDocument,
  updateDocument,
  deleteDocument,
  validateDocument,
} from "./storage.js";
import {
  clearEntityForm,
  startEntityEdit,
  collectEntityPayload,
  showEntityErrors,
} from "./components/entity-form.js";
import { createEntityItem } from "./components/entity-list.js";
import {
  clearDocumentForm,
  startDocumentEdit,
  collectDocumentPayload,
  showDocumentErrors,
} from "./components/document-form.js";
import { folioLabel } from "./components/document-list.js";
import { renderLogo, applyShellLabels, setActiveModule } from "./components/shell.js";
import { renderDashboard } from "./components/dashboard.js";
import { setupSearchBar, renderSearchResults } from "./components/search-bar.js";
import {
  initOrderForm,
  refreshOrderForm,
  loadOrderIntoForm,
  resetOrderForm,
} from "./components/ventas/order-form.js";
import { listOrders, canEditOrder, assertClienteEliminable } from "./ventas/orders.js";
import { listProductos } from "./ventas/catalog.js";
import { initDeliveryPanel, renderDeliveryPanel } from "./components/ventas/delivery-panel.js";
import { renderSummaryView } from "./components/ventas/summary-view.js";
import { initReturnsPanel, renderReturnsPanel } from "./components/ventas/returns-panel.js";
import { initClientHistory, renderClientHistory } from "./components/ventas/client-history.js";
import { initInvoicePanel, renderInvoicePanel } from "./components/ventas/invoice-panel.js";
import { initQuotesPanel, renderQuotesPanel } from "./components/ventas/quotes-panel.js";
import { initProductsPanel, renderProductsPanel } from "./components/ventas/products-panel.js";
import { ALL_ROLES, ROLE_LABELS, getCurrentRole, setCurrentRole } from "./ventas/roles.js";
import { seedMockData } from "./ventas/mock-data.js";
import { listDeliverableOrders } from "./ventas/delivery.js";
import { listQuotes } from "./ventas/quotes.js";
import { listInvoices } from "./ventas/invoices.js";
import { listReturns } from "./ventas/returns.js";

function qs(id) {
  return document.getElementById(id);
}

// Ayudantes de género gramatical para etiquetas configurables en español.
// El género se deduce de la primera palabra (p. ej., "Pedido de Venta" → masculino)
// usando terminaciones femeninas comunes (-a, -dad, -ción, ...).
const palabraClave = (word) => String(word).trim().split(/\s+/)[0] || "";
const esFemenina = (word) => /(a|dad|tad|ción|sión|tud|umbre|ie)$/i.test(palabraClave(word));
const articulo = (word) => (esFemenina(word) ? "la" : "el");
const demostrativo = (word) => (esFemenina(word) ? "esta" : "este");
const seleccionada = (word) => (esFemenina(word) ? "seleccionada" : "seleccionado");

const MODULES = [
  "dashboard",
  "entities",
  "documents",
  "search",
  "sales-order",
  "quotes",
  "products",
  "delivery",
  "summary",
  "returns",
  "history",
  "invoices",
];
const VIEWS = {
  dashboard: "view-dashboard",
  entities: "view-entities",
  documents: "view-documents",
  search: "view-search",
  "sales-order": "view-sales-order",
  quotes: "view-quotes",
  products: "view-products",
  delivery: "view-delivery",
  summary: "view-summary",
  returns: "view-returns",
  history: "view-history",
  invoices: "view-invoices",
};

const VIEW_TITLES = {
  dashboard: "Panel general",
  entities: "Entidades",
  documents: "Documentos",
  search: "Búsqueda",
  "sales-order": "Pedido de venta",
  quotes: "Cotizaciones",
  products: "Productos",
  delivery: "Despacho",
  summary: "Resumen",
  returns: "Devoluciones",
  history: "Historial de clientes",
  invoices: "Facturación",
};

let wired = false;
let currentModule = "dashboard";

function updateBreadcrumb(name) {
  const moduleLabel = qs("breadcrumb-module");
  const currentLabel = qs("breadcrumb-current");
  const back = qs("breadcrumb-back");
  if (moduleLabel) moduleLabel.textContent = "Ventas";
  if (currentLabel) currentLabel.textContent = VIEW_TITLES[name] || "Panel general";
  if (back) {
    const isDashboard = name === "dashboard";
    back.hidden = isDashboard;
    back.setAttribute("aria-disabled", String(isDashboard));
  }
}

function refreshNavCounts() {
  const counts = {
    "nav-sales-order": listOrders().length,
    "nav-quotes": listQuotes().length,
    "nav-products": listProductos().length,
    "nav-delivery": listDeliverableOrders().length,
    "nav-summary": listInvoices().length,
    "nav-returns": listReturns().length,
    "nav-history": loadEntities().length,
    "nav-invoices": listInvoices().length,
  };
  Object.entries(counts).forEach(([id, value]) => {
    const badge = qs(id)?.querySelector(".nav-count");
    if (badge) badge.textContent = String(value);
  });
}

function updateDemoStatus() {
  const status = qs("demo-status");
  if (!status) return;
  const hasData =
    loadEntities().length > 0 ||
    listOrders().length > 0 ||
    listQuotes().length > 0 ||
    listInvoices().length > 0 ||
    listReturns().length > 0;
  status.textContent = hasData
    ? "Datos de ejemplo disponibles en el módulo."
    : "Sin datos de ejemplo. Cárgalos para explorar los flujos.";
  status.dataset.loaded = String(hasData);
  status.closest(".demo-card")?.setAttribute("data-loaded", String(hasData));
}

function animateView(name) {
  document
    .querySelectorAll(".view-panel")
    .forEach((panel) => panel.classList.remove("is-entering"));
  const active = qs(VIEWS[name]);
  if (!active) return;
  active.classList.remove("is-entering");
  void active.offsetWidth;
  active.classList.add("is-entering");
}

function showModule(name, opts = {}) {
  if (!MODULES.includes(name)) name = "dashboard";
  currentModule = name;
  MODULES.forEach((m) => {
    const view = qs(VIEWS[m]);
    if (view) view.hidden = m !== name;
  });
  setActiveModule(name);
  if (name === "dashboard") {
    renderDashboard();
  }
  if (name === "entities") {
    populateDocumentEntitySelect();
    populateEditEntitySelect();
    if (opts.newRecord) clearEntityForm();
    if (opts.focusForm) qs("name").focus();
  }
  if (name === "documents") {
    populateDocumentEntitySelect();
    populateEditDocumentSelect();
    if (opts.newRecord) clearDocumentForm();
    if (opts.focusForm) qs("document-entity").focus();
  }
  if (name === "search") {
    refreshSearch();
    if (opts.focusSearch) qs("search-input").focus();
  }
  if (name === "sales-order") {
    refreshOrderForm();
    populateOrderEditSelect();
  }
  if (name === "quotes") renderQuotesPanel();
  if (name === "products") renderProductsPanel();
  if (name === "delivery") renderDeliveryPanel();
  if (name === "summary") renderSummaryView();
  if (name === "returns") renderReturnsPanel();
  if (name === "history") renderClientHistory();
  if (name === "invoices") renderInvoicePanel();
  updateBreadcrumb(name);
  refreshNavCounts();
  updateDemoStatus();
  animateView(name);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function populateDocumentEntitySelect() {
  const select = qs("document-entity");
  const prev = select.value;
  select.innerHTML = "";
  loadEntities().forEach((e) => {
    const opt = document.createElement("option");
    opt.value = e.entity_id;
    opt.textContent = e.name;
    select.appendChild(opt);
  });
  if (prev && [...select.options].some((o) => o.value === prev)) select.value = prev;
}

function populateEditEntitySelect() {
  const select = qs("edit-entity");
  const prev = select.value;
  select.innerHTML = "";
  const none = document.createElement("option");
  none.value = "";
  none.textContent = `-- Selecciona ${articulo(labelFor("entity"))} ${labelFor("entity").toLowerCase()} --`;
  select.appendChild(none);
  loadEntities().forEach((e) => {
    const opt = document.createElement("option");
    opt.value = e.id;
    opt.textContent = `${e.name} — ${e.code}`;
    select.appendChild(opt);
  });
  if (prev && [...select.options].some((o) => o.value === prev)) select.value = prev;
}

function populateEditDocumentSelect() {
  const select = qs("edit-document");
  const prev = select.value;
  select.innerHTML = "";
  const none = document.createElement("option");
  none.value = "";
  none.textContent = `-- Selecciona ${articulo(labelFor("document"))} ${labelFor("document").toLowerCase()} --`;
  select.appendChild(none);
  const entities = loadEntities();
  loadDocuments().forEach((d) => {
    const entity = entities.find((e) => e.entity_id === d.entity_id);
    const label = `${entity ? entity.name : "Entidad desconocida"} · ${folioLabel(d)} · ${d.startDate} → ${d.endDate}`;
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = label;
    select.appendChild(opt);
  });
  if (prev && [...select.options].some((o) => o.value === prev)) select.value = prev;
}

function refreshSearch() {
  renderSearchResults(
    qs("search-results-list"),
    qs("search-empty"),
    searchEntities(qs("search-input").value),
    (e) => createEntityItem(e),
  );
}

function populateOrderEditSelect() {
  const select = qs("order-edit-select");
  if (!select) return;
  const prev = select.value;
  select.innerHTML = "";
  const none = document.createElement("option");
  none.value = "";
  none.textContent = "-- Selecciona un pedido --";
  select.appendChild(none);
  for (const order of listOrders().filter((item) => canEditOrder(item))) {
    const opt = document.createElement("option");
    opt.value = order.id;
    opt.textContent = `${order.numero} · ${order.estado} · ${order.total.toLocaleString("es-CL")} ${order.moneda}`;
    select.appendChild(opt);
  }
  if (prev && [...select.options].some((opt) => opt.value === prev)) select.value = prev;
}

function onOrderEditChange() {
  const id = qs("order-edit-select").value;
  const error = qs("order-edit-error");
  if (error) error.textContent = "";
  if (!id) {
    resetOrderForm();
    return;
  }
  if (!loadOrderIntoForm(id) && error) {
    error.textContent = "El pedido no puede editarse en su estado actual.";
  }
}

function onEditEntityChange() {
  const id = qs("edit-entity").value;
  if (!id) {
    clearEntityForm();
    return;
  }
  const entity = loadEntities().find((e) => e.id === id);
  if (entity) startEntityEdit(entity);
}

function handleDeleteSelectedEntity() {
  const id = qs("edit-entity").value;
  if (!id) {
    qs("error-edit-entity").textContent =
      `Selecciona ${articulo(labelFor("entity"))} ${labelFor("entity").toLowerCase()} para eliminar.`;
    return;
  }
  const entity = loadEntities().find((item) => item.id === id);
  try {
    assertClienteEliminable(entity?.entity_id || id);
  } catch (error) {
    qs("error-edit-entity").textContent = error.message;
    return;
  }
  if (
    !confirm(
      `¿Eliminar ${demostrativo(labelFor("entity"))} ${labelFor("entity").toLowerCase()}? Sus ${labelFor("documents").toLowerCase()} también se eliminarán.`,
    )
  )
    return;
  deleteEntity(id);
  qs("error-edit-entity").textContent = "";
  clearEntityForm();
  populateDocumentEntitySelect();
  populateEditEntitySelect();
  populateEditDocumentSelect();
}

function onEditDocumentChange() {
  const id = qs("edit-document").value;
  if (!id) {
    clearDocumentForm();
    return;
  }
  const doc = loadDocuments().find((d) => d.id === id);
  if (doc) startDocumentEdit(doc);
}

function handleDeleteSelectedDocument() {
  const id = qs("edit-document").value;
  if (!id) {
    qs("error-edit-document").textContent =
      `Selecciona ${articulo(labelFor("document"))} ${labelFor("document").toLowerCase()} para eliminar.`;
    return;
  }
  if (
    !confirm(
      `¿Eliminar ${demostrativo(labelFor("document"))} ${labelFor("document").toLowerCase()}?`,
    )
  )
    return;
  deleteDocument(id);
  qs("error-edit-document").textContent = "";
  clearDocumentForm();
  populateEditDocumentSelect();
}

function afterSaveRefresh() {
  populateDocumentEntitySelect();
  populateEditEntitySelect();
  populateEditDocumentSelect();
}

function handleEntitySubmit(ev) {
  ev.preventDefault();
  const id = qs("entity-id").value;
  const payload = collectEntityPayload();
  const { valid, errors } = validateEntity(payload);
  showEntityErrors(errors);
  if (!valid) return;
  if (id) {
    try {
      updateEntity(id, payload);
      clearEntityForm();
    } catch (e) {
      alert(e.message);
    }
  } else {
    addEntity(payload);
    clearEntityForm();
  }
  afterSaveRefresh();
}

function handleDocumentSubmit(ev) {
  ev.preventDefault();
  const id = qs("document-id").value;
  const payload = collectDocumentPayload();
  const existing = id ? loadDocuments().find((d) => d.id === id) : undefined;
  const { valid, errors } = validateDocument(payload, existing ? existing.status : undefined);
  showDocumentErrors(errors);
  if (!valid) return;
  try {
    if (id) {
      updateDocument(id, payload);
    } else {
      addDocument(payload);
    }
    clearDocumentForm();
  } catch (e) {
    alert(e.message);
    showDocumentErrors({ status: e.message });
  }
  afterSaveRefresh();
}

function applyLabels(config) {
  const entity = config.labels.entity;
  const entities = config.labels.entities;
  const document_ = config.labels.document;
  const documents = config.labels.documents;
  const femEntity = esFemenina(entity);
  const femDocument = esFemenina(document_);

  document.title = config.moduleName;
  qs("brand-name").textContent = config.moduleName;
  applyShellLabels();

  qs("dashboard-heading").textContent = config.moduleName;
  qs("dashboard-subtitle").textContent =
    `Gestiona tus ${entities.toLowerCase()} y ${documents.toLowerCase()} en un solo lugar.`;
  qs("action-new-entity-title").textContent = `${femEntity ? "Nueva" : "Nuevo"} ${entity}`;
  qs("action-new-entity-sub").textContent = `Crear un registro de ${entity.toLowerCase()}`;
  qs("action-new-document-title").textContent = `${femDocument ? "Nueva" : "Nuevo"} ${document_}`;
  qs("action-new-document-sub").textContent = `Registrar un registro de ${document_.toLowerCase()}`;
  qs("action-open-entities-title").textContent = entities;
  qs("action-open-entities-sub").textContent = `Abrir la gestión de ${entities.toLowerCase()}`;
  qs("action-find-title").textContent = "Buscar registros";
  qs("action-find-sub").textContent = `Buscar ${entities.toLowerCase()}`;

  qs("entities-view-heading").textContent = entities;
  qs("documents-view-heading").textContent = documents;
  qs("entity-form-heading").textContent = `Agregar / Editar ${entity}`;
  qs("edit-entity-heading").textContent =
    `Editar o eliminar ${articulo(entity)} ${entity.toLowerCase()}`;
  qs("document-form-heading").textContent = `Agregar / Editar ${document_}`;
  qs("edit-document-heading").textContent =
    `Editar o eliminar ${articulo(document_)} ${document_.toLowerCase()}`;
  qs("search-view-heading").textContent = `Buscar ${entities}`;
  qs("search-heading").textContent = `Buscar ${articulo(entity)} ${entity.toLowerCase()}`;
  qs("search-input").placeholder = "Buscar por nombre, código, categoría...";
  qs("search-input").setAttribute("aria-label", `Buscar ${entities.toLowerCase()}`);
  qs("search-empty").textContent = "Sin coincidencias para tu búsqueda.";
  qs("delete-entity").textContent =
    `Eliminar ${articulo(entity)} ${entity.toLowerCase()} ${seleccionada(entity)}`;
  qs("delete-document").textContent =
    `Eliminar ${articulo(document_)} ${document_.toLowerCase()} ${seleccionada(document_)}`;

  const hideClientDelete = Boolean(config.features?.hideClientDelete);
  const deleteButton = qs("delete-entity");
  if (deleteButton) deleteButton.hidden = hideClientDelete;
  const deleteNote = qs("entity-delete-note");
  if (deleteNote) deleteNote.hidden = !hideClientDelete;
  const documentsNotice = qs("documents-lifecycle-notice");
  if (documentsNotice) {
    documentsNotice.hidden = !config.features?.documentsStockNotice;
    const noticeText = documentsNotice.querySelector("p");
    if (noticeText) {
      noticeText.innerHTML = `Los ${documents} se registran desde la vista dedicada <strong>${documents}</strong>, que valida el stock de cada producto y asigna el estado inicial «cotización».`;
    }
  }
}

function applyTheme(config) {
  const accent = config.theme.accentColor;
  document.documentElement.style.setProperty("--accent", accent);
  document.documentElement.style.setProperty(
    "--accent-dark",
    `color-mix(in srgb, ${accent} 78%, #0b1220)`,
  );
  document.documentElement.style.setProperty(
    "--accent-soft",
    `color-mix(in srgb, ${accent} 12%, transparent)`,
  );
}

function handleDemoReset() {
  const button = qs("demo-reset");
  const original = button?.textContent || "Recargar datos de ejemplo";
  seedMockData({ force: true });
  if (button) {
    button.textContent = "Datos de ejemplo listos";
    window.setTimeout(() => {
      button.textContent = original;
    }, 1800);
  }
  showModule(currentModule);
}

export function refreshActiveView() {
  showModule(currentModule);
}

function showConfigErrors(errors) {
  const banner = qs("config-errors");
  if (errors && errors.length > 0) {
    banner.textContent = `Problema de configuración del módulo: ${errors.join(" ")}`;
    banner.hidden = false;
  } else {
    banner.hidden = true;
    banner.textContent = "";
  }
}

function populateRoleSelect() {
  const select = qs("role-select");
  if (!select) return;
  select.innerHTML = "";
  for (const role of ALL_ROLES) {
    const opt = document.createElement("option");
    opt.value = role;
    opt.textContent = ROLE_LABELS[role] || role;
    select.appendChild(opt);
  }
  select.value = getCurrentRole();
}

function wireEvents() {
  if (wired) return;
  wired = true;
  document.querySelectorAll(".nav-module, .nav-ventas").forEach((btn) => {
    btn.addEventListener("click", () => showModule(btn.dataset.module));
  });
  const roleSelect = qs("role-select");
  if (roleSelect) {
    roleSelect.addEventListener("change", () => {
      setCurrentRole(roleSelect.value);
      showModule(currentModule);
    });
  }
  initOrderForm({
    onCreated: () => {
      renderSummaryView();
      populateOrderEditSelect();
    },
  });
  qs("order-edit-select").addEventListener("change", onOrderEditChange);
  initDeliveryPanel({ onDelivered: () => renderSummaryView() });
  initReturnsPanel({ onReturned: () => renderSummaryView() });
  initClientHistory();
  initInvoicePanel({ onInvoiced: () => renderSummaryView() });
  initQuotesPanel({
    onChanged: () => renderSummaryView(),
    onOrderCreated: (order) => {
      if (!order) return;
      showModule("sales-order");
      loadOrderIntoForm(order.id);
    },
  });
  initProductsPanel();
  const demoReset = qs("demo-reset");
  if (demoReset) demoReset.addEventListener("click", handleDemoReset);
  qs("demo-load")?.addEventListener("click", () => {
    seedMockData();
    updateDemoStatus();
    showModule(currentModule);
  });
  qs("breadcrumb-home")?.addEventListener("click", () => showModule("dashboard"));
  qs("breadcrumb-back")?.addEventListener("click", () => showModule("dashboard"));
  document.querySelectorAll("[data-goto]").forEach((button) => {
    button.addEventListener("click", () => showModule(button.dataset.goto));
  });
  qs("action-open-sales-order")?.addEventListener("click", () => showModule("sales-order"));
  qs("action-open-invoices")?.addEventListener("click", () => showModule("invoices"));
  qs("action-open-returns")?.addEventListener("click", () => showModule("returns"));
  qs("action-new-entity").addEventListener("click", () =>
    showModule("entities", { newRecord: true, focusForm: true }),
  );
  qs("action-new-document").addEventListener("click", () =>
    showModule("documents", { newRecord: true, focusForm: true }),
  );
  qs("action-open-entities").addEventListener("click", () => showModule("entities"));
  qs("action-find").addEventListener("click", () => showModule("search", { focusSearch: true }));
  qs("entity-form").addEventListener("submit", handleEntitySubmit);
  qs("cancel-edit").addEventListener("click", clearEntityForm);
  qs("document-form").addEventListener("submit", handleDocumentSubmit);
  qs("document-cancel-edit").addEventListener("click", clearDocumentForm);
  setupSearchBar(qs("search-input"), () => refreshSearch());
  qs("edit-entity").addEventListener("change", onEditEntityChange);
  qs("edit-document").addEventListener("change", onEditDocumentChange);
  qs("delete-entity").addEventListener("click", handleDeleteSelectedEntity);
  qs("delete-document").addEventListener("click", handleDeleteSelectedDocument);
}

export function initApp(resolved) {
  showConfigErrors(resolved.errors);
  setActiveConfig(resolved.config);
  applyTheme(resolved.config);
  renderLogo(qs("logo-mark"));
  applyLabels(resolved.config);
  populateRoleSelect();
  wireEvents();
  clearEntityForm();
  clearDocumentForm();
  showModule("dashboard");
}

export async function boot(overrideConfig) {
  const resolved =
    overrideConfig !== undefined ? normalizeConfig(overrideConfig) : await loadModuleConfig();
  initApp(resolved);
}
