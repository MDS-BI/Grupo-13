---

description: "Task list for Módulo de Ventas implementation"
---

# Tareas: Módulo de Ventas

**Entrada**: Documentos de diseño en `/specs/002-modulo-ventas/`

**Prerrequisitos**: plan.md (obligatorio), spec.md (obligatorio para historias), data-model.md (modelo entidad-relación v3.1). No existen `research.md`, `contracts/` ni `quickstart.md` para esta funcionalidad.

**Pruebas**: Las tareas de prueba se incluyen porque la constitución del proyecto (Principio II, Test-First & Verification) exige cobertura automatizada de comportamiento visible y lógica de negocio.

**Organización**: Las tareas se agrupan por historia de usuario para permitir implementación y validación independientes. Las historias P2-P7 dependen de los datos creados por US1, pero cada una se valida con su propia prueba aislada.

## Formato: `[ID] [P?] [Story] Descripción`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes).
- **[Story]**: Historia de usuario a la que pertenece la tarea (US1-US7).
- Todas las rutas son relativas a la raíz del repositorio.

## Convenciones de ruta

- Código del módulo: `modulo-ventas/src/`
- Componentes de interfaz del dominio: `modulo-ventas/src/components/ventas/`
- Lógica de dominio: `modulo-ventas/src/ventas/`
- Pruebas: `modulo-ventas/tests/ventas/`
- Documentación de la funcionalidad: `specs/002-modulo-ventas/`

---

## Fase 1: Setup (infraestructura compartida)

**Propósito**: Preparar el espacio de trabajo y verificar la línea base antes de agregar dominio.

- [x] T001 Ejecutar `npm test` y `npm run build` desde la raíz del repositorio y registrar la línea base (111 pruebas y build vigente) antes de cualquier cambio.
- [x] T002 [P] Agregar el script `test:ventas` (`vitest run modulo-ventas/tests/ventas`) en `package.json`.
- [x] T003 [P] Crear el punto de entrada del dominio en `modulo-ventas/src/ventas/index.js` reexportando los módulos de Ventas a medida que se implementan.
- [x] T004 [P] Crear las utilidades de prueba compartidas y el arranque JSDOM en `modulo-ventas/tests/ventas/fixtures.js`.

---

## Fase 2: Foundational (prerrequisitos bloqueantes)

**Propósito**: Infraestructura de dominio que MUST existir antes de implementar cualquier historia.

**⚠️ CRÍTICO**: Ninguna historia de usuario puede comenzar hasta completar esta fase.

- [x] T005 [P] Implementar los ayudantes de colecciones en `modulo-ventas/src/ventas/collections.js` (claves `erp_ventas:*`, carga/guardado JSON, `generateId`, `generateEntityId`, búsqueda por clave).
- [x] T006 [P] Implementar las utilidades monetarias en `modulo-ventas/src/ventas/money.js` (redondeo por moneda, subtotal de línea, subtotal/impuesto/total de pedido y factura).
- [x] T007 [P] Implementar la numeración de series y folios en `modulo-ventas/src/ventas/numbering.js` (secuencias persistidas, formato `serie-folio`, unicidad por colección).
- [x] T008 [P] Implementar el guardián del ciclo de vida en `modulo-ventas/src/ventas/lifecycle.js` (transiciones permitidas, estados terminales, mensajes de error descriptivos).
- [x] T009 [P] Implementar la autorización por rol en `modulo-ventas/src/ventas/roles.js` (roles vendedor, operaciones, gerente, devoluciones, jefe de ventas, facturación y auditor; `getCurrentRole`, `setCurrentRole`, `can`).
- [x] T010 [P] Implementar la bitácora de auditoría en `modulo-ventas/src/ventas/audit.js` (venta afectada, productos, cantidad, motivo, fecha y usuario).
- [x] T011 [P] Implementar el maestro de datos en `modulo-ventas/src/ventas/masters.js` para `ZONA` y `VENDEDOR`, con validación de referencias y ayudantes de siembra desde las opciones de configuración.
- [x] T012 Extender el esquema de configuración en `modulo-ventas/src/module-config.js` con `businessRules` (`returnWindowDays` por defecto 30, `defaultCurrency`, lista de roles) manteniendo compatibilidad con la configuración actual.
- [x] T013 [P] Escribir pruebas unitarias de colecciones y numeración en `modulo-ventas/tests/ventas/collections-numbering.test.js`.
- [x] T014 [P] Escribir pruebas unitarias de cálculos monetarios en `modulo-ventas/tests/ventas/money.test.js`.
- [x] T015 [P] Escribir pruebas unitarias del guardián del ciclo de vida en `modulo-ventas/tests/ventas/lifecycle.test.js`.
- [x] T016 [P] Escribir pruebas unitarias de roles y auditoría en `modulo-ventas/tests/ventas/roles-audit.test.js`.
- [x] T017 [P] Escribir pruebas unitarias de maestros y valores por defecto de configuración en `modulo-ventas/tests/ventas/masters-config.test.js`.

