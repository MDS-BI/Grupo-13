import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupDom, bootApp, resetVentasStorage, seedVentas } from './fixtures.js';
import { listOrders } from '../../src/ventas/orders.js';
import { setCurrentRole, ROLES } from '../../src/ventas/roles.js';
import { createQuote } from '../../src/ventas/quotes.js';
import { COLLECTIONS, saveCollection } from '../../src/ventas/collections.js';
import { salesDateRange } from '../../src/ventas/panel-metrics.js';

let seed;

async function bootSalesApp(){
  vi.resetModules();
  setupDom();
  resetVentasStorage();
  seed = seedVentas();
  setCurrentRole(ROLES.VENDEDOR);
  await bootApp(undefined);
}

function clickNav(id){
  document.getElementById(id).click();
}

beforeEach(async () => {
  await bootSalesApp();
});

describe('Ventas UI wiring', () => {
  it('creates an order from the sales form and shows it as a quote', () => {
    clickNav('nav-sales-order');
    expect(document.getElementById('view-sales-order').hidden).toBe(false);

    const search = document.getElementById('order-product-search');
    search.value = 'SKU-1';
    search.dispatchEvent(new window.Event('input', { bubbles: true }));
    document.querySelector('#order-product-results .product-option-button').click();

    document.getElementById('order-client').value = seed.client.entity_id;
    document.getElementById('order-seller').value = 'Vendedor Demo';
    document.getElementById('order-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));

    const orders = listOrders();
    expect(orders).toHaveLength(1);
    expect(orders[0].estado).toBe('cotización');
    expect(document.getElementById('order-feedback').textContent).toMatch(/registrado/);
  });

  it('loads an existing order into the form and saves the changes', () => {
    clickNav('nav-sales-order');
    const search = document.getElementById('order-product-search');
    search.value = 'SKU-1';
    search.dispatchEvent(new window.Event('input', { bubbles: true }));
    document.querySelector('#order-product-results .product-option-button').click();
    document.getElementById('order-client').value = seed.client.entity_id;
    document.getElementById('order-seller').value = 'Vendedor Demo';
    document.getElementById('order-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));

    const [order] = listOrders();
    const select = document.getElementById('order-edit-select');
    select.value = order.id;
    select.dispatchEvent(new window.Event('change', { bubbles: true }));

    expect(document.getElementById('order-form-heading').textContent).toMatch(/Editar/);
    expect(document.getElementById('order-save').textContent).toMatch(/Guardar cambios/);

    document.getElementById('order-channel').value = 'Web';
    document.getElementById('order-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));

    const orders = listOrders();
    expect(orders).toHaveLength(1);
    expect(orders[0].canal).toBe('Web');
    expect(document.getElementById('order-feedback').textContent).toMatch(/actualizado/);
  });

  it('shows the empty states of the sales panels without errors', () => {
    clickNav('nav-delivery');
    expect(document.getElementById('delivery-empty').hidden).toBe(false);
    clickNav('nav-returns');
    expect(document.getElementById('return-empty').hidden).toBe(false);
    clickNav('nav-history');
    expect(document.getElementById('history-empty').hidden).toBe(false);
    clickNav('nav-invoices');
    expect(document.getElementById('invoice-content').hidden).toBe(true);
  });

  it('applies the role restrictions and refreshes the visible view', () => {
    clickNav('nav-summary');
    expect(document.getElementById('summary-restricted').hidden).toBe(false);

    const role = document.getElementById('role-select');
    role.value = ROLES.GERENTE;
    role.dispatchEvent(new window.Event('change', { bubbles: true }));
    expect(document.getElementById('summary-restricted').hidden).toBe(true);
    expect(document.getElementById('summary-content').hidden).toBe(false);
    expect(document.getElementById('summary-empty').hidden).toBe(false);
  });

  it('renders the customer history after selecting a client', () => {
    clickNav('nav-history');
    const select = document.getElementById('history-client');
    select.value = seed.client.entity_id;
    select.dispatchEvent(new window.Event('change', { bubbles: true }));
    expect(document.getElementById('history-empty').hidden).toBe(false);
    expect(document.getElementById('history-empty').textContent).toMatch(/no tiene cotizaciones/);
    expect(document.getElementById('history-total').textContent).toContain('0 transacción');
  });

  it('hides the client delete action and shows the documents stock notice', () => {
    clickNav('nav-entities');
    expect(document.getElementById('delete-entity').hidden).toBe(true);
    expect(document.getElementById('entity-delete-note').hidden).toBe(false);

    clickNav('nav-documents');
    expect(document.getElementById('documents-lifecycle-notice').hidden).toBe(false);
    expect(document.getElementById('documents-lifecycle-notice').textContent).toMatch(/cotización/);
  });

  it('converts a quote into a pedido and opens it in the order form', () => {
    const quote = createQuote({
      clienteId: seed.client.entity_id,
      vendedorId: 'Vendedor Demo',
      lineas: [{ productoId: seed.productos[0].id, cantidad: 2 }],
    });

    clickNav('nav-quotes');
    const accept = document.querySelector('#quotes-body button[data-quote-action="aceptada"]');
    expect(accept.textContent).toMatch(/Convertir a pedido/);
    accept.click();

    const [order] = listOrders();
    expect(order.estado).toBe('pedido');
    expect(order.cotizacionId).toBe(quote.id);
    expect(document.getElementById('quotes-feedback').textContent).toMatch(order.numero);
    expect(document.getElementById('view-sales-order').hidden).toBe(false);
    expect(document.getElementById('order-form-heading').textContent).toMatch(/Editar/);
    expect(document.getElementById('order-edit-select').value).toBe(order.id);
    expect(document.getElementById('order-client').value).toBe(seed.client.entity_id);
  });

  it('shows seller follow-up and embeds manager metrics in the dashboard', () => {
    expect(document.getElementById('seller-panel').hidden).toBe(false);
    expect(document.getElementById('summary-content').hidden).toBe(true);

    const role = document.getElementById('role-select');
    role.value = ROLES.GERENTE;
    role.dispatchEvent(new window.Event('change', { bubbles: true }));

    const dashboard = document.getElementById('view-dashboard');
    expect(dashboard.hidden).toBe(false);
    expect(dashboard.contains(document.getElementById('view-summary'))).toBe(true);
    expect(document.getElementById('seller-panel').hidden).toBe(true);
    expect(document.getElementById('summary-content').hidden).toBe(false);
    expect(document.getElementById('analytics-evolution-chart')).not.toBeNull();
    expect(document.getElementById('analytics-products-chart')).not.toBeNull();
    expect(document.getElementById('analytics-empty').hidden).toBe(false);

    clickNav('nav-summary');
    expect(dashboard.hidden).toBe(false);
  });

  it('filters sales and lets the manager inspect the matching customer, order and product', () => {
    const date = salesDateRange('month').to;
    const product = seed.productos[0];
    const order = {
      id: 'order-recent', numero: 'PED-RECIENTE', clienteId: seed.client.entity_id,
      fechaEmision: date, estado: 'facturado', moneda: 'CLP', total: 2000,
    };
    saveCollection(COLLECTIONS.pedidos, [
      order,
      { ...order, id: 'order-old', numero: 'PED-ANTIGUO', fechaEmision: '2000-01-01' },
      { ...order, id: 'order-pending', numero: 'PED-PENDIENTE', estado: 'pedido' },
    ]);
    saveCollection(COLLECTIONS.detallesPedido, [
      { id: 'detail-recent', pedidoId: order.id, productoId: product.id, cantidad: 2, precioUnitario: 1000 },
    ]);
    const select = (id, value) => {
      const element = document.getElementById(id);
      element.value = value;
      element.dispatchEvent(new window.Event('change', { bubbles: true }));
    };
    const content = (id) => document.getElementById(id).textContent;
    select('role-select', ROLES.GERENTE);
    expect(content('panel-repeat-rate')).toBe('100%');
    select('panel-range', 'month');
    expect(content('summary-total-ventas')).toBe('1');
    expect(content('panel-buyers')).toBe('1');
    expect(content('panel-repeat-rate')).toBe('0%');
    expect(content('summary-orders-body')).not.toContain('PED-ANTIGUO');
    select('panel-client-select', seed.client.entity_id);
    expect(content('panel-client-detail')).toContain('Cliente Demo');
    expect(content('panel-client-detail')).toContain('1 compra');
    select('panel-order-select', order.id);
    expect(content('panel-order-detail')).toContain('PED-RECIENTE');
    expect(content('panel-order-lines')).toContain('Producto 1 · 2 unidades');
    select('panel-product-select', product.id);
    expect(content('panel-product-detail')).toContain('Puesto 1 por unidades');
    select('role-select', ROLES.VENDEDOR);
    expect(document.getElementById('summary-content').hidden).toBe(true);
    expect(content('panel-order-lines')).toBe('');
  });

  it('blocks a second conversion of the same quote', () => {
    const quote = createQuote({
      clienteId: seed.client.entity_id,
      vendedorId: 'Vendedor Demo',
      lineas: [{ productoId: seed.productos[0].id, cantidad: 1 }],
    });
    clickNav('nav-quotes');
    document.querySelector('#quotes-body button[data-quote-action="aceptada"]').click();
    expect(listOrders()).toHaveLength(1);

    const quoteRow = [...document.querySelectorAll('#quotes-body tr')].find((row) =>
      row.textContent.includes(quote.numero),
    );
    expect(quoteRow.textContent).toMatch(/aceptada/);
    expect(quoteRow.querySelector('button[data-quote-action]')).toBeNull();
  });
});
