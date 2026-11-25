# Feature Specification: Módulo de Ventas

**Feature Branch**: `002-modulo-ventas`

**Created**: 2026-11-02

**Status**: En progreso

**Input**: User description: "Módulo ERP de Ventas para registrar cotizaciones y pedidos de venta con cliente, productos, cantidades, precios, impuestos y control de stock; gestionar el ciclo cotización → pedido → facturado → entregado; emitir facturas, procesar devoluciones, consultar el historial comercial de cada cliente y obtener un resumen general de ventas por rol."

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Vendedor (Priority: P1)

Descripción: Como vendedor, necesito poder crear un Pedido de Venta. Quiero buscar y seleccionar a un cliente, ir agregando los distintos productos que va a llevar, y anotar cómo nos va a pagar. Todo esto para registrar la compra y que el resto de mis compañeros (como facturación o el jefe de ventas) tengan la información que necesitan para hacer su parte.

¿Por qué esta prioridad?: Porque es el inicio de todo el proceso (Prioridad 1). Si yo como vendedor no registro la venta con todos los detalles (quién compra, qué compra y quién lo vende), los demás roles no tienen datos para revisar, cobrar o analizar.

Prueba independiente: Un vendedor se mete al sistema, crea un pedido nuevo, elige a un cliente que ya existe, le agrega dos productos diferentes fijándose que haya stock, y selecciona `contado` como `condicion_pago`. El sistema le suma todo, le saca el IVA y le guarda el documento como "Cotización".

Escenarios de aceptación:
1. Dado que estoy armando una venta nueva, cuando elijo al cliente, entonces el sistema tiene que guardar sí o sí el ID del cliente para que le quede guardado en su historial.

2. Dado que estoy agregando productos a la boleta, cuando pongo la cantidad de cada cosa, entonces el sistema tiene que multiplicar los precios solo y sumarme el total final con el IVA incluido.

3. Dado que busco un producto para agregarlo, cuando el sistema ve que el stock está en cero, entonces me tiene que tirar un aviso en pantalla y no dejarme venderlo.

4. Dado que ya terminé de anotar todo, cuando le doy a guardar, entonces el sistema me tiene que pedir de forma obligatoria el Canal de Venta, la Condición de Pago y mi ID de vendedor, y lo deja guardado en estado inicial de "Cotización".


---

### User Story 2 - Encargado de operaciones y logística (Priority: P2)

Descripción: Como encargado de operaciones y logística, quiero actualizar el estado de una venta a «entregado» una vez confirmado el despacho físico de los productos, para dar por completado el ciclo comercial del pedido y asegurar que no queden ventas pendientes de entrega en el sistema. El stock NO se descuenta al crear ni al facturar el pedido: se descuenta al despachar, como parte de la transición «facturado» → «entregado».

¿Por qué esta prioridad?: Tiene prioridad P2 porque es la etapa que cierra formalmente la operación logística y comercial; permite que tanto ventas como contabilidad reconozcan que el cliente ya recibió su pedido satisfactoriamente.

Prueba independiente: Se puede probar seleccionando un pedido de venta que se encuentre en estado «facturado», cambiando su estado a «entregado» y verificando que el sistema guarde el cambio y marque la venta en su estado final.

Escenarios de aceptación:
1. Dado que un pedido de venta se encuentra en estado «facturado» y cuenta con confirmación de despacho físico en bodega, Cuando el encargado de logística selecciona el pedido y cambia su estado a «entregado», Entonces el sistema actualiza y persiste el estado del pedido a «entregado», cerrando exitosamente el ciclo comercial.
   
2. Dado que un pedido de venta ya se encuentra en estado «entregado», Cuando el usuario intenta modificar o revertir el estado del pedido, Entonces el sistema bloquea la acción y emite un mensaje indicando que es un estado terminal que no admite modificaciones posteriores.

3. Dado que un pedido en estado «facturado» aún conserva el stock sin descontar, Cuando el encargado confirma el despacho y el sistema lo pasa a «entregado», Entonces se descuentan de forma atómica las cantidades despachadas de cada producto; si al despachar no hay stock suficiente, la transición se bloquea y el stock queda sin cambios.


---

### User Story 3 - Gerente (Priority: P3)

Como gerente, quiero visualizar un resumen general de las ventas, cotizaciones y pedidos registrados en el sistema, con importes completos, para supervisar el desempeño comercial y tomar decisiones que permitan mejorar los resultados de la empresa. El mismo resumen está disponible para los roles con `ver_resumen` de FR-053 (Ejecutivo Comercial, Jefe de Ventas, Postventa y Auditor), con la visibilidad de importes definida en esa matriz.

**Why this priority**: Esta historia tiene prioridad P3 porque permite al gerente tener una visión general del funcionamiento del área de ventas y evaluar sus resultados. Es una herramienta útil para la toma de decisiones, aunque no es indispensable para realizar las operaciones diarias de venta.

**Independent Test**: Se puede probar ingresando al módulo de ventas con un usuario que tenga el rol de gerente y accediendo al resumen general. Se debe verificar que el sistema muestre correctamente las ventas, cotizaciones y pedidos registrados, junto con sus respectivos estados y montos. También se debe probar con los roles Postventa y Auditor: el resumen debe mostrar solo conteos, con los importes y precios unitarios enmascarados y sin registros individuales para Auditor.

**Acceptance Scenarios**:
1. Dado que existen ventas, cotizaciones y pedidos registrados en el sistema, cuando el gerente ingresa al resumen general de ventas, entonces puede visualizar la información comercial registrada con importes completos.
2. Dado que existen pedidos con diferentes estados, cuando el gerente consulta el resumen de ventas, entonces puede identificar el estado actual de cada pedido; Postventa solo ve órdenes despachadas sin importes y Auditor solo ve métricas agregadas, sin registros individuales.
3. Dado que existen ventas registradas, cuando el gerente consulta el resumen general, entonces el sistema muestra el total de ventas realizadas con sus importes.
4. Dado que existen ventas registradas, cuando Postventa o Auditor consultan el resumen general, entonces el sistema muestra únicamente los conteos de ventas, cotizaciones y pedidos, con los importes y precios unitarios enmascarados y sin exponer el detalle por registro al Auditor.

---

### User Story 4 - Postventa y Jefe de Ventas (Priority: P4)

Como encargado de devoluciones de productos quiero poder editar el estado de un producto o productos vendidos en una venta anterior por solicitud de devolución de un cliente, validando en el proceso el motivo de la solicitud y la fecha desde que se compró.

