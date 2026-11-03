import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorage, resetVentasStorage, useSalesConfig } from './fixtures.js';
import {
  COLLECTIONS,
  generateId,
  generateEntityId,
  saveCollection,
  loadCollection,
  findById,
  findByKey,
  collectionKey
} from '../../src/ventas/collections.js';
import {
  formatNumber,
  nextFolio,
  peekNextFolio,
  reserveNumber,
  isNumberUnique,
  seedFolio,
  resetSequences
} from '../../src/ventas/numbering.js';

beforeEach(() => {
  installLocalStorage();
  resetVentasStorage();
  useSalesConfig();
});

describe('collections', () => {
  it('uses the erp_ventas namespace for every collection', () => {
    expect(collectionKey('pedidos')).toBe('erp_ventas:pedidos');
    expect(COLLECTIONS.pedidos).toBe('pedidos');
  });

  it('saves, loads and searches items', () => {
    saveCollection(COLLECTIONS.pedidos, [
      { id: 'a', numero: 'PED-1' },
      { id: 'b', numero: 'PED-2' }
    ]);
    expect(loadCollection(COLLECTIONS.pedidos)).toHaveLength(2);
    expect(findById(COLLECTIONS.pedidos, 'b').numero).toBe('PED-2');
    expect(findByKey(COLLECTIONS.pedidos, 'numero', 'PED-1').id).toBe('a');
  });

  it('returns an empty list when the stored value is corrupt', () => {
    globalThis.localStorage.setItem(collectionKey(COLLECTIONS.pedidos), '{not-json');
    expect(loadCollection(COLLECTIONS.pedidos)).toEqual([]);
  });

  it('generates unique identifiers', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateId()));
    expect(ids.size).toBe(50);
    expect(generateEntityId()).not.toBe(generateEntityId());
  });
});

describe('numbering', () => {
  it('increments persisted folios and formats serie-folio', () => {
    expect(formatNumber('PED', 1)).toBe('PED-1');
    expect(nextFolio('PED')).toBe(1);
    expect(nextFolio('PED')).toBe(2);
    expect(peekNextFolio('PED')).toBe(3);
    seedFolio('PED', 41);
    expect(nextFolio('PED')).toBe(42);
  });

  it('reserves unique numbers per collection', () => {
    saveCollection(COLLECTIONS.pedidos, [{ id: 'existing', numero: 'PED-1' }]);
    const reserved = reserveNumber({ serie: 'PED', collection: COLLECTIONS.pedidos });
    expect(reserved.numero).not.toBe('PED-1');
    expect(isNumberUnique(COLLECTIONS.pedidos, reserved.numero)).toBe(true);
    expect(isNumberUnique(COLLECTIONS.pedidos, 'PED-1')).toBe(false);
  });

  it('resets sequences explicitly', () => {
    nextFolio('FAC');
    resetSequences();
    expect(nextFolio('FAC')).toBe(1);
  });
});
