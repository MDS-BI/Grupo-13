# Feature Specification: Módulo de Ventas

**Feature Branch**: `002-modulo-ventas`

**Created**: 2026-11-02

**Status**: Draft

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

### User Story 1 - [Vendedor] (Priority: P1)

Descripción: Como vendedor, necesito poder crear una orden de venta. Quiero buscar y seleccionar a un cliente, ir agregando los distintos productos que va a llevar, y anotar cómo nos va a pagar. Todo esto para registrar la compra y que el resto de mis compañeros (como facturación o el jefe de ventas) tengan la información que necesitan para hacer su parte.

¿Por qué esta prioridad?: Porque es el inicio de todo el proceso (Prioridad 1). Si yo como vendedor no registro la venta con todos los detalles (quién compra, qué compra y quién lo vende), los demás roles no tienen datos para revisar, cobrar o analizar.

Prueba independiente: Un vendedor se mete al sistema, crea una orden nueva, elige a un cliente que ya existe, le agrega dos productos diferentes fijándose que haya stock, y pone que pagará al contado (condición de pago). El sistema le suma todo, le saca el IVA y le guarda el documento como "Cotización".

Escenarios de aceptación:
1. Dado que estoy armando una venta nueva, cuando elijo al cliente, entonces el sistema tiene que guardar sí o sí el ID del cliente para que le quede guardado en su historial.

2.​ Dado que estoy agregando productos a la boleta, cuando pongo la cantidad de cada cosa, entonces el sistema tiene que multiplicar los precios solo y sumarme el total final con el IVA incluido.

​3. Dado que busco un producto para agregarlo, cuando el sistema ve que el stock está en cero, entonces me tiene que tirar un aviso en pantalla y no dejarme venderlo.

​4. Dado que ya terminé de anotar todo, cuando le doy a guardar, entonces el sistema me tiene que pedir de forma obligatoria el Canal de Venta, la Condición de Pago y mi ID de vendedor, y lo deja guardado en estado inicial de "Cotización".


---

### User Story 2 - [Encargado de operaciones y logística] (Priority: P2)

Descripción: Como encargado de operaciones y logística, quiero actualizar el estado de una venta a «entregado» una vez confirmado el despacho físico de los productos, para dar por completado el ciclo comercial del pedido y asegurar que no queden ventas pendientes de entrega en el sistema.

¿Por qué esta prioridad?: Tiene prioridad P2 porque es la etapa que cierra formalmente la operación logística y comercial; permite que tanto ventas como contabilidad reconozcan que el cliente ya recibió su pedido satisfactoriamente.

Prueba independiente: Se puede probar seleccionando un pedido de venta que se encuentre en estado «facturado», cambiando su estado a «entregado» y verificando que el sistema guarde el cambio y marque la venta en su estado final.

Escenarios de aceptación:
1. Dado que un pedido de venta se encuentra en estado «facturado» y cuenta con confirmación de despacho físico en bodega, Cuando el encargado de logística selecciona el pedido y cambia su estado a «entregado», Entonces el sistema actualiza y persiste el estado del pedido a «entregado», cerrando exitosamente el ciclo comercial.
   
2. Dado que un pedido de venta ya se encuentra en estado «entregado», Cuando el usuario intenta modificar o revertir el estado del pedido, Entonces el sistema bloquea la acción y emite un mensaje indicando que es un estado terminal que no admite modificaciones posteriores.


---

### User Story 3 - [gerente] (Priority: P3)

[Describe this user journey in plain language]
Como gerente, quiero visualizar un resumen general de las ventas realizadas, cotizaciones y pedidos registrados en el sistema, para supervisar el desempeño comercial y tomar decisiones que permitan mejorar los resultados de la empresa.
**Why this priority**: [Explain the value and why it has this priority level]
Esta historia tiene prioridad P3 porque permite al gerente tener una visión general del funcionamiento del área de ventas y evaluar sus resultados. Es una herramienta útil para la toma de decisiones, aunque no es indispensable para realizar las operaciones diarias de venta.