**Punto de control**: Infraestructura lista; las historias de usuario pueden comenzar.

---

## Fase 3: US1 - Crear orden de venta (Prioridad P1) 🎯 MVP

**Meta**: El vendedor registra una orden con cliente existente, líneas de productos, canal, condición de pago y vendedor; el sistema calcula subtotal, IVA y total, valida stock y guarda la orden en estado «cotización».

**Prueba independiente**: Crear un cliente, agregar dos productos con stock suficiente, registrar la orden con pago al contado y verificar que el total incluye IVA y queda en estado «cotización»; comprobar que un producto sin stock y los campos obligatorios faltantes bloquean el guardado.

### Pruebas de US1

- [x] T018 [P] [US1] Escribir pruebas unitarias de catálogo, precios y reglas de stock en `modulo-ventas/tests/ventas/catalog.test.js`.
- [x] T019 [P] [US1] Escribir pruebas unitarias de cálculo de líneas, consolidación de duplicados y totales en `modulo-ventas/tests/ventas/order-lines.test.js`.
- [x] T020 [P] [US1] Escribir la prueba de integración del recorrido «crear orden» (cliente, dos productos, stock, IVA, validaciones) en `modulo-ventas/tests/ventas/us1-create-order.test.js`.

### Implementación de US1

- [x] T021 [P] [US1] Implementar el catálogo en `modulo-ventas/src/ventas/catalog.js` para `CATEGORIA_PRODUCTO`, `LISTA_PRECIO`, `PRODUCTO` y `PRECIO_PRODUCTO`, con unicidad, vigencia y consultas de stock.
- [x] T022 [P] [US1] Implementar la entidad Cotización en `modulo-ventas/src/ventas/quotes.js` (`COTIZACION` con estados `borrador`/`enviada`/`aceptada`/`rechazada`/`vencida` y `acceptQuote` que origina un Pedido de Venta en estado «pedido»), distinta del estado «cotización» de un pedido registrado directamente.
- [x] T023 [US1] Implementar el pedido en `modulo-ventas/src/ventas/orders.js` (`PEDIDO_VENTA` + `DETALLE_PEDIDO`, FK de cliente, vendedor, canal, condición de pago, fecha de entrega y estado inicial «cotización»).
- [x] T024 [US1] Agregar validación y revalidación de stock en `modulo-ventas/src/ventas/orders.js` (stock cero, insuficiente, líneas duplicadas y cantidades no enteras o no positivas).
- [x] T025 [US1] Agregar cálculo automático de subtotal, IVA por línea y total con redondeo monetario en `modulo-ventas/src/ventas/orders.js` usando `money.js`.
- [x] T026 [P] [US1] Crear el selector de productos en `modulo-ventas/src/components/ventas/product-picker.js` (búsqueda por código/nombre, stock visible y bloqueo de productos sin stock).
- [x] T027 [P] [US1] Crear el editor de líneas en `modulo-ventas/src/components/ventas/line-editor.js` (agregar/quitar/consolidar líneas y totales en vivo).
- [x] T028 [US1] Crear el formulario de orden en `modulo-ventas/src/components/ventas/order-form.js` (cliente, vendedor, canal, condición de pago, fecha de entrega y visualización de errores).
- [x] T029 [US1] Agregar la vista «Pedidos de Venta», el formulario y el editor de líneas en `modulo-ventas/index.html`.
- [x] T030 [US1] Conectar la nueva vista de Ventas, la navegación y el flujo de guardado en `modulo-ventas/src/app.js`.
- [x] T031 [US1] Agregar mensajes de validación por campo y estados vacíos de pedidos/productos en `modulo-ventas/src/components/ventas/order-form.js` y `modulo-ventas/index.html`.
- [x] T032 [US1] Agregar estilos del editor de líneas, totales y advertencias de stock en `modulo-ventas/src/styles.css`.
- [x] T033 [US1] Conectar la búsqueda de clientes y productos por campos base y propios en el flujo de la orden en `modulo-ventas/src/components/ventas/order-form.js`.

**Punto de control**: US1 completamente funcional y validable de forma aislada (MVP).

---

## Fase 4: US2 - Marcar pedido como entregado (Prioridad P2)

**Meta**: El encargado de operaciones y logística cambia un pedido «facturado» a «entregado», descuenta el stock al despachar y bloquea cualquier modificación o reversión posterior.

