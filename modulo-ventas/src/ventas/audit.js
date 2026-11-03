import { COLLECTIONS, generateId, loadCollection, saveCollection } from './collections.js';
import { getCurrentRole } from './roles.js';

function today(){
  return new Date().toISOString().slice(0, 10);
}

export function logAudit(entry = {}){
  const usuario = entry.usuario || entry.usuarioId || getCurrentRole();
  const record = {
    id: generateId(),
    accion: entry.accion || entry.action || 'devolucion',
    ventaId: entry.ventaId ?? entry.pedidoId ?? entry.pedido_id ?? null,
    pedidoId: entry.pedidoId ?? entry.pedido_id ?? entry.ventaId ?? null,
    facturaId: entry.facturaId ?? entry.factura_id ?? null,
    devolucionId: entry.devolucionId ?? entry.devolucion_id ?? null,
    productos: Array.isArray(entry.productos) ? entry.productos : [],
    cantidad: entry.cantidad ?? null,
    motivo: entry.motivo || '',
    fecha: entry.fecha || today(),
    usuario,
    createdAt: new Date().toISOString()
  };
  const list = loadCollection(COLLECTIONS.auditoria);
  list.push(record);
  saveCollection(COLLECTIONS.auditoria, list);
  return record;
}

export function logReturnAudit({ ventaId, pedidoId, facturaId, devolucionId, productos, cantidad, motivo, fecha, usuario } = {}){
  return logAudit({
    accion: 'devolucion',
    ventaId,
    pedidoId,
    facturaId,
    devolucionId,
    productos,
    cantidad,
    motivo,
    fecha,
    usuario
  });
}

export function listAudit(){
  return loadCollection(COLLECTIONS.auditoria);
}

export function auditForSale(ventaId){
  return listAudit().filter(entry => entry.ventaId === ventaId || entry.pedidoId === ventaId);
}

export function clearAudit(){
  saveCollection(COLLECTIONS.auditoria, []);
}