**Independent Test**: [Describe how this can be tested independently]
Se puede probar ingresando al módulo de ventas con un usuario que tenga el rol de gerente y accediendo al resumen general. Se debe verificar que el sistema muestre correctamente las ventas, cotizaciones y pedidos registrados, junto con sus respectivos estados y montos.

**Acceptance Scenarios**:

**Given** [initial state], **When** [action], **Then** [expected outcome]
1. Dado que existen ventas, cotizaciones y pedidos registrados en el sistema, cuando el gerente ingresa al resumen general de ventas, entonces puede visualizar la información comercial registrada.
2. Dado que existen pedidos con diferentes estados, cuando el gerente consulta el resumen de ventas, entonces puede identificar el estado actual de cada pedido.
3. Dado que existen ventas registradas, cuando el gerente consulta el resumen general, entonces el sistema muestra el total de ventas realizadas.

---

### User Story 4 - [Encargado de devoluciones de productos] (Priority: P4)

[Como encargado de devoluciones de productos se quiere poder editar el estado de un producto o productos vendidos en una venta anterior por solicitud de devolución de un cliente, validando en el proceso el motivo de la solicitud y la fecha desde que se compró.]

**Why this priority**: [Tiene prioridad P4 porque aceptar las devoluciones de acuerdo con los parámetros empresariales ayuda a mejorar la satisfacción del cliente y saber qué aspectos mejorar para la próxima venta, como transporte, material del producto, etc, lo que es vital para mantener la empresa a largo plazo. Si bien es importante manejar la devolución de productos, no es tan prioritario para el proceso de ventas como los otros.]

**Independent Test**: [Se puede probar simulando la selección de una venta pasada dentro del período permitido, ingresando un motivo válido de devolución y verificando que el estado del producto se actualice correctamente en el sistema y se registre la auditoría de la devolución.]

**Acceptance Scenarios**:

1. Dado que el cliente solicita una devolución dentro del plazo permitido por la empresa (por ejemplo, 30 días desde la fecha de compra) y proporciona un motivo válido, cuando el encargado de devoluciones selecciona la venta, valida la fecha y el motivo, y actualiza el estado del producto a "En proceso de devolución", entonces el sistema guarda exitosamente el cambio de estado, registra el motivo y emite un comprobante o número de seguimiento para el cliente.
2. Cuando el cliente intenta solicitar una devolución superando el plazo límite establecido por la política de la empresa (por ejemplo, más de 30 días desde la compra), cuando el encargado de devoluciones ingresa los datos de la venta y el sistema valida la fecha, entonces el sistema rechaza la solicitud de devolución, muestra un mensaje de error indicando que el período de devolución ha expirado y no permite modificar el estado del producto.
3. Cuando se intenta procesar una devolución con un motivo incompleto o no válido (por ejemplo, campos obligatorios vacíos o no contemplados en el sistema), cuando el encargado intenta registrar y actualizar el estado del producto, entonces el sistema bloquea la actualización, resalta los campos faltantes o inválidos y solicita una justificación adecuada para cumplir con los controles internos.

---

### User Story 5 - [Jefe de ventas] (Priority: P5)

[Como Jefe de ventas quiero supervisar el historial comercial de cada cliente (cotizaciones y  pedidos) y su estado actual, para así realizar un seguimiento personalizado y controlar el progreso de las ventas.]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [ Se puede probar, seleccionando y visitando un perfil de un cliente existente, el cual tenga pedidos asociados, verificando que se muestre su historial comercial completo y el estado actualizado de las transacciones realizadas.]

**Acceptance Scenarios**:

1. Dado que un cliente tiene transacciones registradas,cuando el jefe de ventas entra a su perfil, entonces se puede visualizar un listado con las cotizaciones y pedidos realizados.

---

### User Story 6 - [Encargado de facturacion] (Priority: P6)

[Como encargado de facturación necesito generar una factura a partir de una orden de venta ya confirmada, con el fin de formalizar el cobro del cliente y registrar la venta en el sistema contable]

**Why this priority**: [Porque es la conexión entre los procesos comercial y contable, ya que sin la emisión de factura, no se puede formalizar el cobro a los clientes, no se genera registro en cuentas por cobrar, ni se puede respaldar tributariamente las ventas de la empresa]