**Dependencia**: requiere un Pedido de Venta en estado «facturado»; completar Fase 8 (US6) antes de validar el recorrido extremo a extremo o sembrar un pedido facturado en la prueba.

**Prueba independiente**: Seleccionar un pedido «facturado», cambiarlo a «entregado», verificar la persistencia, el reflejo en listas y el descuento atómico de stock; intentar modificarlo y comprobar el bloqueo por estado terminal.

- [x] T034 [P] [US2] Escribir pruebas unitarias de reglas de entrega y estado terminal en `modulo-ventas/tests/ventas/delivery.test.js`.
- [x] T035 [P] [US2] Escribir la prueba de integración del recorrido «marcar pedido entregado» en `modulo-ventas/tests/ventas/us2-delivery.test.js`.
- [x] T036 [US2] Implementar el servicio de entrega en `modulo-ventas/src/ventas/delivery.js` (solo `facturado → entregado`, persistencia, bloqueo terminal y mensajes de estado previo requerido).
- [x] T037 [US2] Crear el panel de entrega en `modulo-ventas/src/components/ventas/delivery-panel.js` (selección de pedido facturado, confirmación y feedback).
- [x] T038 [US2] Agregar la vista/sección de entrega en `modulo-ventas/index.html`.
- [x] T039 [US2] Conectar el panel de entrega, el guardián de rol de operaciones y la actualización de listas/resumen en `modulo-ventas/src/app.js`.
- [x] T040 [US2] Bloquear la edición de pedidos «entregado» en `modulo-ventas/src/components/ventas/order-form.js` y en el despacho de `modulo-ventas/src/app.js`.
- [ ] T120 [P] [US2] Escribir la prueba de descuento de stock al despachar en `modulo-ventas/tests/ventas/us2-delivery.test.js`: stock sin descontar en «facturado», descuento atómico por línea al pasar a «entregado» y bloqueo/reversión si falta stock.
- [ ] T121 [US2] Implementar el descuento de stock por línea al confirmar el despacho en `modulo-ventas/src/ventas/delivery.js` y `modulo-ventas/src/ventas/catalog.js`, revalidando disponibilidad y revirtiendo la transición si falla.

**Punto de control**: US1 y US2 funcionan de forma independiente.

---

## Fase 5: US3 - Resumen general de ventas (Prioridad P3)

**Meta**: El gerente visualiza el total de ventas, cotizaciones y pedidos, sus montos y el estado actual de cada pedido.

**Prueba independiente**: Registrar ventas en distintos estados, entrar al resumen con rol gerente y verificar cantidades, montos y estados; comprobar el estado vacío con totales en cero.

- [x] T041 [P] [US3] Escribir pruebas unitarias de agregación del resumen en `modulo-ventas/tests/ventas/summary.test.js`.
- [x] T042 [P] [US3] Escribir la prueba de integración de la vista de resumen para gerente en `modulo-ventas/tests/ventas/us3-summary.test.js`.
- [x] T043 [US3] Implementar la agregación del resumen en `modulo-ventas/src/ventas/summary.js` (cantidades, montos, estados y datos persistidos más recientes).
- [x] T044 [US3] Crear la vista de resumen en `modulo-ventas/src/components/ventas/summary-view.js` con totales y estado vacío en cero.
- [x] T045 [US3] Agregar el marcado de la vista de resumen y el mensaje de acceso restringido en `modulo-ventas/index.html`.
- [x] T046 [US3] Conectar la vista de resumen con la matriz de FR-053: `ver_resumen` para Ejecutivo Comercial, Gerente, Postventa, Jefe de Ventas y Auditor; importes completos para Gerente (y según matriz para Ejecutivo Comercial y Jefe de Ventas); solo conteos con importes enmascarados para Postventa y Auditor; sin acceso para Operaciones y Facturación, en `modulo-ventas/src/app.js`.
- [x] T047 [US3] Agregar estilos y semántica accesible de tabla/lista del resumen en `modulo-ventas/src/styles.css`.

**Punto de control**: US1, US2 y US3 funcionan de forma independiente.

---

## Fase 6: US4 - Registrar devoluciones (Prioridad P4)

**Meta**: El encargado de devoluciones registra una devolución dentro del plazo de 30 días, con motivo válido y cantidades no devueltas previamente, actualizando el estado del producto y la bitácora.

**Prueba independiente**: Seleccionar una venta dentro del plazo, registrar un motivo válido y verificar el cambio a «en proceso de devolución», el número de seguimiento y la auditoría; comprobar el rechazo fuera de plazo, con motivo inválido y con cantidad excesiva.

