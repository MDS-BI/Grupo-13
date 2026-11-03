import { COLLECTIONS, generateId, loadCollection, saveCollection } from './collections.js';
import { getConfig } from '../module-config.js';

function now(){ return new Date().toISOString(); }
function text(value){ return String(value ?? '').trim(); }
function isEmpty(value){ return value === undefined || value === null || text(value) === ''; }
function isValidEmail(value){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(value)); }

export function validateZona(payload = {}, options = {}){
  const errors = {};
  const codigo = text(payload.codigo ?? payload.code);
  const nombre = text(payload.nombre ?? payload.name);
  if(!codigo) errors.codigo = 'El código de la zona es obligatorio';
  if(!nombre) errors.nombre = 'El nombre de la zona es obligatorio';
  const zonas = loadCollection(COLLECTIONS.zonas);
  if(codigo && zonas.some(z => text(z.codigo).toLowerCase() === codigo.toLowerCase() && z.id !== options.excludeId)){
    errors.codigo = `Ya existe una zona con el código "${codigo}"`;
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function createZona(payload = {}){
  const check = validateZona(payload);
  if(!check.valid) throw new Error(Object.values(check.errors)[0]);
  const timestamp = now();
  const zona = {
    id: generateId(),
    codigo: text(payload.codigo ?? payload.code),
    nombre: text(payload.nombre ?? payload.name),
    descripcion: text(payload.descripcion ?? payload.description) || undefined,
    activo: payload.activo === undefined ? true : Boolean(payload.activo),
    createdAt: timestamp,
    updatedAt: timestamp
  };
  const list = loadCollection(COLLECTIONS.zonas);
  list.push(zona);
  saveCollection(COLLECTIONS.zonas, list);
  return zona;
}

export function listZonas(){
  return loadCollection(COLLECTIONS.zonas);
}

export function findZona(reference){
  const value = text(reference);
  if(!value) return undefined;
  return listZonas().find(z => z.id === value
    || text(z.codigo).toLowerCase() === value.toLowerCase()
    || text(z.nombre).toLowerCase() === value.toLowerCase());
}

export function validateVendedor(payload = {}, options = {}){
  const errors = {};
  const codigo = text(payload.codigo ?? payload.code);
  const nombre = text(payload.nombre ?? payload.name);
  if(!codigo) errors.codigo = 'El código del vendedor es obligatorio';
  if(!nombre) errors.nombre = 'El nombre del vendedor es obligatorio';
  if(!isEmpty(payload.email) && !isValidEmail(payload.email)) errors.email = 'El correo electrónico del vendedor no es válido';
  const vendedores = loadCollection(COLLECTIONS.vendedores);
  if(codigo && vendedores.some(v => text(v.codigo).toLowerCase() === codigo.toLowerCase() && v.id !== options.excludeId)){
    errors.codigo = `Ya existe un vendedor con el código "${codigo}"`;
  }
  const zonaId = payload.zonaId ?? payload.zona_id;
  if(!isEmpty(zonaId) && !findZona(zonaId)){
    errors.zonaId = 'La zona indicada no existe';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function createVendedor(payload = {}){
  const check = validateVendedor(payload);
  if(!check.valid) throw new Error(Object.values(check.errors)[0]);
  const timestamp = now();
  const zona = findZona(payload.zonaId ?? payload.zona_id);
  const vendedor = {
    id: generateId(),
    codigo: text(payload.codigo ?? payload.code),
    nombre: text(payload.nombre ?? payload.name),
    email: text(payload.email) || undefined,
    telefono: text(payload.telefono ?? payload.phone) || undefined,
    zonaId: zona ? zona.id : undefined,
    activo: payload.activo === undefined ? true : Boolean(payload.activo),
    createdAt: timestamp,
    updatedAt: timestamp
  };
  const list = loadCollection(COLLECTIONS.vendedores);
  list.push(vendedor);
  saveCollection(COLLECTIONS.vendedores, list);
  return vendedor;
}

export function listVendedores(){
  return loadCollection(COLLECTIONS.vendedores);
}

export function findVendedor(reference){
  const value = text(reference);
  if(!value) return undefined;
  return listVendedores().find(v => v.id === value
    || text(v.codigo).toLowerCase() === value.toLowerCase()
    || text(v.nombre).toLowerCase() === value.toLowerCase());
}

export function validateZonaReference(reference){
  return findZona(reference) ? { valid: true, errors: {} } : { valid: false, errors: { zonaId: 'La zona indicada no existe' } };
}

export function validateVendedorReference(reference){
  return findVendedor(reference) ? { valid: true, errors: {} } : { valid: false, errors: { vendedorId: 'El vendedor indicado no existe' } };
}

export function seedMasters(config = getConfig()){
  const zonas = [];
  const fields = Array.isArray(config?.customFields) ? config.customFields : [];
  const zonaField = fields.find(field => field.target === 'entity' && field.key === 'zona');
  for(const option of zonaField?.options || []){
    if(findZona(option)) continue;
    try{
      zonas.push(createZona({
        codigo: text(option).toUpperCase().replace(/\s+/g, '_'),
        nombre: option,
        descripcion: `Zona ${option}`
      }));
    }catch(e){
      // Ignore options that cannot be seeded (already exists or invalid).
    }
  }
  const vendedores = [];
  for(const item of config?.businessRules?.vendedores || []){
    if(findVendedor(item.codigo || item.nombre)) continue;
    try{
      vendedores.push(createVendedor(item));
    }catch(e){
      // Ignore invalid seed entries; validation reports them when used directly.
    }
  }
  return { zonas, vendedores };
}

export function resetMasters(){
  saveCollection(COLLECTIONS.zonas, []);
  saveCollection(COLLECTIONS.vendedores, []);
}