**Why this priority**: Tiene prioridad P4 porque aceptar las devoluciones de acuerdo con los parámetros empresariales ayuda a mejorar la satisfacción del cliente y saber qué aspectos mejorar para la próxima venta, como transporte, material del producto, etc, lo que es vital para mantener la empresa a largo plazo. Si bien es importante manejar la devolución de productos, no es tan prioritario para el proceso de ventas como los otros.

**Independent Test**: Se puede probar simulando la selección de una factura emitida dentro del período permitido, ingresando un motivo válido de devolución y verificando que la devolución se registre correctamente en el sistema con su FK a la factura, el pedido derivado de ella y la auditoría correspondiente.

**Acceptance Scenarios**:

1. Dado que el cliente solicita una devolución dentro del plazo permitido por la empresa (por ejemplo, 30 días desde la fecha de compra) y proporciona un motivo válido, cuando Postventa registra el RMA, entonces el sistema guarda la solicitud en estado `solicitada`, registra el motivo y emite un número de seguimiento.
2. Cuando Postventa intenta solicitar una devolución superando el plazo límite establecido por la política de la empresa (por ejemplo, más de 30 días desde la compra), el sistema rechaza la solicitud, muestra un error indicando que el período expiró y no modifica el estado del producto.
3. Cuando Postventa intenta procesar una devolución con un motivo incompleto o no válido, el sistema bloquea el registro, resalta los campos faltantes o inválidos y solicita una justificación adecuada para cumplir con los controles internos.
4. Dada una solicitud en estado `solicitada`, solo el Jefe de Ventas puede aprobarla o rechazarla; Postventa puede completar una solicitud aprobada, pero no aprobarla.

---

### User Story 5 - Jefe de ventas (Priority: P5)

Como jefe de ventas quiero supervisar el historial comercial de cada cliente (cotizaciones y pedidos) y su estado actual, para así realizar un seguimiento personalizado y controlar el progreso de las ventas.

**Why this priority**: Permite el seguimiento personalizado y el control del progreso comercial por cliente; es una vista de solo lectura que no bloquea el flujo de venta.

**Independent Test**: Se puede probar seleccionando y visitando el perfil de un cliente existente que tenga pedidos asociados, verificando que se muestre su historial comercial completo y el estado actualizado de las transacciones realizadas.

**Acceptance Scenarios**:

1. Dado que un cliente tiene transacciones registradas, cuando el jefe de ventas entra a su perfil, entonces se puede visualizar un listado con las cotizaciones y pedidos realizados.

---

### User Story 6 - Encargado de facturación (Priority: P6)

Como encargado de facturación necesito generar una factura a partir de un Pedido de Venta ya confirmado, con el fin de formalizar el cobro del cliente y registrar la venta en el sistema contable.

**Why this priority**: Porque es la conexión entre los procesos comercial y contable, ya que sin la emisión de factura no se puede formalizar el cobro a los clientes, no se genera registro en cuentas por cobrar, ni se puede respaldar tributariamente las ventas de la empresa.

**Independent Test**: Se puede probar seleccionando un Pedido de Venta existente en estado «pedido» y usando la opción «Generar Factura», para verificar que los datos del cliente, productos e impuestos se traspasan automáticamente desde el pedido, y comprobando que el documento se guarde en estado «Pendiente de pago».

**Acceptance Scenarios**:

1. Dado que existe un pedido de venta en estado «pedido» en el sistema, cuando el encargado de facturación selecciona el pedido y presiona «Generar Factura», entonces el sistema crea automáticamente el registro de la factura copiando las líneas de productos, precios e impuestos, dejando la factura en estado inicial «Pendiente de pago».

2. Dado que se está generando una factura a partir de un pedido de venta, cuando el sistema procesa los montos, entonces calcula correctamente el subtotal, aplica la tasa de impuesto asociada y muestra el monto total a cobrar.

3. Dado que se intenta emitir una factura sobre un pedido de venta que aún se encuentra en estado «cotización» (no confirmado), cuando el encargado de facturación intenta proceder con la emisión, entonces el sistema bloquea la acción, resalta un mensaje de error indicando que el pedido requiere confirmación previa y no genera ningún registro de factura.

4. Dado que un pedido de venta ya cuenta con una factura emitida previamente, cuando el usuario intenta generar una segunda factura para el mismo pedido, entonces el sistema impide la duplicación de comprobantes y notifica que el pedido ya posee un documento fiscal asociado.

---

### User Story 7 - Encargado de facturación registra pagos (Priority: P7)

Como encargado de facturación, quiero registrar pagos aplicados a una factura (fecha, monto, método y referencia) para reducir el saldo pendiente sin permitir sobrepagos.

**Why this priority**: Completa el ciclo de cobro iniciado por la factura; sin registro de pagos la factura no puede saldarse ni reflejar su estado real de cobro.

**Independent Test**: Sobre una factura «pendiente de pago», registrar un pago válido y verificar la reducción del saldo; intentar un pago que exceda el saldo y comprobar el rechazo.

**Acceptance Scenarios**:

1. Dado una factura con saldo pendiente, cuando el encargado registra un pago con monto menor o igual al saldo, entonces el saldo se recalcula y el estado pasa a «parcial» o «pagada».
2. Dado una factura con saldo pendiente, cuando el encargado registra un pago mayor al saldo, entonces el sistema rechaza la operación sin modificar la factura.

---

### Edge Cases