- [x] T048 [P] [US4] Escribir pruebas unitarias de plazo, motivo y límites de devolución en `modulo-ventas/tests/ventas/returns.test.js`.
- [x] T049 [P] [US4] Escribir la prueba de integración del recorrido «registrar devolución» en `modulo-ventas/tests/ventas/us4-returns.test.js`, asertando que `facturaId` referencia la factura seleccionada y que el pedido se deriva de `factura.pedidoId` (sin FK directa en la devolución, FR-026).
- [x] T050 [US4] Implementar el almacén de devoluciones en `modulo-ventas/src/ventas/returns.js` (`DEVOLUCION` + `DETALLE_DEVOLUCION` y número de seguimiento), exigiendo `facturaId` válida (FK → `FACTURA.id`) y derivando el pedido de `factura.pedidoId` (FR-026), con manejo y soporte explícitos de los estados internos `solicitada`/`aprobada`/`rechazada`/`completada`, incluida la transición a `rechazada`.
- [x] T051 [US4] Agregar las validaciones de plazo de 30 días, motivo no vacío y cantidad máxima devolvible en `modulo-ventas/src/ventas/returns.js`.
- [x] T052 [US4] Actualizar el estado del producto a «en proceso de devolución» y registrar la auditoría en `modulo-ventas/src/ventas/returns.js` usando `audit.js`.
- [x] T053 [P] [US4] Crear el panel de devoluciones en `modulo-ventas/src/components/ventas/returns-panel.js` (selección de factura, productos, cantidad, motivo y errores).
- [x] T054 [US4] Agregar la vista y el formulario de devoluciones en `modulo-ventas/index.html`.
- [x] T055 [US4] Conectar el panel de devoluciones, el guardián de rol y la actualización de estados en `modulo-ventas/src/app.js`.
- [x] T056 [US4] Agregar estilos de devoluciones y resaltado de campos inválidos en `modulo-ventas/src/styles.css`.

**Punto de control**: US1 a US4 funcionan de forma independiente.

---

## Fase 7: US5 - Historial comercial del cliente (Prioridad P5)

**Meta**: El jefe de ventas consulta el perfil comercial de un cliente con todas sus cotizaciones y pedidos, fecha, importe y estado actual.

**Prueba independiente**: Seleccionar un cliente con pedidos asociados y verificar el listado completo con estados; comprobar el estado vacío de un cliente sin movimientos.

- [x] T057 [P] [US5] Escribir pruebas unitarias de agregación del historial comercial en `modulo-ventas/tests/ventas/history.test.js`.
- [x] T058 [P] [US5] Escribir la prueba de integración de la vista de historial de cliente en `modulo-ventas/tests/ventas/us5-client-history.test.js`.
- [x] T059 [US5] Implementar la agregación del historial en `modulo-ventas/src/ventas/history.js` (cotizaciones y pedidos con fecha, importe y estado actual).
- [x] T060 [US5] Crear el componente de historial en `modulo-ventas/src/components/ventas/client-history.js` con estado vacío.
- [x] T061 [US5] Agregar la vista de historial comercial del cliente en `modulo-ventas/index.html`.
- [x] T062 [US5] Conectar la vista de historial, el selector de cliente y el guardián del rol jefe de ventas en `modulo-ventas/src/app.js`.
- [x] T063 [US5] Refrescar el historial cuando cambie el estado de una cotización o pedido en `modulo-ventas/src/ventas/history.js` y `modulo-ventas/src/app.js`.

**Punto de control**: US1 a US5 funcionan de forma independiente.

---

## Fase 8: US6 - Generar factura desde pedido confirmado (Prioridad P6)

**Meta**: El encargado de facturación genera una factura desde un pedido confirmado, copiando cliente, líneas, precios e impuestos, en estado «pendiente de pago», sin duplicados, y registra pagos que reducen el saldo (US7).

**Prueba independiente**: Generar una factura desde un pedido en estado «pedido», verificar la copia de líneas e impuestos, el estado «pendiente de pago»; comprobar el bloqueo desde «cotización» y la prevención de una segunda factura.

