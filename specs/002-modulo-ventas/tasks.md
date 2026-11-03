---

description: "Task list for Módulo de Ventas implementation"
---

# Tareas: Módulo de Ventas

**Entrada**: Documentos de diseño en `/specs/002-modulo-ventas/`

**Prerrequisitos**: plan.md (obligatorio), spec.md (obligatorio para historias), data-model.md (modelo entidad-relación v2.0). No existen `research.md`, `contracts/` ni `quickstart.md` para esta funcionalidad.

**Pruebas**: Las tareas de prueba se incluyen porque la constitución del proyecto (Principio II, Test-First & Verification) exige cobertura automatizada de comportamiento visible y lógica de negocio.

**Organización**: Las tareas se agrupan por historia de usuario para permitir implementación y validación independientes. Las historias P2-P6 dependen de los datos creados por US1, pero cada una se valida con su propia prueba aislada.

## Formato: `[ID] [P?] [Story] Descripción`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes).
- **[Story]**: Historia de usuario a la que pertenece la tarea (US1-US6).
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

- [ ] T001 Ejecutar `npm test` y `npm run build` desde la raíz del repositorio y registrar la línea base (111 pruebas y build vigente) antes de cualquier cambio.
- [ ] T002 [P] Agregar el script `test:ventas` (`vitest run modulo-ventas/tests/ventas`) en `package.json`.
- [ ] T003 [P] Crear el punto de entrada del dominio en `modulo-ventas/src/ventas/index.js` reexportando los módulos de Ventas a medida que se implementan.
- [ ] T004 [P] Crear las utilidades de prueba compartidas y el arranque JSDOM en `modulo-ventas/tests/ventas/fixtures.js`.

---

## Fase 2: Foundational (prerrequisitos bloqueantes)

**Propósito**: Infraestructura de dominio que MUST existir antes de implementar cualquier historia.

**⚠️ CRÍTICO**: Ninguna historia de usuario puede comenzar hasta completar esta fase.

- [ ] T005 [P] Implementar los ayudantes de colecciones en `modulo-ventas/src/ventas/collections.js` (claves `erp_ventas:*`, carga/guardado JSON, `generateId`, `generateEntityId`, búsqueda por clave).
- [ ] T006 [P] Implementar las utilidades monetarias en `modulo-ventas/src/ventas/money.js` (redondeo por moneda, subtotal de línea, subtotal/impuesto/total de pedido y factura).
- [ ] T007 [P] Implementar la numeración de series y folios en `modulo-ventas/src/ventas/numbering.js` (secuencias persistidas, formato `serie-folio`, unicidad por colección).
- [ ] T008 [P] Implementar el guardián del ciclo de vida en `modulo-ventas/src/ventas/lifecycle.js` (transiciones permitidas, estados terminales, mensajes de error descriptivos).
- [ ] T009 [P] Implementar la autorización por rol en `modulo-ventas/src/ventas/roles.js` (roles vendedor, operaciones, gerente, devoluciones, jefe de ventas, facturación; `getCurrentRole`, `setCurrentRole`, `can`).
- [ ] T010 [P] Implementar la bitácora de auditoría en `modulo-ventas/src/ventas/audit.js` (venta afectada, productos, cantidad, motivo, fecha y usuario).
- [ ] T011 [P] Implementar el maestro de datos en `modulo-ventas/src/ventas/masters.js` para `ZONA` y `VENDEDOR`, con validación de referencias y ayudantes de siembra desde las opciones de configuración.
- [ ] T012 Extender el esquema de configuración en `modulo-ventas/src/module-config.js` con `businessRules` (`returnWindowDays` por defecto 30, `defaultCurrency`, lista de roles) manteniendo compatibilidad con la configuración actual.
- [ ] T013 [P] Escribir pruebas unitarias de colecciones y numeración en `modulo-ventas/tests/ventas/collections-numbering.test.js`.
- [ ] T014 [P] Escribir pruebas unitarias de cálculos monetarios en `modulo-ventas/tests/ventas/money.test.js`.
- [ ] T015 [P] Escribir pruebas unitarias del guardián del ciclo de vida en `modulo-ventas/tests/ventas/lifecycle.test.js`.
- [ ] T016 [P] Escribir pruebas unitarias de roles y auditoría en `modulo-ventas/tests/ventas/roles-audit.test.js`.
- [ ] T017 [P] Escribir pruebas unitarias de maestros y valores por defecto de configuración en `modulo-ventas/tests/ventas/masters-config.test.js`.

