import { addDocument, addEntity, clearAll, loadEntities } from "../storage.js";
import {
  createCategoria,
  createListaPrecio,
  createPrecioProducto,
  createProducto,
  listCategorias,
  listListasPrecio,
  listPreciosProducto,
  listProductos,
} from "./catalog.js";
import { clearCollections } from "./collections.js";
import { createVendedor, findVendedor, seedMasters, listVendedores, listZonas } from "./masters.js";
import {
  QUOTE_STATUSES,
  acceptQuote,
  createQuote,
  listQuotes,
  updateQuoteStatus,
} from "./quotes.js";
import { createOrder, listOrders, updateOrderStatus } from "./orders.js";
import { createInvoiceFromOrder, listInvoices } from "./invoices.js";
import { addPayment, listPayments } from "./payments.js";
import { RETURN_STATUSES, createReturn, listReturns, updateReturnStatus } from "./returns.js";
import { deliverOrder } from "./delivery.js";
import { getCurrentRole, setCurrentRole, ROLES } from "./roles.js";

const DEMO_MARKER = "erp_ventas:demo_data_loaded";

const CLIENTES = [
  {
    name: "Comercial Andes SpA",
    code: "CLI-001",
    taxId: "76.123.456-7",
    email: "contacto@comercialandes.cl",
    phone: "+56 2 2200 1001",
    address: "Av. Providencia 1234, Providencia, Santiago",
    category: "Mayorista",
    description: "Cadena de tiendas con cobertura nacional y compras mensuales.",
    targetDate: "2026-12-15",
    creditLimit: 5000000,
    paymentTerms: "neto 30",
    estado: "activo",
    vendedor: "Camila Rojas",
    zona: "Centro",
  },
  {
    name: "Distribuidora Costa Norte",
    code: "CLI-002",
    taxId: "76.234.567-8",
    email: "ventas@costanorte.cl",
    phone: "+56 51 220 1002",
    address: "Calle Serrano 456, Antofagasta",
    category: "Distribuidor",
    description: "Distribución regional en la zona norte del país.",
    targetDate: "2026-11-30",
    creditLimit: 3500000,
    paymentTerms: "neto 15",
    estado: "activo",
    vendedor: "Diego Fuentes",
    zona: "Norte",
  },
  {
    name: "Inversiones del Sur Ltda.",
    code: "CLI-003",
    taxId: "76.345.678-9",
    email: "gerencia@inversionessur.cl",
    phone: "+56 65 220 1003",
    address: "Av. Alemania 0891, Temuco",
    category: "Minorista",
    description: "Cliente minorista con rotación alta de productos de oficina.",
    targetDate: "2026-12-05",
    creditLimit: 1200000,
    paymentTerms: "contado",
    estado: "activo",
    vendedor: "Camila Rojas",
    zona: "Sur",
  },
  {
    name: "Tecnología Oriente S.A.",
    code: "CLI-004",
    taxId: "76.456.789-0",
    email: "compras@tecnologiaoriente.cl",
    phone: "+56 2 2200 1004",
    address: "Av. Vitacura 2780, Vitacura, Santiago",
    category: "Corporativo",
    description: "Cuenta corporativa en pausa por renovación de contrato.",
    targetDate: "2027-01-20",
    creditLimit: 8000000,
    paymentTerms: "neto 45",
    estado: "inactivo",
    vendedor: "Paula Soto",
    zona: "Este",
  },
  {
    name: "Servicios Poniente E.I.R.L.",
    code: "CLI-005",
    taxId: "76.567.890-1",
    email: "administracion@serviciosponiente.cl",
    phone: "+56 32 220 1005",
    address: "Av. Libertad 1450, Valparaíso",
    category: "Servicios",
    description: "Empresa de servicios generales con compras ocasionales.",
    targetDate: "2026-11-25",
    creditLimit: 900000,
    paymentTerms: "contado",
    estado: "activo",
    vendedor: "Rodrigo Mena",
    zona: "Oeste",
  },
  {
    name: "Grupo Empresarial Centro",
    code: "CLI-006",
    taxId: "76.678.901-2",
    email: "finanzas@grupocentro.cl",
    phone: "+56 2 2200 1006",
    address: "Av. Apoquindo 3200, Las Condes, Santiago",
    category: "Corporativo",
    description: "Cuenta bloqueada temporalmente por revisión de crédito.",
    targetDate: "2027-02-10",
    creditLimit: 6000000,
    paymentTerms: "neto 60",
    estado: "bloqueado",
    vendedor: "Paula Soto",
    zona: "Centro",
  },
];