- ¿Qué ocurre cuando se intenta agregar un producto sin stock o con stock insuficiente para la cantidad solicitada? El sistema debe avisar y no permitir agregarlo ni guardar la venta.
- ¿Qué ocurre si el stock de un producto cambia entre el momento en que se agrega a la venta y el momento en que se confirma el pedido? El sistema debe revalidar la disponibilidad antes de confirmar y bloquear la operación si ya no alcanza.
- ¿Qué ocurre si se agrega dos veces el mismo producto a una venta? El sistema debe consolidar la cantidad en una sola línea o impedir la línea duplicada, recalculando el stock y los importes.
- ¿Qué ocurre si se ingresa una cantidad cero, negativa o no entera? El sistema debe rechazar el valor e indicar que la cantidad debe ser un entero positivo.
- ¿Qué ocurre si faltan el canal de venta, la condición de pago o el vendedor al guardar? El sistema debe impedir el guardado y señalar cada campo obligatorio faltante.
- ¿Qué ocurre si se selecciona un cliente inexistente o se intenta guardar una venta sin cliente? El sistema debe bloquear el guardado y exigir un cliente válido.
- ¿Qué ocurre si el cliente, el producto o el vendedor se eliminan después de registrar una venta? El sistema debe preservar la integridad histórica de la venta y aplicar la política de borrado definida para cada relación.
- ¿Qué ocurre si se intenta modificar o revertir un pedido que ya está en estado «entregado»? El sistema debe bloquear la acción por tratarse de un estado terminal.
- ¿Qué ocurre si se intenta pasar a «entregado» un pedido que no está «facturado»? El sistema debe rechazar la transición e indicar el estado previo requerido.
- Emisión de factura desde cotización o pedido no confirmado: ver FR-040 (y US6/AC3).
- Segunda factura para el mismo pedido o emisión concurrente: ver FR-041, FR-047 y US6/AC4.
- ¿Qué ocurre si se solicita una devolución después del plazo permitido? El sistema debe rechazarla y mostrar que el período de devolución expiró, sin modificar el estado del producto.
- ¿Qué ocurre si se intenta devolver una cantidad mayor a la vendida o ya devuelta? El sistema debe bloquear la devolución y señalar el máximo devolvible por producto.
- ¿Qué ocurre si el motivo de devolución está vacío o no es válido? El sistema debe impedir el registro, resaltar los campos faltantes y solicitar una justificación válida.
- ¿Qué ocurre si un cliente no tiene cotizaciones ni pedidos? El perfil debe mostrar un estado vacío claro en su historial comercial.
- ¿Qué ocurre si no existen ventas, cotizaciones ni pedidos al abrir el resumen general? El sistema debe mostrar los totales en cero y un estado vacío comprensible.
- ¿Qué ocurre si un pedido tiene productos con distintas tasas de impuesto? El sistema debe calcular el impuesto por línea y sumarlo correctamente en el total del pedido.
- ¿Qué ocurre si el resumen general se consulta mientras otro usuario registra una venta? El resumen debe reflejar la información persistida más reciente al momento de la consulta.
- ¿Qué ocurre si un usuario sin el rol correspondiente intenta facturar, entregar, devolver o ver el resumen general? El sistema debe denegar la acción y mantener la información protegida según el rol.
- ¿Qué ocurre si el conjunto de ejemplo repite un nombre propio entre vendedores, contactos de clientes o responsables de rol? El seed no cumple FR-066: las pruebas deben rechazarlo, sin admitir duplicados como «Ana Pérez» en dos registros.
- ¿Qué ocurre si el seed intenta una devolución fuera del plazo de FR-027? El guardián debe rechazarla con el mensaje de plazo expirado, no persistirla y dejar constancia del intento en el resultado de la carga (FR-066).
- ¿Qué ocurre si un cliente sembrado no tiene cotizaciones ni pedidos? Su perfil debe mostrar el estado vacío de historial comercial descrito en FR-046 y US5, sin registros falsos.

## Requirements *(mandatory)*

### Functional Requirements

**Base y terminología**

- **FR-001**: El sistema DEBE persistir clientes, cotizaciones, pedidos de venta, facturas y devoluciones de forma consistente entre sesiones y pantallas.
- **FR-002**: El sistema DEBE presentar el módulo con el nombre «Ventas» y distinguir claramente las Cotizaciones (`sales_quotes`) de las Órdenes de Venta (`sales_orders`) en la navegación. Los documentos genéricos del módulo base DEBEN etiquetarse como «Documentos de clientes», nunca como «Pedidos de Venta».
- **FR-003**: El sistema DEBE registrar los campos propios del dominio: vendedor y zona del cliente; canal de venta y fecha de entrega del pedido.
- **FR-004**: El sistema DEBE permitir buscar clientes y productos por sus datos identificatorios y descriptivos, incluidos los campos propios del dominio.
- **FR-005**: El sistema DEBE gestionar el ciclo de vida del pedido de venta con los estados «cotización», «pedido», «facturado», «entregado» y «cancelado», aplicando únicamente las transiciones permitidas. El estado «cotización» corresponde al Pedido de Venta registrado directamente y no debe confundirse con la entidad Cotización (ver Key Entities).
- **FR-006**: El sistema DEBE mantener la integridad referencial entre clientes, pedidos, facturas y devoluciones, impidiendo registros huérfanos o referencias inexistentes.

**Registro de la venta (Vendedor)**

- **FR-007**: El sistema DEBE permitir a un vendedor crear un Pedido de Venta seleccionando un cliente existente y guardando su identificador en el pedido.
- **FR-008**: El sistema DEBE permitir agregar al pedido uno o más productos, indicando la cantidad de cada uno.
- **FR-009**: El sistema DEBE calcular automáticamente el subtotal de cada línea multiplicando cantidad por precio unitario.
- **FR-010**: El sistema DEBE calcular automáticamente el subtotal del pedido, el impuesto (IVA) aplicable y el total final con impuesto incluido.
- **FR-011**: El sistema DEBE mostrar de forma separada y comprensible el subtotal, el impuesto y el total del pedido.
- **FR-012**: El sistema DEBE validar la disponibilidad de stock al agregar cada producto y al guardar el pedido, impidiendo la venta cuando el stock sea cero o insuficiente.
- **FR-013**: El sistema DEBE exigir de forma obligatoria el canal de venta, la condición de pago y el vendedor responsable al guardar el pedido.
- **FR-014**: El sistema DEBE crear todo Pedido de Venta nuevo en estado inicial «cotización».
- **FR-015**: El sistema DEBE permitir editar un Pedido de Venta solo en los estados «cotización» y «pedido», recalculando sus importes y revalidando el stock; en «facturado», «entregado» y «cancelado» la edición DEBE bloquearse.
- **FR-016**: El sistema DEBE registrar `condicion_pago` como enum cerrado `{contado, credito}`, declarado en la clave de configuración `businessRules.paymentConditions` y persistido en el pedido como `paymentTerms`. CUALQUIER otro valor o texto libre DEBE rechazarse.
- **FR-017**: El sistema DEBE conservar el detalle de productos, cantidades, precios, impuestos e importes de cada Pedido de Venta para su consulta posterior.

**Ciclo de entrega (Operaciones y logística)**

- **FR-018**: El sistema DEBE permitir al encargado de operaciones y logística cambiar el estado de un pedido de «facturado» a «entregado» cuando exista confirmación del despacho físico.
- **FR-019**: El sistema DEBE persistir el cambio de estado a «entregado» y reflejarlo de inmediato en las listas, el detalle del pedido y el resumen general.
- **FR-020**: El sistema DEBE tratar «entregado» como estado terminal, bloqueando cualquier modificación o reversión posterior e informando el motivo.
- **FR-021**: El sistema DEBE rechazar cualquier transición de estado no contemplada en el ciclo de vida con un mensaje claro que indique el estado actual y los estados permitidos.

**Resumen general (Gerente)**

