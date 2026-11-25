# Plan de Implementación: Módulo de Ventas

**Rama**: `002-modulo-ventas` | **Fecha**: 2026-11-02 | **Especificación**: [spec.md](spec.md) | **Modelo de Datos**: [data-model.md](data-model.md) (v3.1)
**Entrada**: Especificación de la funcionalidad desde `/specs/002-modulo-ventas/spec.md`
**Alcance de este documento**: plan de implementación alineado con el modelo de datos de `specs/002-modulo-ventas/data-model.md`. El detalle de entidades, atributos y relaciones se mantiene exclusivamente en ese documento y no se reproduce aquí.

## Resumen

El Módulo de Ventas se construye sobre el módulo base ERP sin modificar su núcleo. La adaptación actual se concentra en `modulo-ventas/src/module-config.js`, que declara:

- **Terminología y vistas**: Entidad → **Cliente**; la separación entre Cotizaciones (`sales_quotes`) y Órdenes de Venta (`sales_orders`) se define en FR-002 y FR-050.
- **Campos propios**: `vendedor` y `zona` en el cliente; `canal` y `fechaEntrega` en el pedido.
- **Ciclo de vida**: `cotización → pedido → facturado → entregado`, con cancelación desde `cotización` o `pedido`.
- **Marca**: nombre "Ventas" y color de acento `#2563eb` (oscuro `#1d4ed8`, FR-064).

El modelo de datos v3.1 distingue el **modelo lógico completo** del **modelo físico implementado** en `localStorage`. El detalle de entidades, cardinalidades, claves y restricciones se consulta en `data-model.md` y no se duplica en este plan.

La entrega implementa clientes sobre `erp_base_module:entities` y conserva las colecciones de dominio, entre ellas `erp_ventas:cotizaciones`, `erp_ventas:pedidos`, `erp_ventas:listas_precio`, `erp_ventas:precios_producto` y `erp_ventas:devoluciones`. La separación de las entidades y los cambios de UI no migran ni reemplazan datos persistidos.

## Contexto Técnico

**Lenguaje/Versión**: JavaScript (ES2022), HTML, CSS  
**Dependencias Principales**: Vite, Vitest + jsdom (sin framework de interfaz) y Chart.js para los gráficos del Panel de análisis (FR-059, T115)  
**Almacenamiento**: localStorage del navegador — clientes en `erp_base_module:entities` y colecciones de dominio con prefijo `erp_ventas:` (zonas, vendedores, catálogo, cotizaciones, pedidos, facturas, pagos, devoluciones, auditoría y secuencias)
**Modelo de Datos**: modelo de dos niveles (lógico completo y físico implementado) documentado en [data-model.md](data-model.md); este plan no replica el modelo entidad-relación  
**Estructura**: la carpeta `modulo-ventas/` es autocontenida (index.html, src/, tests/) y se ejecuta con `vite modulo-ventas` desde la raíz del repositorio  
**Comandos**: `npm run dev`, `npm run build`, `npm test` (apuntan a `modulo-ventas/`)

## Verificación de la Constitución

- **Calidad**: la personalización se realiza mediante configuración, sin bifurcar el código central; `storage.js` y los componentes conservan sus límites y responsabilidades.
- **Pruebas**: los flujos de clientes, pedidos, campos propios, ciclo de vida, búsqueda y cascada están cubiertos por la suite automatizada.
- **Experiencia de Usuario**: terminología de Ventas coherente, mensajes de validación claros, estados vacíos accesibles y comportamiento consistente con el módulo base. Conforme al Principio III, todas las vistas siguen el patrón de FR-049: indicador de carga accesible en listas, botones deshabilitados con spinner en acciones asíncronas y mensaje de éxito o error tras cada acción, con estados vacíos, validación y recuperación de errores inequívocos. T095a–T095f implementan y verifican el patrón.
- **Rendimiento**: las colecciones se mantienen en el rango previsto por el módulo base y las operaciones de búsqueda y renderizado no cambian su complejidad.

## Estructura del Proyecto

### Documentación (esta funcionalidad)

```text
specs/002-modulo-ventas/
├── spec.md
├── data-model.md
├── plan.md
├── tasks.md
└── checklists/
    └── requirements.md
```

### Código Fuente (carpeta `modulo-ventas/`)

```text
modulo-ventas/
├── index.html
├── src/
│   ├── main.js
│   ├── styles.css
│   ├── storage.js
│   ├── app.js
│   ├── module-config.js      ← configuración de Ventas (userConfig)
│   ├── ventas/               ← dominio: collections, money, orders, invoices, returns, …
│   └── components/
│       ├── shell.js
│       ├── dashboard.js
│       ├── entity-form.js
│       ├── entity-list.js
│       ├── document-form.js
│       ├── document-list.js
│       ├── custom-fields.js
│       ├── search-bar.js
│       └── ventas/           ← vistas de dominio: order-form, delivery-panel, summary-view, …
└── tests/
    ├── unit/
    ├── integration/
    └── ventas/               ← pruebas del dominio de Ventas
```

