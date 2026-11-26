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
import { renderRoleContext } from "./components/role-context.js";
import { renderDashboard } from "./components/dashboard.js";
import { setupSearchBar, renderSearchResults } from "./components/search-bar.js";
import {
  initOrderForm,
  refreshOrderForm,
  loadOrderIntoForm,
  resetOrderForm,
} from "./components/ventas/order-form.js";
import { listOrders, canEditOrder, assertClienteEliminable } from "./ventas/orders.js";
import { initDeliveryPanel, renderDeliveryPanel } from "./components/ventas/delivery-panel.js";
import { renderSummaryView } from "./components/ventas/summary-view.js";
import { initSalesAnalytics } from "./components/ventas/sales-analytics.js";
import { initReturnsPanel, renderReturnsPanel } from "./components/ventas/returns-panel.js";
import { initClientHistory, renderClientHistory } from "./components/ventas/client-history.js";
import { initInvoicePanel, renderInvoicePanel } from "./components/ventas/invoice-panel.js";
import { initQuotesPanel, renderQuotesPanel } from "./components/ventas/quotes-panel.js";
import { initProductsPanel, renderProductsPanel } from "./components/ventas/products-panel.js";
import { initQuoteForm, refreshQuoteForm } from "./components/ventas/quote-form.js";
import { initPricingPanel, renderPricingPanel } from "./components/ventas/pricing-panel.js";
import {
  ALL_ROLES,
  ROLE_LABELS,
  ROLES,
  can,
  canAny,
  getCurrentRole,
  setCurrentRole,
} from "./ventas/roles.js";
import { seedMockData } from "./ventas/mock-data.js";
import { listQuotes } from "./ventas/quotes.js";
import { listInvoices } from "./ventas/invoices.js";
import { listReturns } from "./ventas/returns.js";
import { renderSalesOrders } from "./components/ventas/orders-panel.js";
import {
  ensureFeedbackPattern,
  runWithBusy,
  showListLoading,
  hideListLoading,
} from "./components/ventas/loading-feedback.js";

function qs(id) {
  return document.getElementById(id);
}

function viewFeedback(module) {
  return qs(VIEWS[module])?.querySelector("[data-view-feedback]");
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
  "operations",
  "clients",
  "client-documents",
  "search",
  "sales-order",
  "quotes",
  "products",
  "delivery",
  "returns",
  "history",
  "invoices",
];
const VIEWS = {
  dashboard: "view-dashboard",
  operations: "view-operations",
  clients: "view-clients",
  "client-documents": "view-client-documents",
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
  dashboard: "Panel",
  operations: "Agregar",
  clients: "Clientes",
  "client-documents": "Documentos de clientes",
  search: "Búsqueda",
  "sales-order": "Órdenes de venta",
  quotes: "Cotizaciones",
  products: "Productos",
  delivery: "Despacho",
  returns: "Devoluciones",
  history: "Historial de clientes",
  invoices: "Facturación",
};

let wired = false;
let currentModule = "dashboard";
const VISUAL_MODULES = ["dashboard"];
const OPERATION_MODULES = [
  "operations",
  "clients",
  "client-documents",
  "search",
  "sales-order",
  "quotes",
  "products",
  "delivery",
  "returns",
  "history",
  "invoices",
];
const MODULE_ACCESS_PERMISSIONS = {
  dashboard: ["ver_panel"],
  operations: ["ver_agregar"],
  "sales-order": ["ver_pedidos"],
  quotes: ["ver_cotizaciones"],
  products: ["ver_productos"],
  delivery: ["ver_entregas"],
  returns: ["ver_devoluciones"],
  invoices: ["ver_facturacion"],
  clients: ["ver_clientes"],
  "client-documents": ["ver_documentos_clientes"],
  search: ["ver_busqueda"],
  history: ["ver_historial"],
};

