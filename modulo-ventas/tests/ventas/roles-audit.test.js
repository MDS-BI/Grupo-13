import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorage, resetVentasStorage, useSalesConfig } from './fixtures.js';
import {
  ROLES,
  ALL_ROLES,
  getCurrentRole,
  setCurrentRole,
  can,
  assertCan,
  permissionsFor
} from '../../src/ventas/roles.js';
import { logAudit, logReturnAudit, listAudit, auditForSale, clearAudit } from '../../src/ventas/audit.js';

beforeEach(() => {
  installLocalStorage();
  resetVentasStorage();
  useSalesConfig();
});

describe('roles', () => {
  it('defaults to the vendedor role', () => {
    expect(getCurrentRole()).toBe(ROLES.VENDEDOR);
    expect(can('crear_orden')).toBe(true);
    expect(can('facturar')).toBe(false);
  });

  it('switches the current role and enforces permissions', () => {
    setCurrentRole(ROLES.FACTURACION);
    expect(getCurrentRole()).toBe(ROLES.FACTURACION);
    expect(can('facturar')).toBe(true);
    expect(can('entregar')).toBe(false);
    expect(() => assertCan('entregar')).toThrow(/permiso/);
    expect(() => setCurrentRole('superusuario')).toThrow(/Rol inválido/);
  });

  it('supports every documented role', () => {
    for(const role of ALL_ROLES){
      setCurrentRole(role);
      expect(getCurrentRole()).toBe(role);
      expect(Array.isArray(permissionsFor(role))).toBe(true);
    }
  });

  it('maps English aliases to the domain permissions', () => {
    setCurrentRole(ROLES.GERENTE);
    expect(can('summary')).toBe(true);
    expect(can('ver_resumen')).toBe(true);
    setCurrentRole(ROLES.JEFE_VENTAS);
    expect(can('history')).toBe(true);
  });
});

describe('audit log', () => {
  it('records the affected sale, products, quantity, reason, date and user', () => {
    clearAudit();
    const entry = logReturnAudit({
      ventaId: 'pedido-1',
      facturaId: 'factura-1',
      devolucionId: 'devolucion-1',
      productos: [{ productoId: 'p1', cantidad: 2 }],
      cantidad: 2,
      motivo: 'Producto defectuoso',
      fecha: '2026-11-03',
      usuario: ROLES.DEVOLUCIONES
    });
    expect(entry.ventaId).toBe('pedido-1');
    expect(entry.productos).toHaveLength(1);
    expect(entry.cantidad).toBe(2);
    expect(entry.motivo).toBe('Producto defectuoso');
    expect(entry.fecha).toBe('2026-11-03');
    expect(entry.usuario).toBe(ROLES.DEVOLUCIONES);
    expect(listAudit()).toHaveLength(1);
    expect(auditForSale('pedido-1')).toHaveLength(1);
  });

  it('accepts a generic audit action', () => {
    const entry = logAudit({ accion: 'entrega', ventaId: 'pedido-2', usuario: 'operaciones' });
    expect(entry.accion).toBe('entrega');
    expect(listAudit().some(item => item.id === entry.id)).toBe(true);
  });
});
