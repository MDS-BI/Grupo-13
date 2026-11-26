import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { normalizeConfig } from '../../src/module-config.js';
import { addEntity, addDocument, loadEntities } from '../../src/storage.js';

const html = fs.readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');

let dom;

function qs(id){ return document.getElementById(id); }

const salesConfig = {
  moduleName: 'Ventas',
  labels: { entity: 'Cliente', entities: 'Clientes', document: 'Pedido de Venta', documents: 'Pedidos de Venta' }
};

beforeEach(async () => {
  dom = new JSDOM(html, { url: 'http://localhost/' });
  const w = dom.window;
  globalThis.window = w;
  globalThis.document = w.document;
  globalThis.localStorage = w.localStorage;
  globalThis.alert = vi.fn();
  globalThis.confirm = vi.fn(() => true);
  w.scrollTo = vi.fn();
  w.localStorage.clear();
});

afterEach(() => {
  dom.window.close();
});

async function bootWith(configOverride){
  vi.resetModules();
  const { initApp } = await import('../../src/app.js');
  await initApp(normalizeConfig(configOverride));
}

describe('User Story 3 - Panel metrics and centralized registration', () => {
  it('opens on Panel with aggregate reports and keeps operational views separate', async () => {
    await bootWith(undefined);
    expect(qs('view-dashboard').hidden).toBe(false);
    expect(qs('view-operations').hidden).toBe(true);
    expect(qs('view-clients').hidden).toBe(true);
    expect(qs('view-search').hidden).toBe(true);
    expect(qs('view-quotes').hidden).toBe(true);
    expect(qs('view-products').hidden).toBe(true);
    expect(qs('view-summary').hidden).toBe(false);
  });

  it('links registration to the single Agregar section', async () => {
    await bootWith(salesConfig);
    expect(qs('action-open-add').textContent).toMatch(/Crear un registro/);
    expect(qs('action-find-title').textContent).toBe('Buscar clientes');
    expect(qs('operations-heading').textContent).toBe('Agregar');
    expect(document.querySelectorAll('#operations-forms [role="tab"]').length).toBe(6);
  });

  it('uses configured terminology on stat cards', async () => {
    await bootWith(salesConfig);
    expect(qs('stat-entities-label').textContent).toBe('Clientes');
    expect(qs('stat-documents-label').textContent).toBe('Documentos de clientes');
  });

  it('shows live statistics that match stored records', async () => {
    await bootWith(undefined);
    expect(qs('stat-entities').textContent).toBe('0');
    expect(qs('stat-documents').textContent).toBe('0');

    const entity = addEntity({ name: 'Acme', code: 'AC-001' });
    addEntity({ name: 'Globex', code: 'GL-002' });
    addDocument({ entityId: entity.entity_id, folio: 1001, startDate: '2026-08-01', endDate: '2026-08-05' });

    qs('nav-dashboard').click();
    expect(qs('stat-entities').textContent).toBe('2');
    expect(qs('stat-documents').textContent).toBe('1');
  });

  it('refreshes statistics after creating records elsewhere in the app', async () => {
    await bootWith(undefined);
    qs('nav-clients').click();
    qs('name').value = 'Acme';
    qs('code').value = 'AC-001';
    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    expect(loadEntities().length).toBe(1);

    qs('nav-dashboard').click();
    expect(qs('stat-entities').textContent).toBe('1');
  });

  it('opens the entity management area with a cleared form via the new-entity action', async () => {
    await bootWith(undefined);
    qs('action-open-add').click();
    qs('add-tab-client').click();
    expect(qs('entity-id').value).toBe('');
    expect(qs('name').value).toBe('');
  });

  it('opens document registration from its tab in Agregar', async () => {
    await bootWith(undefined);
    qs('nav-operations').click();
    qs('add-tab-document').click();
    expect(qs('document-id').value).toBe('');
    expect(qs('add-panel-document').hidden).toBe(false);
  });

  it('opens the search screen with a focused search field via the find action', async () => {
    await bootWith(undefined);
    qs('action-find').click();
    expect(qs('view-search').hidden).toBe(false);
    expect(qs('view-dashboard').hidden).toBe(true);
    expect(document.activeElement).toBe(qs('search-input'));
  });
});