const VENDEDORES = [
  {
    codigo: "VEN-01",
    nombre: "Camila Rojas",
    email: "camila.rojas@ejemplo.cl",
    telefono: "+56 9 8100 1001",
    zonaId: "CENTRO",
  },
  {
    codigo: "VEN-02",
    nombre: "Diego Fuentes",
    email: "diego.fuentes@ejemplo.cl",
    telefono: "+56 9 8100 1002",
    zonaId: "NORTE",
  },
  {
    codigo: "VEN-03",
    nombre: "Paula Soto",
    email: "paula.soto@ejemplo.cl",
    telefono: "+56 9 8100 1003",
    zonaId: "SUR",
  },
  {
    codigo: "VEN-04",
    nombre: "Rodrigo Mena",
    email: "rodrigo.mena@ejemplo.cl",
    telefono: "+56 9 8100 1004",
    zonaId: "OESTE",
  },
];

const PRODUCTOS = [
  {
    sku: "SKU-1001",
    nombre: "Notebook Business 14",
    descripcion: "Portátil corporativo de 14 pulgadas, 16 GB RAM y 512 GB SSD.",
    unidadMedida: "UN",
    impuestoPorcentaje: 19,
    stockActual: 80,
    stockMinimo: 12,
    categoria: "tecnologia",
    precio: 649990,
    precioPremium: 699990,
  },
  {
    sku: "SKU-1002",
    nombre: "Monitor LED 24 pulgadas",
    descripcion: "Monitor Full HD con soporte ajustable y garantía de 3 años.",
    unidadMedida: "UN",
    impuestoPorcentaje: 19,
    stockActual: 95,
    stockMinimo: 20,
    categoria: "tecnologia",
    precio: 159990,
    precioPremium: 169990,
  },
  {
    sku: "SKU-1003",
    nombre: "Teclado mecánico",
    descripcion: "Teclado mecánico compacto, switches marrones y conexión USB-C.",
    unidadMedida: "UN",
    impuestoPorcentaje: 19,
    stockActual: 140,
    stockMinimo: 25,
    categoria: "tecnologia",
    precio: 39990,
    precioPremium: 42990,
  },
  {
    sku: "SKU-1004",
    nombre: "Silla ergonómica",
    descripcion: "Silla de oficina con respaldo mallado y ajuste lumbar.",
    unidadMedida: "UN",
    impuestoPorcentaje: 19,
    stockActual: 52,
    stockMinimo: 8,
    categoria: "oficina",
    precio: 129990,
    precioPremium: 139990,
  },
  {
    sku: "SKU-1005",
    nombre: "Escritorio modular 120",
    descripcion: "Escritorio modular de 120 cm con bandeja para teclado.",
    unidadMedida: "UN",
    impuestoPorcentaje: 19,
    stockActual: 38,
    stockMinimo: 6,
    categoria: "oficina",
    precio: 189990,
    precioPremium: 199990,
  },
  {
    sku: "SKU-1006",
    nombre: "Licencia software anual",
    descripcion: "Licencia anual de productividad para un puesto de trabajo.",
    unidadMedida: "UN",
    impuestoPorcentaje: 19,
    stockActual: 220,
    stockMinimo: 30,
    categoria: "servicios",
    precio: 89990,
    precioPremium: 94990,
  },
  {
    sku: "SKU-1007",
    nombre: "Servicio de instalación",
    descripcion: "Instalación y configuración en sitio con visita técnica.",
    unidadMedida: "SE",
    impuestoPorcentaje: 0,
    stockActual: 100,
    stockMinimo: 5,
    categoria: "servicios",
    precio: 45000,
    precioPremium: 48000,
  },
  {
    sku: "SKU-1008",
    nombre: "Papel A4 caja",
    descripcion: "Caja de 5 remamas de papel A4 de 80 gramos.",
    unidadMedida: "CJA",
    impuestoPorcentaje: 19,
    stockActual: 9,
    stockMinimo: 12,
    categoria: "papeleria",
    precio: 12990,
    precioPremium: 13990,
  },
  {
    sku: "SKU-1009",
    nombre: "Impresora láser multifunción",
    descripcion: "Impresora láser a color con escáner y bandeja de 250 hojas.",
    unidadMedida: "UN",
    impuestoPorcentaje: 19,
    stockActual: 26,
    stockMinimo: 8,
    categoria: "tecnologia",
    precio: 249990,
    precioPremium: 269990,
  },
  {
    sku: "SKU-1010",
    nombre: "Cuaderno A5",
    descripcion: "Cuaderno de tapas duras de 120 hojas para reuniones.",
    unidadMedida: "UN",
    impuestoPorcentaje: 19,
    stockActual: 320,
    stockMinimo: 40,
    categoria: "papeleria",
    precio: 3990,
    precioPremium: 4290,
  },
];

