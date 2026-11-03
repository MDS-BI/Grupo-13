const PREFIX = 'erp_ventas:';

export const COLLECTIONS = Object.freeze({
  zonas: 'zonas',
  vendedores: 'vendedores',
  categorias: 'categorias',
  listasPrecio: 'listas_precio',
  productos: 'productos',
  preciosProducto: 'precios_producto',
  cotizaciones: 'cotizaciones',
  pedidos: 'pedidos',
  detallesPedido: 'detalles_pedido',
  facturas: 'facturas',
  pagos: 'pagos',
  devoluciones: 'devoluciones',
  detallesDevolucion: 'detalles_devolucion',
  auditoria: 'auditoria',
  secuencias: 'secuencias'
});

export const ALL_COLLECTION_NAMES = Object.freeze(Object.values(COLLECTIONS));

function getStorage(){
  const storage = globalThis.localStorage;
  if(!storage){
    throw new Error('No hay almacenamiento disponible para el módulo de Ventas');
  }
  return storage;
}

export function collectionKey(name){
  return `${PREFIX}${name}`;
}

export function loadCollection(name){
  try{
    const raw = getStorage().getItem(collectionKey(name));
    if(!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  }catch(e){
    console.error(`Failed to parse collection "${name}" from storage`, e);
    return [];
  }
}

export function saveCollection(name, items){
  getStorage().setItem(collectionKey(name), JSON.stringify(Array.isArray(items) ? items : []));
  return items;
}

export function generateId(){
  const base = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  return base;
}

export function generateEntityId(){
  return generateId();
}

export function findById(name, id){
  if(!id) return undefined;
  return loadCollection(name).find(item => item.id === id);
}

export function findByKey(name, key, value){
  if(value === undefined || value === null) return undefined;
  return loadCollection(name).find(item => item[key] === value);
}

export function findByField(name, key, value){
  return findByKey(name, key, value);
}

export function appendToCollection(name, item){
  const list = loadCollection(name);
  list.push(item);
  saveCollection(name, list);
  return item;
}

export function updateInCollection(name, id, updates){
  const list = loadCollection(name);
  const idx = list.findIndex(item => item.id === id);
  if(idx === -1) throw new Error(`Registro no encontrado en ${name}`);
  list[idx] = { ...list[idx], ...updates };
  saveCollection(name, list);
  return list[idx];
}

export function removeFromCollection(name, id){
  const list = loadCollection(name);
  const next = list.filter(item => item.id !== id);
  saveCollection(name, next);
  return next;
}

export function clearCollections(){
  const storage = getStorage();
  for(const name of ALL_COLLECTION_NAMES){
    storage.removeItem(collectionKey(name));
  }
  storage.removeItem(`${PREFIX}current_role`);
}

export function nextLineNumber(items){
  return items.reduce((max, item) => Math.max(max, Number(item.linea) || 0), 0) + 1;
}