**Independent Test**: [Se puede probar seleccionando una orden de venta existente en estado «confirmado» o «aprobado» y haciendo clic en la opción «Generar Factura», para verificar que los datos del cliente, productos y los impuestos se traspasan automáticamente desde la orden de venta, y comprobando que el documento se guarde en estado «Pendiente de pago»]

**Acceptance Scenarios**:

1. Dado que existe una orden de venta confirmada en el sistema, cuando el encargado de facturación selecciona la orden y presiona «Generar Factura», entonces el sistema crea automáticamente el registro de la factura copiando las líneas de productos, precios e impuestos), dejando la factura en estado inicial «Pendiente de pago».

2. Dado que se está generando una factura a partir de una orden de venta, cuando el sistema procesa los montos, entonces calcula correctamente el subtotal, aplica la tasa de impuesto asociada y muestra el monto total a cobrar.

3. Dado que se intenta emitir una factura sobre una orden de venta que aún se encuentra en estado inicial de «Cotización» o no aprobada, cuando el encargado de facturación intenta proceder con la emisión, entonces el sistema bloquea la acción, resalta un mensaje de error indicando que la orden requiere confirmación previa y no genera ningún registro de factura.

4. Dado que una orden de venta ya cuenta con una factura emitida previamente, cuando el usuario intenta generar una segunda factura para la misma orden, entonces el sistema impide la duplicación de comprobantes y notifica que la orden ya posee un documento fiscal asociado.



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
- ¿Qué ocurre si se intenta generar una factura desde una cotización o desde un pedido no confirmado? El sistema debe bloquear la emisión y explicar que la orden requiere confirmación previa.
- ¿Qué ocurre si se intenta generar una segunda factura para la misma orden? El sistema debe impedir la duplicación y notificar que ya existe un documento fiscal asociado.
- ¿Qué ocurre si dos usuarios intentan facturar la misma orden al mismo tiempo? Solo se debe persistir una factura; la segunda operación debe rechazarse por duplicidad.
- ¿Qué ocurre si se solicita una devolución después del plazo permitido? El sistema debe rechazarla y mostrar que el período de devolución expiró, sin modificar el estado del producto.
- ¿Qué ocurre si se intenta devolver una cantidad mayor a la vendida o ya devuelta? El sistema debe bloquear la devolución y señalar el máximo devolvible por producto.
- ¿Qué ocurre si el motivo de devolución está vacío o no es válido? El sistema debe impedir el registro, resaltar los campos faltantes y solicitar una justificación válida.
- ¿Qué ocurre si un cliente no tiene cotizaciones ni pedidos? El perfil debe mostrar un estado vacío claro en su historial comercial.
- ¿Qué ocurre si no existen ventas, cotizaciones ni pedidos al abrir el resumen general? El sistema debe mostrar los totales en cero y un estado vacío comprensible.
- ¿Qué ocurre si un pedido tiene productos con distintas tasas de impuesto? El sistema debe calcular el impuesto por línea y sumarlo correctamente en el total de la orden.
- ¿Qué ocurre si el resumen general se consulta mientras otro usuario registra una venta? El resumen debe reflejar la información persistida más reciente al momento de la consulta.
- ¿Qué ocurre si un usuario sin el rol correspondiente intenta facturar, entregar, devolver o ver el resumen general? El sistema debe denegar la acción y mantener la información protegida según el rol.

## Requirements *(mandatory)*

### Functional Requirements

**Base y terminología**

- **FR-001**: El sistema DEBE persistir clientes, cotizaciones, pedidos de venta, facturas y devoluciones de forma consistente entre sesiones y pantallas.
- **FR-002**: El sistema DEBE presentar el módulo con el nombre «Ventas» y la terminología Cliente(s) / Pedido(s) de Venta en todas las pantallas.
- **FR-003**: El sistema DEBE registrar los campos propios del dominio: vendedor y zona del cliente; canal de venta y fecha de entrega del pedido.
- **FR-004**: El sistema DEBE permitir buscar clientes y productos por sus datos identificatorios y descriptivos, incluidos los campos propios del dominio.
- **FR-005**: El sistema DEBE gestionar el ciclo de vida del pedido de venta con los estados «cotización», «pedido», «facturado», «entregado» y «cancelado», aplicando únicamente las transiciones permitidas.
- **FR-006**: El sistema DEBE mantener la integridad referencial entre clientes, pedidos, facturas y devoluciones, impidiendo registros huérfanos o referencias inexistentes.

