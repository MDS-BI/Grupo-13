import { can, getCurrentRole, ROLE_LABELS } from "../ventas/roles.js";

const TASKS = [
  { id: "role-task-orders", permission: "gestionar_orden" },
  { id: "role-task-create-order", permission: "crear_orden" },
  { id: "role-task-edit-order", permission: "editar_orden" },
  { id: "role-task-create-quote", permission: "crear_cotizacion" },
  { id: "role-task-prices", permission: "gestionar_precios" },
  { id: "role-task-approve-quote", permission: "aprobar_cotizacion" },
  { id: "role-task-invoices", permission: "facturar" },
  { id: "role-task-payments", permission: "registrar_pago" },
  { id: "role-task-delivery", permission: "entregar" },
  { id: "role-task-returns", permission: "devolver" },
  { id: "role-task-approve-returns", permission: "aprobar_devolucion" },
  { id: "role-task-summary", permission: "ver_resumen" },
  { id: "role-task-history", permission: "ver_historial" },
];

const ROLE_SUMMARIES = {
  jefe_ventas: "Acceso completo a datos, costos, márgenes y acciones comerciales.",
  vendedor: "Datos comerciales y clientes visibles; costos internos y márgenes reservados.",
  devoluciones: "Información operativa de órdenes despachadas y devoluciones RMA, sin montos.",
  auditor: "Solo métricas agregadas y reportes; acciones en modo de solo lectura.",
};

function qs(id) {
  return document.getElementById(id);
}

export function renderRoleContext() {
  const role = getCurrentRole();
  const roleLabel = ROLE_LABELS[role] || role;
  const badge = qs("role-badge");
  const badgeLabel = qs("role-badge-label");
  const title = qs("role-context-title");
  const summary = qs("role-context-summary");
  const count = qs("role-context-count");

  if (badge) {
    badge.dataset.role = role;
    badge.setAttribute("aria-label", `Rol activo: ${roleLabel}`);
  }
  if (badgeLabel) badgeLabel.textContent = roleLabel;
  if (title) title.textContent = roleLabel;
  if (summary)
    summary.textContent =
      ROLE_SUMMARIES[role] || `Acciones disponibles para ${roleLabel.toLowerCase()}.`;

  let available = 0;
  for (const task of TASKS) {
    const allowed = can(task.permission, role);
    const item = qs(task.id);
    if (item) item.hidden = !allowed;
    if (allowed) available += 1;
  }

  if (count) count.textContent = `${available} ${available === 1 ? "acceso" : "accesos"}`;
}
