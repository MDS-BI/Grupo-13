import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorage, resetVentasStorage, useSalesConfig } from './fixtures.js';
import { ROLES, can, assertCan, permissionsFor, setCurrentRole } from '../../src/ventas/roles.js';

beforeEach(() => {
  installLocalStorage();
  resetVentasStorage();
  useSalesConfig();
});

describe('role authorization matrix', () => {
  const cases = [
    [ROLES.VENDEDOR, ['crear_orden', 'editar_orden', 'ver_pedidos'], ['facturar', 'entregar', 'devolver', 'ver_resumen', 'ver_historial']],
    [ROLES.OPERACIONES, ['ver_pedidos', 'entregar'], ['crear_orden', 'facturar', 'devolver', 'ver_resumen', 'ver_historial']],
    [ROLES.GERENTE, ['ver_pedidos', 'ver_resumen'], ['crear_orden', 'facturar', 'entregar', 'devolver', 'ver_historial']],
    [ROLES.DEVOLUCIONES, ['ver_pedidos', 'devolver'], ['crear_orden', 'facturar', 'entregar', 'ver_resumen', 'ver_historial']],
    [ROLES.JEFE_VENTAS, ['ver_pedidos', 'ver_historial'], ['crear_orden', 'facturar', 'entregar', 'devolver', 'ver_resumen']],
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
});