**Registro de la venta (Vendedor)**

- **FR-007**: El sistema DEBE permitir a un vendedor crear una orden de venta seleccionando un cliente existente y guardando su identificador en la orden.
- **FR-008**: El sistema DEBE permitir agregar a la orden uno o más productos, indicando la cantidad de cada uno.
- **FR-009**: El sistema DEBE calcular automáticamente el subtotal de cada línea multiplicando cantidad por precio unitario.
- **FR-010**: El sistema DEBE calcular automáticamente el subtotal de la orden, el impuesto (IVA) aplicable y el total final con impuesto incluido.
- **FR-011**: El sistema DEBE mostrar de forma separada y comprensible el subtotal, el impuesto y el total de la orden.
- **FR-012**: El sistema DEBE validar la disponibilidad de stock al agregar cada producto y al guardar la orden, impidiendo la venta cuando el stock sea cero o insuficiente.
- **FR-013**: El sistema DEBE exigir de forma obligatoria el canal de venta, la condición de pago y el vendedor responsable al guardar la orden.
- **FR-014**: El sistema DEBE crear toda orden nueva en estado inicial «cotización».
- **FR-015**: El sistema DEBE permitir editar una orden mientras permanezca en un estado que admita modificaciones, recalculando sus importes y revalidando el stock.
- **FR-016**: El sistema DEBE permitir registrar la condición de pago acordada con el cliente (por ejemplo, contado o crédito) junto con la orden.
- **FR-017**: El sistema DEBE conservar el detalle de productos, cantidades, precios, impuestos e importes de cada orden para su consulta posterior.

**Ciclo de entrega (Operaciones y logística)**

- **FR-018**: El sistema DEBE permitir al encargado de operaciones y logística cambiar el estado de un pedido de «facturado» a «entregado» cuando exista confirmación del despacho físico.
- **FR-019**: El sistema DEBE persistir el cambio de estado a «entregado» y reflejarlo de inmediato en las listas, el detalle del pedido y el resumen general.
- **FR-020**: El sistema DEBE tratar «entregado» como estado terminal, bloqueando cualquier modificación o reversión posterior e informando el motivo.
- **FR-021**: El sistema DEBE rechazar cualquier transición de estado no contemplada en el ciclo de vida con un mensaje claro que indique el estado actual y los estados permitidos.

**Resumen general (Gerente)**

- **FR-022**: El sistema DEBE ofrecer al gerente un resumen general de las ventas, cotizaciones y pedidos registrados.
- **FR-023**: El sistema DEBE mostrar en el resumen la cantidad total de ventas, cotizaciones y pedidos, así como sus montos cuando corresponda.
- **FR-024**: El sistema DEBE mostrar el estado actual de cada pedido en el resumen general.
- **FR-025**: El sistema DEBE actualizar el resumen general para que refleje la información persistida más reciente al momento de la consulta.

**Devoluciones (Encargado de devoluciones)**

- **FR-026**: El sistema DEBE permitir al encargado de devoluciones seleccionar una venta anterior y solicitar la devolución de uno o más productos vendidos.
- **FR-027**: El sistema DEBE validar que la solicitud de devolución se realice dentro del plazo permitido por la política de la empresa, tomando como referencia la fecha de compra.
- **FR-028**: El sistema DEBE exigir un motivo de devolución válido y no vacío antes de registrar el cambio de estado.
- **FR-029**: El sistema DEBE actualizar el estado del producto o productos devueltos a «en proceso de devolución» cuando la fecha y el motivo sean válidos.
- **FR-030**: El sistema DEBE emitir un comprobante o número de seguimiento de la devolución para el cliente.
- **FR-031**: El sistema DEBE rechazar las solicitudes fuera de plazo, con motivo inválido o con cantidades superiores a las vendidas y no devueltas, sin modificar el estado del producto.
- **FR-032**: El sistema DEBE registrar en una bitácora de auditoría la venta afectada, los productos devueltos, la cantidad, el motivo, la fecha y el usuario que procesó la devolución.