function dayOffset(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function hasData() {
  return (
    loadEntities().length > 0 ||
    listProductos().length > 0 ||
    listOrders().length > 0 ||
    listQuotes().length > 0 ||
    listInvoices().length > 0 ||
    listPayments().length > 0 ||
    listReturns().length > 0
  );
}

export function isDemoDataLoaded() {
  try {
    return globalThis.localStorage?.getItem(DEMO_MARKER) === "1";
  } catch {
    return false;
  }
}

export function resetDemoData() {
  const role = getCurrentRole();
  clearCollections();
  clearAll();
  setCurrentRole(role);
  globalThis.localStorage?.removeItem(DEMO_MARKER);
}

function currentCounts() {
  return {
    clientes: loadEntities().length,
    zonas: listZonas().length,
    vendedores: listVendedores().length,
    categorias: listCategorias().length,
    listasPrecio: listListasPrecio().length,
    productos: listProductos().length,
    preciosProducto: listPreciosProducto().length,
    cotizaciones: listQuotes().length,
    pedidos: listOrders().length,
    facturas: listInvoices().length,
    pagos: listPayments().length,
    devoluciones: listReturns().length,
  };
}

function seedCatalog() {
  seedMasters();
  VENDEDORES.forEach((vendedor) => createVendedor(vendedor));

  const general = createCategoria({
    nombre: "General",
    descripcion: "Categoría raíz del catálogo comercial.",
  });
  const categorias = {
    general: general.id,
    tecnologia: createCategoria({
      nombre: "Tecnología",
      descripcion: "Equipos computacionales y periféricos.",
      padreId: general.id,
    }).id,
    oficina: createCategoria({
      nombre: "Muebles de oficina",
      descripcion: "Mobiliario y accesorios de trabajo.",
    }).id,
    servicios: createCategoria({
      nombre: "Servicios",
      descripcion: "Servicios profesionales y licencias.",
    }).id,
    papeleria: createCategoria({
      nombre: "Papelería",
      descripcion: "Materiales de oficina de consumo frecuente.",
    }).id,
  };

  const listaGeneral = createListaPrecio({
    codigo: "LP-GEN-2026",
    nombre: "Lista general 2026",
    moneda: "CLP",
    vigenteDesde: "2026-01-01",
  });
  const listaPremium = createListaPrecio({
    codigo: "LP-PREM-2026",
    nombre: "Lista premium 2026",
    moneda: "CLP",
    vigenteDesde: "2026-06-01",
  });
  const listaOnline = createListaPrecio({
    codigo: "LP-ONLINE-2026",
    nombre: "Lista canal online 2026",
    moneda: "CLP",
    vigenteDesde: "2026-03-01",
  });

  return PRODUCTOS.map((producto) => {
    const creado = createProducto({
      sku: producto.sku,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      categoriaId: categorias[producto.categoria],
      unidadMedida: producto.unidadMedida,
      impuestoPorcentaje: producto.impuestoPorcentaje,
      stockActual: producto.stockActual,
      stockMinimo: producto.stockMinimo,
      costoEstandar: Math.round(producto.precio * 0.7),
    });
    createPrecioProducto({
      listaId: listaGeneral.id,
      productoId: creado.id,
      precio: producto.precio,
      moneda: "CLP",
      vigenteDesde: "2026-01-01",
    });
    createPrecioProducto({
      listaId: listaPremium.id,
      productoId: creado.id,
      precio: producto.precioPremium,
      moneda: "CLP",
      vigenteDesde: "2026-06-01",
    });
    if (producto.sku === "SKU-1001") {
      createPrecioProducto({
        listaId: listaGeneral.id,
        productoId: creado.id,
        precio: 599990,
        moneda: "CLP",
        vigenteDesde: "2025-01-01",
        vigenteHasta: "2025-12-31",
      });
    }
    if (producto.sku === "SKU-1005" || producto.sku === "SKU-1009") {
      createPrecioProducto({
        listaId: listaOnline.id,
        productoId: creado.id,
        precio: Math.round(producto.precio * 0.95),
        moneda: "CLP",
        vigenteDesde: "2026-03-01",
      });
    }
    return creado;
  });
}

function lineFor(productos, index, cantidad, descuentoLinea = 0) {
  return {
    productoId: productos[index].id,
    cantidad,
    precioUnitario: PRODUCTOS[index].precio,
    descuentoLinea,
  };
}

function orderPayload(cliente, vendedor, productos, extras = {}) {
  return {
    clienteId: cliente.entity_id,
    vendedorId: vendedor.id,
    canal: extras.canal || "Tienda",
    condicionesPago: extras.condicionesPago || "contado",
    fechaEmision: extras.fechaEmision || dayOffset(-8),
    fechaEntrega: extras.fechaEntrega || dayOffset(-3),
    moneda: "CLP",
    descuento: extras.descuento || 0,
    notas: extras.notas || "Pedido de demostración del módulo de ventas.",
    estado: extras.estado || "cotización",
    lineas: extras.lineas || [lineFor(productos, 0, 1)],
  };
}

function invoiceFor(order, fechaEmision) {
  return createInvoiceFromOrder(order.id, {
    skipRoleCheck: true,
    fechaEmision,
    diasVencimiento: 30,
  });
}

function seller(reference) {
  const master = findVendedor(reference);
  return { id: master ? master.id : reference };
}

export function loadDemoData(options = {}) {
  if (options.force) resetDemoData();
  else if (isDemoDataLoaded() || hasData()) return { loaded: false, counts: currentCounts() };

  const productos = seedCatalog();
  const clientes = CLIENTES.map((cliente) => addEntity(cliente));

  addDocument({
    entityId: clientes[0].entity_id,
    series: "DOC",
    folio: 601,
    startDate: dayOffset(-14),
    endDate: dayOffset(-9),
    quantity: 4,
    subtotal: 639960,
    discount: 20000,
    taxAmount: 117692,
    totalAmount: 737652,
    currency: "CLP",
    paymentTerms: "neto 30",
    notes: "Documento de ejemplo para la bandeja de clientes.",
    status: "cotización",
    canal: "Web",
    fechaEntrega: dayOffset(-7),
  });
  addDocument({
    entityId: clientes[1].entity_id,
    series: "DOC",
    folio: 602,
    startDate: dayOffset(-11),
    endDate: dayOffset(-6),
    quantity: 2,
    subtotal: 319980,
    discount: 0,
    taxAmount: 60796,
    totalAmount: 380776,
    currency: "CLP",
    paymentTerms: "neto 15",
    notes: "Documento de ejemplo con estado confirmado.",
    status: "pedido",
    canal: "Teléfono",
    fechaEntrega: dayOffset(-4),
  });

  const borrador = createQuote({
    clienteId: clientes[0].entity_id,
    vendedorId: seller("VEN-01").id,
    fechaEmision: dayOffset(-6),
    validaHasta: dayOffset(24),
    estado: "borrador",
    moneda: "CLP",
    descuento: 10000,
    notas: "Cotización en preparación para renovación de equipos.",
    lineas: [lineFor(productos, 0, 2), lineFor(productos, 2, 3)],
  });
  const enviada = createQuote({
    clienteId: clientes[1].entity_id,
    vendedorId: seller("VEN-02").id,
    fechaEmision: dayOffset(-9),
    validaHasta: dayOffset(21),
    estado: "enviada",
    moneda: "CLP",
    descuento: 25000,
    notas: "Propuesta enviada por correo, pendiente de respuesta.",
    lineas: [lineFor(productos, 1, 4), lineFor(productos, 3, 2, 5000)],
  });
  const aceptada = createQuote({
    clienteId: clientes[2].entity_id,
    vendedorId: seller("VEN-01").id,
    fechaEmision: dayOffset(-12),
    validaHasta: dayOffset(18),
    estado: "borrador",
    moneda: "CLP",
    descuento: 15000,
    notas: "Cotización aceptada y transformada en pedido de venta.",
    lineas: [lineFor(productos, 4, 2), lineFor(productos, 5, 3)],
  });
  updateQuoteStatus(aceptada.id, "enviada");
  updateQuoteStatus(aceptada.id, "aceptada", { role: ROLES.JEFE_VENTAS });
  const rechazada = createQuote({
    clienteId: clientes[3].entity_id,
    vendedorId: seller("VEN-03").id,
    fechaEmision: dayOffset(-16),
    validaHasta: dayOffset(14),
    estado: "rechazada",
    moneda: "CLP",
    descuento: 0,
    notas: "Presupuesto rechazado por presupuesto del cliente.",
    lineas: [lineFor(productos, 0, 1)],
  });
  const vencida = createQuote({
    clienteId: clientes[4].entity_id,
    vendedorId: seller("VEN-04").id,
    fechaEmision: dayOffset(-45),
    validaHasta: dayOffset(-15),
    estado: "enviada",
    moneda: "CLP",
    descuento: 5000,
    notas: "Cotización vencida conservada para el historial.",
    lineas: [lineFor(productos, 6, 5)],
  });
  updateQuoteStatus(vencida.id, "vencida");
  const segundaEnviada = createQuote({
    clienteId: clientes[5].entity_id,
    vendedorId: seller("VEN-03").id,
    fechaEmision: dayOffset(-3),
    validaHasta: dayOffset(27),
    estado: "enviada",
    moneda: "CLP",
    descuento: 20000,
    notas: "Cotización pendiente de aprobación comercial.",
    lineas: [lineFor(productos, 8, 1), lineFor(productos, 9, 10)],
  });

  acceptQuote(aceptada.id, { role: ROLES.JEFE_VENTAS });

  const cotizacion = createOrder(
    orderPayload(clientes[0], seller("VEN-01"), productos, {
      estado: "cotización",
      canal: "Web",
      fechaEmision: dayOffset(-5),
      fechaEntrega: dayOffset(5),
      descuento: 12000,
      lineas: [lineFor(productos, 1, 2), lineFor(productos, 2, 4)],
    }),
  );
  const confirmado = createOrder(
    orderPayload(clientes[1], seller("VEN-02"), productos, {
      estado: "pedido",
      canal: "Teléfono",
      condicionesPago: "neto 15",
      descuento: 18000,
      lineas: [lineFor(productos, 3, 3), lineFor(productos, 5, 2)],
    }),
  );
  const pendiente = createOrder(
    orderPayload(clientes[2], seller("VEN-01"), productos, {
      estado: "pedido",
      descuento: 9000,
      lineas: [lineFor(productos, 4, 1)],
    }),
  );
  const parcial = createOrder(
    orderPayload(clientes[0], seller("VEN-01"), productos, {
      estado: "pedido",
      canal: "Distribuidor",
      condicionesPago: "neto 30",
      descuento: 30000,
      lineas: [lineFor(productos, 0, 2), lineFor(productos, 2, 2)],
    }),
  );
  const entregado = createOrder(
    orderPayload(clientes[4], seller("VEN-04"), productos, {
      estado: "pedido",
      canal: "Tienda",
      descuento: 7500,
      lineas: [lineFor(productos, 5, 4), lineFor(productos, 6, 2)],
    }),
  );
  const conDevolucion = createOrder(
    orderPayload(clientes[1], seller("VEN-02"), productos, {
      estado: "pedido",
      condicionesPago: "neto 15",
      lineas: [lineFor(productos, 1, 3), lineFor(productos, 3, 1)],
    }),
  );
  const cancelado = createOrder(
    orderPayload(clientes[5], seller("VEN-03"), productos, {
      estado: "cotización",
      canal: "Teléfono",
      notas: "Pedido cancelado por decisión del cliente.",
      lineas: [lineFor(productos, 0, 1)],
    }),
  );
  updateOrderStatus(cancelado.id, "cancelado");

  const facturaPendiente = invoiceFor(pendiente, dayOffset(-2));
  const facturaParcial = invoiceFor(parcial, dayOffset(-4));
  const facturaEntregada = invoiceFor(entregado, dayOffset(-6));
  const facturaDevuelta = invoiceFor(conDevolucion, dayOffset(-3));

  addPayment({
    facturaId: facturaParcial.id,
    fecha: dayOffset(-2),
    monto: Math.round(facturaParcial.total * 0.4),
    metodo: "transferencia",
    referencia: "TRF-DEMO-001",
  });
  addPayment({
    facturaId: facturaEntregada.id,
    fecha: dayOffset(-5),
    monto: Math.round(facturaEntregada.total / 2),
    metodo: "efectivo",
    referencia: "EFE-DEMO-002",
  });
  addPayment({
    facturaId: facturaEntregada.id,
    fecha: dayOffset(-1),
    monto: facturaEntregada.total - Math.round(facturaEntregada.total / 2),
    metodo: "tarjeta",
    referencia: "TAR-DEMO-003",
  });
  addPayment({
    facturaId: facturaDevuelta.id,
    fecha: dayOffset(-2),
    monto: facturaDevuelta.total,
    metodo: "transferencia",
    referencia: "TRF-DEMO-004",
  });

  deliverOrder(entregado.id, { skipRoleCheck: true, role: "operaciones" });

  const devolucionCompletada = createReturn(
    {
      facturaId: facturaDevuelta.id,
      pedidoId: conDevolucion.id,
      fecha: dayOffset(-1),
      motivo: "Producto con falla de fabricación detectada al recibir.",
      lineas: [{ detallePedidoId: conDevolucion.lineas[0].id, cantidad: 1 }],
    },
    { skipRoleCheck: true, role: "devoluciones" },
  );
  updateReturnStatus(devolucionCompletada.devolucion.id, "aprobada", { skipRoleCheck: true });
  updateReturnStatus(devolucionCompletada.devolucion.id, "completada", { skipRoleCheck: true });

  const devolucionRechazada = createReturn(
    {
      facturaId: facturaEntregada.id,
      pedidoId: entregado.id,
      fecha: dayOffset(-1),
      motivo: "Solicitud fuera de la política comercial del cliente.",
      lineas: [{ detallePedidoId: entregado.lineas[0].id, cantidad: 1 }],
    },
    { skipRoleCheck: true, role: "devoluciones" },
  );
  updateReturnStatus(devolucionRechazada.devolucion.id, "rechazada", { skipRoleCheck: true });

  createReturn(
    {
      facturaId: facturaParcial.id,
      pedidoId: parcial.id,
      fecha: dayOffset(-1),
      motivo: "El cliente solicitó revisión del equipo recibido.",
      lineas: [{ detallePedidoId: parcial.lineas[0].id, cantidad: 1 }],
    },
    { skipRoleCheck: true, role: "devoluciones" },
  );

  const devolucionAprobada = createReturn(
    {
      facturaId: facturaPendiente.id,
      pedidoId: pendiente.id,
      fecha: dayOffset(-1),
      motivo: "Diferencia respecto a la ficha técnica publicada.",
      lineas: [{ detallePedidoId: pendiente.lineas[0].id, cantidad: 1 }],
    },
    { skipRoleCheck: true, role: "devoluciones" },
  );
  updateReturnStatus(devolucionAprobada.devolucion.id, "aprobada", { skipRoleCheck: true });

  globalThis.localStorage?.setItem(DEMO_MARKER, "1");

  return {
    loaded: true,
    counts: currentCounts(),
    detail: {
      cotizaciones: QUOTE_STATUSES.map((estado) => ({
        estado,
        cantidad: listQuotes().filter((quote) => quote.estado === estado).length,
      })),
      devoluciones: RETURN_STATUSES.map((estado) => ({
        estado,
        cantidad: listReturns().filter((item) => item.estado === estado).length,
      })),
      ejemplo: {
        borrador: borrador.numero,
        enviada: enviada.numero,
        rechazada: rechazada.numero,
        vencida: vencida.numero,
        segundaEnviada: segundaEnviada.numero,
        cotizacion: cotizacion.numero,
        confirmado: confirmado.numero,
      },
    },
  };
}

export function seedMockData(options = {}) {
  const result = loadDemoData(options);
  if (options.force) return result.counts;
  return result.loaded ? result.counts : false;
}
