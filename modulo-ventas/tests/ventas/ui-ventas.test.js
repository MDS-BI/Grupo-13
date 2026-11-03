import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupDom, bootApp, resetVentasStorage, seedVentas } from './fixtures.js';
import { listOrders } from '../../src/ventas/orders.js';
import { setCurrentRole, ROLES } from '../../src/ventas/roles.js';

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
});