- **FR-022**: El sistema DEBE ofrecer el resumen general de las ventas, cotizaciones y pedidos registrados a los roles con `ver_resumen` definidos en FR-053 (Ejecutivo Comercial, Gerente, Postventa, Jefe de Ventas y Auditor); al gerente se le muestra la información completa con importes.
- **FR-023**: El sistema DEBE mostrar en el resumen la cantidad total de ventas, cotizaciones y pedidos, así como sus montos cuando corresponda; los importes se muestran solo a los roles con visibilidad de montos según FR-053 y se enmascaran para Postventa y Auditor, que reciben únicamente conteos.
- **FR-024**: El sistema DEBE mostrar el estado actual de cada pedido en el resumen general a los roles con detalle por registro (Ejecutivo Comercial, Gerente y Jefe de Ventas); Auditor ve solo métricas agregadas y Postventa solo órdenes despachadas, ambos sin importes.
- **FR-025**: El sistema DEBE actualizar el resumen general para que refleje la información persistida más reciente al momento de la consulta.

**Devoluciones (Encargado de devoluciones)**

- **FR-026**: El sistema DEBE permitir al encargado de devoluciones seleccionar una factura existente y solicitar la devolución de uno o más productos vendidos en ella. La devolución DEBE anclarse a la factura mediante `facturaId` (FK → `FACTURA.id`); el pedido DEBE derivarse de `factura.pedidoId` y la devolución NO DEBE almacenar una FK propia de pedido.
- **FR-027**: El sistema DEBE definir el plazo de devolución (por defecto 30 días calendario desde la fecha de compra) y usarlo como referencia para validar la solicitud.
- **FR-028**: El sistema DEBE exigir un motivo de devolución válido y no vacío para registrar la devolución.
- **FR-029**: El sistema DEBE registrar la devolución en estado `solicitada`; Postventa puede gestionar la solicitud, solo el Jefe de Ventas puede aprobarla o rechazarla, y Postventa o el Jefe de Ventas pueden completar una solicitud aprobada.
- **FR-030**: El sistema DEBE emitir un número de seguimiento único de la devolución para el cliente.
- **FR-031**: El sistema DEBE rechazar, sin registrar la devolución, las solicitudes fuera de plazo (FR-027), con motivo inválido (FR-028) o con cantidades superiores a las vendidas y no devueltas.
- **FR-032**: El sistema DEBE registrar en una bitácora de auditoría la venta afectada, los productos devueltos, la cantidad, el motivo, la fecha y el usuario que procesó la devolución.

**Historial comercial (Jefe de ventas)**

- **FR-033**: El sistema DEBE permitir al jefe de ventas consultar el perfil comercial de un cliente existente.
- **FR-034**: El sistema DEBE mostrar en el perfil del cliente el listado completo de sus cotizaciones y pedidos, con fecha, importe y estado actual.
- **FR-035**: El sistema DEBE mantener actualizado el historial comercial cuando cambie el estado de una cotización o pedido.

**Facturación (Encargado de facturación)**

- **FR-036**: El sistema DEBE permitir al encargado de facturación generar una factura a partir de un Pedido de Venta en estado «pedido».
- **FR-037**: El sistema DEBE copiar automáticamente a la factura el cliente, las líneas de productos, los precios y los impuestos del pedido de origen.
- **FR-038**: El sistema DEBE calcular automáticamente el subtotal, el impuesto y el monto total a cobrar de la factura.
- **FR-039**: El sistema DEBE crear la factura en estado inicial «pendiente de pago».
- **FR-040**: El sistema DEBE bloquear la emisión de facturas sobre pedidos en estado «cotización» (no confirmados), sin generar ningún registro.
- **FR-041**: El sistema DEBE impedir que un mismo Pedido de Venta tenga más de una factura asociada.
- **FR-042**: El sistema DEBE vincular cada factura con su pedido de venta y su cliente, conservando la trazabilidad del documento fiscal.

**Validación, permisos y experiencia de uso**

