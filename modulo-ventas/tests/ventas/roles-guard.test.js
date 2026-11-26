import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorage, resetVentasStorage, seedVentas, seedConfirmedOrder, useSalesConfig } from './fixtures.js';
import { ALL_ROLES, ROLES, PERMISSIONS, can, assertCan, permissionsFor, setCurrentRole } from '../../src/ventas/roles.js';
import { getSummaryForRole, MASKED_AMOUNT } from '../../src/ventas/summary.js';

beforeEach(() => {
  installLocalStorage();
  resetVentasStorage();
  useSalesConfig();
});

describe('role authorization matrix', () => {
  it('grants Jefe de Ventas every permission in the module', () => {
    for (const permission of Object.keys(PERMISSIONS)) {
      expect(can(permission, ROLES.JEFE_VENTAS)).toBe(true);
    }
  });

  const expectedPermissions = {
    [ROLES.VENDEDOR]: [
      'crear_cliente', 'editar_cliente', 'gestionar_clientes',
      'crear_documento', 'editar_documento', 'gestionar_documentos',
      'crear_cotizacion', 'editar_cotizacion', 'crear_orden', 'editar_orden', 'gestionar_orden',
      'ver_panel', 'ver_montos_financieros', 'ver_pedidos', 'ver_cotizaciones', 'ver_productos',
      'ver_clientes', 'ver_documentos_clientes', 'ver_resumen', 'ver_agregar', 'ver_entregas',
      'ver_devoluciones', 'ver_busqueda',
    ],
    [ROLES.OPERACIONES]: ['ver_pedidos', 'entregar', 'ver_entregas'],
    [ROLES.GERENTE]: [
      'ver_panel', 'ver_montos_financieros', 'ver_pedidos', 'ver_cotizaciones',
      'ver_clientes', 'ver_documentos_clientes', 'ver_resumen', 'ver_busqueda',
    ],
    [ROLES.DEVOLUCIONES]: [
      'gestionar_devoluciones', 'ver_panel', 'ver_resumen', 'ver_pedidos', 'devolver',
      'ver_agregar', 'ver_devoluciones',
    ],
    [ROLES.JEFE_VENTAS]: Object.keys(PERMISSIONS),
    [ROLES.FACTURACION]: [
      'ver_montos_financieros', 'ver_pedidos', 'facturar', 'registrar_pago', 'ver_facturacion',
    ],
    [ROLES.AUDITOR]: ['ver_panel', 'ver_resumen', 'ver_agregar'],
  };

  it('matches the exact FR-068 permission set for every role', () => {
    for (const role of ALL_ROLES) {
      setCurrentRole(role);
      expect(permissionsFor(role).sort()).toEqual([...expectedPermissions[role]].sort());
    }
  });

  it('gives every pair of roles a different permission set', () => {
    for (let i = 0; i < ALL_ROLES.length; i += 1) {
      for (let j = i + 1; j < ALL_ROLES.length; j += 1) {
        const first = [...expectedPermissions[ALL_ROLES[i]]].sort().join('|');
        const second = [...expectedPermissions[ALL_ROLES[j]]].sort().join('|');
        expect(first).not.toBe(second);
      }
    }
  });

  const cases = [
    [ROLES.VENDEDOR, ['ver_clientes', 'ver_documentos_clientes', 'ver_resumen'], ['ver_historial', 'ver_datos_sensibles', 'facturar', 'entregar', 'devolver', 'aprobar_devolucion']],
    [ROLES.OPERACIONES, ['ver_pedidos', 'entregar', 'ver_entregas'], ['crear_orden', 'facturar', 'devolver', 'ver_resumen', 'ver_historial', 'ver_panel']],
    [ROLES.GERENTE, ['ver_pedidos', 'ver_cotizaciones', 'ver_resumen', 'ver_clientes', 'ver_documentos_clientes'], ['crear_orden', 'facturar', 'entregar', 'devolver', 'ver_historial', 'ver_productos']],
    [ROLES.DEVOLUCIONES, ['ver_panel', 'ver_pedidos', 'devolver', 'gestionar_devoluciones', 'ver_resumen'], ['crear_orden', 'crear_cotizacion', 'gestionar_precios', 'aprobar_devolucion', 'facturar', 'entregar', 'ver_historial', 'ver_cotizaciones', 'ver_clientes']],
    [ROLES.JEFE_VENTAS, Object.keys(PERMISSIONS), []],
    [ROLES.FACTURACION, ['ver_pedidos', 'facturar', 'registrar_pago', 'ver_facturacion'], ['crear_orden', 'entregar', 'devolver', 'ver_resumen', 'ver_historial', 'ver_panel']],
    [ROLES.AUDITOR, ['ver_panel', 'ver_resumen', 'ver_agregar'], ['ver_pedidos', 'ver_cotizaciones', 'ver_productos', 'ver_clientes', 'ver_documentos_clientes', 'ver_historial', 'ver_datos_sensibles', 'crear_orden', 'crear_cotizacion', 'gestionar_precios', 'aprobar_devolucion', 'facturar', 'entregar', 'devolver', 'gestionar_devoluciones']],
  ];

  for(const [role, allowed, denied] of cases){
    it(`applies the ${role} permissions`, () => {
      setCurrentRole(role);
      for(const permission of allowed) expect(can(permission)).toBe(true);
      for(const permission of denied){
        expect(can(permission)).toBe(false);
        expect(() => assertCan(permission)).toThrow(/permiso/);
      }
      expect(permissionsFor(role)).toEqual(expect.arrayContaining(allowed));
    });
  }

  it('denies unknown roles and permissions by default', () => {
    expect(can('crear_orden', 'desconocido')).toBe(false);
    expect(can('permiso_inexistente', ROLES.GERENTE)).toBe(false);
    expect(() => setCurrentRole('desconocido')).toThrow(/Rol inválido/);
  });

  it('gives the auditor read-only aggregate access without individual records', () => {
    setCurrentRole(ROLES.AUDITOR);
    for (const permission of ['ver_panel', 'ver_agregar', 'ver_resumen']) {
      expect(can(permission)).toBe(true);
    }
    for (const permission of ['ver_pedidos', 'ver_cotizaciones', 'ver_productos', 'ver_clientes', 'ver_documentos_clientes', 'ver_historial', 'ver_datos_sensibles', 'crear_orden', 'crear_cotizacion', 'gestionar_precios', 'aprobar_cotizacion', 'aprobar_devolucion', 'facturar', 'entregar', 'devolver', 'gestionar_devoluciones']) {
      expect(can(permission)).toBe(false);
    }
  });

  it('returns only counts and masked amounts for Postventa and Auditor', () => {
    const seed = seedVentas();
    seedConfirmedOrder(seed);
    for (const role of [ROLES.DEVOLUCIONES, ROLES.AUDITOR]) {
      const summary = getSummaryForRole(role);
      expect(summary.totalVentas + summary.totalCotizaciones + summary.totalPedidos).toBeGreaterThan(0);
      for (const key of ['montoVentas', 'montoCotizaciones', 'montoPedidos', 'montoTotal']) {
        expect(summary[key]).toBe(MASKED_AMOUNT);
      }
      expect(summary.pedidos).toEqual([]);
      expect(summary.ventas).toEqual([]);
      expect(summary.cotizaciones).toEqual([]);
    }
    const manager = getSummaryForRole(ROLES.GERENTE);
    expect(manager.montoTotal).toBeGreaterThan(0);
    expect(manager.pedidos.length).toBeGreaterThan(0);
  });
});
