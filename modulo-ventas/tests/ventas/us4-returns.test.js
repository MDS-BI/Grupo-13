import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorage, resetVentasStorage, seedVentas, seedInvoicedOrder } from './fixtures.js';
import { createReturn, validateReturn, listReturns, getReturn, getReturnDetails, updateReturnStatus, previousReturnedQuantity } from '../../src/ventas/returns.js';
import { listAudit, auditForSale } from '../../src/ventas/audit.js';
import { getProducto } from '../../src/ventas/catalog.js';
import { ROLES, setCurrentRole } from '../../src/ventas/roles.js';

let seed;
let invoice;
let order;

beforeEach(() => {
  installLocalStorage();
  resetVentasStorage();
  seed = seedVentas();
  ({ order, invoice } = seedInvoicedOrder(seed));
  setCurrentRole(ROLES.DEVOLUCIONES);
});

function basePayload(overrides = {}){
  return {
    facturaId: invoice.id,
    motivo: 'Producto defectuoso',
    fecha: '2026-11-10',
    lineas: [{ productoId: seed.productos[0].id, cantidad: 1 }],
    ...overrides
  };
}

describe('US4 - devoluciones', () => {
  it('registers a request, deducts nothing twice and writes an audit entry', () => {
    const result = createReturn(basePayload());
    expect(result.devolucion.estado).toBe('solicitada');
    expect(result.devolucion.numero).toBe(`DEV-${result.devolucion.folio}`);
    expect(result.devolucion.facturaId).toBe(invoice.id);
    expect(result.devolucion.pedidoId).toBe(order.id);
    expect(result.total).toBe(1000);
    expect(listReturns()).toHaveLength(1);
    expect(previousReturnedQuantity(result.detalles[0].detallePedidoId)).toBe(1);

    const audit = auditForSale(order.id);
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      ventaId: order.id,
      facturaId: invoice.id,
      devolucionId: result.devolucion.id,
      motivo: 'Producto defectuoso',
      cantidad: 1
    });
    expect(listAudit()).toHaveLength(1);
    expect(getProducto(seed.productos[0].id).estado).toBe('en proceso de devolución');
  });

  it('rejects returns outside the 30 day window', () => {
    const check = validateReturn(basePayload({ fecha: '2027-01-15' }));
    expect(check.valid).toBe(false);
    expect(check.errors.fecha).toMatch(/expirado/);
    expect(() => createReturn(basePayload({ fecha: '2027-01-15' }))).toThrow(/expirado/);
  });

  it('requires a motive and at least one valid product', () => {
    expect(() => createReturn(basePayload({ motivo: '' }))).toThrow(/motivo/);
    expect(() => createReturn(basePayload({ lineas: [] }))).toThrow(/producto/);
    expect(() => createReturn(basePayload({ lineas: [{ productoId: 'ajeno', cantidad: 1 }] }))).toThrow(/no pertenece/);
  });

  it('never returns more units than were sold', () => {
    createReturn(basePayload({ lineas: [{ productoId: seed.productos[1].id, cantidad: 2 }] }));
    expect(() => createReturn(basePayload({ lineas: [{ productoId: seed.productos[1].id, cantidad: 1 }] }))).toThrow(/máxima devolvible/);
  });

  it('moves through the return lifecycle and allows re-return after rejection', () => {
    const first = createReturn(basePayload());
    setCurrentRole(ROLES.JEFE_VENTAS);
    const approved = updateReturnStatus(first.devolucion.id, 'aprobada');
    expect(approved.estado).toBe('aprobada');
    setCurrentRole(ROLES.DEVOLUCIONES);
    const completed = updateReturnStatus(first.devolucion.id, 'completada');
    expect(completed.estado).toBe('completada');
    setCurrentRole(ROLES.JEFE_VENTAS);
    expect(() => updateReturnStatus(first.devolucion.id, 'aprobada')).toThrow(/inválida/);

    const rejected = createReturn(basePayload({ lineas: [{ productoId: seed.productos[1].id, cantidad: 1 }] }));
    setCurrentRole(ROLES.JEFE_VENTAS);
    updateReturnStatus(rejected.devolucion.id, 'rechazada');
    setCurrentRole(ROLES.DEVOLUCIONES);
    expect(previousReturnedQuantity(rejected.detalles[0].detallePedidoId)).toBe(0);
    expect(() => createReturn(basePayload({ lineas: [{ productoId: seed.productos[1].id, cantidad: 2 }] }))).not.toThrow();
    expect(getReturn(rejected.devolucion.id).estado).toBe('rechazada');
  });

  it('treats an identical repeated request as one persisted return', () => {
    const payload = basePayload({
      motivo: 'Producto defectuoso',
      fecha: '2026-11-10',
      lineas: [{ productoId: seed.productos[1].id, cantidad: 1 }]
    });
    const first = createReturn(payload);
    const repeated = createReturn({ ...payload });

    expect(repeated.devolucion.id).toBe(first.devolucion.id);
    expect(repeated.devolucion.numero).toBe(first.devolucion.numero);
    expect(repeated.total).toBe(first.total);
    expect(listReturns()).toHaveLength(1);
    expect(getReturnDetails(first.devolucion.id)).toHaveLength(1);
    expect(listAudit()).toHaveLength(1);
  });

  it('accepts an explicit idempotency key and still creates a different request', () => {
    const first = createReturn(
      basePayload({
        idempotencyKey: 'RMA-CLIENTE-1',
        motivo: 'Motivo original',
        lineas: [{ productoId: seed.productos[1].id, cantidad: 1 }]
      })
    );
    const repeated = createReturn(
      basePayload({
        idempotencyKey: 'RMA-CLIENTE-1',
        motivo: 'Motivo distinto',
        lineas: [{ productoId: seed.productos[1].id, cantidad: 1 }]
      })
    );
    expect(repeated.devolucion.id).toBe(first.devolucion.id);

    const different = createReturn(
      basePayload({
        motivo: 'Motivo distinto',
        lineas: [{ productoId: seed.productos[1].id, cantidad: 1 }]
      })
    );
    expect(different.devolucion.id).not.toBe(first.devolucion.id);
    expect(different.devolucion.numero).not.toBe(first.devolucion.numero);
    expect(listReturns()).toHaveLength(2);
    expect(listReturns().every(item => item.idempotencyKey)).toBe(true);
    expect(listReturns().reduce((sum, item) => sum + getReturnDetails(item.id).length, 0)).toBe(2);
    expect(listAudit()).toHaveLength(2);
  });

  it('requires the devoluciones role', () => {
    setCurrentRole(ROLES.VENDEDOR);
    expect(() => createReturn(basePayload())).toThrow(/permiso/);
    expect(listReturns()).toHaveLength(0);
  });

  it('allows only Jefe de Ventas to approve or reject an RMA', () => {
    const request = createReturn(basePayload());
    expect(() => updateReturnStatus(request.devolucion.id, 'aprobada')).toThrow(/permiso/);
    setCurrentRole(ROLES.JEFE_VENTAS);
    expect(updateReturnStatus(request.devolucion.id, 'aprobada').estado).toBe('aprobada');
  });
});