- [x] T064 [P] [US6] Escribir pruebas unitarias de reglas de facturación y unicidad en `modulo-ventas/tests/ventas/invoices.test.js`.
- [x] T065 [P] [US6][US7] Escribir pruebas unitarias de registro de pagos y recálculo de saldo en `modulo-ventas/tests/ventas/payments.test.js`.
- [x] T066 [P] [US6] Escribir la prueba de integración del recorrido «generar factura» en `modulo-ventas/tests/ventas/us6-invoice.test.js`.
- [x] T067 [US6] Implementar el almacén de facturas en `modulo-ventas/src/ventas/invoices.js` (`FACTURA` desde pedido confirmado, copia de cliente/líneas/precios/impuestos, estado «pendiente de pago» y saldo).
- [x] T068 [US6] Agregar elegibilidad y protección de duplicados en `modulo-ventas/src/ventas/invoices.js` conforme a FR-040, FR-041 y FR-047.
- [x] T069 [P] [US6][US7] Implementar el registro de pagos y recálculo de saldo en `modulo-ventas/src/ventas/payments.js` (`PAGO`, monto positivo y suma de pagos ≤ total facturado; cubre FR-048 / US7).
- [x] T070 [P] [US6] Crear el panel de facturación en `modulo-ventas/src/components/ventas/invoice-panel.js` (pedido elegible, detalle de factura, saldo y mensajes de bloqueo).
- [x] T071 [US6] Agregar la vista de facturación y el detalle de factura/pagos en `modulo-ventas/index.html`.
- [x] T072 [US6] Conectar la generación de facturas, los mensajes de bloqueo y el guardián del rol facturación en `modulo-ventas/src/app.js`.
- [x] T073 [US6] Propagar el estado «facturado» a pedido, entrega y resumen en `modulo-ventas/src/ventas/orders.js`, `modulo-ventas/src/ventas/delivery.js` y `modulo-ventas/src/ventas/summary.js`.
- [x] T074 [US6] Agregar estilos de facturación, saldos y estados de pago en `modulo-ventas/src/styles.css`.
- [x] T075 [US6] Agregar la prueba de concurrencia/idempotencia que garantiza una sola factura persistida por pedido en `modulo-ventas/tests/ventas/us6-invoice-concurrency.test.js` (FR-041, FR-047).

**Punto de control**: Las siete historias de usuario funcionan de forma independiente.

---

## Fase 9: Polish y preocupaciones transversales

**Propósito**: Cerrar requisitos transversales de permisos, accesibilidad, rendimiento, consistencia y documentación.

