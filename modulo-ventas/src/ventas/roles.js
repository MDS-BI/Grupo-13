export const ROLES = Object.freeze({
  VENDEDOR: "vendedor",
  OPERACIONES: "operaciones",
  GERENTE: "gerente",
  DEVOLUCIONES: "devoluciones",
  JEFE_VENTAS: "jefe_ventas",
  FACTURACION: "facturacion",
  AUDITOR: "auditor",
});

export const ROLE_LABELS = Object.freeze({
  vendedor: "Ejecutivo Comercial",
  operaciones: "Encargado de operaciones y logística",
  gerente: "Gerente",
  devoluciones: "Postventa",
  jefe_ventas: "Jefe de Ventas",
  facturacion: "Encargado de facturación",
  auditor: "Auditor (Solo lectura)",
});

export const ALL_ROLES = Object.freeze(Object.values(ROLES));

export const PERMISSIONS = Object.freeze({
  crear_cliente: Object.freeze([ROLES.VENDEDOR, ROLES.JEFE_VENTAS]),
  editar_cliente: Object.freeze([ROLES.VENDEDOR, ROLES.JEFE_VENTAS]),
  gestionar_clientes: Object.freeze([ROLES.VENDEDOR, ROLES.JEFE_VENTAS]),
  crear_documento: Object.freeze([ROLES.VENDEDOR, ROLES.JEFE_VENTAS]),
  editar_documento: Object.freeze([ROLES.VENDEDOR, ROLES.JEFE_VENTAS]),
  gestionar_documentos: Object.freeze([ROLES.VENDEDOR, ROLES.JEFE_VENTAS]),
  crear_cotizacion: Object.freeze([ROLES.VENDEDOR, ROLES.JEFE_VENTAS]),
  editar_cotizacion: Object.freeze([ROLES.VENDEDOR, ROLES.JEFE_VENTAS]),
  aprobar_cotizacion: Object.freeze([ROLES.JEFE_VENTAS]),
  crear_orden: Object.freeze([ROLES.VENDEDOR, ROLES.JEFE_VENTAS]),
  editar_orden: Object.freeze([ROLES.VENDEDOR, ROLES.JEFE_VENTAS]),
  gestionar_orden: Object.freeze([ROLES.VENDEDOR, ROLES.JEFE_VENTAS]),
  gestionar_precios: Object.freeze([ROLES.JEFE_VENTAS]),
  aprobar_devolucion: Object.freeze([ROLES.JEFE_VENTAS]),
  gestionar_devoluciones: Object.freeze([ROLES.DEVOLUCIONES, ROLES.JEFE_VENTAS]),
  ver_panel: Object.freeze([
    ROLES.VENDEDOR,
    ROLES.GERENTE,
    ROLES.DEVOLUCIONES,
    ROLES.JEFE_VENTAS,
    ROLES.AUDITOR,
  ]),
  ver_datos_sensibles: Object.freeze([ROLES.JEFE_VENTAS]),
  ver_montos_financieros: Object.freeze([
    ROLES.VENDEDOR,
    ROLES.GERENTE,
    ROLES.JEFE_VENTAS,
    ROLES.FACTURACION,
  ]),
  ver_pedidos: Object.freeze([
    ROLES.VENDEDOR,
    ROLES.OPERACIONES,
    ROLES.GERENTE,
    ROLES.DEVOLUCIONES,
    ROLES.JEFE_VENTAS,
    ROLES.FACTURACION,
  ]),
  ver_cotizaciones: Object.freeze([ROLES.VENDEDOR, ROLES.GERENTE, ROLES.JEFE_VENTAS]),
  ver_productos: Object.freeze([ROLES.VENDEDOR, ROLES.JEFE_VENTAS]),
  ver_clientes: Object.freeze([ROLES.VENDEDOR, ROLES.GERENTE, ROLES.JEFE_VENTAS]),
  ver_documentos_clientes: Object.freeze([ROLES.VENDEDOR, ROLES.GERENTE, ROLES.JEFE_VENTAS]),
  ver_agregar: Object.freeze([
    ROLES.VENDEDOR,
    ROLES.DEVOLUCIONES,
    ROLES.JEFE_VENTAS,
    ROLES.AUDITOR,
  ]),
  ver_entregas: Object.freeze([ROLES.VENDEDOR, ROLES.OPERACIONES, ROLES.JEFE_VENTAS]),
  ver_devoluciones: Object.freeze([ROLES.VENDEDOR, ROLES.DEVOLUCIONES, ROLES.JEFE_VENTAS]),
  ver_facturacion: Object.freeze([ROLES.FACTURACION, ROLES.JEFE_VENTAS]),
  ver_busqueda: Object.freeze([ROLES.VENDEDOR, ROLES.GERENTE, ROLES.JEFE_VENTAS]),
  facturar: Object.freeze([ROLES.FACTURACION, ROLES.JEFE_VENTAS]),
  entregar: Object.freeze([ROLES.OPERACIONES, ROLES.JEFE_VENTAS]),
  devolver: Object.freeze([ROLES.DEVOLUCIONES, ROLES.JEFE_VENTAS]),
  ver_resumen: Object.freeze([
    ROLES.VENDEDOR,
    ROLES.GERENTE,
    ROLES.DEVOLUCIONES,
    ROLES.JEFE_VENTAS,
    ROLES.AUDITOR,
  ]),
  ver_historial: Object.freeze([ROLES.JEFE_VENTAS]),
  registrar_pago: Object.freeze([ROLES.FACTURACION, ROLES.JEFE_VENTAS]),
});

