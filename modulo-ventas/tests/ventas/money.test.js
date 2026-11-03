import { describe, it, expect } from 'vitest';
import {
  currencyDecimals,
  roundMoney,
  lineSubtotal,
  lineTax,
  calculateLine,
  orderTotals,
  invoiceTotals,
  sumPayments,
  outstandingBalance
} from '../../src/ventas/money.js';

describe('money', () => {
  it('rounds according to the currency precision', () => {
    expect(currencyDecimals('CLP')).toBe(0);
    expect(currencyDecimals('MXN')).toBe(2);
    expect(roundMoney(10.4, 'CLP')).toBe(10);
    expect(roundMoney(10.5, 'CLP')).toBe(11);
    expect(roundMoney(10.555, 'USD')).toBe(10.56);
  });

  it('calculates line subtotal and tax', () => {
    expect(lineSubtotal(3, 1000, 0, 'CLP')).toBe(3000);
    expect(lineSubtotal(3, 1000, 500, 'CLP')).toBe(2500);
    expect(lineTax(2500, 19, 'CLP')).toBe(475);
    expect(calculateLine({ cantidad: 2, precioUnitario: 50, impuestoPorcentaje: 16 }, 'MXN')).toMatchObject({
      subtotalLinea: 100,
      impuestoLinea: 16
    });
  });

  it('consolidates totals for lines with different tax rates', () => {
    const totals = orderTotals([
      { cantidad: 1, precioUnitario: 1000, impuestoPorcentaje: 19 },
      { cantidad: 2, precioUnitario: 500, impuestoPorcentaje: 10 }
    ], { currency: 'CLP', descuento: 100 });
    expect(totals.subtotal).toBe(2000);
    expect(totals.impuesto).toBe(290);
    expect(totals.descuento).toBe(100);
    expect(totals.total).toBe(2190);
    expect(totals.lineas).toHaveLength(2);
  });

  it('keeps invoice totals consistent with order totals', () => {
    const lines = [{ cantidad: 1, precioUnitario: 1000, impuestoPorcentaje: 19 }];
    expect(invoiceTotals(lines, { currency: 'CLP' }).total).toBe(1190);
  });

  it('sums payments and computes the outstanding balance', () => {
    const payments = [{ monto: 500 }, { monto: 200 }];
    expect(sumPayments(payments)).toBe(700);
    expect(outstandingBalance(1000, payments, 'CLP')).toBe(300);
  });
});
