import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupDom, bootApp, resetVentasStorage, seedVentas, seedInvoicedOrder, seedDeliveredOrder } from './fixtures.js';
import { listOrders } from '../../src/ventas/orders.js';
import { listQuotes } from '../../src/ventas/quotes.js';
import { listListasPrecio, listPreciosProducto } from '../../src/ventas/catalog.js';
import { createReturn } from '../../src/ventas/returns.js';
import { setCurrentRole, ROLES, ALL_ROLES } from '../../src/ventas/roles.js';
import { createQuote } from '../../src/ventas/quotes.js';

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

const expectedMenus = {
  [ROLES.VENDEDOR]: ['dashboard', 'operations', 'sales-order', 'quotes', 'products', 'clients', 'client-documents', 'search', 'delivery', 'returns'],
  [ROLES.OPERACIONES]: ['sales-order', 'delivery'],
  [ROLES.GERENTE]: ['dashboard', 'sales-order', 'quotes', 'clients', 'client-documents', 'search'],
  [ROLES.DEVOLUCIONES]: ['dashboard', 'operations', 'sales-order', 'returns'],
  [ROLES.JEFE_VENTAS]: ['dashboard', 'operations', 'sales-order', 'quotes', 'products', 'delivery', 'returns', 'invoices', 'clients', 'client-documents', 'search', 'history'],
  [ROLES.FACTURACION]: ['sales-order', 'invoices'],
  [ROLES.AUDITOR]: ['dashboard', 'operations'],
};

function setRole(role){
  const select = document.getElementById('role-select');
  select.value = role;
  select.dispatchEvent(new window.Event('change', { bubbles: true }));
}

function visibleModules(){
  return [...document.querySelectorAll('.nav-module, .nav-ventas')]
    .filter((button) => !button.hidden)
    .map((button) => button.dataset.module)
    .sort();
}

beforeEach(async () => {
  await bootSalesApp();
});

