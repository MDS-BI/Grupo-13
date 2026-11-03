const CURRENCY_DECIMALS = Object.freeze({
  CLP: 0,
  COP: 0,
  JPY: 0,
  PYG: 0,
  MXN: 2,
  USD: 2,
  EUR: 2,
  ARS: 2,
  PEN: 2,
  BRL: 2,
  GBP: 2,
  UYU: 2
});

export function currencyDecimals(currency){
  const code = String(currency || 'CLP').trim().toUpperCase();
  return CURRENCY_DECIMALS[code] ?? 2;
}

export function roundMoney(value, currency = 'CLP'){
  const number = Number(value);
  if(!Number.isFinite(number)) return 0;
  const factor = 10 ** currencyDecimals(currency);
  return Math.round((number + Number.EPSILON) * factor) / factor;
}

function num(value){
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function readLine(line){
  return {
    cantidad: num(line.cantidad ?? line.quantity),
    precioUnitario: num(line.precioUnitario ?? line.precio_unitario ?? line.precio),
    descuentoLinea: num(line.descuentoLinea ?? line.descuento_linea ?? line.descuento),
    impuestoPorcentaje: num(line.impuestoPorcentaje ?? line.impuesto_porcentaje ?? line.taxRate)
  };
}

export function lineSubtotal(cantidad, precioUnitario, descuentoLinea = 0, currency = 'CLP'){
  const gross = num(cantidad) * num(precioUnitario);
  return roundMoney(gross - num(descuentoLinea), currency);
}

export function lineTax(subtotalLinea, impuestoPorcentaje, currency = 'CLP'){
  return roundMoney(num(subtotalLinea) * num(impuestoPorcentaje) / 100, currency);
}

export function calculateLine(line, currency = 'CLP'){
  const values = readLine(line);
  const subtotalLinea = lineSubtotal(values.cantidad, values.precioUnitario, values.descuentoLinea, currency);
  const impuestoLinea = lineTax(subtotalLinea, values.impuestoPorcentaje, currency);
  return {
    cantidad: values.cantidad,
    precioUnitario: values.precioUnitario,
    descuentoLinea: values.descuentoLinea,
    impuestoPorcentaje: values.impuestoPorcentaje,
    subtotalLinea,
    impuestoLinea
  };
}

export function subtotalOfLines(lines, currency = 'CLP'){
  return (lines || []).reduce((sum, line) => {
    const calc = line.subtotalLinea !== undefined ? line : calculateLine(line, currency);
    return sum + num(calc.subtotalLinea);
  }, 0);
}

export function orderTotals(lines, options = {}){
  const currency = options.currency || options.moneda || 'CLP';
  const descuento = roundMoney(options.descuento ?? options.discount ?? 0, currency);
  const calculated = (lines || []).map(line => {
    const values = readLine(line);
    const base = calculateLine(values, currency);
    return { ...line, ...values, subtotalLinea: base.subtotalLinea, impuestoLinea: base.impuestoLinea };
  });
  const subtotal = roundMoney(calculated.reduce((sum, line) => sum + num(line.subtotalLinea), 0), currency);
  const impuesto = roundMoney(calculated.reduce((sum, line) => sum + num(line.impuestoLinea), 0), currency);
  const total = roundMoney(subtotal - descuento + impuesto, currency);
  return {
    subtotal,
    descuento,
    impuesto,
    total,
    lineas: calculated
  };
}

export function invoiceTotals(lines, options = {}){
  return orderTotals(lines, options);
}

export function sumPayments(payments){
  return (payments || []).reduce((sum, p) => sum + num(p.monto), 0);
}

export function outstandingBalance(total, payments, currency = 'CLP'){
  return roundMoney(num(total) - sumPayments(payments), currency);
}

export function isCurrencyEqual(a, b, currency = 'CLP'){
  return roundMoney(a, currency) === roundMoney(b, currency);
}