**Punto de control**: Infraestructura lista; las historias de usuario pueden comenzar.

---

## Fase 3: US1 - Crear orden de venta (Prioridad P1) 🎯 MVP

**Meta**: El vendedor registra una orden con cliente existente, líneas de productos, canal, condición de pago y vendedor; el sistema calcula subtotal, IVA y total, valida stock y guarda la orden en estado «cotización».

**Prueba independiente**: Crear un cliente, agregar dos productos con stock suficiente, registrar la orden con pago al contado y verificar que el total incluye IVA y queda en estado «cotización»; comprobar que un producto sin stock y los campos obligatorios faltantes bloquean el guardado.

### Pruebas de US1

- [ ] T018 [P] [US1] Escribir pruebas unitarias de catálogo, precios y reglas de stock en `modulo-ventas/tests/ventas/catalog.test.js`.
- [ ] T019 [P] [US1] Escribir pruebas unitarias de cálculo de líneas, consolidación de duplicados y totales en `modulo-ventas/tests/ventas/order-lines.test.js`.
- [ ] T020 [P] [US1] Escribir la prueba de integración del recorrido «crear orden» (cliente, dos productos, stock, IVA, validaciones) en `modulo-ventas/tests/ventas/us1-create-order.test.js`.

### Implementación de US1

- [ ] T021 [P] [US1] Implementar el catálogo en `modulo-ventas/src/ventas/catalog.js` para `CATEGORIA_PRODUCTO`, `LISTA_PRECIO`, `PRODUCTO` y `PRECIO_PRODUCTO`, con unicidad, vigencia y consultas de stock.
- [ ] T022 [P] [US1] Implementar la cotización en `modulo-ventas/src/ventas/quotes.js` (`COTIZACION`, estados `borrador`/`enviada`/`aceptada`/`rechazada`/`vencida`, aceptación que origina pedido).
- [ ] T023 [US1] Implementar el pedido en `modulo-ventas/src/ventas/orders.js` (`PEDIDO_VENTA` + `DETALLE_PEDIDO`, FK de cliente, vendedor, canal, condición de pago, fecha de entrega y estado inicial «cotización»).
- [ ] T024 [US1] Agregar validación y revalidación de stock en `modulo-ventas/src/ventas/orders.js` (stock cero, insuficiente, líneas duplicadas y cantidades no enteras o no positivas).
- [ ] T025 [US1] Agregar cálculo automático de subtotal, IVA por línea y total con redondeo monetario en `modulo-ventas/src/ventas/orders.js` usando `money.js`.
- [ ] T026 [P] [US1] Crear el selector de productos en `modulo-ventas/src/components/ventas/product-picker.js` (búsqueda por código/nombre, stock visible y bloqueo de productos sin stock).
- [ ] T027 [P] [US1] Crear el editor de líneas en `modulo-ventas/src/components/ventas/line-editor.js` (agregar/quitar/consolidar líneas y totales en vivo).
- [ ] T028 [US1] Crear el formulario de orden en `modulo-ventas/src/components/ventas/order-form.js` (cliente, vendedor, canal, condición de pago, fecha de entrega y visualización de errores).
- [ ] T029 [US1] Agregar la vista «Pedidos de Venta», el formulario y el editor de líneas en `modulo-ventas/index.html`.
- [ ] T030 [US1] Conectar la nueva vista de Ventas, la navegación y el flujo de guardado en `modulo-ventas/src/app.js`.
- [ ] T031 [US1] Agregar mensajes de validación por campo y estados vacíos de pedidos/productos en `modulo-ventas/src/components/ventas/order-form.js` y `modulo-ventas/index.html`.
- [ ] T032 [US1] Agregar estilos del editor de líneas, totales y advertencias de stock en `modulo-ventas/src/styles.css`.
- [ ] T033 [US1] Conectar la búsqueda de clientes y productos por campos base y propios en el flujo de la orden en `modulo-ventas/src/components/ventas/order-form.js`.

**Punto de control**: US1 completamente funcional y validable de forma aislada (MVP).

---

## Fase 4: US2 - Marcar pedido como entregado (Prioridad P2)

**Meta**: El encargado de operaciones y logística cambia un pedido «facturado» a «entregado», y el sistema bloquea cualquier modificación o reversión posterior.

**Prueba independiente**: Seleccionar un pedido «facturado», cambiarlo a «entregado», verificar la persistencia y el reflejo en listas; intentar modificarlo y comprobar el bloqueo por estado terminal.