- **FR-043**: El sistema DEBE validar todos los campos obligatorios antes de guardar y mostrar retroalimentación clara indicando qué información falta o es inválida.
- **FR-044**: El sistema DEBE calcular los importes con precisión monetaria y redondear al entero o decimal según la configuración de la moneda (p. ej., CLP sin decimales; USD con 2).
- **FR-045**: El sistema DEBE restringir las acciones de creación, facturación, entrega, devolución y consulta del resumen según el rol activo definido en FR-057 y conforme a la matriz de permisos de FR-053, que es la autoridad para la visibilidad y las acciones por rol.
- **FR-046**: El sistema DEBE mostrar estados vacíos claros cuando no existan clientes, productos, ventas, cotizaciones, pedidos o devoluciones que mostrar.
- **FR-047**: El sistema DEBE mantener la consistencia de los datos ante operaciones simultáneas o repetidas, evitando duplicados de facturas, devoluciones y líneas de pedido.
- **FR-048**: El sistema DEBE registrar pagos aplicados a una factura, con fecha, monto, método y referencia, recalculando el saldo pendiente sin permitir sobrepagos.
- **FR-049**: Todas las vistas DEBEN seguir el mismo patrón de carga y retroalimentación: al cargar o actualizar listas se muestra un indicador de carga accesible; durante una acción asíncrona el botón correspondiente queda deshabilitado y muestra un spinner; al finalizar cada acción se muestra un mensaje inequívoco de éxito o error, anunciado mediante `aria-live` y con una acción de recuperación cuando corresponda. Los estados vacíos, la validación y el manejo de errores DEBEN conservar la terminología y el diseño del módulo base, de modo que el usuario entienda el estado, pueda navegar y recuperarse del error sin ambigüedad.
- **FR-050**: El sistema DEBE presentar la pre-venta como «Cotizaciones (`sales_quotes`)» y la venta como «Órdenes de Venta (`sales_orders`)» en vistas diferenciadas. Aceptar una cotización aprobada DEBE crear como máximo una orden vinculada. Estos nombres son etiquetas de interfaz; se conservan las claves físicas `erp_ventas:cotizaciones` y `erp_ventas:pedidos`.
- **FR-051**: El menú lateral DEBE ofrecer una sola entrada «Panel» para KPIs, gráficos y resúmenes; las vistas operativas de Órdenes de Venta (`sales_orders`) y Cotizaciones (`sales_quotes`) DEBEN ser distintas y mostrar solo sus propios registros y acciones. Las tablas no DEBEN duplicarse dentro del Panel ni entre sí.
- **FR-052**: El sistema DEBE centralizar en «Agregar» los formularios de cotización, orden de venta, listas/precios y devolución RMA, accesibles mediante pestañas internas. Los formularios de cliente y documento también DEBEN estar en esa sección; las demás vistas operativas se limitan a sus tablas y acciones de gestión.
- **FR-053**: El selector de rol DEBE aplicar la matriz de visibilidad y acciones que se detalla a continuación. Jefe de Ventas ve la información completa, incluidos costos estándar, márgenes y contactos completos, y tiene todas las acciones habilitadas dentro de las acciones expuestas por las vistas; Ejecutivo Comercial ve datos comerciales y clientes, puede agregar/editar cotizaciones y órdenes, pero no ve costos/márgenes y tiene bloqueada la edición de precios y la aprobación/rechazo RMA; Postventa ve solo información operativa de órdenes despachadas y RMA, sin montos totales ni precios unitarios, y solo puede agregar/gestionar RMA; Auditor ve métricas agregadas y reportes en Panel, sin acceso a registros individuales, y las pestañas/botones de Agregar y edición aparecen bloqueados en modo de solo lectura. Los roles heredados de Operaciones, Gerente y Facturación conservan sus acciones específicas.

  | Rol (FR-057) | Ver | Crear | Editar | Eliminar |
  |--------------|-----|-------|--------|----------|
  | Ejecutivo Comercial (`vendedor`) | Panel/Resumen general y Panel de análisis **con importes** (sin costos ni márgenes); Órdenes de Venta, Cotizaciones, Productos (sin costos ni márgenes), Clientes, Documentos de clientes y Búsqueda; Entregas y RMA en modo de solo lectura | Cotización, Orden de Venta, Cliente y Documento desde Agregar | Cotización y Orden de Venta en estados modificables (FR-015) | — |
  | Encargado de operaciones y logística (`operaciones`) | Órdenes de Venta en estado «facturado» y vista de Entregas; sin Resumen general ni Panel de análisis | — | Transición «facturado» → «entregado» (FR-018) | — |
  | Gerente (`gerente`) | Panel/Resumen general y Panel de análisis **con importes completos**; Órdenes, Cotizaciones, Clientes, Documentos y Búsqueda en modo de solo lectura | — | — | — |
  | Postventa (`devoluciones`) | Panel/Resumen general y Panel de análisis con **solo conteos y unidades; importes y precios unitarios enmascarados**; Órdenes despachadas y RMA, sin importes | RMA | RMA en estados permitidos (FR-029) | — |
  | Jefe de Ventas (`jefe_ventas`) | Panel/Resumen general con importes, costos, márgenes y contactos completos; todas las vistas | Todas las acciones expuestas: cotización, orden, lista/precio, RMA, cliente y documento | Todas las acciones expuestas, incluidas edición de precios y aprobación/rechazo de RMA (FR-054, FR-056) | Acciones destructivas expuestas por cada vista; sin borrado físico de clientes |
  | Encargado de facturación (`facturacion`) | Órdenes en estado «pedido» y Facturación y pagos; sin Resumen general ni Panel de análisis | Factura y Pago | Saldo y estado de factura, y pagos registrados | — |
  | Auditor (`auditor`) | Panel/Resumen general y Panel de análisis con **solo métricas agregadas y conteos, sin importes ni registros individuales**; resto de vistas bloqueadas | — | — | — |

    Roles con `ver_resumen`: Ejecutivo Comercial, Gerente, Postventa, Jefe de Ventas y Auditor. Operaciones y Facturación no acceden al Resumen general. «Sí» = permitido; «No» = bloqueado con aviso del rol requerido; «—» = acción no expuesta en esa vista. La columna Ver fija la visibilidad de importes; el enmascaramiento aplica también a los totales monetarios del Panel de análisis (FR-060, FR-061). La tabla de menús de FR-068 es la autoridad para las entradas que cada rol ve en la barra lateral; dos roles distintos deben diferir tanto en su menú como en su conjunto de permisos.
 El borrado físico de clientes no se expone: la baja es lógica (ver Assumptions).
- **FR-054**: El sistema DEBE permitir al Jefe de Ventas crear y editar listas de precios y precios por producto, validando claves, moneda, unicidad y fechas de vigencia sin modificar las colecciones ni perder registros existentes.
- **FR-055**: Los costos estándar y márgenes DEBEN mostrarse solo al Jefe de Ventas; la interfaz DEBE ocultarlos o enmascararlos para los demás roles. Los montos financieros y detalles por registro DEBEN respetar las restricciones de Postventa y Auditor descritas en FR-053.
- **FR-056**: Las acciones de aprobación/rechazo de RMA DEBEN estar habilitadas solo para el Jefe de Ventas; los controles no autorizados DEBEN aparecer bloqueados y explicar el rol requerido.

**Acceso por rol activo (sin inicio de sesión)**

- **FR-057**: El módulo NO tiene pantalla de inicio de sesión ni credenciales. El usuario elige su rol en el selector «Rol activo» de la barra superior, con 7 roles: Ejecutivo Comercial (`vendedor`), Encargado de operaciones y logística (`operaciones`), Gerente (`gerente`), Postventa (`devoluciones`), Jefe de Ventas (`jefe_ventas`), Encargado de facturación (`facturacion`) y Auditor (solo lectura) (`auditor`). El rol elegido se guarda en `localStorage` (`erp_ventas:current_role`), se conserva al recargar y por defecto es Ejecutivo Comercial. Todos los permisos de FR-045 y FR-053 se evalúan contra este rol activo.
- **FR-058**: El sistema DEBE mostrar el rol activo en una insignia de la barra superior y, en la barra lateral, una tarjeta «Rol activo» con el nombre del rol, un resumen de lo que puede ver (por ejemplo, Ejecutivo Comercial: «Datos comerciales y clientes visibles; costos internos y márgenes reservados»; Jefe de Ventas: «Acceso completo a datos, costos, márgenes y acciones comerciales»; Postventa: «Información operativa de órdenes despachadas y devoluciones RMA, sin montos»; Auditor: «Solo métricas agregadas y reportes; acciones en modo de solo lectura») y la lista «Puedes realizar» con el número de accesos, que muestra solo las acciones permitidas: consultar pedidos, crear y editar órdenes de venta, crear cotizaciones, gestionar precios, aprobar cotizaciones, facturar, registrar pagos, entregar, devolver, aprobar devoluciones, ver el resumen y ver el historial.

**Panel de análisis (gráficos)**

