import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorage, resetVentasStorage, useSalesConfig } from './fixtures.js';
import {
  createCategoria,
  createListaPrecio,
  createProducto,
  createPrecioProducto,
  listProductos,
  getProducto,
  getStock,
  hasStock,
  validateStock,
  getPrecioVigente,
  getPrecio,
  searchProductos,
  adjustStock
} from '../../src/ventas/catalog.js';

let categoria;
let lista;

beforeEach(() => {
  installLocalStorage();
  resetVentasStorage();
  useSalesConfig();
  categoria = createCategoria({ nombre: 'Bebidas' });
  lista = createListaPrecio({ codigo: 'LP-GEN', nombre: 'General', moneda: 'CLP', vigenteDesde: '2026-01-01' });
});

describe('catalog', () => {
  it('creates products with unique SKU and validates stock and tax ranges', () => {
    const producto = createProducto({
      sku: 'BEB-01',
      nombre: 'Agua',
      categoriaId: categoria.id,
      unidadMedida: 'UN',
      impuestoPorcentaje: 19,
      stockActual: 10
    });
    expect(getProducto('BEB-01').id).toBe(producto.id);
    expect(getProducto(producto.id).id).toBe(producto.id);
    expect(() => createProducto({ sku: 'BEB-01', nombre: 'Otra', stockActual: 1 })).toThrow(/SKU/);
    expect(() => createProducto({ sku: 'BEB-02', nombre: 'Mala', impuestoPorcentaje: 150, stockActual: 1 })).toThrow(/impuesto/);
    expect(() => createProducto({ sku: 'BEB-03', nombre: 'Negativa', stockActual: -1 })).toThrow(/stock/);
  });

  it('answers stock availability and rejects zero or insufficient stock lines', () => {
    const disponible = createProducto({ sku: 'OK-01', nombre: 'Disponible', stockActual: 5, impuestoPorcentaje: 19 });
    const agotado = createProducto({ sku: 'NO-01', nombre: 'Agotado', stockActual: 0, impuestoPorcentaje: 19 });
    expect(getStock(disponible.id)).toBe(5);
    expect(hasStock(disponible.id, 5)).toBe(true);
    expect(hasStock(disponible.id, 6)).toBe(false);
    const check = validateStock([
      { productoId: agotado.id, cantidad: 1 },
      { productoId: disponible.id, cantidad: 99 }
    ]);
    expect(check.valid).toBe(false);
    expect(Object.values(check.errors).some(message => message.includes('no tiene stock'))).toBe(true);
    expect(Object.values(check.errors).some(message => message.includes('Stock insuficiente'))).toBe(true);
    expect(() => adjustStock(disponible.id, -10)).toThrow(/negativo/);
  });

  it('stores prices per list and resolves the price valid on a date', () => {
    const producto = createProducto({ sku: 'P-01', nombre: 'Producto', stockActual: 10, impuestoPorcentaje: 19 });
    createPrecioProducto({ listaId: lista.id, productoId: producto.id, precio: 1500, moneda: 'CLP', vigenteDesde: '2026-01-01', vigenteHasta: '2026-06-30' });
    createPrecioProducto({ listaId: lista.id, productoId: producto.id, precio: 1800, moneda: 'CLP', vigenteDesde: '2026-07-01' });
    expect(getPrecio(producto.id, lista.id, '2026-03-01')).toBe(1500);
    expect(getPrecio(producto.id, lista.id, '2026-09-01')).toBe(1800);
    expect(getPrecioVigente(producto.id, '2026-09-01').precio).toBe(1800);
    expect(() => createPrecioProducto({ listaId: lista.id, productoId: producto.id, precio: 1, moneda: 'USD', vigenteDesde: '2026-10-01' })).toThrow(/moneda/);
  });

  it('searches products by SKU and name', () => {
    createProducto({ sku: 'CAF-01', nombre: 'Café molido', stockActual: 4, impuestoPorcentaje: 19 });
    createProducto({ sku: 'TE-01', nombre: 'Té verde', stockActual: 4, impuestoPorcentaje: 19 });
    expect(searchProductos('caf').length).toBe(1);
    expect(searchProductos('TE-01').length).toBe(1);
    expect(searchProductos('').length).toBe(2);
    expect(listProductos()).toHaveLength(2);
  });
});
