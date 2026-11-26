import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupDom, bootApp, resetVentasStorage, seedVentas } from './fixtures.js';
import { setCurrentRole, ROLES } from '../../src/ventas/roles.js';
import {
  ensureFeedbackPattern,
  showListLoading,
  hideListLoading,
  runWithBusy,
} from '../../src/components/ventas/loading-feedback.js';

beforeEach(async () => {
  vi.resetModules();
  setupDom();
  resetVentasStorage();
  seedVentas();
  setCurrentRole(ROLES.JEFE_VENTAS);
  await bootApp();
});

describe('shared loading and feedback pattern', () => {
  it('adds an accessible loading indicator and feedback region to every view', () => {
    const views = [...document.querySelectorAll('.view-panel')];
    expect(views.length).toBeGreaterThanOrEqual(13);
    for (const view of views) {
      const loading = view.querySelector('[data-loading]');
      expect(loading).not.toBeNull();
      expect(loading.getAttribute('role')).toBe('status');
      expect(loading.getAttribute('aria-live')).toBe('polite');
      expect(view.querySelector('[data-view-feedback]')?.getAttribute('aria-live')).toBe('polite');
    }
  });

  it('toggles an accessible indicator while a list is refreshed', () => {
    const view = document.getElementById('view-sales-order');
    showListLoading(view, 'Actualizando órdenes…');
    const loading = view.querySelector('[data-loading]');
    expect(view.getAttribute('aria-busy')).toBe('true');
    expect(loading.hidden).toBe(false);
    expect(loading.textContent).toContain('Actualizando órdenes');

    hideListLoading(view);
    expect(view.getAttribute('aria-busy')).toBe('false');
    expect(loading.hidden).toBe(true);
  });

  it('disables a button and shows a spinner during an async action', async () => {
    let finish;
    const button = document.createElement('button');
    button.textContent = 'Guardar';
    const feedback = document.createElement('p');
    const task = () => new Promise((resolve) => { finish = resolve; });

    const pending = runWithBusy(button, task, { feedback, success: 'Cambios guardados.' });
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.querySelector('.spinner')).not.toBeNull();

    finish();
    const outcome = await pending;
    expect(outcome.ok).toBe(true);
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-busy')).toBe('false');
    expect(feedback.getAttribute('aria-live')).toBe('polite');
    expect(feedback.textContent).toContain('Cambios guardados.');
  });

  it('announces an error with a recovery action and restores the button', async () => {
    const button = document.createElement('button');
    button.textContent = 'Guardar';
    const feedback = document.createElement('p');

    const outcome = await runWithBusy(
      button,
      () => { throw new Error('Fallo de prueba'); },
      { feedback, error: 'No se pudo guardar.', recoveryLabel: 'Reintentar' },
    );

    expect(outcome.ok).toBe(false);
    expect(button.disabled).toBe(false);
    expect(button.querySelector('.spinner')).toBeNull();
    expect(feedback.getAttribute('aria-live')).toBe('polite');
    expect(feedback.textContent).toContain('No se pudo guardar.');
    const retry = feedback.querySelector('[data-feedback-retry]');
    expect(retry).not.toBeNull();
    expect(retry.textContent).toBe('Reintentar');
  });

  it('keeps every success and error message inside an aria-live region', () => {
    for (const element of document.querySelectorAll('.feedback, .form-feedback, [data-view-feedback]')) {
      expect(element.getAttribute('aria-live')).toBe('polite');
    }
  });

  it('exposes the shared pattern to application code', () => {
    expect(typeof ensureFeedbackPattern).toBe('function');
    expect(typeof showListLoading).toBe('function');
    expect(typeof hideListLoading).toBe('function');
    expect(typeof runWithBusy).toBe('function');
  });
});