- **FR-059**: El Panel DEBE incluir, junto al «Resumen general de ventas», la sección «Panel de análisis», visible para los roles con permiso de resumen (`ver_resumen`: Ejecutivo Comercial, Gerente, Postventa, Jefe de Ventas y Auditor), con dos gráficos dibujados con la biblioteca Chart.js: «Evolución de ventas por período» y «Productos más vendidos». La visibilidad de importes en ambos bloques se rige por la matriz de FR-053: Gerente, Jefe de Ventas y Ejecutivo Comercial ven importes completos; Postventa y Auditor ven solo conteos y unidades, con importes enmascarados.
- **FR-060**: «Evolución de ventas por período» DEBE ser un gráfico de líneas con tres series, sumando el total de cada documento por su fecha de emisión: **Ventas** (pedidos «facturado» y «entregado»), **Pedidos** (pedidos en estado «pedido») y **Cotizaciones** (pedidos en «cotización» más todas las cotizaciones). El filtro «Período» agrupa por mes (por defecto, etiquetas «nov 26»), semana (que comienza el lunes, «sem 23 nov») o día («23 nov»), y completa con cero los períodos intermedios sin datos. Estas etiquetas son ilustrativas: se generan a partir de la fecha actual, como las fechas relativas a hoy de FR-066. Sobre el gráfico se muestra el total de cada serie en CLP, salvo para Postventa y Auditor: para esos roles el total monetario se enmascara y solo se muestran los conteos de documentos por período (FR-053).
- **FR-061**: «Productos más vendidos» DEBE mostrar los 7 productos con más ventas en pedidos confirmados («pedido», «facturado» y «entregado»). El filtro «Métrica» elige entre Unidades vendidas (por defecto) y Monto vendido; el filtro «Gráfico» elige entre Barras horizontales (por defecto) y Pastel (dona con leyenda). Los empates se ordenan por nombre. Sobre el gráfico se muestra el total de unidades y monto de esos productos; para Postventa y Auditor, la métrica «Monto vendido» y el total de monto se enmascaran y solo se muestran unidades y conteos (FR-053).
- **FR-062**: Cada gráfico se oculta si no tiene datos; si ninguno tiene datos, se muestra el aviso «No hay pedidos ni cotizaciones para mostrar en los gráficos». Si el navegador no puede dibujar el gráfico, se muestra «Vista disponible en navegadores con soporte de canvas». Los gráficos tienen `role="img"` con una descripción y se redibujan al cambiar cualquier filtro o los datos.

**Diseño visual y navegación**

- **FR-063**: La interfaz DEBE usar una barra lateral oscura (fondo `#0b1220`) de 252 px con dos grupos: **Panel** (Panel) y **Operaciones** (Agregar, Órdenes de Venta, Cotizaciones, Productos, Entregas, Devoluciones, Facturación y pagos, Clientes, Documentos de clientes y Búsqueda), cada entrada con descripción emergente (Panel, Clientes, Documentos de clientes y Búsqueda llevan además ícono); una barra superior de 68 px con la marca «Ventas», la insignia del rol y el selector «Rol activo»; y una ruta de navegación («Ventas / Panel»). «Clientes» y «Documentos de clientes» son las entradas del dominio (`nav-clients`/`data-module="clients"` y `nav-client-documents`/`data-module="client-documents"`) y sustituyen a las heredadas «Entidades» y «Documentos» (FR-067).
- **FR-064**: El estilo visual DEBE basarse en estas variables: acento azul `#2563eb` (oscuro `#1d4ed8`), fondo `#f6f7fb`, superficies blancas, bordes `#e5e9f2`, texto `#0f172a`, texto secundario `#64748b`, peligro `#dc2626` y éxito `#059669`; tipografía Inter (o la del sistema); bordes redondeados de 14 px en tarjetas y 9 px en controles, y sombras suaves. Los indicadores del Panel se muestran como tarjetas con un borde superior de color.
- **FR-067**: La navegación y el enrutamiento DEBEN eliminar las entradas y rutas heredadas del módulo base: «Entidades» (`nav-entities`, `view-entities`, `data-module="entities"`) y «Documentos» (`nav-documents`, `view-documents`, `data-module="documents"`). Sus sustitutos del dominio son «Clientes» (`nav-clients`, `data-module="clients"`) y «Documentos de clientes» (`nav-client-documents`, `data-module="client-documents"`), que operan sobre las colecciones físicas vigentes y solo exponen las acciones de FR-052 y FR-053. Ningún botón, enlace, vista, importación, prueba ni ruta DEBE referenciar los identificadores heredados; un acceso directo a `entities` o `documents` DEBE considerarse ruta no disponible y redirigir al Panel con un aviso. La verificación DEBE incluir búsqueda estática de los identificadores heredados en `modulo-ventas/index.html`, `modulo-ventas/src/` y `modulo-ventas/tests/`, además de la ejecución de la suite completa.
- **FR-068**: La visibilidad de menús DEBE ser realmente distinta por rol y ajustarse a esta tabla; el ocultamiento de botones NO basta: la restricción se aplica también en el enrutador y en los guardas de dominio.

  | Rol (FR-057) | Entradas visibles en la barra lateral | Restricción |
  |--------------|---------------------------------------|-------------|
  | Ejecutivo Comercial (`vendedor`) | Panel, Agregar, Órdenes de Venta, Cotizaciones, Productos, Clientes, Documentos de clientes, Búsqueda, Entregas, Devoluciones | Entregas y Devoluciones en solo lectura; sin Facturación y pagos ni Historial |
  | Encargado de operaciones y logística (`operaciones`) | Órdenes de Venta, Entregas | Solo pedidos «facturado»; sin Panel, Agregar, Cotizaciones, Productos, Clientes, Documentos de clientes, Búsqueda, Devoluciones, Facturación y pagos ni Historial |
  | Gerente (`gerente`) | Panel, Órdenes de Venta, Cotizaciones, Clientes, Documentos de clientes, Búsqueda | Solo lectura; sin Agregar, Entregas, Devoluciones, Facturación y pagos ni Historial |
  | Postventa (`devoluciones`) | Panel, Agregar, Órdenes de Venta, Devoluciones | Agregar solo con la pestaña de Devolución RMA; Órdenes de Venta solo «entregado»; sin Cotizaciones, Productos, Clientes, Documentos de clientes, Búsqueda, Entregas, Facturación y pagos ni Historial |
  | Jefe de Ventas (`jefe_ventas`) | Todas las entradas de FR-063 | Todas las acciones expuestas, según FR-053 |
  | Encargado de facturación (`facturacion`) | Órdenes de Venta, Facturación y pagos | Solo pedidos «pedido»; sin Panel, Agregar, Cotizaciones, Productos, Clientes, Documentos de clientes, Búsqueda, Entregas, Devoluciones ni Historial |
  | Auditor (`auditor`) | Panel y Agregar | Agregar bloqueado en modo de solo lectura, sin pestañas activas; resto de entradas ocultas; sin registros individuales |

  Cada par de roles distintos DEBE diferir en al menos una entrada de menú y en al menos un permiso de `PERMISSIONS`. Un acceso directo a una ruta no listada para el rol activo DEBE redirigir al Panel y mostrar el aviso del rol requerido. Los permisos `ver_pedidos`, `ver_cotizaciones`, `ver_productos` y los nuevos `ver_clientes` y `ver_documentos_clientes` NO DEBEN concederse de forma global si la tabla los excluye; en particular, Auditor no obtiene acceso a registros individuales y Postventa solo a órdenes despachadas.