function organizeWorkspace() {
  const visual = qs("visual-consultations");
  const operations = qs("operations-forms");
  const addPanels = {
    quote: qs("add-panel-quote"),
    order: qs("add-panel-order"),
    pricing: qs("add-panel-pricing"),
    return: qs("add-panel-return"),
    client: qs("add-panel-client"),
    document: qs("add-panel-document"),
  };
  const visualNav = document.querySelector(".side-nav:not(.sales-nav)");
  const operationsNav = document.querySelector(".sales-nav");
  if (!visual || !operations || !visualNav || !operationsNav) return;

  const summary = qs("view-summary");
  if (summary) visual.appendChild(summary);

  const addForms = {
    quote: qs("quote-create-panel"),
    order: [qs("order-edit-panel"), qs("order-create-panel")],
    pricing: qs("pricing-management-panel"),
    return: qs("return-create-panel"),
    client: qs("entity-create-panel"),
    document: qs("document-create-panel"),
  };
  for (const [tab, panel] of Object.entries(addForms)) {
    const target = addPanels[tab];
    if (!target) continue;
    for (const item of Array.isArray(panel) ? panel : [panel]) {
      if (item) target.appendChild(item);
    }
  }

  const demoCard = document.querySelector(".demo-card");
  if (demoCard) operations.appendChild(demoCard);
  for (const id of [
    "nav-operations",
    "nav-sales-order",
    "nav-quotes",
    "nav-products",
    "nav-delivery",
    "nav-returns",
    "nav-history",
    "nav-invoices",
    "nav-clients",
    "nav-client-documents",
    "nav-search",
  ]) {
    const button = qs(id);
    if (button) operationsNav.appendChild(button);
  }

  const initialTab = getCurrentRole() === ROLES.DEVOLUCIONES ? "return" : "quote";
  selectAddTab(initialTab);
}

function selectAddTab(name) {
  const tabs = [...document.querySelectorAll("[data-add-tab]")];
  const requested = tabs.find((tab) => tab.dataset.addTab === name);
  const fallback = tabs.find((tab) => can(tab.dataset.permission));
  const selected =
    requested && (can(requested.dataset.permission) || getCurrentRole() === ROLES.AUDITOR)
      ? requested
      : fallback || requested;
  for (const tab of tabs) {
    const active = tab === selected;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
    const panel = qs(`add-panel-${tab.dataset.addTab}`);
    if (panel) panel.hidden = !active;
  }
  return selected;
}

function applyPermissions() {
  document.querySelectorAll("[data-permission]").forEach((element) => {
    const permission = element.dataset.permission;
    const allowed = can(permission);
    if (allowed) delete element.dataset.permissionLocked;
    else element.dataset.permissionLocked = "true";
    if (allowed) element.removeAttribute("title");
    else element.title = "🔒 Bloqueado para este rol.";
    if (element.tagName === "FORM") {
      element.setAttribute("aria-disabled", String(!allowed));
      let notice = element.querySelector(".permission-notice");
      if (!allowed && !notice) {
        notice = document.createElement("p");
        notice.className = "permission-notice";
        notice.setAttribute("role", "status");
        notice.textContent = "🔒 Acción bloqueada para el rol activo.";
        element.prepend(notice);
      }
      if (notice) notice.hidden = allowed;
      element.querySelectorAll("input, select, textarea, button").forEach((control) => {
        control.disabled = !allowed;
      });
    } else if ("disabled" in element) {
      element.disabled = !allowed;
    }
  });
}

function applyReadPermissions() {
  document.querySelectorAll("[data-read-permission]").forEach((element) => {
    element.hidden = !can(element.dataset.readPermission);
  });
}

