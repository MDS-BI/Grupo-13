import { getOrder, listOrders, updateOrderStatus } from "./orders.js";
import { isTerminal } from "./lifecycle.js";
import { assertCan } from "./roles.js";
import { logAudit } from "./audit.js";
import { deductStockAtomic, restoreStockAtomic } from "./catalog.js";

export function canDeliver(order) {
  return !!order && order.estado === "facturado" && !isTerminal(order.estado);
}

export function listDeliverableOrders() {
  return listOrders().filter((order) => order.estado === "facturado");
}

export function deliverOrder(orderId, options = {}) {
  if (!options.skipRoleCheck) {
    assertCan("entregar", options.role);
  }
  const order = getOrder(orderId);
  if (!order) throw new Error("Pedido no encontrado");
  if (order.estado === "entregado") {
    throw new Error('El estado "entregado" es terminal y no admite modificaciones posteriores');
  }
  if (order.estado !== "facturado") {
    throw new Error(
      `Solo se puede entregar un pedido en estado "facturado"; estado actual: "${order.estado}"`,
    );
  }
  const lineas = order.lineas || [];
  let deducted = false;
  if (!order.stockDescontado && lineas.length > 0) {
    deductStockAtomic(lineas);
    deducted = true;
  }
  let updated;
  try {
    updated = updateOrderStatus(orderId, "entregado", { stockDescontado: true });
  } catch (error) {
    if (deducted) restoreStockAtomic(lineas);
    throw error;
  }
  logAudit({
    accion: "entrega",
    ventaId: updated.id,
    pedidoId: updated.id,
    productos: (updated.lineas || []).map((line) => line.productoId),
    cantidad: (updated.lineas || []).reduce((sum, line) => sum + Number(line.cantidad), 0),
    motivo: "Entrega confirmada",
    fecha: new Date().toISOString().slice(0, 10),
    usuario: options.usuario || options.role,
  });
  return updated;
}

export function validateDelivery(order) {
  if (!order) return { valid: false, errors: { pedido: "Pedido no encontrado" } };
  if (order.estado === "entregado") {
    return {
      valid: false,
      errors: {
        estado: 'El estado "entregado" es terminal y no admite modificaciones posteriores',
      },
    };
  }
  if (order.estado !== "facturado") {
    return {
      valid: false,
      errors: {
        estado: `Solo se puede entregar un pedido en estado "facturado"; estado actual: "${order.estado}"`,
      },
    };
  }
  return { valid: true, errors: {} };
}