**Datos de ejemplo**

- **FR-065**: Al abrir la aplicación sin datos, el sistema DEBE cargar automáticamente un conjunto de datos de ejemplo y marcarlo en `localStorage` (`erp_ventas:demo_data_loaded`). Los roles con permiso para crear cotizaciones ven los botones «Cargar datos de ejemplo» y «Recargar datos de ejemplo»; recargar borra todos los datos del módulo y los vuelve a crear, conservando el rol activo.
- **FR-066**: El conjunto de ejemplo cargado automáticamente (FR-065) DEBE ser abundante y variado: cada estado, plazo y gráfico de FR-059 a FR-061 debe tener datos el día de la carga. Ninguna razón social ni nombre propio de persona (vendedor, contacto de cliente o responsable de rol) DEBE repetirse entre registros; está prohibido reutilizar un mismo nombre como «Ana Pérez» en dos entidades. Las fechas son relativas al día actual. El contenido mínimo es:

  | Grupo | Contenido obligatorio |
  |--------|-----------------------|
  | Responsables por rol | Uno por cada rol de FR-057, con nombre propio único y distinto del de los vendedores y contactos: Ejecutivo Comercial `Camila Rojas`, Operaciones `Diego Fuentes`, Gerente `Paula Soto`, Postventa `Rodrigo Mena`, Jefe de Ventas `Valentina Errázuriz`, Facturación `Matías Vergara` y Auditor `Antonia Beltrán`. Son etiquetas de demostración en los datos, no mecanismo de acceso. |
  | Clientes | 10 razones sociales chilenas únicas con RUT, contacto único, dirección, categoría, límite de crédito, condición de pago, vendedor y zona; 6 activos, 2 inactivos y 2 bloqueados; al menos 1 cliente activo sin cotizaciones, pedidos, facturas ni devoluciones, para probar el estado vacío de US5. |
  | Zonas, vendedores y catálogo | 5 zonas; 6 vendedores con nombre propio único (`Ignacia Valdés`, `Tomás Herrera`, `Javiera Muñoz`, `Cristóbal Ríos`, `Fernanda Salas` y `Sebastián Tapia`); 5 categorías; 12 productos con SKU, stock y stock mínimo, incluidos 1 producto con stock 0, 2 bajo el mínimo y productos con tasas de impuesto 19 % y 0 %; 3 listas de precios con al menos 25 precios vigentes y al menos 1 precio vencido. |
  | Cotizaciones | 6 cotizaciones: 1 borrador, 2 enviadas, 1 aceptada con orden vinculada, 1 rechazada y 1 vencida. |
  | Pedidos | 10 pedidos con al menos 1 en cada estado de FR-005 («cotización», «pedido», «facturado», «entregado» y «cancelado»); al menos 1 pedido «facturado» y 1 «entregado», 1 cancelado desde «pedido» y 1 con líneas de 19 % y 0 % en el mismo documento, con impuesto calculado por línea y total consistente (SC-009). |
  | Facturas y pagos | 5 facturas: 1 pendiente de pago, 1 parcial, 2 pagadas y 1 generada desde el pedido de tasas mixtas; 5 pagos con al menos 3 métodos y referencia. |
  | Devoluciones | 4 devoluciones persistidas: 1 solicitada, 1 aprobada, 1 completada y 1 rechazada por motivo comercial. Las aceptadas tienen `fecha` dentro de los 30 días de `factura.fechaEmision`. Además, 1 intento fuera de plazo sobre una factura emitida más de 30 días atrás, con motivo válido y cantidad disponible: el guardián DEBE rechazarlo con el mensaje de plazo expirado, NO DEBE persistirlo y DEBE exponer el error junto con la factura de referencia en `detail` del resultado de la carga. |
  | Documentos y auditoría | 2 documentos de clientes y su bitácora de auditoría, con entradas que vinculen cada devolución con su venta, productos, cantidad, motivo, fecha y usuario (FR-032). |

  Las pruebas del seed DEBEN verificar recuentos, unicidad de nombres, presencia de todos los estados, el cliente sin movimientos, el pedido de tasas mixtas con su desglose de impuesto y que el intento fuera de plazo no generó una devolución persistida.

### Key Entities *(include if feature involves data)*

