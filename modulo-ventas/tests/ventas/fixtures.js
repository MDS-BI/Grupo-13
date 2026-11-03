import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { clearAll, addEntity } from '../../src/storage.js';
import { normalizeConfig, setActiveConfig, userConfig } from '../../src/module-config.js';
import { clearCollections } from '../../src/ventas/collections.js';
import { seedMasters } from '../../src/ventas/masters.js';
import { createCategoria, createListaPrecio, createProducto, createPrecioProducto } from '../../src/ventas/catalog.js';
import { createOrder, getOrder, updateOrderStatus } from '../../src/ventas/orders.js';
import { createInvoiceFromOrder } from '../../src/ventas/invoices.js';

export function installLocalStorage(){
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
  };
  return store;
}

export function resetVentasStorage(){
  if(!globalThis.localStorage) installLocalStorage();
  clearCollections();
  clearAll();
}

export function useSalesConfig(){
  const resolved = normalizeConfig(userConfig);
  setActiveConfig(resolved.config);
  return resolved;
}

export function seedVentas({ clientName = 'Cliente Demo', clientCode = 'CLI-001', products = 2 } = {}){
  useSalesConfig();
  const client = addEntity({ name: clientName, code: clientCode, vendedor: 'Vendedor Demo', zona: 'Centro' });
  seedMasters();
  const categoria = createCategoria({ nombre: 'General' });
  const lista = createListaPrecio({ codigo: 'LP-01', nombre: 'Lista general', moneda: 'CLP', vigenteDesde: '2026-01-01' });
  const created = [];
  for(let i = 1; i <= products; i += 1){
    const producto = createProducto({
      sku: `SKU-${i}`,
      nombre: `Producto ${i}`,
      categoriaId: categoria.id,
      unidadMedida: 'UN',
      impuestoPorcentaje: 19,
      stockActual: 100
    });
    createPrecioProducto({
      listaId: lista.id,
      productoId: producto.id,
      precio: 1000 * i,
      moneda: 'CLP',
      vigenteDesde: '2026-01-01'
    });
    created.push(producto);
  }
  return { client, categoria, lista, productos: created };
}

export function setupDom(){
  const html = fs.readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/' });
  const w = dom.window;
  globalThis.window = w;
  globalThis.document = w.document;
  globalThis.localStorage = w.localStorage;
  globalThis.alert = () => {};
  globalThis.confirm = () => true;
  w.scrollTo = () => {};
  return dom;
}

export async function bootApp(dom, configOverride){
  const { boot } = await import('../../src/app.js');
  return boot(configOverride);
}

export function seedQuoteOrder(seed, overrides = {}){
  return createOrder(buildOrderPayload(seed, overrides));
}

export function seedConfirmedOrder(seed, overrides = {}){
  const order = createOrder(buildOrderPayload(seed, overrides));
  return updateOrderStatus(order.id, 'pedido');
}

export function seedInvoicedOrder(seed, overrides = {}){
  const order = createOrder(buildOrderPayload(seed, overrides));
  updateOrderStatus(order.id, 'pedido');
  const invoice = createInvoiceFromOrder(order.id, { skipRoleCheck: true, role: 'facturacion' });
  return { order: getOrder(order.id), invoice };
}

export function seedDeliveredOrder(seed, overrides = {}){
  const { order, invoice } = seedInvoicedOrder(seed, overrides);
  const delivered = updateOrderStatus(order.id, 'entregado');
  return { order: delivered, invoice };
}

export function buildOrderPayload(seed, overrides = {}){
  return {
    clienteId: seed.client.entity_id,
    vendedorId: 'Vendedor Demo',
    canal: 'Tienda',
    condicionesPago: 'contado',
    fechaEmision: '2026-11-01',
    fechaEntrega: '2026-11-05',
    moneda: 'CLP',
    lineas: seed.productos.map((producto, index) => ({
      productoId: producto.id,
      cantidad: index + 1,
      precioUnitario: 1000 * (index + 1)
    })),
    ...overrides
  };
}
