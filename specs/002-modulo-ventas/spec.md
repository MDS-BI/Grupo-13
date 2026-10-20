# Especificación de la Funcionalidad: Módulo de Ventas

**Rama de la funcionalidad**: 002-modulo-ventas  
**Creada**: 2026-10-20  
**Estado**: Borrador  
**Entrada**: Descripción del usuario: "Módulo ERP enfocado en el área de ventas, generado a partir del módulo base (001-erp-base-module) mediante su archivo de configuración."

## Propósito

Adaptar el módulo base ERP al dominio de **Ventas** usando exclusivamente el mecanismo de configuración (`userConfig` en `modulo-ventas/src/module-config.js`), sin modificar el código central. En este módulo:

- La **Entidad** representa un **Cliente** (datos maestros del comprador).
- El **Documento** representa un **Pedido de Venta** (transacción comercial vinculada al cliente).

## Perfil de Configuración

| Atributo | Valor |
|---|---|
| `moduleName` | Ventas |
| `labels.entity` / `labels.entities` | Cliente / Clientes |
| `labels.document` / `labels.documents` | Pedido de Venta / Pedidos de Venta |
| `theme.accentColor` | `#0f62fe` |

### Campos Personalizados

| Target | Key | Etiqueta | Tipo |
|---|---|---|---|
| entity | `vendedor` | Vendedor asignado | text |
| entity | `zona` | Zona | select (Norte, Sur, Este, Oeste, Centro) |
| document | `canal` | Canal de venta | select (Tienda, Web, Teléfono, Distribuidor) |
| document | `fechaEntrega` | Fecha de entrega | date |

### Ciclo de Vida de Estados (Pedido de Venta)

```text
cotización ──► pedido ──► facturado ──► entregado
     │             │
     └────► cancelado ◄────┘
```

- `cotización` → `pedido`, `cancelado`
- `pedido` → `facturado`, `cancelado`
- `facturado` → `entregado`
- `entregado` y `cancelado`: estados finales

## Escenarios de Usuario y Pruebas *(obligatorio)*

### Historia de Usuario 1 - Registrar un cliente (Prioridad: P1)

Como usuario de ventas, quiero crear clientes con su vendedor asignado y zona para mantener el maestro de clientes del área.

**Prueba Independiente**: Un usuario abre Clientes, añade un cliente con nombre, código, vendedor y zona, y lo ve en la lista.

**Escenarios de Aceptación**:

1. **Dado** que un usuario está viendo la lista de clientes, **cuando** crea un cliente con nombre, código, vendedor y zona, **entonces** el cliente se guarda y aparece en la lista.
2. **Dado** que un usuario crea un cliente, **cuando** deja el nombre o el código en blanco, **entonces** el sistema impide guardar y explica qué falta.
3. **Dado** que un usuario selecciona una zona, **cuando** guarda el cliente, **entonces** el valor del select coincide con una de las zonas declaradas.

---

### Historia de Usuario 2 - Registrar un pedido de venta (Prioridad: P1)

Como usuario de ventas, quiero registrar pedidos de venta asociados a un cliente, con canal y fecha de entrega, para seguir la actividad comercial.

**Prueba Independiente**: Un usuario añade un pedido de venta a un cliente existente y el pedido queda asociado a ese cliente.

**Escenarios de Aceptación**:

1. **Dada** un cliente en la lista, **cuando** el usuario añade un pedido de venta con serie, folio y fechas, **entonces** el pedido se guarda asociado a ese cliente.
2. **Dado** que un usuario crea un pedido, **cuando** deja campos obligatorios del pedido en blanco, **entonces** el sistema impide guardar y explica qué falta.
3. **Dado** que un cliente tiene pedidos, **cuando** se elimina el cliente confirmado, **entonces** sus pedidos de venta se eliminan en cascada.

---

### Historia de Usuario 3 - Avanzar el estado de un pedido (Prioridad: P1)

Como usuario de ventas, quiero que los pedidos sigan el ciclo cotización → pedido → facturado → entregado (con cancelación posible) para que el estado refleje el proceso comercial real.

**Prueba Independiente**: Al editar un pedido, el selector de estado solo ofrece los estados siguientes válidos; una transición inválida se rechaza.

**Escenarios de Aceptación**:

1. **Dado** un pedido en estado `cotización`, **cuando** el usuario lo edita, **entonces** solo se ofrecen `pedido` y `cancelado`.
2. **Dado** un pedido en estado `facturado`, **cuando** el usuario lo edita, **entonces** solo se ofrece `entregado`.
3. **Dado** un pedido en `entregado` o `cancelado`, **cuando** el usuario lo edita, **entonces** no hay transiciones disponibles (estado final).
4. **Dado** un pedido en cualquier estado, **cuando** el usuario ve las listas o el panel, **entonces** el estado actual es identificable de un vistazo.

---

### Historia de Usuario 4 - Identificación del módulo (Prioridad: P1)

Como usuario de ventas, quiero ver "Ventas", "Clientes" y "Pedidos de Venta" en todo el espacio de trabajo para que la interfaz hable el idioma del área.

**Prueba Independiente**: El panel muestra el nombre Ventas con estadísticas de Clientes y Pedidos de Venta; la barra lateral usa la terminología configurada.

**Escenarios de Aceptación**:

1. **Dado** que la aplicación carga, **cuando** se muestra el panel, **entonces** el encabezado y el subtítulo usan los términos Clientes y Pedidos de Venta.
2. **Dada** cualquier pantalla, **cuando** el usuario mira la barra lateral y la barra superior, **entonces** el nombre del módulo es Ventas y las etiquetas usan la terminología configurada.
3. **Dado** que el usuario crea o elimina registros, **cuando** vuelve al panel, **entonces** las estadísticas de clientes y pedidos se actualizan.

---

### Casos Límite

- ¿Qué ocurre al eliminar un cliente que tiene pedidos en distintos estados? (Eliminación en cascada.)
- ¿Qué ocurre si la configuración declara una clave de campo personalizado que choca con un campo base?
- ¿Qué ocurre si una transición del ciclo de vida referencia un estado desconocido?
- ¿Qué ocurre con valores de campos personalizados almacenados que ya no están declarados?
- ¿Cómo se comporta la búsqueda cuando coincide un valor de campo personalizado (vendedor, zona, canal)?

## Requisitos *(obligatorio)*

### Requisitos Funcionales

- **FR-001**: Heredar todos los requisitos funcionales del módulo base (001-erp-base-module): CRUD de entidades/documentos, búsqueda, panel, marco de espacio de trabajo, validación y persistencia en localStorage.
- **FR-002**: Presentar el módulo con el nombre **Ventas** y la terminología Cliente(s) / Pedido(s) de Venta en todas las pantallas.
- **FR-003**: Ofrecer los campos personalizados de cliente (vendedor asignado, zona) y de pedido (canal de venta, fecha de entrega) en los formularios con los tipos de entrada correspondientes.
- **FR-004**: Validar y persistir los campos personalizados junto a los campos base, incluyéndolos en los resultados de búsqueda.
- **FR-005**: Restringir el estado de los pedidos de venta al ciclo configurado (cotización, pedido, facturado, entregado, cancelado) y aplicar las transiciones permitidas.
- **FR-006**: Aplicar el color de acento `#0f62fe` en todo el marco del espacio de trabajo.

### Requisitos No Funcionales

- **NFR-001**: Cero modificaciones en el código central respecto al módulo base; toda la adaptación vive en `modulo-ventas/src/module-config.js`.
- **NFR-002**: La suite de pruebas del módulo base debe pasar adaptada a la terminología de Ventas (111 pruebas).

## Criterios de Éxito *(obligatorio)*

- **SC-001**: Un usuario puede registrar un cliente con vendedor y zona, y encontrarlo por búsqueda, en menos de 2 minutos.
- **SC-002**: Un usuario puede registrar un pedido de venta y llevarlo de cotización a entregado sin transiciones inválidas.
- **SC-003**: Al eliminar un cliente, sus pedidos de venta desaparecen de la lista y la búsqueda.
- **SC-004**: `npm test` pasa al 100% y `npm run build` compila sin errores dentro de `modulo-ventas/`.

## Suposiciones

- Hereda todas las suposiciones del módulo base (localStorage, un solo espacio de trabajo, sin backend).
- La personalización del dominio de Ventas se logra únicamente mediante `userConfig`; no se agregan componentes ni estilos propios del módulo.
- El ciclo de vida de estados es opcional por diseño: si se retira de la configuración, el estado vuelve a texto libre.
