export const ROLES = Object.freeze({
  VENDEDOR: 'vendedor',
  OPERACIONES: 'operaciones',
  GERENTE: 'gerente',
  DEVOLUCIONES: 'devoluciones',
  JEFE_VENTAS: 'jefe_ventas',
  FACTURACION: 'facturacion'
});

export const ROLE_LABELS = Object.freeze({
  vendedor: 'Vendedor',
  operaciones: 'Encargado de operaciones y logística',
  gerente: 'Gerente',
  devoluciones: 'Encargado de devoluciones',
  jefe_ventas: 'Jefe de ventas',
  facturacion: 'Encargado de facturación'
});

export const ALL_ROLES = Object.freeze(Object.values(ROLES));

export const PERMISSIONS = Object.freeze({
  crear_orden: Object.freeze([ROLES.VENDEDOR]),
  editar_orden: Object.freeze([ROLES.VENDEDOR]),
  ver_pedidos: Object.freeze(ALL_ROLES),
  facturar: Object.freeze([ROLES.FACTURACION]),
  entregar: Object.freeze([ROLES.OPERACIONES]),
  devolver: Object.freeze([ROLES.DEVOLUCIONES]),
  ver_resumen: Object.freeze([ROLES.GERENTE]),
  ver_historial: Object.freeze([ROLES.JEFE_VENTAS]),
  registrar_pago: Object.freeze([ROLES.FACTURACION])
});

const ALIASES = Object.freeze({
  create_order: 'crear_orden',
  crearOrden: 'crear_orden',
  edit_order: 'editar_orden',
  editarOrden: 'editar_orden',
  view_orders: 'ver_pedidos',
  verPedidos: 'ver_pedidos',
  invoice: 'facturar',
  facturacion: 'facturar',
  deliver: 'entregar',
  entrega: 'entregar',
  return: 'devolver',
  devolucion: 'devolver',
  summary: 'ver_resumen',
  resumen: 'ver_resumen',
  history: 'ver_historial',
  historial: 'ver_historial',
  payment: 'registrar_pago',
  pago: 'registrar_pago'
});

const ROLE_STORAGE_KEY = 'erp_ventas:current_role';

export function normalizeRole(role){
  const value = String(role || '').trim().toLowerCase();
  if(ALL_ROLES.includes(value)) return value;
  return null;
}

export function getCurrentRole(){
  try{
    const stored = globalThis.localStorage?.getItem(ROLE_STORAGE_KEY);
    return normalizeRole(stored) || ROLES.VENDEDOR;
  }catch(e){
    return ROLES.VENDEDOR;
  }
}

export function setCurrentRole(role){
  const normalized = normalizeRole(role);
  if(!normalized){
    throw new Error(`Rol inválido. Roles permitidos: ${ALL_ROLES.join(', ')}`);
  }
  globalThis.localStorage?.setItem(ROLE_STORAGE_KEY, normalized);
  return normalized;
}

export function clearCurrentRole(){
  globalThis.localStorage?.removeItem(ROLE_STORAGE_KEY);
}

export function normalizePermission(permission){
  const key = String(permission || '').trim();
  return ALIASES[key] || key;
}

export function can(permission, role = getCurrentRole()){
  const key = normalizePermission(permission);
  const allowed = PERMISSIONS[key];
  if(!allowed) return false;
  return allowed.includes(normalizeRole(role));
}

export function canAny(permissions, role = getCurrentRole()){
  return (permissions || []).some(permission => can(permission, role));
}

export function assertCan(permission, role = getCurrentRole()){
  if(!can(permission, role)){
    const label = ROLE_LABELS[normalizeRole(role)] || 'sin rol';
    throw new Error(`El rol "${label}" no tiene permiso para ${normalizePermission(permission).replaceAll('_', ' ')}`);
  }
  return true;
}

export function permissionsFor(role = getCurrentRole()){
  return Object.keys(PERMISSIONS).filter(permission => can(permission, role));
}