**Historial comercial (Jefe de ventas)**

- **FR-033**: El sistema DEBE permitir al jefe de ventas consultar el perfil comercial de un cliente existente.
- **FR-034**: El sistema DEBE mostrar en el perfil del cliente el listado completo de sus cotizaciones y pedidos, con fecha, importe y estado actual.
- **FR-035**: El sistema DEBE mantener actualizado el historial comercial cuando cambie el estado de una cotización o pedido.

**Facturación (Encargado de facturación)**

- **FR-036**: El sistema DEBE permitir al encargado de facturación generar una factura a partir de una orden de venta confirmada o aprobada.
- **FR-037**: El sistema DEBE copiar automáticamente a la factura el cliente, las líneas de productos, los precios y los impuestos de la orden de origen.
- **FR-038**: El sistema DEBE calcular automáticamente el subtotal, el impuesto y el monto total a cobrar de la factura.
- **FR-039**: El sistema DEBE crear la factura en estado inicial «pendiente de pago».
- **FR-040**: El sistema DEBE bloquear la emisión de facturas sobre órdenes en estado «cotización» o no aprobadas, sin generar ningún registro.
- **FR-041**: El sistema DEBE impedir que una misma orden de venta tenga más de una factura asociada.
- **FR-042**: El sistema DEBE vincular cada factura con su orden de venta y su cliente, conservando la trazabilidad del documento fiscal.

**Validación, permisos y experiencia de uso**

- **FR-043**: El sistema DEBE validar todos los campos obligatorios antes de guardar y mostrar retroalimentación clara indicando qué información falta o es inválida.
- **FR-044**: El sistema DEBE calcular los importes con precisión monetaria y redondearlos según la moneda configurada para la orden.
- **FR-045**: El sistema DEBE restringir las acciones de creación, facturación, entrega, devolución y consulta del resumen según el rol del usuario autenticado.
- **FR-046**: El sistema DEBE mostrar estados vacíos claros cuando no existan clientes, productos, ventas, cotizaciones, pedidos o devoluciones que mostrar.
- **FR-047**: El sistema DEBE mantener la consistencia de los datos ante operaciones simultáneas o repetidas, evitando duplicados de facturas, devoluciones y líneas de pedido.

### Key Entities *(include if feature involves data)*