const ALIASES = Object.freeze({
  create_quote: "crear_cotizacion",
  crearCotizacion: "crear_cotizacion",
  edit_quote: "editar_cotizacion",
  editarCotizacion: "editar_cotizacion",
  approve_quote: "aprobar_cotizacion",
  aprobarCotizacion: "aprobar_cotizacion",
  create_order: "crear_orden",
  crearOrden: "crear_orden",
  edit_order: "editar_orden",
  editarOrden: "editar_orden",
  view_orders: "ver_pedidos",
  verPedidos: "ver_pedidos",
  invoice: "facturar",
  facturacion: "facturar",
  deliver: "entregar",
  entrega: "entregar",
  return: "devolver",
  devolucion: "devolver",
  summary: "ver_resumen",
  resumen: "ver_resumen",
  history: "ver_historial",
  historial: "ver_historial",
  payment: "registrar_pago",
  pago: "registrar_pago",
});

export const ROLE_STORAGE_KEY = "erp_ventas:current_role";

export function normalizeRole(role) {
  const value = String(role || "")
    .trim()
    .toLowerCase();
  if (ALL_ROLES.includes(value)) return value;
  return null;
}

export function getCurrentRole() {
  try {
    const stored = globalThis.localStorage?.getItem(ROLE_STORAGE_KEY);
    return normalizeRole(stored) || ROLES.VENDEDOR;
  } catch {
    return ROLES.VENDEDOR;
  }
}

export function setCurrentRole(role) {
  const normalized = normalizeRole(role);
  if (!normalized) {
    throw new Error(`Rol inválido. Roles permitidos: ${ALL_ROLES.join(", ")}`);
  }
  globalThis.localStorage?.setItem(ROLE_STORAGE_KEY, normalized);
  return normalized;
}

export function clearCurrentRole() {
  globalThis.localStorage?.removeItem(ROLE_STORAGE_KEY);
}

export function normalizePermission(permission) {
  const key = String(permission || "").trim();
  return ALIASES[key] || key;
}

export function can(permission, role = getCurrentRole()) {
  const key = normalizePermission(permission);
  const allowed = PERMISSIONS[key];
  if (!allowed) return false;
  return allowed.includes(normalizeRole(role));
}

export function canAny(permissions, role = getCurrentRole()) {
  return (permissions || []).some((permission) => can(permission, role));
}

export function assertCan(permission, role = getCurrentRole()) {
  if (!can(permission, role)) {
    const label = ROLE_LABELS[normalizeRole(role)] || "sin rol";
    throw new Error(
      `El rol "${label}" no tiene permiso para ${normalizePermission(permission).replaceAll("_", " ")}`,
    );
  }
  return true;
}

export function permissionsFor(role = getCurrentRole()) {
  return Object.keys(PERMISSIONS).filter((permission) => can(permission, role));
}
