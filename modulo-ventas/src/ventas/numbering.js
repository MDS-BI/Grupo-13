import { COLLECTIONS, loadCollection, saveCollection } from './collections.js';

export function formatNumber(serie, folio){
  const prefix = String(serie || '').trim().toUpperCase();
  const value = Number(folio);
  if(!prefix) return String(value);
  return `${prefix}-${value}`;
}

export function getFolio(serie){
  const entry = loadCollection(COLLECTIONS.secuencias).find(s => s.serie === serie);
  return entry ? Number(entry.folio) || 0 : 0;
}

export function seedFolio(serie, folio){
  const list = loadCollection(COLLECTIONS.secuencias);
  const idx = list.findIndex(s => s.serie === serie);
  const value = Math.max(0, Number(folio) || 0);
  if(idx === -1) list.push({ serie, folio: value });
  else list[idx] = { ...list[idx], folio: Math.max(list[idx].folio, value) };
  saveCollection(COLLECTIONS.secuencias, list);
  return value;
}

export function nextFolio(serie){
  const list = loadCollection(COLLECTIONS.secuencias);
  const idx = list.findIndex(s => s.serie === serie);
  const current = idx === -1 ? 0 : Number(list[idx].folio) || 0;
  const folio = current + 1;
  if(idx === -1) list.push({ serie, folio });
  else list[idx] = { ...list[idx], folio };
  saveCollection(COLLECTIONS.secuencias, list);
  return folio;
}

export function peekNextFolio(serie){
  return getFolio(serie) + 1;
}

export function isNumberUnique(collectionName, numero, excludeId){
  const value = String(numero || '').trim();
  if(!value) return true;
  return !loadCollection(collectionName).some(item => item.numero === value && item.id !== excludeId);
}

export function reserveNumber({ serie = 'PED', collection = COLLECTIONS.pedidos } = {}){
  const prefix = String(serie || 'PED').trim().toUpperCase();
  let folio = nextFolio(prefix);
  let numero = formatNumber(prefix, folio);
  let guard = 0;
  while(!isNumberUnique(collection, numero) && guard < 1000){
    folio = nextFolio(prefix);
    numero = formatNumber(prefix, folio);
    guard += 1;
  }
  return { serie: prefix, folio, numero };
}

export function resetSequences(){
  saveCollection(COLLECTIONS.secuencias, []);
}