function applyDataVisibility() {
  const financialVisible = can("ver_montos_financieros");
  document.querySelectorAll("[data-financial-info]").forEach((element) => {
    element.hidden = !financialVisible;
  });
  document.querySelectorAll("[data-sensitive='boss-only']").forEach((element) => {
    element.hidden = !can("ver_datos_sensibles");
  });
  document.querySelectorAll("[data-aggregated-detail]").forEach((element) => {
    element.hidden = [ROLES.AUDITOR, ROLES.DEVOLUCIONES].includes(getCurrentRole());
  });
  document.querySelectorAll("[data-postventa-restricted]").forEach((element) => {
    element.hidden = getCurrentRole() === ROLES.DEVOLUCIONES;
  });
  const postventa = getCurrentRole() === ROLES.DEVOLUCIONES;
  const auditor = getCurrentRole() === ROLES.AUDITOR;
  const regularMetrics = qs("summary-standard-metrics");
  const postventaMetrics = qs("summary-postventa-metrics");
  if (regularMetrics) regularMetrics.hidden = postventa;
  if (postventaMetrics) postventaMetrics.hidden = !postventa;
  const baseMetrics = qs("dashboard-base-stats");
  if (baseMetrics) baseMetrics.hidden = postventa;
  const analytics = document.querySelector(".analytics-panel");
  if (analytics) analytics.hidden = postventa;
  const readOnlyNotice = qs("add-readonly-notice");
  if (readOnlyNotice) readOnlyNotice.hidden = !auditor;
  document.querySelectorAll("[data-add-tab]").forEach((tab) => {
    tab.hidden = postventa && !can(tab.dataset.permission);
  });
}

export function canAccessModule(name) {
  return canAny(MODULE_ACCESS_PERMISSIONS[name]);
}

function applyModuleAccess() {
  document.querySelectorAll(".nav-module, .nav-ventas").forEach((button) => {
    const accessible = canAccessModule(button.dataset.module);
    button.hidden = !accessible;
  });
  const shortcuts = {
    "action-open-add":
      canAccessModule("operations") &&
      [...document.querySelectorAll("[data-add-tab]")].some((tab) => can(tab.dataset.permission)),
    "action-find": canAccessModule("search"),
    "action-open-analytics": can("ver_resumen") && getCurrentRole() !== ROLES.DEVOLUCIONES,
  };
  for (const [id, visible] of Object.entries(shortcuts)) {
    qs(id).hidden = !visible;
  }
  qs("dashboard-shortcuts").hidden = !Object.values(shortcuts).some(Boolean);
  const demoCard = document.querySelector("#operations-forms .demo-card");
  if (demoCard) demoCard.hidden = !can("crear_cotizacion");
}

function updateBreadcrumb(name) {
  const moduleLabel = qs("breadcrumb-module");
  const currentLabel = qs("breadcrumb-current");
  const back = qs("breadcrumb-back");
  if (moduleLabel) moduleLabel.textContent = "Ventas";
  if (currentLabel) currentLabel.textContent = VIEW_TITLES[name] || "Panel";
  if (back) {
    const isDashboard = name === "dashboard";
    back.hidden = isDashboard;
    back.setAttribute("aria-disabled", String(isDashboard));
  }
}

