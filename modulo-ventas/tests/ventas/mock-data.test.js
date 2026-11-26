import { describe, it, expect, beforeEach } from "vitest";
import { installLocalStorage, resetVentasStorage, useSalesConfig } from "./fixtures.js";
import { loadDemoData, seedMockData } from "../../src/ventas/mock-data.js";
import { loadEntities, loadDocuments } from "../../src/storage.js";
import { listAudit } from "../../src/ventas/audit.js";
import {
  listProductos,
  listListasPrecio,
  listPreciosProducto,
  listCategorias,
  getProducto,
} from "../../src/ventas/catalog.js";
import { listVendedores, listZonas } from "../../src/ventas/masters.js";
import { listQuotes, QUOTE_STATUSES } from "../../src/ventas/quotes.js";
import { listOrders } from "../../src/ventas/orders.js";
import { listInvoices } from "../../src/ventas/invoices.js";
import { listPayments } from "../../src/ventas/payments.js";
import { listReturns } from "../../src/ventas/returns.js";

function countBy(items, key) {
  return items.reduce((counts, item) => {
    counts[item[key]] = (counts[item[key]] || 0) + 1;
    return counts;
  }, {});
}

beforeEach(() => {
  installLocalStorage();
  resetVentasStorage();
  useSalesConfig();
});