- [ ] T034 [P] [US2] Escribir pruebas unitarias de reglas de entrega y estado terminal en `modulo-ventas/tests/ventas/delivery.test.js`.
- [ ] T035 [P] [US2] Escribir la prueba de integración del recorrido «marcar pedido entregado» en `modulo-ventas/tests/ventas/us2-delivery.test.js`.
- [ ] T036 [US2] Implementar el servicio de entrega en `modulo-ventas/src/ventas/delivery.js` (solo `facturado → entregado`, persistencia, bloqueo terminal y mensajes de estado previo requerido).
- [ ] T037 [US2] Crear el panel de entrega en `modulo-ventas/src/components/ventas/delivery-panel.js` (selección de pedido facturado, confirmación y feedback).
- [ ] T038 [US2] Agregar la vista/sección de entrega en `modulo-ventas/index.html`.
- [ ] T039 [US2] Conectar el panel de entrega, el guardián de rol de operaciones y la actualización de listas/resumen en `modulo-ventas/src/app.js`.
- [ ] T040 [US2] Bloquear la edición de pedidos «entregado» en `modulo-ventas/src/components/ventas/order-form.js` y en el despacho de `modulo-ventas/src/app.js`.

**Punto de control**: US1 y US2 funcionan de forma independiente.

---

## Fase 5: US3 - Resumen general de ventas (Prioridad P3)

**Meta**: El gerente visualiza el total de ventas, cotizaciones y pedidos, sus montos y el estado actual de cada pedido.

**Prueba independiente**: Registrar ventas en distintos estados, entrar al resumen con rol gerente y verificar cantidades, montos y estados; comprobar el estado vacío con totales en cero.

- [ ] T041 [P] [US3] Escribir pruebas unitarias de agregación del resumen en `modulo-ventas/tests/ventas/summary.test.js`.
- [ ] T042 [P] [US3] Escribir la prueba de integración de la vista de resumen para gerente en `modulo-ventas/tests/ventas/us3-summary.test.js`.
- [ ] T043 [US3] Implementar la agregación del resumen en `modulo-ventas/src/ventas/summary.js` (cantidades, montos, estados y datos persistidos más recientes).
- [ ] T044 [US3] Crear la vista de resumen en `modulo-ventas/src/components/ventas/summary-view.js` con totales y estado vacío en cero.
- [ ] T045 [US3] Agregar el marcado de la vista de resumen y el mensaje de acceso restringido en `modulo-ventas/index.html`.
- [ ] T046 [US3] Conectar la vista de resumen y la restricción del rol gerente en `modulo-ventas/src/app.js`.
- [ ] T047 [US3] Agregar estilos y semántica accesible de tabla/lista del resumen en `modulo-ventas/src/styles.css`.

**Punto de control**: US1, US2 y US3 funcionan de forma independiente.

---

## Fase 6: US4 - Registrar devoluciones (Prioridad P4)

**Meta**: El encargado de devoluciones registra una devolución dentro del plazo de 30 días, con motivo válido y cantidades no devueltas previamente, actualizando el estado del producto y la bitácora.

**Prueba independiente**: Seleccionar una venta dentro del plazo, registrar un motivo válido y verificar el cambio a «en proceso de devolución», el número de seguimiento y la auditoría; comprobar el rechazo fuera de plazo, con motivo inválido y con cantidad excesiva.

- [ ] T048 [P] [US4] Escribir pruebas unitarias de plazo, motivo y límites de devolución en `modulo-ventas/tests/ventas/returns.test.js`.
- [ ] T049 [P] [US4] Escribir la prueba de integración del recorrido «registrar devolución» en `modulo-ventas/tests/ventas/us4-returns.test.js`.
- [ ] T050 [US4] Implementar el almacén de devoluciones en `modulo-ventas/src/ventas/returns.js` (`DEVOLUCION` + `DETALLE_DEVOLUCION`, número de seguimiento y estados `solicitada`/`aprobada`/`rechazada`/`completada`).
- [ ] T051 [US4] Agregar las validaciones de plazo de 30 días, motivo no vacío y cantidad máxima devolvible en `modulo-ventas/src/ventas/returns.js`.
- [ ] T052 [US4] Actualizar el estado del producto a «en proceso de devolución» y registrar la auditoría en `modulo-ventas/src/ventas/returns.js` usando `audit.js`.
- [ ] T053 [P] [US4] Crear el panel de devoluciones en `modulo-ventas/src/components/ventas/returns-panel.js` (selección de venta, productos, cantidad, motivo y errores).
- [ ] T054 [US4] Agregar la vista y el formulario de devoluciones en `modulo-ventas/index.html`.
- [ ] T055 [US4] Conectar el panel de devoluciones, el guardián de rol y la actualización de estados en `modulo-ventas/src/app.js`.
- [ ] T056 [US4] Agregar estilos de devoluciones y resaltado de campos inválidos en `modulo-ventas/src/styles.css`.