function refreshNavCounts() {
  renderSalesOrders();
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

function showRouteNotice(message = "") {
  const notice = qs("route-notice");
  if (!notice) return;
  notice.textContent = message;
  notice.hidden = !message;
}

function refreshListView(id, task) {
  const view = qs(id);
  showListLoading(view, "Actualizando registros…");
  try {
    const result = task();
    if (result && typeof result.then === "function") {
      return result.finally(() => hideListLoading(view));
    }
    hideListLoading(view);
    return result;
  } catch (error) {
    hideListLoading(view);
    throw error;
  }
}

export function showModule(name, opts = {}) {
  let panelHeading;
  if (name === "summary") panelHeading = "summary-heading";
  if (name === "analysis") panelHeading = "analytics-heading";
  if (panelHeading) name = "dashboard";
  if (!MODULES.includes(name)) {
    showRouteNotice("Ruta no disponible; se muestra el Panel.");
    name = "dashboard";
  } else if (!canAccessModule(name)) {
    showRouteNotice(
      `Ruta no disponible para el rol ${ROLE_LABELS[getCurrentRole()] || getCurrentRole()}; se muestra el Panel.`,
    );
    name = "dashboard";
  } else {
    showRouteNotice();
  }
  currentModule = name;
  const visualActive = VISUAL_MODULES.includes(name);
  for (const [module, id] of Object.entries(VIEWS)) {
    if (module === "summary") continue;
    const view = qs(id);
    if (view) view.hidden = module !== name;
  }
  const summaryView = qs("view-summary");
  if (summaryView) summaryView.hidden = !visualActive || !can("ver_resumen");
  const visualContainer = qs("visual-consultations");
  if (visualContainer) visualContainer.hidden = !visualActive;
  setActiveModule(name);
  if (visualActive) {
    refreshListView("view-dashboard", () => {
      renderDashboard();
      renderSummaryView();
    });
  }
  if (name === "search") refreshListView("view-search", refreshSearch);
  if (name === "quotes") refreshListView("view-quotes", renderQuotesPanel);
  if (name === "products") refreshListView("view-products", renderProductsPanel);
  if (name === "history") refreshListView("view-history", renderClientHistory);
  if (name === "sales-order") refreshListView("view-sales-order", renderSalesOrders);
  if (OPERATION_MODULES.includes(name)) {
    refreshListView("view-operations", () => {
      populateDocumentEntitySelect();
      populateEditEntitySelect();
      populateEditDocumentSelect();
      refreshOrderForm();
      populateOrderEditSelect();
      refreshQuoteForm();
      renderDeliveryPanel();
      renderReturnsPanel();
      renderInvoicePanel();
      renderPricingPanel();
    });
    if (name === "clients" && opts.newRecord) clearEntityForm();
    if (name === "client-documents" && opts.newRecord) clearDocumentForm();
    if (opts.focusForm && name === "clients") qs("name")?.focus();
    if (opts.focusForm && name === "client-documents") qs("document-entity")?.focus();
  }
  if (name === "search" && opts.focusSearch) qs("search-input")?.focus();
  applyPermissions();
  applyReadPermissions();
  applyDataVisibility();
  applyModuleAccess();
  updateBreadcrumb(name);
  refreshNavCounts();
  updateDemoStatus();
  animateView(name);
  const heading = panelHeading && qs(panelHeading);
  if (heading && !heading.closest("[hidden]")) {
    heading.focus({ preventScroll: true });
    heading.scrollIntoView?.({ block: "start" });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
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
  if (entity) {
    startEntityEdit(entity);
    showModule("operations");
    selectAddTab("client");
  }
}

function handleDeleteSelectedEntity() {
  runWithBusy(
    qs("delete-entity"),
    () => {
      if (!can("gestionar_clientes")) {
        throw new Error("Tu rol no tiene permiso para gestionar clientes.");
      }
      const id = qs("edit-entity").value;
      if (!id) {
        throw new Error(
          `Selecciona ${articulo(labelFor("entity"))} ${labelFor("entity").toLowerCase()} para eliminar.`,
        );
      }
      const entity = loadEntities().find((item) => item.id === id);
      assertClienteEliminable(entity?.entity_id || id);
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
    },
    {
      feedback: viewFeedback("clients"),
      success: "Cliente eliminado.",
      error: "No se pudo eliminar el cliente.",
      recoveryLabel: "Reintentar",
    },
  );
}

function onEditDocumentChange() {
  const id = qs("edit-document").value;
  if (!id) {
    clearDocumentForm();
    return;
  }
  const doc = loadDocuments().find((d) => d.id === id);
  if (doc) {
    startDocumentEdit(doc);
    showModule("operations");
    selectAddTab("document");
  }
}

function handleDeleteSelectedDocument() {
  runWithBusy(
    qs("delete-document"),
    () => {
      if (!can("gestionar_documentos")) {
        throw new Error("Tu rol no tiene permiso para gestionar documentos.");
      }
      const id = qs("edit-document").value;
      if (!id) {
        throw new Error(
          `Selecciona ${articulo(labelFor("document"))} ${labelFor("document").toLowerCase()} para eliminar.`,
        );
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
    },
    {
      feedback: viewFeedback("client-documents"),
      success: "Documento de cliente eliminado.",
      error: "No se pudo eliminar el documento.",
      recoveryLabel: "Reintentar",
    },
  );
}

function afterSaveRefresh() {
  populateDocumentEntitySelect();
  populateEditEntitySelect();
  populateEditDocumentSelect();
}

function handleEntitySubmit(ev) {
  ev.preventDefault();
  runWithBusy(
    qs("submit-button"),
    () => {
      const id = qs("entity-id").value;
      if (!can(id ? "editar_cliente" : "crear_cliente")) {
        throw new Error("Tu rol no tiene permiso para gestionar clientes.");
      }
      const payload = collectEntityPayload();
      const { valid, errors } = validateEntity(payload);
      showEntityErrors(errors);
      if (!valid) return;
      if (id) updateEntity(id, payload);
      else addEntity(payload);
      clearEntityForm();
      afterSaveRefresh();
    },
    {
      feedback: viewFeedback("clients"),
      success: "Cliente guardado.",
      error: "No se pudo guardar el cliente.",
      recoveryLabel: "Reintentar",
    },
  );
}

function handleDocumentSubmit(ev) {
  ev.preventDefault();
  runWithBusy(
    qs("document-submit-button"),
    () => {
      const id = qs("document-id").value;
      if (!can(id ? "editar_documento" : "crear_documento")) {
        throw new Error("Tu rol no tiene permiso para gestionar documentos.");
      }
      const payload = collectDocumentPayload();
      const existing = id ? loadDocuments().find((d) => d.id === id) : undefined;
      const { valid, errors } = validateDocument(payload, existing ? existing.status : undefined);
      showDocumentErrors(errors);
      if (!valid) return;
      if (id) updateDocument(id, payload);
      else addDocument(payload);
      clearDocumentForm();
      afterSaveRefresh();
    },
    {
      feedback: viewFeedback("client-documents"),
      success: "Documento de cliente guardado.",
      error: "No se pudo guardar el documento.",
      recoveryLabel: "Reintentar",
    },
  );
}

function applyLabels(config) {
  const entity = config.labels.entity;
  const entities = config.labels.entities;
  const document_ = config.labels.document;
  const salesDocumentLabels = config.labels.documents.toLowerCase() === "pedidos de venta";
  const documentLabel = salesDocumentLabels ? "Documento de cliente" : document_;
  const documentsLabel = salesDocumentLabels ? "Documentos de clientes" : config.labels.documents;
  document.title = config.moduleName;
  qs("brand-name").textContent = config.moduleName;
  applyShellLabels();

  qs("dashboard-heading").textContent = "Panel";
  qs("add-tab-client").textContent = `Agregar ${entity}`;
  qs("add-tab-document").textContent = `Agregar ${documentLabel}`;
  qs("action-find-title").textContent = `Buscar ${entities.toLowerCase()}`;

  qs("clients-view-heading").textContent = entities;
  qs("client-documents-view-heading").textContent = documentsLabel;
  qs("entity-form-heading").textContent = `Agregar / Editar ${entity}`;
  qs("edit-entity-heading").textContent =
    `Editar o eliminar ${articulo(entity)} ${entity.toLowerCase()}`;
  qs("document-form-heading").textContent = `Agregar / Editar ${documentLabel}`;
  qs("edit-document-heading").textContent =
    `Editar o eliminar ${articulo(documentLabel)} ${documentLabel.toLowerCase()}`;
  qs("search-view-heading").textContent = `Buscar ${entities}`;
  qs("search-heading").textContent = `Buscar ${articulo(entity)} ${entity.toLowerCase()}`;
  qs("search-input").placeholder = "Buscar por nombre, código, categoría...";
  qs("search-input").setAttribute("aria-label", `Buscar ${entities.toLowerCase()}`);
  qs("search-empty").textContent = "Sin coincidencias para tu búsqueda.";
  qs("delete-entity").textContent =
    `Eliminar ${articulo(entity)} ${entity.toLowerCase()} ${seleccionada(entity)}`;
  qs("delete-document").textContent =
    `Eliminar ${articulo(documentLabel)} ${documentLabel.toLowerCase()} ${seleccionada(documentLabel)}`;

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
      noticeText.innerHTML =
        "Las órdenes de venta se registran en <strong>Agregar → Agregar Orden de Venta</strong>. El formulario valida el stock y asigna el estado inicial «cotización».";
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
  runWithBusy(
    qs("demo-reset"),
    () => {
      seedMockData({ force: true });
      showModule(currentModule);
    },
    {
      feedback: viewFeedback("dashboard"),
      success: "Datos de ejemplo recargados.",
      error: "No se pudieron recargar los datos de ejemplo.",
      recoveryLabel: "Reintentar",
    },
  );
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
  initSalesAnalytics();
  document.querySelectorAll(".nav-module, .nav-ventas").forEach((btn) => {
    btn.addEventListener("click", () => showModule(btn.dataset.module));
  });
  const roleSelect = qs("role-select");
  if (roleSelect) {
    roleSelect.addEventListener("change", () => {
      setCurrentRole(roleSelect.value);
      renderRoleContext();
      selectAddTab(getCurrentRole() === ROLES.DEVOLUCIONES ? "return" : "quote");
      showModule(currentModule);
    });
  }
  initOrderForm({
    onCreated: () => {
      renderSummaryView();
      populateOrderEditSelect();
      renderSalesOrders();
    },
  });
  initQuoteForm({
    onCreated: () => {
      renderQuotesPanel();
      renderSummaryView();
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
      showModule("operations");
      selectAddTab("order");
      loadOrderIntoForm(order.id);
    },
  });
  initProductsPanel();
  initPricingPanel();
  const demoReset = qs("demo-reset");
  if (demoReset) demoReset.addEventListener("click", handleDemoReset);
  qs("demo-load")?.addEventListener("click", () => {
    runWithBusy(
      qs("demo-load"),
      () => {
        seedMockData();
        updateDemoStatus();
        showModule(currentModule);
      },
      {
        feedback: viewFeedback("dashboard"),
        success: "Datos de ejemplo cargados.",
        error: "No se pudieron cargar los datos de ejemplo.",
        recoveryLabel: "Reintentar",
      },
    );
  });
  qs("breadcrumb-home")?.addEventListener("click", () => showModule("dashboard"));
  qs("breadcrumb-back")?.addEventListener("click", () => showModule("dashboard"));
  document.querySelectorAll("[data-goto]").forEach((button) => {
    button.addEventListener("click", () => showModule(button.dataset.goto));
  });
  document.querySelectorAll("[data-add-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      if (!tab.disabled) selectAddTab(tab.dataset.addTab);
    });
  });
  document.querySelectorAll("[data-add-target]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!canAccessModule("operations")) return;
      showModule("operations");
      selectAddTab(button.dataset.addTarget)?.focus();
    });
  });
  qs("sales-orders-body")?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-order-edit-id]");
    if (!button || button.disabled || !can("editar_orden")) return;
    showModule("operations");
    selectAddTab("order");
    loadOrderIntoForm(button.dataset.orderEditId);
  });
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
  organizeWorkspace();
  ensureFeedbackPattern();
  applyLabels(resolved.config);
  populateRoleSelect();
  renderRoleContext();
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