describe("datos de demostración del módulo de ventas", () => {
  it("crea un conjunto completo y coherente para todos los flujos", () => {
    const counts = seedMockData({ force: true });

    expect(counts.clientes).toBeGreaterThanOrEqual(6);
    expect(counts.productos).toBeGreaterThanOrEqual(6);
    expect(counts.cotizaciones).toBeGreaterThanOrEqual(5);
    expect(counts.pedidos).toBeGreaterThanOrEqual(5);
    expect(counts.facturas).toBeGreaterThanOrEqual(4);
    expect(counts.pagos).toBeGreaterThanOrEqual(4);
    expect(counts.devoluciones).toBeGreaterThanOrEqual(2);

    expect(loadEntities().length).toBe(counts.clientes);
    expect(loadDocuments().length).toBeGreaterThan(0);
    expect(listCategorias().length).toBeGreaterThan(0);
    expect(listListasPrecio().length).toBeGreaterThan(0);
    expect(listPreciosProducto().length).toBeGreaterThanOrEqual(counts.productos);
    expect(listVendedores().length).toBeGreaterThan(0);

    const clientIds = new Set(loadEntities().map((entity) => entity.entity_id));
    const invoiceIds = new Set(listInvoices().map((invoice) => invoice.id));
    const orderIds = new Set(listOrders().map((order) => order.id));
    const productIds = new Set(listProductos().map((product) => product.id));

    for (const quote of listQuotes()) {
      expect(clientIds.has(quote.clienteId)).toBe(true);
      quote.lineas.forEach((line) => expect(productIds.has(line.productoId)).toBe(true));
    }
    for (const order of listOrders()) {
      expect(clientIds.has(order.clienteId)).toBe(true);
      order.lineas.forEach((line) => expect(productIds.has(line.productoId)).toBe(true));
    }
    for (const invoice of listInvoices()) {
      expect(orderIds.has(invoice.pedidoId)).toBe(true);
      expect(invoice.lineas.length).toBeGreaterThan(0);
    }
    for (const payment of listPayments()) {
      expect(invoiceIds.has(payment.facturaId)).toBe(true);
      expect(payment.monto).toBeGreaterThan(0);
    }
    for (const item of listReturns()) {
      expect(invoiceIds.has(item.facturaId)).toBe(true);
      expect(item.total).toBeGreaterThan(0);
    }
  });

  it("cubre todos los campos y estados relevantes", () => {
    seedMockData({ force: true });

    const client = loadEntities()[0];
    for (const field of [
      "taxId",
      "email",
      "phone",
      "address",
      "category",
      "description",
      "targetDate",
      "creditLimit",
      "paymentTerms",
      "vendedor",
      "zona",
    ]) {
      expect(client[field]).toBeTruthy();
    }

    const product = listProductos()[0];
    for (const field of [
      "sku",
      "nombre",
      "descripcion",
      "categoriaId",
      "unidadMedida",
      "impuestoPorcentaje",
      "stockActual",
      "stockMinimo",
    ]) {
      expect(product[field]).toBeDefined();
    }

    expect(new Set(listQuotes().map((quote) => quote.estado))).toEqual(new Set(QUOTE_STATUSES));
    expect(new Set(listOrders().map((order) => order.estado))).toEqual(
      new Set(["cotización", "pedido", "facturado", "entregado", "cancelado"]),
    );
    expect(new Set(listPayments().map((payment) => payment.metodo))).toEqual(
      new Set(["transferencia", "efectivo", "tarjeta"]),
    );
    expect(listInvoices().some((invoice) => invoice.estado === "parcial")).toBe(true);
    expect(listInvoices().some((invoice) => invoice.estado === "pagada")).toBe(true);
    expect(listInvoices().some((invoice) => invoice.estado === "pendiente de pago")).toBe(true);
    expect(listReturns().some((item) => item.estado === "completada")).toBe(true);
    expect(listReturns().some((item) => item.estado === "rechazada")).toBe(true);
  });

  it("no duplica datos al cargar dos veces y permite recargar forzadamente", () => {
    const first = seedMockData({ force: true });
    expect(seedMockData()).toBe(false);

    const second = seedMockData({ force: true });
    expect(second.clientes).toBe(first.clientes);
    expect(second.pedidos).toBe(first.pedidos);
    expect(second.facturas).toBe(first.facturas);
    expect(listPayments()).toHaveLength(first.pagos);
    expect(listReturns()).toHaveLength(first.devoluciones);
  });

  it("cumple los recuentos y la unicidad estricta de FR-066", () => {
    const result = loadDemoData({ force: true });
    expect(result.loaded).toBe(true);
    expect(result.counts).toMatchObject({
      clientes: 10,
      zonas: 5,
      vendedores: 6,
      categorias: 5,
      listasPrecio: 3,
      productos: 12,
      cotizaciones: 6,
      pedidos: 10,
      facturas: 5,
      pagos: 5,
      devoluciones: 4,
    });

    const clients = loadEntities();
    expect(countBy(clients, "estado")).toEqual({ activo: 6, inactivo: 2, bloqueado: 2 });
    expect(new Set(clients.map((client) => client.name)).size).toBe(10);
    expect(new Set(clients.map((client) => client.taxId)).size).toBe(10);
    expect(new Set(clients.map((client) => client.email)).size).toBe(10);
    expect(new Set(clients.map((client) => client.code)).size).toBe(10);

    expect(result.detail.responsablesPorRol.map((item) => item.nombre)).toEqual([
      "Camila Rojas",
      "Diego Fuentes",
      "Paula Soto",
      "Rodrigo Mena",
      "Valentina Errázuriz",
      "Matías Vergara",
      "Antonia Beltrán",
    ]);
    expect(listVendedores().map((vendedor) => vendedor.nombre)).toEqual([
      "Ignacia Valdés",
      "Tomás Herrera",
      "Javiera Muñoz",
      "Cristóbal Ríos",
      "Fernanda Salas",
      "Sebastián Tapia",
    ]);
    const contactos = result.detail.contactosClientes;
    expect(contactos).toHaveLength(10);
    expect(new Set(contactos).size).toBe(10);
    const personas = [
      ...contactos,
      ...listVendedores().map((vendedor) => vendedor.nombre),
      ...result.detail.responsablesPorRol.map((item) => item.nombre),
    ];
    expect(new Set(personas).size).toBe(personas.length);
    expect(listZonas()).toHaveLength(5);
    expect(listCategorias()).toHaveLength(5);
    expect(loadDocuments()).toHaveLength(2);
  });

  it("cubre catálogo, todos los estados y el pedido de tasas mixtas", () => {
    loadDemoData({ force: true });
    const hoy = new Date().toISOString().slice(0, 10);
    const productos = listProductos();
    expect(productos).toHaveLength(12);
    expect(productos.filter((producto) => producto.stockActual === 0)).toHaveLength(1);
    expect(
      productos.filter(
        (producto) => producto.stockActual > 0 && producto.stockActual < producto.stockMinimo,
      ),
    ).toHaveLength(2);
    expect(new Set(productos.map((producto) => producto.impuestoPorcentaje))).toEqual(
      new Set([19, 0]),
    );
    expect(
      listPreciosProducto().filter(
        (precio) => !precio.vigenteHasta || precio.vigenteHasta >= hoy,
      ).length,
    ).toBeGreaterThanOrEqual(25);
    expect(
      listPreciosProducto().some((precio) => precio.vigenteHasta && precio.vigenteHasta < hoy),
    ).toBe(true);

    expect(countBy(listQuotes(), "estado")).toEqual({
      borrador: 1,
      enviada: 2,
      aceptada: 1,
      rechazada: 1,
      vencida: 1,
    });
    const orders = listOrders();
    expect(orders).toHaveLength(10);
    const orderStates = countBy(orders, "estado");
    for (const estado of ["cotización", "pedido", "facturado", "entregado", "cancelado"]) {
      expect(orderStates[estado]).toBeGreaterThanOrEqual(1);
    }

    const mixed = orders.find(
      (order) =>
        order.lineas.some((line) => line.impuestoPorcentaje === 19) &&
        order.lineas.some((line) => line.impuestoPorcentaje === 0),
    );
    expect(mixed).toBeDefined();
    expect(mixed.impuesto).toBeGreaterThan(0);
    expect(mixed.lineas.some((line) => line.impuestoLinea > 0)).toBe(true);
    expect(mixed.lineas.some((line) => line.impuestoLinea === 0)).toBe(true);
    const mixedInvoice = listInvoices().find((invoice) => invoice.pedidoId === mixed.id);
    expect(mixedInvoice).toBeDefined();
    expect(mixedInvoice.impuesto).toBe(mixed.impuesto);
    expect(getProducto(mixed.lineas[0].productoId).impuestoPorcentaje).toBe(19);
  });

  it("registra facturas, pagos, devoluciones y auditoría coherente", () => {
    loadDemoData({ force: true });
    const invoices = listInvoices();
    expect(invoices).toHaveLength(5);
    const invoiceStates = countBy(invoices, "estado");
    expect(invoiceStates["pendiente de pago"]).toBe(1);
    expect(invoiceStates.parcial).toBe(1);
    expect(invoiceStates.pagada).toBe(2);

    const payments = listPayments();
    expect(payments).toHaveLength(5);
    expect(new Set(payments.map((payment) => payment.metodo)).size).toBeGreaterThanOrEqual(3);
    expect(payments.every((payment) => payment.referencia)).toBe(true);

    const returns = listReturns();
    expect(countBy(returns, "estado")).toEqual({
      solicitada: 1,
      aprobada: 1,
      completada: 1,
      rechazada: 1,
    });
    const audit = listAudit().filter((entry) => entry.accion === "devolucion");
    expect(audit).toHaveLength(4);
    for (const item of returns) {
      const entry = audit.find((record) => record.devolucionId === item.id);
      expect(entry).toMatchObject({
        ventaId: item.pedidoId,
        facturaId: item.facturaId,
        motivo: item.motivo,
        fecha: item.fecha,
        usuario: expect.any(String),
      });
      expect(entry.productos.length).toBeGreaterThan(0);
      expect(entry.cantidad).toBeGreaterThan(0);
    }
  });

  it("deja un cliente sin movimientos y documenta el rechazo fuera de plazo", () => {
    const result = loadDemoData({ force: true });
    const usedClients = new Set([
      ...listQuotes().map((quote) => quote.clienteId),
      ...listOrders().map((order) => order.clienteId),
      ...listInvoices().map((invoice) => invoice.clienteId),
    ]);
    const emptyClients = loadEntities().filter((client) => !usedClients.has(client.entity_id));
    expect(emptyClients).toHaveLength(1);
    expect(emptyClients[0].estado).toBe("activo");

    const attempt = result.detail.intentoFueraDePlazo;
    expect(attempt).toMatchObject({ facturaId: expect.any(String), numero: expect.any(String) });
    expect(attempt.error).toMatch(/expirado/);
    expect(listReturns()).toHaveLength(4);
    expect(listReturns().some((item) => item.facturaId === attempt.facturaId)).toBe(false);
  });
});