- **Cliente**: Comprador registrado en el maestro de clientes. Se identifica por un código único y conserva datos de contacto, condiciones comerciales, vendedor asignado, zona, estado y límite de crédito. Es el origen de cotizaciones, pedidos, facturas y devoluciones.
- **Vendedor**: Responsable comercial de atender al cliente y gestionar sus ventas. Puede estar asignado a una zona y se conserva como referencia en clientes, cotizaciones y pedidos.
- **Zona**: Segmento geográfico o comercial que agrupa clientes y vendedores.
- **Producto**: Bien o servicio vendible, con código único, categoría, unidad de medida, tasa de impuesto, stock actual, stock mínimo y estado de vigencia.
- **Detalle de Pedido de Venta**: Línea de una orden que registra un producto, la cantidad vendida, el precio unitario, el descuento, el impuesto y el subtotal de la línea.
- **Pedido de Venta**: Transacción comercial que vincula a un cliente con uno o más productos. Conserva vendedor, canal de venta, fecha de emisión, fecha de entrega, condición de pago, moneda, subtotal, descuento, impuesto, total y estado del ciclo de vida.
- **Cotización**: Oferta previa a la venta dirigida a un cliente, con fecha de emisión, vigencia, vendedor, líneas de productos e importes. Puede originar un pedido de venta cuando es aceptada.
- **Factura**: Documento fiscal generado a partir de un pedido confirmado. Registra cliente, líneas, subtotal, impuesto, total, saldo, fecha de emisión, vencimiento y estado de cobro. Una orden admite como máximo una factura.
- **Pago**: Abono aplicado a una factura, con fecha, monto, método y referencia. Reduce el saldo pendiente de la factura.
- **Devolución**: Solicitud de devolución asociada a una factura y a su pedido, con número de seguimiento, fecha, motivo, estado, moneda e importe total devuelto. Se compone de una o más líneas devueltas.
- **Detalle de Devolución**: Línea que indica qué producto vendido se devuelve, la cantidad y el monto devuelto.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un vendedor puede registrar un cliente con vendedor y zona, y encontrarlo mediante búsqueda, en menos de 2 minutos.
- **SC-002**: Un pedido de venta puede recorrerse desde «cotización» hasta «entregado» sin que el sistema permita una sola transición inválida.
- **SC-003**: Al eliminar un cliente, el 100% de sus pedidos de venta asociados desaparecen de la lista, la búsqueda y el historial comercial.
- **SC-004**: El resumen general del gerente coincide exactamente con los datos persistidos en el 100% de las consultas, incluyendo cantidades, montos y estados.
- **SC-005**: El 100% de las devoluciones fuera de plazo, con motivo inválido o con cantidades excesivas son rechazadas sin modificar el estado del producto.
- **SC-006**: El 100% de las facturas emitidas provienen de órdenes confirmadas y ninguna orden genera más de una factura.
- **SC-007**: El perfil de un cliente muestra la totalidad de sus cotizaciones y pedidos con su estado actual en el 100% de los casos.
- **SC-008**: El 100% de los intentos de vender un producto con stock cero son bloqueados con un mensaje visible para el vendedor.
- **SC-009**: Los cálculos de subtotal, impuesto y total coinciden con el resultado esperado en el 100% de las órdenes, incluidos pedidos con varias tasas de impuesto.
- **SC-010**: Al menos el 90% de los usuarios de prueba completan las tareas de crear una venta, entregar un pedido, facturar y registrar una devolución sin ayuda.
- **SC-011**: El sistema mantiene una respuesta ágil y consistente al consultar listados y resúmenes con al menos 500 registros de pedidos.
- **SC-012**: Un pedido en estado «entregado» no puede modificarse ni revertirse en el 100% de los intentos.

## Assumptions

- El módulo reutiliza la autenticación, los roles y el almacenamiento del módulo base ERP; existe un único espacio de trabajo empresarial.
- Los clientes, productos, vendedores, zonas y listas de precios ya existen o se gestionan en los maestros correspondientes antes de registrar una venta.
- Los precios de los productos se expresan sin impuesto y el IVA se suma para obtener el total; la tasa aplicable proviene de la configuración tributaria vigente de cada producto.
- La condición de pago «contado» y las condiciones a crédito se registran como texto o selección acordada con el cliente; el módulo no procesa cobros en línea.
- Una orden «confirmada» o «aprobada» corresponde al estado «pedido» del ciclo de vida; la facturación solo se habilita desde ese estado.
- El plazo de devolución es de 30 días calendario desde la fecha de compra, salvo que la política de la empresa configure otro plazo.
- Las devoluciones pueden ser totales o parciales por producto, siempre que no superen la cantidad vendida y no devuelta previamente.
- El estado visible «en proceso de devolución» puede corresponder internamente a las etapas solicitada, aprobada o completada del flujo de devolución.
- El stock se descuenta al confirmar o despachar el pedido según la política operativa; la validación de disponibilidad se realiza al agregar cada producto y al guardar o confirmar la orden.
- Los importes se manejan en la moneda configurada para la orden y se redondean según la precisión de esa moneda.
- La cancelación de un pedido solo se permite desde los estados «cotización» y «pedido», conforme al ciclo de vida definido.
- La emisión de facturas, la confirmación de entregas, la gestión de devoluciones y la consulta del resumen general requieren un usuario autenticado con el rol correspondiente.
- Los datos deben conservarse entre sesiones y no deben perderse al navegar entre pantallas o al recargar la aplicación.