- [x] T076 [P] Cubrir la autorización por rol de acciones y consultas en `modulo-ventas/tests/ventas/roles-guard.test.js` (crear, precios, aprobar cotizaciones/RMA, facturar, entregar, gestionar devoluciones, resumen, datos sensibles e historial).
- [x] T077 [P] Completar los estados vacíos de productos, pedidos, facturas, devoluciones, historial y resumen en sus componentes de `modulo-ventas/src/components/ventas/`.
- [x] T078 [P] Agregar etiquetas, `aria-live` y encabezados de tabla accesibles a las nuevas vistas en `modulo-ventas/index.html`.
- [x] T079 Agregar la prueba de rendimiento con 500 pedidos para listados y resumen, verificando un umbral de percepción ~0,5 s por operación, en `modulo-ventas/tests/ventas/performance.test.js`.
- [x] T080 Agregar pruebas transversales de consistencia (sin pedidos huérfanos, una factura por pedido y límites de devolución) en `modulo-ventas/tests/ventas/consistency.test.js`.
- [x] T081 Actualizar la tabla de estado de implementación de `specs/002-modulo-ventas/data-model.md` con las entidades implementadas y parciales.
- [x] T082 Actualizar las fases y la sección de cambios de `specs/002-modulo-ventas/plan.md` con el estado final de la entrega.
- [x] T083 Documentar las nuevas colecciones, roles y `businessRules` en `specs/002-modulo-ventas/data-model.md` §7 y §8.
- [x] T084 Eliminar cálculos duplicados y código sin uso en `modulo-ventas/src/ventas/` y `modulo-ventas/src/components/ventas/`.
- [x] T085 Ejecutar `npm test` desde la raíz y corregir cualquier regresión de la suite completa.
- [x] T086 Ejecutar `npm run build` desde la raíz y verificar la salida en `modulo-ventas/dist/`.
- [x] T087 [P] Configurar ESLint + Prettier en la raíz (`package.json`, `eslint.config.mjs`, `.prettierrc`) para `modulo-ventas/src/`.
- [x] T088 [P] Ejecutar lint/format y corregir hallazgos en `modulo-ventas/src/ventas/` y `modulo-ventas/src/components/ventas/`.
- [x] T089 Agregar scripts `lint` y `format:check` y ejecutarlos junto a `npm test` y `npm run build` antes de cerrar la entrega.
- [x] T090 [P] [US1] Escribir prueba de edición de pedido con recálculo y revalidación de stock en `modulo-ventas/tests/ventas/edit-order.test.js`. (Diferida de US1: se ejecuta en la fase Polish por conveniencia de secuencia.)
- [x] T091 [US1] Implementar la edición de pedidos en estados modificables en `modulo-ventas/src/components/ventas/order-form.js` y `modulo-ventas/src/ventas/orders.js`. (Diferida de US1: se ejecuta en la fase Polish.)
- [x] T092 [P] [US1] Escribir prueba de transición «cancelado» desde «cotización» y «pedido» en `modulo-ventas/tests/ventas/us1-cancel-order.test.js`. (Diferida de US1: se ejecuta en la fase Polish.)
- [x] T093 Verificar que `data-model.md` refleje la distinción entre la entidad Cotización y el estado «cotización», y actualizar las entidades implementadas.
- [x] T094 Ejecutar `npm test`, `npm run lint`, `npm run format:check` y `npm run build` tras los cambios y corregir regresiones.
- [x] T095 Verificar y documentar la desviación del Principio III (estados de carga): confirmar que el dominio de Ventas no tiene operaciones asíncronas de red/E/S y que FR-049, FR-046 y los mensajes `aria-live` cubren la retroalimentación inmediata; reflejar la justificación en `plan.md`.
- [x] T096 [US1] Reorganizar la interfaz para concentrar consultas en «Panel Visual» y agrupar formularios/acciones en «Agregar / Operaciones», conservando accesos y datos existentes.
- [x] T097 [US1] Separar el formulario de alta de Cotización de la Orden de Venta, usar precios vigentes a la fecha de emisión y proteger aprobación/rechazo en `quotes.js` y `quotes-panel.js`.
- [x] T098 [US1] Aplicar la matriz de Jefe de Ventas, Ejecutivo Comercial, Postventa y Auditor, conservando roles heredados; añadir pruebas de autorización y revisión de órdenes generadas.
- [x] T099 Sincronizar `spec.md`, `data-model.md`, `plan.md` y `tasks.md` con la separación de entidades, la organización de pantallas, las claves físicas y la matriz de permisos.
- [x] T100 Ejecutar `npm test`, `npm run lint`, `npm run build` y `npm run format:check`; corregir regresiones y registrar las advertencias de formato existentes.
- [x] T101 [US1] Agregar formularios de creación/edición de listas de precios y precios por producto bajo «Agregar / Operaciones», preservar los identificadores y colecciones, y probar validaciones de moneda/vigencia en `catalog.js`, `pricing-panel.js` y `catalog.test.js`.
- [x] T102 [US4] Agregar acciones RMA de aprobar/rechazar (Jefe de Ventas) y completar (Postventa/Jefe de Ventas), con guardas de dominio y pruebas en `returns.js`, `returns-panel.js` y `us4-returns.test.js`.
- [x] T103 Aplicar navegación por rol: Jefe con acceso total, Ejecutivo sin edición de precios/aprobación RMA, Postventa solo Panel/RMA y Auditor solo Panel Visual de lectura; mostrar controles bloqueados con aviso/candado y conservar roles heredados.
- [x] T104 Alinear las etiquetas «Cotizaciones (`sales_quotes`)» y «Órdenes de Venta (`sales_orders`)» con el flujo de conversión y documentar las claves físicas vigentes conforme a FR-002 y FR-050.
- [x] T105 Validar cambios con pruebas de catálogo, RMA, matriz de roles y UI, además de la suite completa, lint y build; actualizar el registro de verificación de `plan.md`.
- [x] T106 [US1] Separar el listado operativo de Órdenes de Venta del listado de Cotizaciones, quitar contadores redundantes de la navegación y conservar la conversión aprobada solo desde Cotizaciones.
- [x] T107 [US1] Centralizar formularios de cotización, orden, listas/precios, RMA, clientes y documentos en pestañas de «Agregar»; dejar las demás vistas operativas con tablas y acciones.
- [x] T108 [US1] Concentrar KPIs, gráficos y resúmenes en Panel; el Resumen general y el Panel de análisis muestran importes completos solo a Gerente, Jefe de Ventas y Ejecutivo Comercial, y solo conteos/unidades con importes y precios unitarios enmascarados a Postventa y Auditor, sin detalles por registro para Auditor (FR-053, FR-059 a FR-061).
- [x] T109 [US1] Aplicar la matriz de visibilidad: costo/margen solo Jefe de Ventas, datos comerciales para Ejecutivo, órdenes despachadas y RMA sin montos para Postventa, y solo reportes agregados para Auditor.
- [x] T110 [P] Añadir pruebas focalizadas de separación de vistas, centralización de formularios, máscara de costos y visibilidad Postventa/Auditor; actualizar la especificación, el plan y el modelo de datos.
- [x] T111 Ejecutar pruebas completas, lint y build; registrar los resultados finales en `plan.md`.

