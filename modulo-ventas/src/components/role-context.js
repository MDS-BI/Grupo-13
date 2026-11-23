import { can, getCurrentRole, ROLE_LABELS } from "../ventas/roles.js";

const TASKS = [
  { id: "role-task-orders", permission: "ver_pedidos" },
  { id: "role-task-create-order", permission: "crear_orden" },
  { id: "role-task-edit-order", permission: "editar_orden" },
  { id: "role-task-invoices", permission: "facturar" },
  { id: "role-task-payments", permission: "registrar_pago" },
  { id: "role-task-delivery", permission: "entregar" },
  { id: "role-task-returns", permission: "devolver" },
  { id: "role-task-summary", permission: "ver_resumen" },
  { id: "role-task-history", permission: "ver_historial" },
];

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
  if (summary) summary.textContent = `Acciones disponibles para ${roleLabel.toLowerCase()}.`;

  let available = 0;
  for (const task of TASKS) {
    const allowed = can(task.permission, role);
    const item = qs(task.id);
    if (item) item.hidden = !allowed;
    if (allowed) available += 1;
  }

  if (count) count.textContent = `${available} ${available === 1 ? "acceso" : "accesos"}`;
}
