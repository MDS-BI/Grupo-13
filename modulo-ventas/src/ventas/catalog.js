import { COLLECTIONS, generateId, loadCollection, saveCollection } from './collections.js';
import { isValidDate } from '../storage.js';
import { roundMoney } from './money.js';

function now(){ return new Date().toISOString(); }
function text(value){ return String(value ?? '').trim(); }
function isEmpty(value){ return value === undefined || value === null || text(value) === ''; }
function num(value){ const n = Number(value); return Number.isFinite(n) ? n : NaN; }
function today(){ return new Date().toISOString().slice(0, 10); }

function field(payload, camel, snake, fallback){
  if(payload[camel] !== undefined) return payload[camel];
  if(payload[snake] !== undefined) return payload[snake];
  return fallback;
}

export function listCategorias(){
  return loadCollection(COLLECTIONS.categorias);
}

export function validateCategoria(payload = {}, options = {}){
  const errors = {};
  const nombre = text(field(payload, 'nombre', 'nombre', field(payload, 'name', 'name', '')));
  if(!nombre) errors.nombre = 'El nombre de la categoría es obligatorio';
  const categorias = listCategorias();
  if(nombre && categorias.some(c => text(c.nombre).toLowerCase() === nombre.toLowerCase() && c.id !== options.excludeId)){
    errors.nombre = `Ya existe una categoría con el nombre "${nombre}"`;
  }
  const padreId = field(payload, 'padreId', 'padre_id', undefined);
  if(!isEmpty(padreId)){
    if(padreId === options.excludeId) errors.padreId = 'La categoría no puede ser su propia categoría padre';
    else if(!categorias.some(c => c.id === padreId)) errors.padreId = 'La categoría padre no existe';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function createCategoria(payload = {}){
  const check = validateCategoria(payload);
  if(!check.valid) throw new Error(Object.values(check.errors)[0]);
  const timestamp = now();
  const categoria = {
    id: generateId(),
    nombre: text(field(payload, 'nombre', 'nombre', field(payload, 'name', 'name', ''))),
    descripcion: text(field(payload, 'descripcion', 'descripcion', payload.description)) || undefined,
    padreId: field(payload, 'padreId', 'padre_id', undefined) || undefined,
    activo: payload.activo === undefined ? true : Boolean(payload.activo),
    createdAt: timestamp,
    updatedAt: timestamp
  };
  const list = listCategorias();
  list.push(categoria);
  saveCollection(COLLECTIONS.categorias, list);
  return categoria;
}

export function listListasPrecio(){
  return loadCollection(COLLECTIONS.listasPrecio);
}

export function validateListaPrecio(payload = {}, options = {}){
  const errors = {};
  const codigo = text(field(payload, 'codigo', 'codigo', field(payload, 'code', 'code', '')));
  const nombre = text(field(payload, 'nombre', 'nombre', field(payload, 'name', 'name', '')));
  const moneda = text(field(payload, 'moneda', 'moneda', field(payload, 'currency', 'currency', '')));
  const vigenteDesde = text(field(payload, 'vigenteDesde', 'vigente_desde', ''));
  const vigenteHasta = text(field(payload, 'vigenteHasta', 'vigente_hasta', ''));
  if(!codigo) errors.codigo = 'El código de la lista es obligatorio';
  if(!nombre) errors.nombre = 'El nombre de la lista es obligatorio';
  if(!moneda) errors.moneda = 'La moneda de la lista es obligatoria';
  if(!vigenteDesde) errors.vigenteDesde = 'La fecha de vigencia inicial es obligatoria';
  else if(!isValidDate(vigenteDesde)) errors.vigenteDesde = 'La fecha de vigencia inicial debe ser una fecha válida (YYYY-MM-DD)';
  if(!isEmpty(vigenteHasta)){
    if(!isValidDate(vigenteHasta)) errors.vigenteHasta = 'La fecha de vigencia final debe ser una fecha válida (YYYY-MM-DD)';
    else if(isValidDate(vigenteDesde) && vigenteHasta < vigenteDesde) errors.vigenteHasta = 'La vigencia final debe ser igual o posterior a la inicial';
  }
  const listas = listListasPrecio();
  if(codigo && listas.some(l => text(l.codigo).toLowerCase() === codigo.toLowerCase() && l.id !== options.excludeId)){
    errors.codigo = `Ya existe una lista con el código "${codigo}"`;
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function createListaPrecio(payload = {}){
  const check = validateListaPrecio(payload);
  if(!check.valid) throw new Error(Object.values(check.errors)[0]);
  const timestamp = now();
  const lista = {
    id: generateId(),
    codigo: text(field(payload, 'codigo', 'codigo', field(payload, 'code', 'code', ''))),
    nombre: text(field(payload, 'nombre', 'nombre', field(payload, 'name', 'name', ''))),
    moneda: text(field(payload, 'moneda', 'moneda', field(payload, 'currency', 'currency', 'CLP'))).toUpperCase(),
    vigenteDesde: text(field(payload, 'vigenteDesde', 'vigente_desde', today())),
    vigenteHasta: text(field(payload, 'vigenteHasta', 'vigente_hasta', '')) || undefined,
    activa: payload.activa === undefined ? true : Boolean(payload.activa),
    createdAt: timestamp,
    updatedAt: timestamp
  };
  const list = listListasPrecio();
  list.push(lista);
  saveCollection(COLLECTIONS.listasPrecio, list);
  return lista;
}

export function listProductos(){
  return loadCollection(COLLECTIONS.productos);
}

export function getProducto(reference){
  const value = text(reference);
  if(!value) return undefined;
  return listProductos().find(p => p.id === value || text(p.sku).toLowerCase() === value.toLowerCase());
}

export function validateProducto(payload = {}, options = {}){
  const errors = {};
  const sku = text(field(payload, 'sku', 'sku', ''));
  const nombre = text(field(payload, 'nombre', 'nombre', field(payload, 'name', 'name', '')));
  const unidadMedida = text(field(payload, 'unidadMedida', 'unidad_medida', 'UN'));
  const impuesto = num(field(payload, 'impuestoPorcentaje', 'impuesto_porcentaje', 0));
  const stockActual = num(field(payload, 'stockActual', 'stock_actual', 0));
  const stockMinimo = field(payload, 'stockMinimo', 'stock_minimo', undefined);
  if(!sku) errors.sku = 'El SKU del producto es obligatorio';
  if(!nombre) errors.nombre = 'El nombre del producto es obligatorio';
  if(!unidadMedida) errors.unidadMedida = 'La unidad de medida es obligatoria';
  if(Number.isNaN(impuesto) || impuesto < 0 || impuesto > 100) errors.impuestoPorcentaje = 'El impuesto debe estar entre 0 y 100';
  if(Number.isNaN(stockActual) || stockActual < 0) errors.stockActual = 'El stock actual debe ser un número no negativo';
  if(!isEmpty(stockMinimo) && (Number.isNaN(num(stockMinimo)) || num(stockMinimo) < 0)) errors.stockMinimo = 'El stock mínimo debe ser un número no negativo';
  const productos = listProductos();
  if(sku && productos.some(p => text(p.sku).toLowerCase() === sku.toLowerCase() && p.id !== options.excludeId)){
    errors.sku = `Ya existe un producto con el SKU "${sku}"`;
  }
  const categoriaId = field(payload, 'categoriaId', 'categoria_id', undefined);
  if(!isEmpty(categoriaId) && !listCategorias().some(c => c.id === categoriaId)){
    errors.categoriaId = 'La categoría del producto no existe';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function createProducto(payload = {}){
  const check = validateProducto(payload);
  if(!check.valid) throw new Error(Object.values(check.errors)[0]);
  const timestamp = now();
  const producto = {
    id: generateId(),
    sku: text(field(payload, 'sku', 'sku', '')),
    nombre: text(field(payload, 'nombre', 'nombre', field(payload, 'name', 'name', ''))),
    descripcion: text(field(payload, 'descripcion', 'descripcion', payload.description)) || undefined,
    categoriaId: field(payload, 'categoriaId', 'categoria_id', undefined) || undefined,
    unidadMedida: text(field(payload, 'unidadMedida', 'unidad_medida', 'UN')),
    impuestoPorcentaje: num(field(payload, 'impuestoPorcentaje', 'impuesto_porcentaje', 0)),
    stockActual: num(field(payload, 'stockActual', 'stock_actual', 0)),
    stockMinimo: isEmpty(field(payload, 'stockMinimo', 'stock_minimo', undefined)) ? undefined : num(field(payload, 'stockMinimo', 'stock_minimo', 0)),
    activo: payload.activo === undefined ? true : Boolean(payload.activo),
    estado: text(payload.estado) || 'disponible',
    createdAt: timestamp,
    updatedAt: timestamp
  };
  const list = listProductos();
  list.push(producto);
  saveCollection(COLLECTIONS.productos, list);
  return producto;
}

export function updateProducto(id, updates = {}){
  const list = listProductos();
  const idx = list.findIndex(p => p.id === id);
  if(idx === -1) throw new Error('Producto no encontrado');
  const merged = { ...list[idx], ...updates };
  const check = validateProducto(merged, { excludeId: id });
  if(!check.valid) throw new Error(Object.values(check.errors)[0]);
  list[idx] = {
    ...list[idx],
    ...merged,
    impuestoPorcentaje: num(field(merged, 'impuestoPorcentaje', 'impuesto_porcentaje', 0)),
    stockActual: num(field(merged, 'stockActual', 'stock_actual', 0)),
    updatedAt: now()
  };
  saveCollection(COLLECTIONS.productos, list);
  return list[idx];
}

export function setProductoEstado(reference, estado){
  const producto = getProducto(reference);
  if(!producto) throw new Error('Producto no encontrado');
  return updateProducto(producto.id, { estado: text(estado) });
}

export function getStock(reference){
  const producto = getProducto(reference);
  return producto ? Number(producto.stockActual ?? producto.stock_actual) || 0 : 0;
}

export function hasStock(reference, cantidad = 1){
  const producto = getProducto(reference);
  if(!producto) return false;
  const available = Number(producto.stockActual ?? producto.stock_actual) || 0;
  const requested = Number(cantidad);
  return Number.isFinite(requested) && requested > 0 && available >= requested;
}

export function adjustStock(reference, delta){
  const producto = getProducto(reference);
  if(!producto) throw new Error('Producto no encontrado');
  const next = Number(producto.stockActual ?? producto.stock_actual) + Number(delta);
  if(next < 0) throw new Error('El stock no puede quedar negativo');
  return updateProducto(producto.id, { stockActual: next });
}

export function deductStock(reference, cantidad){
  return adjustStock(reference, -Math.abs(Number(cantidad) || 0));
}

export function restoreStock(reference, cantidad){
  return adjustStock(reference, Math.abs(Number(cantidad) || 0));
}

export function validateStock(lines){
  const errors = {};
  (lines || []).forEach((line, index) => {
    const productoId = line.productoId ?? line.producto_id ?? line.productId;
    const cantidad = Number(line.cantidad ?? line.quantity);
    const producto = getProducto(productoId);
    if(!producto){
      errors[`linea_${index}`] = 'El producto seleccionado no existe';
      return;
    }
    if(!Number.isInteger(cantidad) || cantidad <= 0){
      errors[`linea_${index}`] = 'La cantidad debe ser un entero positivo';
      return;
    }
    const available = Number(producto.stockActual ?? producto.stock_actual) || 0;
    if(available <= 0){
      errors[`linea_${index}`] = `El producto "${producto.nombre}" no tiene stock disponible`;
    } else if(available < cantidad){
      errors[`linea_${index}`] = `Stock insuficiente para "${producto.nombre}": disponible ${available}, solicitado ${cantidad}`;
    }
  });
  return { valid: Object.keys(errors).length === 0, errors };
}

export function listPreciosProducto(){
  return loadCollection(COLLECTIONS.preciosProducto);
}

function priceIsValidOn(price, fecha){
  const day = text(fecha);
  if(!day) return true;
  if(price.vigenteDesde && day < price.vigenteDesde) return false;
  if(price.vigenteHasta && day > price.vigenteHasta) return false;
  return true;
}

export function validatePrecioProducto(payload = {}, options = {}){
  const errors = {};
  const listaId = field(payload, 'listaId', 'lista_id', undefined);
  const productoId = field(payload, 'productoId', 'producto_id', undefined);
  const precio = num(field(payload, 'precio', 'precio', NaN));
  const moneda = text(field(payload, 'moneda', 'moneda', ''));
  const vigenteDesde = text(field(payload, 'vigenteDesde', 'vigente_desde', ''));
  const vigenteHasta = text(field(payload, 'vigenteHasta', 'vigente_hasta', ''));
  const lista = listListasPrecio().find(l => l.id === listaId);
  const producto = listProductos().find(p => p.id === productoId);
  if(!lista) errors.listaId = 'La lista de precios no existe';
  if(!producto) errors.productoId = 'El producto no existe';
  if(Number.isNaN(precio) || precio < 0) errors.precio = 'El precio debe ser un número no negativo';
  if(!moneda) errors.moneda = 'La moneda del precio es obligatoria';
  else if(lista && text(lista.moneda).toUpperCase() !== moneda.toUpperCase()) errors.moneda = 'La moneda debe coincidir con la de la lista';
  if(!vigenteDesde) errors.vigenteDesde = 'La fecha de vigencia inicial es obligatoria';
  else if(!isValidDate(vigenteDesde)) errors.vigenteDesde = 'La fecha de vigencia inicial debe ser una fecha válida (YYYY-MM-DD)';
  if(!isEmpty(vigenteHasta)){
    if(!isValidDate(vigenteHasta)) errors.vigenteHasta = 'La fecha de vigencia final debe ser una fecha válida (YYYY-MM-DD)';
    else if(isValidDate(vigenteDesde) && vigenteHasta < vigenteDesde) errors.vigenteHasta = 'La vigencia final debe ser igual o posterior a la inicial';
  }
  const duplicated = listPreciosProducto().some(p =>
    p.id !== options.excludeId
    && p.listaId === listaId
    && p.productoId === productoId
    && p.vigenteDesde === vigenteDesde);
  if(listaId && productoId && vigenteDesde && duplicated){
    errors.vigenteDesde = 'Ya existe un precio para ese producto en esa lista con la misma fecha de vigencia';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function createPrecioProducto(payload = {}){
  const check = validatePrecioProducto(payload);
  if(!check.valid) throw new Error(Object.values(check.errors)[0]);
  const timestamp = now();
  const lista = listListasPrecio().find(l => l.id === payload.listaId);
  const precio = {
    id: generateId(),
    listaId: payload.listaId,
    productoId: payload.productoId,
    precio: roundMoney(payload.precio, lista ? lista.moneda : payload.moneda),
    moneda: text(payload.moneda || lista?.moneda).toUpperCase(),
    vigenteDesde: text(payload.vigenteDesde),
    vigenteHasta: text(payload.vigenteHasta) || undefined,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  const list = listPreciosProducto();
  list.push(precio);
  saveCollection(COLLECTIONS.preciosProducto, list);
  return precio;
}

export function getPrecioVigente(reference, fecha = today(), listaId){
  const producto = typeof reference === 'string' ? getProducto(reference) : reference;
  if(!producto) return undefined;
  const candidates = listPreciosProducto()
    .filter(p => p.productoId === producto.id)
    .filter(p => !listaId || p.listaId === listaId)
    .filter(p => priceIsValidOn(p, fecha))
    .sort((a, b) => String(b.vigenteDesde).localeCompare(String(a.vigenteDesde)));
  return candidates[0];
}

export function getPrecio(reference, listaId, fecha = today()){
  const price = getPrecioVigente(reference, fecha, listaId);
  return price ? price.precio : undefined;
}

export function searchProductos(term){
  const query = text(term).toLowerCase();
  const productos = listProductos();
  if(!query) return productos;
  return productos.filter(p => ['sku', 'nombre', 'descripcion'].some(key => text(p[key]).toLowerCase().includes(query)));
}

export function resetCatalog(){
  saveCollection(COLLECTIONS.categorias, []);
  saveCollection(COLLECTIONS.listasPrecio, []);
  saveCollection(COLLECTIONS.productos, []);
  saveCollection(COLLECTIONS.preciosProducto, []);
}
