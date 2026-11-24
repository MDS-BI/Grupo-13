import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorage, resetVentasStorage, useSalesConfig } from './fixtures.js';
import { ROLES, PERMISSIONS, can, assertCan, permissionsFor, setCurrentRole } from '../../src/ventas/roles.js';

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

  const cases = [
    [ROLES.VENDEDOR, ['crear_cotizacion', 'editar_cotizacion', 'crear_orden', 'editar_orden', 'ver_pedidos', 'ver_resumen'], ['gestionar_precios', 'aprobar_devolucion', 'facturar', 'entregar', 'devolver', 'ver_historial']],
    [ROLES.OPERACIONES, ['ver_pedidos', 'entregar'], ['crear_orden', 'facturar', 'devolver', 'ver_resumen', 'ver_historial']],
    [ROLES.GERENTE, ['ver_pedidos', 'ver_resumen'], ['crear_orden', 'facturar', 'entregar', 'devolver', 'ver_historial']],
    [ROLES.DEVOLUCIONES, ['ver_panel', 'ver_pedidos', 'devolver', 'gestionar_devoluciones', 'ver_resumen'], ['crear_orden', 'crear_cotizacion', 'gestionar_precios', 'aprobar_devolucion', 'facturar', 'entregar', 'ver_historial']],
    [ROLES.JEFE_VENTAS, ['ver_pedidos', 'ver_historial', 'ver_datos_sensibles', 'ver_resumen', 'aprobar_cotizacion', 'crear_orden', 'crear_cotizacion', 'gestionar_precios', 'aprobar_devolucion', 'devolver', 'gestionar_devoluciones', 'facturar', 'entregar'], []],
    [ROLES.FACTURACION, ['ver_pedidos', 'facturar', 'registrar_pago'], ['crear_orden', 'entregar', 'devolver', 'ver_resumen', 'ver_historial']]
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

  it('gives the auditor read-only access to sales consultations', () => {
    setCurrentRole(ROLES.AUDITOR);
    for (const permission of ['ver_panel', 'ver_pedidos', 'ver_cotizaciones', 'ver_productos', 'ver_resumen']) {
      expect(can(permission)).toBe(true);
    }
    for (const permission of ['ver_historial', 'ver_datos_sensibles', 'crear_orden', 'crear_cotizacion', 'gestionar_precios', 'aprobar_cotizacion', 'aprobar_devolucion', 'facturar', 'entregar', 'devolver', 'gestionar_devoluciones']) {
      expect(can(permission)).toBe(false);
    }
  });
});