---

## Fase 10: Respaldo en el spec del código existente (FR-057 a FR-066)

**Propósito**: Documentar funcionalidades ya implementadas fuera de una tarea (commits `38d17de`, `6741975`, `18ebb86` y los datos de ejemplo), para que una implementación desde cero a partir de este spec las reproduzca.

- [x] T112 [P] Selector «Rol activo» sin inicio de sesión, persistido en `erp_ventas:current_role` con Ejecutivo Comercial por defecto, en `modulo-ventas/src/ventas/roles.js` y `modulo-ventas/src/app.js` (FR-057).
- [x] T113 [P] Insignia de rol y tarjeta «Rol activo» con resumen y lista «Puedes realizar» en `modulo-ventas/src/components/role-context.js` e `index.html` (FR-058).
- [x] T114 Agregaciones `buildSalesEvolution` (series Ventas/Pedidos/Cotizaciones por mes, semana o día, con períodos vacíos en cero) y `buildTopProducts` (7 productos, unidades o monto) en `modulo-ventas/src/ventas/analytics.js` (FR-060, FR-061).
- [x] T115 Gráficos con Chart.js (dependencia `chart.js`), filtros `#analytics-period`, `#analytics-metric` y `#analytics-type`, totales, estados vacíos y aviso sin canvas en `modulo-ventas/src/components/ventas/sales-analytics.js` y la sección «Panel de análisis» de `index.html` (FR-059 a FR-062).
- [x] T116 [P] Pruebas de las agregaciones y de los gráficos en `modulo-ventas/tests/ventas/analytics.test.js` y `modulo-ventas/tests/ventas/sales-analytics.test.js` (FR-059 a FR-062).
- [x] T117 [P] Barra lateral oscura con grupos Panel y Operaciones, barra superior, ruta de navegación y variables de estilo en `modulo-ventas/index.html`, `modulo-ventas/src/components/shell.js` y `modulo-ventas/src/styles.css` (FR-063, FR-064).
- [x] T118 Datos de ejemplo con carga automática y botones de carga y recarga en `modulo-ventas/src/ventas/mock-data.js`, `modulo-ventas/src/main.js` y `modulo-ventas/src/app.js` (FR-065, FR-066).
- [ ] T119 [P] Agregar prueba de visibilidad del Resumen: Postventa y Auditor reciben solo conteos de ventas, cotizaciones y pedidos, sin importes ni precios unitarios, sin detalle por registro para Auditor, y Gerente recibe importes completos, en `modulo-ventas/tests/ventas/roles-guard.test.js` y `modulo-ventas/tests/ventas/us3-summary.test.js` (FR-023, FR-024, FR-053, FR-059).

---

## Dependencias y orden de ejecución

### Dependencias por fase

- **Setup (Fase 1)**: sin dependencias; puede comenzar de inmediato.
- **Foundational (Fase 2)**: depende de Setup; bloquea todas las historias.
- **US1 (Fase 3)**: depende de Foundational; no depende de otras historias.
- **US2 (Fase 4)**: depende de Foundational y de un pedido en estado «facturado» creado por US1/US6 para su prueba de extremo a extremo; T120/T121 cubren el descuento de stock al despachar.
- **US3 (Fase 5)**: depende de Foundational y de pedidos/cotizaciones generados por US1.
- **US4 (Fase 6)**: depende de Foundational y de una venta/factura generada por US1/US6.
- **US5 (Fase 7)**: depende de Foundational y de cotizaciones/pedidos generados por US1.
- **US6 (Fase 8)**: depende de Foundational y de un pedido confirmado generado por US1.
- **US7 (Fase 8)**: comparte fase con US6; depende de una factura emitida por US6 para registrar pagos.
- **Polish (Fase 9)**: depende de todas las historias que se deseen entregar.
- **Fase 10 (respaldo y verificación de matriz)**: depende de la matriz de FR-053 y de las vistas de FR-051; T119 verifica el enmascaramiento de importes del Resumen para Postventa y Auditor.

### Dependencias entre historias

- **US1 (P1)**: historia base del MVP; produce clientes, productos, cotizaciones y pedidos.
- **US2 (P2)**: requiere el ciclo de vida y pedidos de US1; su prueba puede sembrar un pedido «facturado».
- **US3 (P3)**: requiere datos de US1; no modifica el flujo de creación.
- **US4 (P4)**: requiere ventas/facturas de US1/US6; su prueba puede sembrar la factura necesaria.
- **US5 (P5)**: requiere cotizaciones/pedidos de US1; es de solo lectura.
- **US6 (P6)**: requiere pedidos confirmados de US1; habilita la entrega de US2.
- **US7 (P7)**: requiere facturas de US6; registra pagos y recalcula el saldo sin permitir sobrepagos (FR-048).