describe('Ventas UI wiring', () => {
  it('creates a separate quote using the price valid on its issue date', () => {
    clickNav('nav-operations');
    const form = document.getElementById('quote-form');
    expect(form).not.toBeNull();
    expect(document.getElementById('view-sales-order').hidden).toBe(true);

    document.getElementById('quote-client').value = seed.client.entity_id;
    document.getElementById('quote-date').value = '2026-11-01';
    const search = document.getElementById('quote-product-search');
    search.value = 'SKU-1';
    search.dispatchEvent(new window.Event('input', { bubbles: true }));
    document.querySelector('#quote-product-results .product-option-button').click();
    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));

    expect(listQuotes()).toHaveLength(1);
    expect(listQuotes()[0].total).toBe(1190);
    expect(listOrders()).toHaveLength(0);
    expect(document.getElementById('quote-feedback').textContent).toMatch(/creada/);
  });

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

  it('keeps orders and quotes in separate tables and moves their forms into Agregar', () => {
    expect(document.querySelectorAll('[data-module="sales-order"]')).toHaveLength(1);
    expect(document.getElementById('nav-sales-order').textContent.trim()).toBe('Órdenes de venta');
    expect(document.getElementById('nav-quotes').textContent.trim()).toBe('Cotizaciones');

    clickNav('nav-sales-order');
    expect(document.getElementById('sales-orders-body')).not.toBeNull();
    expect(document.getElementById('order-create-panel').parentElement.id).toBe('add-panel-order');
    expect(document.getElementById('quote-create-panel').parentElement.id).toBe('add-panel-quote');
    expect(document.getElementById('return-create-panel').parentElement.id).toBe('add-panel-return');
    expect(document.getElementById('pricing-management-panel').parentElement.id).toBe('add-panel-pricing');
    clickNav('nav-quotes');
    expect(document.getElementById('quotes-body')).not.toBe(document.getElementById('sales-orders-body'));
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
    const role = document.getElementById('role-select');
    role.value = ROLES.JEFE_VENTAS;
    role.dispatchEvent(new window.Event('change', { bubbles: true }));
    clickNav('nav-history');
    expect(document.getElementById('history-empty').hidden).toBe(false);
    clickNav('nav-invoices');
    expect(document.getElementById('invoice-content').hidden).toBe(false);
  });

  it('applies the role restrictions and refreshes the visible view', () => {
    clickNav('nav-dashboard');
    expect(document.getElementById('summary-restricted').hidden).toBe(true);

    const role = document.getElementById('role-select');
    role.value = ROLES.GERENTE;
    role.dispatchEvent(new window.Event('change', { bubbles: true }));
    expect(document.getElementById('summary-restricted').hidden).toBe(true);
    expect(document.getElementById('summary-content').hidden).toBe(false);
    expect(document.getElementById('summary-empty').hidden).toBe(false);
  });

  it('renders the customer history after selecting a client', () => {
    const role = document.getElementById('role-select');
    role.value = ROLES.JEFE_VENTAS;
    role.dispatchEvent(new window.Event('change', { bubbles: true }));
    clickNav('nav-history');
    const select = document.getElementById('history-client');
    select.value = seed.client.entity_id;
    select.dispatchEvent(new window.Event('change', { bubbles: true }));
    expect(document.getElementById('history-empty').hidden).toBe(false);
    expect(document.getElementById('history-empty').textContent).toMatch(/no tiene cotizaciones/);
  });

  it('hides the client delete action and shows the documents stock notice', () => {
    clickNav('nav-clients');
    expect(document.getElementById('delete-entity').hidden).toBe(true);
    expect(document.getElementById('entity-delete-note').hidden).toBe(false);

    clickNav('nav-client-documents');
    expect(document.getElementById('documents-lifecycle-notice').hidden).toBe(false);
    expect(document.getElementById('documents-lifecycle-notice').textContent).toMatch(/cotización/);
  });

  it('redirects an unavailable route to Panel with an accessible notice', async () => {
    clickNav('nav-sales-order');
    const { showModule } = await import('../../src/app.js');
    showModule('ruta-no-disponible');

    expect(document.getElementById('view-dashboard').hidden).toBe(false);
    const notice = document.getElementById('route-notice');
    expect(notice.hidden).toBe(false);
    expect(notice.getAttribute('aria-live')).toBe('polite');
    expect(notice.textContent).toMatch(/no disponible/i);
  });

  it('converts a quote into a pedido and opens it in the order form', () => {
    const quote = createQuote({
      clienteId: seed.client.entity_id,
      vendedorId: 'Vendedor Demo',
      lineas: [{ productoId: seed.productos[0].id, cantidad: 2 }],
    });

    clickNav('nav-quotes');
    const role = document.getElementById('role-select');
    role.value = ROLES.JEFE_VENTAS;
    role.dispatchEvent(new window.Event('change', { bubbles: true }));
    const accept = document.querySelector('#quotes-body button[data-quote-action="aceptada"]');
    expect(accept.textContent).toMatch(/Convertir a pedido/);
    accept.click();

    const [order] = listOrders();
    expect(order.estado).toBe('pedido');
    expect(order.cotizacionId).toBe(quote.id);
    expect(document.getElementById('quotes-feedback').textContent).toMatch(order.numero);
    expect(document.getElementById('view-sales-order').hidden).toBe(true);
    expect(document.getElementById('view-operations').hidden).toBe(false);
    expect(document.getElementById('order-form-heading').textContent).toMatch(/Editar/);
    expect(document.getElementById('order-edit-select').value).toBe(order.id);
    expect(document.getElementById('order-client').value).toBe(seed.client.entity_id);
  });

  it('opens the analytics panel from the dashboard', () => {
    setRole(ROLES.GERENTE);
    document.getElementById('action-open-analytics').click();
    expect(document.getElementById('view-summary').hidden).toBe(false);
    expect(document.activeElement.id).toBe('analytics-heading');

    expect(document.getElementById('summary-content').hidden).toBe(false);
    expect(document.getElementById('analytics-evolution-chart')).not.toBeNull();
    expect(document.getElementById('analytics-products-chart')).not.toBeNull();
    expect(document.getElementById('analytics-empty').hidden).toBe(false);
  });

  it('opens the quote form from its list even after using a different registration tab', () => {
    clickNav('nav-operations');
    clickNav('add-tab-order');
    expect(document.getElementById('add-panel-order').hidden).toBe(false);

    clickNav('nav-quotes');
    document.querySelector('#view-quotes [data-add-target="quote"]').click();

    expect(document.getElementById('view-operations').hidden).toBe(false);
    expect(document.getElementById('add-panel-quote').hidden).toBe(false);
    expect(document.getElementById('add-panel-order').hidden).toBe(true);
    expect(document.activeElement.id).toBe('add-tab-quote');
  });

  it('keeps only available quick actions and focuses the summary through its shortcut', () => {
    document.querySelector('#role-task-summary button').click();
    expect(document.activeElement.id).toBe('summary-heading');

    setRole(ROLES.AUDITOR);
    expect(document.getElementById('action-open-add').hidden).toBe(true);
    expect(document.getElementById('action-find').hidden).toBe(true);
    expect(document.getElementById('action-open-analytics').hidden).toBe(false);
    expect(document.getElementById('dashboard-shortcuts').hidden).toBe(false);
  });

  it('blocks a second conversion of the same quote', () => {
    const quote = createQuote({
      clienteId: seed.client.entity_id,
      vendedorId: 'Vendedor Demo',
      lineas: [{ productoId: seed.productos[0].id, cantidad: 1 }],
    });
    clickNav('nav-quotes');
    const role = document.getElementById('role-select');
    role.value = ROLES.JEFE_VENTAS;
    role.dispatchEvent(new window.Event('change', { bubbles: true }));
    document.querySelector('#quotes-body button[data-quote-action="aceptada"]').click();
    expect(listOrders()).toHaveLength(1);

    const quoteRow = [...document.querySelectorAll('#quotes-body tr')].find((row) =>
      row.textContent.includes(quote.numero),
    );
    expect(quoteRow.textContent).toMatch(/aceptada/);
    expect(quoteRow.querySelector('button[data-quote-action]')).toBeNull();
  });

  it('lets only Jefe de Ventas create and edit price lists and product prices', () => {
    clickNav('nav-operations');
    expect(document.getElementById('add-panel-pricing').hidden).toBe(true);

    const role = document.getElementById('role-select');
    role.value = ROLES.JEFE_VENTAS;
    role.dispatchEvent(new window.Event('change', { bubbles: true }));
    document.getElementById('add-tab-pricing').click();
    expect(document.getElementById('pricing-management-panel').hidden).toBe(false);

    document.getElementById('price-list-code').value = 'LP-UI';
    document.getElementById('price-list-name').value = 'Lista UI';
    document.getElementById('price-list-currency').value = 'CLP';
    document.getElementById('price-list-start').value = '2026-11-01';
    document.getElementById('price-list-form').dispatchEvent(
      new window.Event('submit', { bubbles: true, cancelable: true }),
    );
    const priceList = listListasPrecio().find((item) => item.codigo === 'LP-UI');
    expect(priceList).toBeDefined();

    document.getElementById('price-item-list').value = priceList.id;
    document.getElementById('price-item-list').dispatchEvent(new window.Event('change'));
    document.getElementById('price-item-product').value = seed.productos[0].id;
    document.getElementById('price-item-amount').value = '2500';
    document.getElementById('price-item-start').value = '2026-11-01';
    document.getElementById('price-item-form').dispatchEvent(
      new window.Event('submit', { bubbles: true, cancelable: true }),
    );
    const price = listPreciosProducto().find((item) => item.listaId === priceList.id);
    expect(price.precio).toBe(2500);

    document.getElementById('price-record-edit-select').value = price.id;
    document.getElementById('price-record-edit-select').dispatchEvent(
      new window.Event('change', { bubbles: true }),
    );
    document.getElementById('price-item-amount').value = '2750';
    document.getElementById('price-item-form').dispatchEvent(
      new window.Event('submit', { bubbles: true, cancelable: true }),
    );
    expect(listPreciosProducto().find((item) => item.id === price.id).precio).toBe(2750);

    role.value = ROLES.VENDEDOR;
    role.dispatchEvent(new window.Event('change', { bubbles: true }));
    expect(document.getElementById('add-panel-pricing').hidden).toBe(true);
    expect(document.getElementById('add-tab-pricing').disabled).toBe(true);
    expect(document.getElementById('price-item-save').disabled).toBe(true);
  });

  it('limits RMA approval to Jefe de Ventas and allows Postventa to complete it', () => {
    const { invoice, order } = seedInvoicedOrder(seed);
    const createRequest = (line) =>
      createReturn(
        {
          facturaId: invoice.id,
          motivo: 'Revisión RMA',
          fecha: '2026-11-10',
          lineas: [{ detallePedidoId: line.id, cantidad: 1 }],
        },
        { skipRoleCheck: true },
      );
    createRequest(order.lineas[0]);

    const role = document.getElementById('role-select');
    role.value = ROLES.JEFE_VENTAS;
    role.dispatchEvent(new window.Event('change', { bubbles: true }));
    clickNav('nav-returns');
    const approve = document.querySelector('#returns-list button[data-return-status="aprobada"]');
    expect(approve.disabled).toBe(false);
    approve.click();
    expect(document.querySelector('#returns-list li').textContent).toMatch(/aprobada/);

    role.value = ROLES.DEVOLUCIONES;
    role.dispatchEvent(new window.Event('change', { bubbles: true }));
    const complete = document.querySelector('#returns-list button[data-return-status="completada"]');
    expect(complete.disabled).toBe(false);
    complete.click();
    expect(document.querySelector('#returns-list li').textContent).toMatch(/completada/);

    createRequest(order.lineas[1]);
    role.value = ROLES.VENDEDOR;
    role.dispatchEvent(new window.Event('change', { bubbles: true }));
    const blockedApproval = document.querySelector(
      '#returns-list button[data-return-status="aprobada"]',
    );
    expect(blockedApproval.disabled).toBe(true);
  });

  it('limits Postventa to RMA operations and Auditor to the visual panel', () => {
    createQuote({
      clienteId: seed.client.entity_id,
      vendedorId: 'Vendedor Demo',
      lineas: [{ productoId: seed.productos[0].id, cantidad: 1 }],
    });
    const role = document.getElementById('role-select');
    role.value = ROLES.DEVOLUCIONES;
    role.dispatchEvent(new window.Event('change', { bubbles: true }));
    clickNav('nav-operations');
    expect(document.getElementById('view-returns').hidden).toBe(true);
    expect(document.getElementById('view-sales-order').hidden).toBe(true);
    expect(document.getElementById('add-panel-return').hidden).toBe(false);
    expect(document.getElementById('add-panel-quote').hidden).toBe(true);
    expect(document.getElementById('add-panel-pricing').hidden).toBe(true);
    clickNav('nav-returns');
    expect(document.getElementById('view-returns').hidden).toBe(false);

    role.value = ROLES.AUDITOR;
    role.dispatchEvent(new window.Event('change', { bubbles: true }));
    expect(document.getElementById('view-dashboard').hidden).toBe(false);
    expect(document.getElementById('nav-operations').hidden).toBe(false);
    expect(document.getElementById('nav-returns').hidden).toBe(true);
    expect(document.getElementById('nav-quotes').hidden).toBe(true);
    expect(document.getElementById('add-readonly-notice').hidden).toBe(false);
    expect(document.getElementById('summary-orders-heading').closest('[data-aggregated-detail]').hidden).toBe(true);
    expect(document.getElementById('summary-content').hidden).toBe(false);
    document.querySelectorAll('[data-add-tab]').forEach((tab) => {
      expect(tab.disabled).toBe(true);
      expect(tab.dataset.permissionLocked).toBe('true');
    });
    clickNav('nav-operations');
    expect(document.getElementById('view-operations').hidden).toBe(false);
  });

  it('masks internal costs and financial details according to the active role', () => {
    const role = document.getElementById('role-select');
    role.value = ROLES.JEFE_VENTAS;
    role.dispatchEvent(new window.Event('change', { bubbles: true }));
    clickNav('nav-products');
    expect(document.querySelector('th[data-sensitive="boss-only"]').hidden).toBe(false);
    expect(document.querySelector('#products-body tr').textContent).toContain('500 CLP');
    expect(document.querySelector('#products-body tr').textContent).toContain('50.0%');

    role.value = ROLES.VENDEDOR;
    role.dispatchEvent(new window.Event('change', { bubbles: true }));
    expect(document.querySelector('th[data-sensitive="boss-only"]').hidden).toBe(true);
    expect(document.querySelector('#products-body tr').textContent).not.toContain('500 CLP');
    expect(document.querySelector('#products-body tr').textContent).toContain('Reservado');

    const { order, invoice } = seedDeliveredOrder(seed);
    role.value = ROLES.DEVOLUCIONES;
    role.dispatchEvent(new window.Event('change', { bubbles: true }));
    clickNav('nav-sales-order');
    const rows = [...document.querySelectorAll('#sales-orders-body tr')];
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain(order.numero);
    expect(rows[0].textContent).not.toContain('CLP');
    expect(document.getElementById('dashboard-base-stats').hidden).toBe(true);
    expect(document.getElementById('summary-standard-metrics').hidden).toBe(true);
    expect(document.getElementById('summary-postventa-metrics').hidden).toBe(false);

    clickNav('nav-operations');
    const invoiceOption = [...document.getElementById('return-invoice').options].find(
      (option) => option.value === invoice.id,
    );
    expect(invoiceOption.textContent).not.toContain('CLP');
    document.getElementById('return-invoice').value = invoice.id;
    document.getElementById('return-invoice').dispatchEvent(new window.Event('change'));
    expect(document.querySelector('#return-lines label').textContent).not.toContain('CLP');
  });

  it('shows exactly the FR-068 sidebar entries for every role', () => {
    for (const role of ALL_ROLES) {
      setRole(role);
      expect(visibleModules()).toEqual([...expectedMenus[role]].sort());
    }
  });

  it('keeps every pair of roles distinct in menu composition', () => {
    for (let i = 0; i < ALL_ROLES.length; i += 1) {
      for (let j = i + 1; j < ALL_ROLES.length; j += 1) {
        const first = visibleModulesAfterRole(ALL_ROLES[i]).join('|');
        const second = visibleModulesAfterRole(ALL_ROLES[j]).join('|');
        expect(first).not.toBe(second);
      }
    }
  });

  it('redirects direct access to a module excluded for the active role', async () => {
    const { showModule } = await import('../../src/app.js');
    const forbidden = {
      [ROLES.VENDEDOR]: 'invoices',
      [ROLES.OPERACIONES]: 'dashboard',
      [ROLES.GERENTE]: 'delivery',
      [ROLES.DEVOLUCIONES]: 'quotes',
      [ROLES.JEFE_VENTAS]: 'ruta-inexistente',
      [ROLES.FACTURACION]: 'products',
      [ROLES.AUDITOR]: 'sales-order',
    };
    for (const role of ALL_ROLES) {
      setRole(role);
      showModule(forbidden[role]);
      expect(document.getElementById('view-dashboard').hidden).toBe(false);
      const notice = document.getElementById('route-notice');
      expect(notice.hidden).toBe(false);
      expect(notice.textContent).toMatch(/no disponible/i);
    }
  });
});

function visibleModulesAfterRole(role){
  setRole(role);
  return visibleModules();
}
