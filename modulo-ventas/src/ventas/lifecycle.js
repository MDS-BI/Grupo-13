export const ORDER_STATUSES = Object.freeze(['cotización', 'pedido', 'facturado', 'entregado', 'cancelado']);

export const ORDER_TRANSITIONS = Object.freeze({
  'cotización': Object.freeze(['pedido', 'cancelado']),
  pedido: Object.freeze(['facturado', 'cancelado']),
  facturado: Object.freeze(['entregado']),
  entregado: Object.freeze([]),
  cancelado: Object.freeze([])
});

export const TERMINAL_STATUSES = Object.freeze(['entregado', 'cancelado']);

export function statuses(){
  return [...ORDER_STATUSES];
}

export function isKnownStatus(status){
  return ORDER_STATUSES.includes(status);
}

export function isTerminal(status){
  return TERMINAL_STATUSES.includes(status);
}

export function allowedTransitions(from){
  if(from === undefined || from === null || from === '') return [...ORDER_STATUSES];
  return [...(ORDER_TRANSITIONS[from] || [])];
}

export function canTransition(from, to){
  if(!isKnownStatus(to)) return false;
  if(from === undefined || from === null || from === '') return true;
  if(from === to) return true;
  if(isTerminal(from)) return false;
  return allowedTransitions(from).includes(to);
}

export function transitionError(from, to){
  return `Transición de estado inválida de "${from}" a "${to}"`;
}

export function assertTransition(from, to){
  if(!canTransition(from, to)){
    throw new Error(transitionError(from, to));
  }
  return true;
}

export function assertModifiable(status){
  if(isTerminal(status)){
    throw new Error(`El estado "${status}" es terminal y no admite modificaciones posteriores`);
  }
  return true;
}

export function validateTransition(from, to){
  if(canTransition(from, to)) return { valid: true, errors: {} };
  return { valid: false, errors: { status: transitionError(from, to) } };
}