**Punto de control**: US1 a US4 funcionan de forma independiente.

---

## Fase 7: US5 - Historial comercial del cliente (Prioridad P5)

**Meta**: El jefe de ventas consulta el perfil comercial de un cliente con todas sus cotizaciones y pedidos, fecha, importe y estado actual.

**Prueba independiente**: Seleccionar un cliente con pedidos asociados y verificar el listado completo con estados; comprobar el estado vacío de un cliente sin movimientos.

- [ ] T057 [P] [US5] Escribir pruebas unitarias de agregación del historial comercial en `modulo-ventas/tests/ventas/history.test.js`.
- [ ] T058 [P] [US5] Escribir la prueba de integración de la vista de historial de cliente en `modulo-ventas/tests/ventas/us5-client-history.test.js`.
- [ ] T059 [US5] Implementar la agregación del historial en `modulo-ventas/src/ventas/history.js` (cotizaciones y pedidos con fecha, importe y estado actual).
- [ ] T060 [US5] Crear el componente de historial en `modulo-ventas/src/components/ventas/client-history.js` con estado vacío.
- [ ] T061 [US5] Agregar la vista de historial comercial del cliente en `modulo-ventas/index.html`.
- [ ] T062 [US5] Conectar la vista de historial, el selector de cliente y el guardián del rol jefe de ventas en `modulo-ventas/src/app.js`.
- [ ] T063 [US5] Refrescar el historial cuando cambie el estado de una cotización o pedido en `modulo-ventas/src/ventas/history.js` y `modulo-ventas/src/app.js`.

**Punto de control**: US1 a US5 funcionan de forma independiente.

---

## Fase 8: US6 - Generar factura desde pedido confirmado (Prioridad P6)

**Meta**: El encargado de facturación genera una factura desde un pedido confirmado, copiando cliente, líneas, precios e impuestos, en estado «pendiente de pago», sin duplicados.

**Prueba independiente**: Generar una factura desde un pedido en estado «pedido», verificar la copia de líneas e impuestos, el estado «pendiente de pago»; comprobar el bloqueo desde «cotización» y la prevención de una segunda factura.

- [ ] T064 [P] [US6] Escribir pruebas unitarias de reglas de facturación y unicidad en `modulo-ventas/tests/ventas/invoices.test.js`.
- [ ] T065 [P] [US6] Escribir pruebas unitarias de registro de pagos y recálculo de saldo en `modulo-ventas/tests/ventas/payments.test.js`.
- [ ] T066 [P] [US6] Escribir la prueba de integración del recorrido «generar factura» en `modulo-ventas/tests/ventas/us6-invoice.test.js`.
- [ ] T067 [US6] Implementar el almacén de facturas en `modulo-ventas/src/ventas/invoices.js` (`FACTURA` desde pedido confirmado, copia de cliente/líneas/precios/impuestos, estado «pendiente de pago» y saldo).
- [ ] T068 [US6] Agregar elegibilidad y protección de duplicados en `modulo-ventas/src/ventas/invoices.js` (solo estado «pedido», una factura por pedido y guardia ante solicitudes concurrentes).
- [ ] T069 [P] [US6] Implementar el registro de pagos y recálculo de saldo en `modulo-ventas/src/ventas/payments.js` (`PAGO`, monto positivo y suma de pagos ≤ total facturado).
- [ ] T070 [P] [US6] Crear el panel de facturación en `modulo-ventas/src/components/ventas/invoice-panel.js` (pedido elegible, detalle de factura, saldo y mensajes de bloqueo).
- [ ] T071 [US6] Agregar la vista de facturación y el detalle de factura/pagos en `modulo-ventas/index.html`.
- [ ] T072 [US6] Conectar la generación de facturas, los mensajes de bloqueo y el guardián del rol facturación en `modulo-ventas/src/app.js`.
- [ ] T073 [US6] Propagar el estado «facturado» a pedido, entrega y resumen en `modulo-ventas/src/ventas/orders.js`, `modulo-ventas/src/ventas/delivery.js` y `modulo-ventas/src/ventas/summary.js`.
- [ ] T074 [US6] Agregar estilos de facturación, saldos y estados de pago en `modulo-ventas/src/styles.css`.
- [ ] T075 [US6] Agregar la prueba de concurrencia/idempotencia que garantiza una sola factura persistida por pedido en `modulo-ventas/tests/ventas/us6-invoice-concurrency.test.js`.