### Dentro de cada historia

- Las pruebas MUST escribirse antes de la implementación y fallar primero.
- Modelos/almacenes antes que servicios; servicios antes que componentes de interfaz.
- La implementación central antes de la integración con el shell.
- Cada historia debe quedar completa y validada antes de considerarse entregada; cuando una historia dependa de otra de mayor prioridad funcional (p. ej., US2 depende de US6), se permite adelantar la dependencia.

### Oportunidades de paralelización

- Todas las tareas [P] de Setup y Foundational pueden ejecutarse en paralelo.
- Las pruebas [P] de una historia pueden escribirse en paralelo.
- Los componentes [P] de una misma historia pueden implementarse en paralelo una vez listos los almacenes.
- US3, US5 y US6 pueden avanzar en paralelo después de US1 si se siembran datos de prueba; US2 y US4 requieren datos de facturación.
- Las tareas de Polish [P] pueden ejecutarse en paralelo entre sí.

---

## Ejemplo de paralelización: US1

```text
# Pruebas de US1 en paralelo:
T018 [US1] Pruebas de catálogo y stock en modulo-ventas/tests/ventas/catalog.test.js
T019 [US1] Pruebas de líneas y totales en modulo-ventas/tests/ventas/order-lines.test.js
T020 [US1] Prueba de integración de creación de orden en modulo-ventas/tests/ventas/us1-create-order.test.js

# Componentes de US1 en paralelo (tras T023-T025):
T026 [US1] Selector de productos en modulo-ventas/src/components/ventas/product-picker.js
T027 [US1] Editor de líneas en modulo-ventas/src/components/ventas/line-editor.js
```

## Ejemplo de paralelización: US6

```text
# Pruebas de US6 en paralelo:
T064 [US6] Pruebas de facturación en modulo-ventas/tests/ventas/invoices.test.js
T065 [US6] Pruebas de pagos/saldo en modulo-ventas/tests/ventas/payments.test.js
T066 [US6] Prueba de integración de facturación en modulo-ventas/tests/ventas/us6-invoice.test.js

# Implementación paralela tras T067-T068:
T069 [US6] Pagos y saldo en modulo-ventas/src/ventas/payments.js
T070 [US6] Panel de facturación en modulo-ventas/src/components/ventas/invoice-panel.js
```

---

## Estrategia de implementación

### MVP primero (solo US1)

1. Completar Fase 1 (Setup).
2. Completar Fase 2 (Foundational), que bloquea todo lo demás.
3. Completar Fase 3 (US1).
4. **DETENERSE Y VALIDAR**: ejecutar `modulo-ventas/tests/ventas/us1-create-order.test.js` y probar la creación de una orden de forma aislada.
5. Demostrar el MVP si está listo.

### Entrega incremental

1. Setup + Foundational → base de dominio lista.
2. US1 → validar y demostrar el MVP.
3. US6 → habilitar facturación y el estado «facturado».
4. US2 → habilitar la entrega, el descuento de stock al despachar y el cierre del ciclo.
5. US3 y US5 → habilitar supervisión e historial.
6. US4 → habilitar devoluciones.
7. Polish → accesibilidad, rendimiento, consistencia y documentación.

### Estrategia de equipo en paralelo

1. El equipo completa Setup y Foundational.
2. Con la base lista:
   - Desarrollador A: US1 (MVP).
   - Desarrollador B: US3 + US5 (solo lectura, con datos sembrados).
   - Desarrollador C: US6 (facturación).
3. Tras US1 y US6: US2 y US4.
4. Integrar y validar cada historia de forma independiente antes de avanzar.

---

## Notas

- [P] indica archivos distintos y sin dependencias pendientes.
- [USx] traza cada tarea a su historia de usuario de `spec.md`.
- US1 es el MVP mínimo; las demás historias agregan valor sin romperla.
- El modelo lógico de `data-model.md` es la única fuente de verdad de entidades y relaciones.
- Mantener `modulo-ventas/src/storage.js` y los componentes base sin bifurcaciones: el dominio nuevo vive en `modulo-ventas/src/ventas/`.
- `PAGO` se incluye en US6/US7: figura en el modelo de datos y en las entidades clave de la especificación, y ahora responde al requisito FR-048 (US7).
- T095 rastrea la desviación justificada del Principio III (sin estados de carga por operaciones síncronas); FR-049 y FR-046 definen la retroalimentación inmediata equivalente.
- Confirmar que las pruebas fallan antes de implementar y ejecutar la suite completa antes de cerrar cada fase.
