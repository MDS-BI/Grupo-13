import { describe, it, expect, beforeEach } from "vitest";
import { installLocalStorage, resetVentasStorage, useSalesConfig } from "./fixtures.js";
import { seedMockData } from "../../src/ventas/mock-data.js";
import { loadEntities, loadDocuments } from "../../src/storage.js";
import {
  listProductos,
  listListasPrecio,
  listPreciosProducto,
  listCategorias,
} from "../../src/ventas/catalog.js";
import { listVendedores } from "../../src/ventas/masters.js";
import { listQuotes, QUOTE_STATUSES } from "../../src/ventas/quotes.js";
import { listOrders } from "../../src/ventas/orders.js";
import { listInvoices } from "../../src/ventas/invoices.js";
import { listPayments } from "../../src/ventas/payments.js";
import { listReturns } from "../../src/ventas/returns.js";

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
});