**Punto de control**: Las seis historias de usuario funcionan de forma independiente.

---

## Fase 9: Polish y preocupaciones transversales

**Propósito**: Cerrar requisitos transversales de permisos, accesibilidad, rendimiento, consistencia y documentación.

- [ ] T076 [P] Cubrir la autorización por rol de todas las acciones en `modulo-ventas/tests/ventas/roles-guard.test.js` (crear, facturar, entregar, devolver, resumen e historial).
- [ ] T077 [P] Completar los estados vacíos de productos, pedidos, facturas, devoluciones, historial y resumen en sus componentes de `modulo-ventas/src/components/ventas/`.
- [ ] T078 [P] Agregar etiquetas, `aria-live` y encabezados de tabla accesibles a las nuevas vistas en `modulo-ventas/index.html`.
- [ ] T079 Agregar la prueba de rendimiento con 500 pedidos para listados y resumen en `modulo-ventas/tests/ventas/performance.test.js`.
- [ ] T080 Agregar pruebas transversales de consistencia (sin pedidos huérfanos, una factura por pedido y límites de devolución) en `modulo-ventas/tests/ventas/consistency.test.js`.
- [ ] T081 Actualizar la tabla de estado de implementación de `specs/002-modulo-ventas/data-model.md` con las entidades implementadas y parciales.
- [ ] T082 Actualizar las fases y la sección de cambios de `specs/002-modulo-ventas/plan.md` con el estado final de la entrega.
- [ ] T083 Documentar las nuevas colecciones, roles y `businessRules` en `specs/002-modulo-ventas/data-model.md` §7 y §8.
- [ ] T084 Eliminar cálculos duplicados y código sin uso en `modulo-ventas/src/ventas/` y `modulo-ventas/src/components/ventas/`.
- [ ] T085 Ejecutar `npm test` desde la raíz y corregir cualquier regresión de la suite completa.
- [ ] T086 Ejecutar `npm run build` desde la raíz y verificar la salida en `modulo-ventas/dist/`.

---

## Dependencias y orden de ejecución

### Dependencias por fase

- **Setup (Fase 1)**: sin dependencias; puede comenzar de inmediato.
- **Foundational (Fase 2)**: depende de Setup; bloquea todas las historias.
- **US1 (Fase 3)**: depende de Foundational; no depende de otras historias.
- **US2 (Fase 4)**: depende de Foundational y de un pedido en estado «facturado» creado por US1/US6 para su prueba de extremo a extremo.
- **US3 (Fase 5)**: depende de Foundational y de pedidos/cotizaciones generados por US1.
- **US4 (Fase 6)**: depende de Foundational y de una venta/factura generada por US1/US6.
- **US5 (Fase 7)**: depende de Foundational y de cotizaciones/pedidos generados por US1.
- **US6 (Fase 8)**: depende de Foundational y de un pedido confirmado generado por US1.
- **Polish (Fase 9)**: depende de todas las historias que se deseen entregar.

### Dependencias entre historias

- **US1 (P1)**: historia base del MVP; produce clientes, productos, cotizaciones y pedidos.
- **US2 (P2)**: requiere el ciclo de vida y pedidos de US1; su prueba puede sembrar un pedido «facturado».
- **US3 (P3)**: requiere datos de US1; no modifica el flujo de creación.
- **US4 (P4)**: requiere ventas/facturas de US1/US6; su prueba puede sembrar la factura necesaria.
- **US5 (P5)**: requiere cotizaciones/pedidos de US1; es de solo lectura.
- **US6 (P6)**: requiere pedidos confirmados de US1; habilita la entrega de US2.

### Dentro de cada historia

- Las pruebas MUST escribirse antes de la implementación y fallar primero.
- Modelos/almacenes antes que servicios; servicios antes que componentes de interfaz.
- La implementación central antes de la integración con el shell.
- Cada historia debe quedar completa y validada antes de pasar a la siguiente prioridad.

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
4. US2 → habilitar la entrega y el cierre del ciclo.
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
- `PAGO` se incluye en US6 porque figura en el modelo de datos y en las entidades clave de la especificación, aunque no tenga un requisito funcional explícito.
- Confirmar que las pruebas fallan antes de implementar y ejecutar la suite completa antes de cerrar cada fase.
