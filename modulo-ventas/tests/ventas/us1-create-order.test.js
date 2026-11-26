import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorage, resetVentasStorage, seedVentas, buildOrderPayload } from './fixtures.js';
import { createOrder, listOrders, getOrder, updateOrderStatus } from '../../src/ventas/orders.js';
import { createProducto } from '../../src/ventas/catalog.js';
import { createInvoiceFromOrder } from '../../src/ventas/invoices.js';

let seed;

beforeEach(() => {
  installLocalStorage();
  resetVentasStorage();
  seed = seedVentas();
});

describe('US1 - crear orden de venta', () => {
  it('registers a quote with client, two products, tax and contado payment', () => {
    const order = createOrder(buildOrderPayload(seed));
    expect(listOrders()).toHaveLength(1);
    expect(order.clienteId).toBe(seed.client.entity_id);
    expect(order.estado).toBe('cotización');
    expect(order.canal).toBe('Tienda');
    expect(order.condicionesPago).toBe('contado');
    expect(order.vendedorId).toBe('Vendedor Demo');
    expect(order.lineas).toHaveLength(2);
    expect(order.subtotal).toBe(5000);
    expect(order.impuesto).toBe(950);
    expect(order.total).toBe(5950);
    expect(order.numero).toMatch(/^PED-\d+$/);
    expect(getOrder(order.id).clienteId).toBe(seed.client.entity_id);
  });

  it('requires the sales channel, payment condition and seller', () => {
    const base = buildOrderPayload(seed);
    expect(() => createOrder({ ...base, canal: '' })).toThrow(/canal/);
    expect(() => createOrder({ ...base, condicionesPago: '' })).toThrow(/condición de pago/);
    expect(() => createOrder({ ...base, vendedorId: '' })).toThrow(/vendedor/);
    expect(listOrders()).toHaveLength(0);
  });

  it('requires an existing client', () => {
    expect(() => createOrder(buildOrderPayload(seed, { clienteId: 'no-existe' }))).toThrow(/cliente/);
    expect(listOrders()).toHaveLength(0);
  });

  it('blocks products with zero or insufficient stock', () => {
    const agotado = createProducto({ sku: 'AGOTADO', nombre: 'Sin stock', stockActual: 0, impuestoPorcentaje: 19 });
    const payload = buildOrderPayload(seed, {
      lineas: [{ productoId: agotado.id, cantidad: 1, precioUnitario: 100 }]
    });
    expect(() => createOrder(payload)).toThrow(/stock/i);
    expect(listOrders()).toHaveLength(0);
  });

  it('copies mixed 19% and 0% tax rates and amounts into the derived invoice', () => {
    const exento = createProducto({
      sku: 'EXENTO',
      nombre: 'Producto exento',
      unidadMedida: 'UN',
      impuestoPorcentaje: 0,
      stockActual: 50
    });
    const payload = buildOrderPayload(seed, {
      lineas: [
        { productoId: seed.productos[0].id, cantidad: 2, precioUnitario: 1000, impuestoPorcentaje: 19 },
        { productoId: exento.id, cantidad: 1, precioUnitario: 500, impuestoPorcentaje: 0 }
      ]
    });
    const order = createOrder(payload);
    expect(order.subtotal).toBe(2500);
    expect(order.impuesto).toBe(380);
    expect(order.total).toBe(2880);

    updateOrderStatus(order.id, 'pedido');
    const invoice = createInvoiceFromOrder(order.id, { skipRoleCheck: true, role: 'facturacion' });
    expect(invoice.lineas.map(line => line.impuestoPorcentaje)).toEqual([19, 0]);
    expect(invoice.lineas.map(line => line.impuestoLinea)).toEqual([380, 0]);
    expect(invoice.subtotal).toBe(2500);
    expect(invoice.impuesto).toBe(380);
    expect(invoice.total).toBe(2880);
  });

  it('keeps subtotal, tax and total available for later consultation', () => {
    const order = createOrder(buildOrderPayload(seed));
    const reloaded = getOrder(order.id);
    expect(reloaded.subtotal).toBe(order.subtotal);
    expect(reloaded.impuesto).toBe(order.impuesto);
    expect(reloaded.total).toBe(order.total);
    expect(reloaded.lineas.map(line => line.productoId)).toEqual(seed.productos.map(producto => producto.id));
  });
});
