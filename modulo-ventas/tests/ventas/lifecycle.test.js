import { describe, it, expect } from 'vitest';
import {
  ORDER_STATUSES,
  statuses,
  isKnownStatus,
  isTerminal,
  allowedTransitions,
  canTransition,
  assertTransition,
  assertModifiable,
  validateTransition,
  transitionError
} from '../../src/ventas/lifecycle.js';

describe('order lifecycle', () => {
  it('exposes the configured commercial statuses', () => {
    expect(statuses()).toEqual([...ORDER_STATUSES]);
    expect(ORDER_STATUSES).toContain('cotización');
    expect(ORDER_STATUSES).toContain('entregado');
  });

  it('accepts only the allowed transitions', () => {
    expect(canTransition('cotización', 'pedido')).toBe(true);
    expect(canTransition('cotización', 'cancelado')).toBe(true);
    expect(canTransition('pedido', 'facturado')).toBe(true);
    expect(canTransition('facturado', 'entregado')).toBe(true);
    expect(canTransition('pedido', 'entregado')).toBe(false);
    expect(canTransition('cotización', 'facturado')).toBe(false);
  });

  it('treats entregado and cancelado as terminal states', () => {
    expect(isTerminal('entregado')).toBe(true);
    expect(isTerminal('cancelado')).toBe(true);
    expect(isTerminal('pedido')).toBe(false);
    expect(allowedTransitions('entregado')).toEqual([]);
    expect(() => assertModifiable('entregado')).toThrow(/terminal/);
  });

  it('explains invalid transitions with both states', () => {
    expect(transitionError('facturado', 'cotización')).toContain('facturado');
    expect(transitionError('facturado', 'cotización')).toContain('cotización');
    expect(() => assertTransition('entregado', 'pedido')).toThrow(/Transición de estado inválida/);
    expect(validateTransition('entregado', 'pedido').valid).toBe(false);
    expect(validateTransition('facturado', 'entregado').valid).toBe(true);
  });

  it('accepts any known status when the current status is unknown', () => {
    expect(canTransition(undefined, 'pedido')).toBe(true);
    expect(isKnownStatus('archivado')).toBe(false);
  });
});