**Decisión de Estructura**: `storage.js` y los componentes base permanecen genéricos para clientes y documentos configurados. El dominio de Ventas implementa las colecciones específicas de catálogo, listas/precios, cotizaciones, órdenes, facturación, pagos y RMA bajo `erp_ventas:`; no se reemplazan por `erp_base_module:documents`. El detalle de las claves y colecciones vigentes se mantiene en `data-model.md` §7.

## Estrategia de Implementación por Fases

Las fases se derivan del estado de implementación declarado en `data-model.md` (§1.2 y §7.5). No se listan aquí entidades ni relaciones; cada fase referencia la sección correspondiente del modelo.

### Fase 0 — Subconjunto base (completada)

- Clientes sobre `erp_base_module:entities`; las órdenes se guardan en la colección específica `erp_ventas:pedidos`.
- Campos propios de Ventas, búsqueda y ciclo de vida configurado.
- Validaciones R-01 a R-18 y cascada cliente → pedidos.
- Sin cambios en el núcleo del módulo base.

### Fase 1 — Maestros normalizados (completada)

- `ZONA` y `VENDEDOR` normalizados en `masters.js` con referencias validadas y siembra desde configuración.
- Restricciones de unicidad, correo y FK aplicadas.
- Cliente base reutilizado desde `erp_base_module:entities`.

### Fase 2 — Catálogo y precios (completada)

- `CATEGORIA_PRODUCTO`, `LISTA_PRECIO`, `PRODUCTO` y `PRECIO_PRODUCTO` implementados en `catalog.js`.
- Unicidad de SKU, vigencia de precios por lista, control de stock y búsqueda por código/nombre.
- Los pedidos consolidan líneas y toman precios desde el catálogo o el valor informado.

### Fase 3 — Cotizaciones y líneas de pedido (completada)

- `COTIZACION` como entidad de pre-venta con estados propios; `acceptQuote` origina un `PEDIDO_VENTA` en estado «pedido» (`quotes.js`). El estado «cotización» de un pedido registrado directamente es distinto de esta entidad.
- `PEDIDO_VENTA` y `DETALLE_PEDIDO` con consolidación de líneas y totales derivados (`orders.js`).
- Cálculo de subtotal, IVA por línea y total con redondeo monetario (`money.js`).

### Fase 4 — Facturación, pagos y devoluciones (completada)

- `FACTURA`, `PAGO`, `DEVOLUCION` y `DETALLE_DEVOLUCION` implementados en `invoices.js`, `payments.js` y `returns.js`.
- Reglas de saldo, sobrepago, plazo de 30 días, motivo obligatorio y límites de devolución.
- Ciclo completo `cotización → pedido → facturado → entregado`, con auditoría y estados terminales.

Las fases se completaron manteniendo la compatibilidad con los datos persistidos, la configuración como punto de entrada del dominio y `data-model.md` como fuente de verdad del modelo.

## Interfaz de usuario

- El menú lateral tiene una entrada «Panel» para KPIs, gráficos, reportes y resúmenes; no repite listados operativos ni contadores en otras pestañas.
- «Agregar» contiene pestañas para Cotización, Orden de Venta, Lista/Precio y Devolución RMA, además de Cliente y Documento. Los formularios de alta/edición quedan centralizados en esta vista.
- Las vistas operativas, sus etiquetas y la conversión de una cotización aprobada siguen FR-002, FR-050 y FR-051; los documentos genéricos se muestran como «Documentos de clientes» (FR-002).
- Las pestañas operativas restantes se limitan a tablas y acciones de consulta/gestión; las claves físicas `erp_ventas:cotizaciones` y `erp_ventas:pedidos` se conservan (FR-050).
- Componentes de dominio en `modulo-ventas/src/components/ventas/` conectados desde `modulo-ventas/src/app.js`.
- Selector de rol activo en la barra superior, gobernado por la matriz rol × vista × acción de FR-053. Jefe de Ventas ve datos completos, incluidos costos estándar, márgenes y contactos de clientes. Ejecutivo Comercial ve datos comerciales/clientes, con costos y márgenes enmascarados; puede agregar cotizaciones/órdenes, pero no editar precios ni aprobar/rechazar RMA. Postventa ve órdenes despachadas y datos operativos RMA sin montos ni precios unitarios; solo puede agregar y gestionar RMA. Auditor consulta métricas agregadas únicamente en Panel; sus pestañas y controles de Agregar/edición quedan bloqueados con indicador de solo lectura. Operaciones, Gerente y Facturación conservan sus acciones heredadas. El Resumen general y el Panel de análisis están disponibles para Ejecutivo Comercial, Gerente, Postventa, Jefe de Ventas y Auditor (`ver_resumen`): Gerente ve todo con importes completos; Jefe de Ventas y Ejecutivo Comercial ven importes completos según su matriz; Postventa y Auditor ven solo conteos y unidades, con importes y precios unitarios enmascarados y sin registros individuales para Auditor. Operaciones y Facturación no acceden al Resumen ni al Panel de análisis.
- Los botones, pestañas y formularios no autorizados se deshabilitan con avisos/candados. RMA aplica guardas de dominio para creación y transición.
- Estados vacíos, mensajes `aria-live`, tablas accesibles y estilos responsivos en `styles.css`.