- **Cliente**: Comprador registrado en el maestro de clientes. Se identifica por un código único y conserva datos de contacto, condiciones comerciales, vendedor asignado, zona, estado y límite de crédito. Es el origen de cotizaciones, pedidos, facturas y devoluciones.
- **Vendedor**: Responsable comercial de atender al cliente y gestionar sus ventas. Puede estar asignado a una zona y se conserva como referencia en clientes, cotizaciones y pedidos.
- **Zona**: Segmento geográfico o comercial que agrupa clientes y vendedores.
- **Producto**: Bien o servicio vendible, con código único, categoría, unidad de medida, tasa de impuesto, costo estándar interno, stock actual, stock mínimo y estado de vigencia. El costo estándar solo es visible al Jefe de Ventas; el margen se deriva del precio vigente.
- **Lista de precios / Precio de producto**: La lista agrupa precios por moneda y vigencia; cada precio relaciona un producto con una lista y un período válido. El Jefe de Ventas puede crearlos y editarlos.
- **Detalle de Pedido de Venta**: Línea de un pedido que registra un producto, la cantidad vendida, el precio unitario, el descuento, el impuesto y el subtotal de la línea.
- **Pedido de Venta**: Transacción comercial que vincula a un cliente con uno o más productos. Conserva vendedor, canal de venta, fecha de emisión, fecha de entrega, `condicion_pago` (`{contado, credito}`, FR-016), moneda, subtotal, descuento, impuesto, total y estado del ciclo de vida.
- **Cotización**: Documento de pre-venta dirigido a un cliente, con fecha de emisión, vigencia, vendedor, líneas de productos e importes. Tiene estados propios y, al aceptarse, origina un Pedido de Venta en estado «pedido» vinculado por su identificador. No debe confundirse con el estado «cotización» de un pedido registrado directamente.
- **Persistencia**: La interfaz distingue estas entidades, pero conserva sin migración las claves actuales `erp_ventas:cotizaciones` y `erp_ventas:pedidos`.
- **Factura**: Documento fiscal generado a partir de un pedido confirmado. Registra cliente, líneas, subtotal, impuesto, total, saldo, fecha de emisión, vencimiento y estado de cobro. Un pedido admite como máximo una factura.
- **Pago**: Abono aplicado a una factura, con fecha, monto, método y referencia. Reduce el saldo pendiente de la factura.
- **Devolución**: Solicitud de devolución anclada a una factura mediante `facturaId`; el pedido se deriva de `factura.pedidoId` (FR-026). Consta de número de seguimiento, fecha, motivo, estado, moneda e importe total devuelto, y se compone de una o más líneas devueltas.
- **Detalle de Devolución**: Línea que indica qué producto vendido se devuelve, la cantidad y el monto devuelto.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un vendedor puede buscar y seleccionar un cliente existente (con vendedor y zona asignados) y agregarlo a un pedido en menos de 2 minutos.
- **SC-002**: Un pedido de venta puede recorrerse desde «cotización» hasta «entregado» sin que el sistema permita una sola transición inválida.
- **SC-003**: Al desactivar un cliente, el 100% de sus pedidos históricos permanecen consultables con su referencia y no se generan registros huérfanos.
- **SC-004**: El resumen general del gerente coincide exactamente con los datos persistidos en el 100% de las consultas, incluyendo cantidades, montos y estados.
- **SC-005**: El 100% de las devoluciones fuera de plazo, con motivo inválido o con cantidades excesivas son rechazadas sin registrar la devolución.
- **SC-006**: El 100% de las facturas emitidas provienen de pedidos confirmados y ningún pedido genera más de una factura.
- **SC-007**: El perfil de un cliente muestra la totalidad de sus cotizaciones y pedidos con su estado actual en el 100% de los casos.
- **SC-008**: El 100% de los intentos de vender un producto con stock cero son bloqueados con un mensaje visible para el vendedor.
- **SC-009**: Los cálculos de subtotal, impuesto y total coinciden con el resultado esperado en el 100% de los pedidos, incluidos pedidos con varias tasas de impuesto.
- **SC-010**: En una prueba de usabilidad con al menos 5 usuarios representativos, al menos el 90% completa las tareas de crear una venta, entregar un pedido, facturar y registrar una devolución sin ayuda.
- **SC-011**: Con 500 pedidos persistidos, los listados y el resumen general se muestran prácticamente al instante (por debajo del umbral de percepción, ~0,5 s), sin bloqueos visibles.
- **SC-012**: Un pedido en estado «entregado» no puede modificarse ni revertirse en el 100% de los intentos.
- **SC-013**: El 100% de los pares de roles tienen conjuntos de menú y de permisos distintos conforme a FR-068, y ninguna ruta no autorizada es alcanzable por navegación directa.
- **SC-014**: El conjunto de ejemplo de FR-066 carga sin nombres repetidos y cubre el 100% de los estados, el cliente sin ventas, las tasas mixtas y el rechazo fuera de plazo en la primera carga.
- **SC-015**: Ninguna entrada ni ruta heredada «Entidades»/«Documentos» queda expuesta y el 100% de las referencias a sus identificadores desaparece del código y de las pruebas (FR-067).

## Assumptions

- El módulo reutiliza el almacenamiento del módulo base ERP; el acceso se controla con el selector de rol activo (FR-057), sin autenticación; existe un único espacio de trabajo empresarial.
- «Orden de venta» y «Pedido de Venta» designan la misma entidad; el término canónico es **Pedido de Venta**.
- Los clientes, productos, vendedores, zonas y listas de precios ya existen o se gestionan en los maestros correspondientes antes de registrar una venta.
- Los precios de los productos se expresan sin impuesto y el IVA se suma para obtener el total; la tasa aplicable proviene de la configuración tributaria vigente de cada producto.
- `condicion_pago` es un enum cerrado `{contado, credito}`; se declara en `businessRules.paymentConditions` y se persiste en el pedido como `paymentTerms`. No se admite texto libre ni condiciones personalizadas; el módulo no procesa cobros en línea.
- El estado «pedido» es el único que habilita la facturación; «cotización» no se considera confirmado.
- El plazo de devolución es de 30 días calendario desde la fecha de compra, salvo que la política de la empresa configure otro plazo.
- Las devoluciones pueden ser totales o parciales por producto, siempre que no superen la cantidad vendida y no devuelta previamente.
- El estado visible «en proceso de devolución» puede corresponder internamente a las etapas solicitada, aprobada o completada del flujo de devolución.
- El stock se descuenta al despachar el pedido (transición «facturado» → «entregado»), no al crearlo ni al facturarlo; la disponibilidad se valida al agregar cada producto, al guardar/confirmar el pedido y de nuevo antes del despacho, con reversión si la transición falla.
- Los importes se manejan en la moneda configurada para el pedido y se redondean según la precisión de esa moneda.
- La cancelación de un pedido solo se permite desde los estados «cotización» y «pedido», conforme al ciclo de vida definido.
- La emisión de facturas, la confirmación de entregas, la gestión de devoluciones y la consulta del resumen general requieren el rol activo correspondiente según la matriz de FR-053 y los roles de FR-057; el módulo no tiene inicio de sesión.
- La navegación y los datos visibles dependen del rol conforme a FR-051–FR-056: Panel concentra métricas; Agregar concentra altas; Cotizaciones y Órdenes de Venta son listados separados. Jefe de Ventas ve costos, márgenes y contactos completos; Ejecutivo Comercial no ve costos/márgenes; Postventa solo consulta órdenes despachadas y RMA sin importes; Auditor ve métricas agregadas en Panel y no accede a registros individuales. Operaciones, Gerente y Facturación se conservan como roles heredados con permisos específicos. El Resumen general y el Panel de análisis siguen la matriz de FR-053: Postventa y Auditor ven solo conteos y unidades con importes enmascarados, y el Auditor no accede a registros individuales.
- Las etiquetas `sales_quotes` y `sales_orders` son solo de interfaz y no cambian las colecciones ni las claves físicas vigentes (FR-002, FR-050).
- Los clientes se desactivan lógicamente sin eliminar sus pedidos, facturas ni devoluciones (trazabilidad, FR-006); el borrado en cascada de pedidos solo aplica al borrado físico del cliente, que el módulo no expone.
- Los datos deben conservarse entre sesiones y no deben perderse al navegar entre pantallas o al recargar la aplicación.
- No existen operaciones asíncronas de red ni de entrada/salida en el dominio de Ventas: la carga de configuración y la siembra de datos son síncronas. El patrón de FR-049 se aplica de todas formas: las listas muestran un indicador accesible mientras se actualizan, las acciones que pueden tardar deshabilitan el botón y muestran un spinner, y cada acción termina con un mensaje inequívoco de éxito o error anunciado por `aria-live`, con recuperación cuando corresponda. La ausencia de red no elimina estos estados; solo limita su duración.
