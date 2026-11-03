import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorage, resetVentasStorage, useSalesConfig } from './fixtures.js';
import {
  createZona,
  listZonas,
  findZona,
  createVendedor,
  listVendedores,
  findVendedor,
  seedMasters,
  validateZonaReference,
  validateVendedorReference
} from '../../src/ventas/masters.js';
import { DEFAULT_CONFIG, normalizeConfig, getConfig } from '../../src/module-config.js';

beforeEach(() => {
  installLocalStorage();
  resetVentasStorage();
  useSalesConfig();
});

describe('masters', () => {
  it('creates zones with unique codes and resolves them by code or name', () => {
    const zona = createZona({ codigo: 'CENTRO', nombre: 'Centro' });
    expect(listZonas()).toHaveLength(1);
    expect(findZona('centro').id).toBe(zona.id);
    expect(findZona('CENTRO').id).toBe(zona.id);
    expect(() => createZona({ codigo: 'CENTRO', nombre: 'Otra' })).toThrow(/Ya existe/);
  });

  it('creates sellers linked to a valid zone and validates references', () => {
    const zona = createZona({ codigo: 'NORTE', nombre: 'Norte' });
    const vendedor = createVendedor({ codigo: 'V-01', nombre: 'Ana', email: 'ana@example.com', zonaId: zona.id });
    expect(listVendedores()).toHaveLength(1);
    expect(findVendedor('V-01').id).toBe(vendedor.id);
    expect(validateZonaReference(zona.id).valid).toBe(true);
    expect(validateVendedorReference(vendedor.id).valid).toBe(true);
    expect(validateVendedorReference('nope').valid).toBe(false);
    expect(() => createVendedor({ codigo: 'V-02', nombre: 'Beto', email: 'no-es-correo' })).toThrow(/correo/);
    expect(() => createVendedor({ codigo: 'V-03', nombre: 'Carla', zonaId: 'inexistente' })).toThrow(/zona/);
  });

  it('seeds zones from the configured options idempotently', () => {
    const first = seedMasters(getConfig());
    expect(first.zonas.length).toBeGreaterThan(0);
    const second = seedMasters(getConfig());
    expect(second.zonas).toHaveLength(0);
    expect(listZonas().length).toBe(first.zonas.length);
  });
});

describe('business rules configuration', () => {
  it('provides Ventas defaults', () => {
    const { config, errors } = normalizeConfig(null);
    expect(errors).toEqual([]);
    expect(config).toEqual(DEFAULT_CONFIG);
    expect(config.businessRules.returnWindowDays).toBe(30);
    expect(config.businessRules.defaultCurrency).toBe('CLP');
    expect(config.businessRules.roles).toContain('gerente');
  });

  it('merges custom business rules without breaking the rest of the config', () => {
    const { config, errors } = normalizeConfig({
      moduleName: 'Ventas',
      businessRules: { returnWindowDays: 15, defaultCurrency: 'mxn', roles: ['vendedor', 'gerente'] }
    });
    expect(errors).toEqual([]);
    expect(config.businessRules.returnWindowDays).toBe(15);
    expect(config.businessRules.defaultCurrency).toBe('MXN');
    expect(config.businessRules.roles).toEqual(['vendedor', 'gerente']);
    expect(config.labels.entity).toBe(DEFAULT_CONFIG.labels.entity);
  });

  it('reports invalid business rules', () => {
    const { errors } = normalizeConfig({ businessRules: { returnWindowDays: -1, roles: [] } });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(error => error.includes('returnWindowDays'))).toBe(true);
    expect(errors.some(error => error.includes('roles'))).toBe(true);
  });
});