## Cambios Realizados en esta Iteración

1. **Configuración de Ventas** en `modulo-ventas/src/module-config.js`: nombre, etiquetas, cuatro campos propios, ciclo de vida de cinco estados y color de acento.
2. **Modelo de datos v3.1** en `specs/002-modulo-ventas/data-model.md`: modelo lógico completo, modelo físico implementado, estados de implementación, restricciones, persistencia y matriz de roles. Este plan se alinea con ese documento y delega en él todo el detalle entidad-relación.
3. **Ajustes menores**:
   - `index.html`: título por defecto → "Ventas".
   - `tests/unit/module-config.test.js`: verifica la configuración de Ventas en lugar del default nulo.
   - `package.json` (raíz): scripts `dev`, `build`, `preview` y `test` apuntan a `modulo-ventas/`.
4. **Reencuadre del alcance**: lo que antes se consideraba fuera de alcance (catálogo, líneas, cotización, facturación, pagos y devoluciones) quedó implementado en `modulo-ventas/src/ventas/` y expuesto en la interfaz.
5. **Dominio de Ventas**: 16 módulos JavaScript (`collections`, `money`, `numbering`, `lifecycle`, `roles`, `audit`, `masters`, `catalog`, `quotes`, `orders`, `delivery`, `summary`, `returns`, `history`, `invoices`, `payments`) y un barrel `index.js`.
6. **Pruebas**: suite nueva en `modulo-ventas/tests/ventas/` con cobertura de historias US1-US7, roles, concurrencia, rendimiento y consistencia.
7. **Documentación**: `data-model.md` v3.1 actualizado con entidades implementadas, colecciones, roles y `businessRules`.
8. **Pulido según feedback del avance 03**:
   - `module-config.js`: nueva sección `features` (`hideClientDelete`, `documentsStockNotice`) validada en `normalizeConfig` y activada solo para el módulo de Ventas.
   - `index.html` + `app.js`: la vista Documentos muestra un aviso que dirige la creación de Pedidos de Venta a la vista dedicada, que valida stock (FR-012) y asigna el estado inicial «cotización» (FR-014); el botón de eliminación física del cliente queda oculto en Entidades y se reemplaza por una nota de desactivación lógica (supuestos de la especificación).
   - `quotes-panel.js` (T022): corrección de la correspondencia acción→estado en los botones de cotización, etiqueta «Convertir a pedido», mensaje con el pedido generado y recorrido hacia el formulario de órdenes. Jefe y Ejecutivo pueden editar órdenes en estados modificables.
9. **Vistas y autorizaciones**: Panel Visual reúne consultas/KPIs; Agregar / Operaciones contiene formularios. Se incorporan los formularios de mantenimiento de precios para Jefe de Ventas y las acciones de aprobación/rechazo RMA separadas de la gestión de Postventa.
10. **Navegación y visibilidad por rol**: la barra lateral se reduce a Panel y vistas operativas separadas (FR-051) y Agregar concentra los formularios en pestañas (FR-052). La etiqueta «Documentos de clientes» y la separación de vistas siguen FR-002 y FR-050. Se incorpora el costo estándar opcional del producto, margen derivado del precio vigente y máscaras de información para Ejecutivo, Postventa y Auditor (FR-053 a FR-055).

## Verificación

- **Estado: pendiente hasta completar T119-T134.** La funcionalidad no está completa; no se registra verificación final.
- T000 ejecuta el formateador del proyecto sobre los 44 archivos con hallazgos y debe dejar `npm run format:check` con 0 hallazgos. No se aceptan hallazgos de formato preexistentes.
- `format:check` con 0 hallazgos es un gate bloqueante en T111 y en toda verificación final: si falla, la verificación no se considera completada.
- Las ejecuciones parciales anteriores de `npm test`, `npm run lint`, `npm run build` o comprobaciones en navegador no sustituyen la verificación final pendiente.
- El plan no reproduce el modelo entidad-relación: las entidades, atributos, relaciones y restricciones se consultan en `data-model.md` §2 a §5.

## Seguimiento de Complejidad

La entrega mantiene el núcleo base sin bifurcaciones: `storage.js` y los componentes base conservan sus responsabilidades, mientras el dominio nuevo vive en `modulo-ventas/src/ventas/` y sus vistas en `modulo-ventas/src/components/ventas/`. Las extensiones se justifican por el modelo lógico documentado en `data-model.md`, que sigue siendo la única fuente de verdad.
