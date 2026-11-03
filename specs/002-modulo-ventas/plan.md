# Plan de Implementación: Módulo de Ventas

**Rama**: `002-modulo-ventas` | **Fecha**: 2026-11-02 | **Especificación**: [spec.md](spec.md) | **Modelo de Datos**: [data-model.md](data-model.md) (v2.0)
**Entrada**: Especificación de la funcionalidad desde `/specs/002-modulo-ventas/spec.md`
**Alcance de este documento**: plan de implementación alineado con el modelo de datos de `specs/002-modulo-ventas/data-model.md`. El detalle de entidades, atributos y relaciones se mantiene exclusivamente en ese documento y no se reproduce aquí.

## Resumen

El Módulo de Ventas se construye sobre el módulo base ERP sin modificar su núcleo. La adaptación actual se concentra en `modulo-ventas/src/module-config.js`, que declara:

- **Terminología**: Entidad → **Cliente**, Documento → **Pedido de Venta** en todas las pantallas.
- **Campos propios**: `vendedor` y `zona` en el cliente; `canal` y `fechaEntrega` en el pedido.
- **Ciclo de vida**: `cotización → pedido → facturado → entregado`, con cancelación desde `cotización` o `pedido`.
- **Marca**: nombre "Ventas" y color de acento `#0f62fe`.

El modelo de datos v2.0 distingue dos niveles: el **modelo lógico completo** del dominio comercial y el **modelo físico implementado** en `localStorage`. El plan asume esa separación: la implementación actual cubre el subconjunto físico descrito en `data-model.md` (§7) y las fases posteriores incorporan gradualmente el resto del modelo lógico. El detalle de entidades, cardinalidades, claves y restricciones se consulta en `data-model.md` y no se duplica en este plan.

La implementación vigente mantiene los clientes y pedidos en las colecciones genéricas `erp_base_module:entities` y `erp_base_module:documents`, con las validaciones R-01 a R-18 del modelo. El modelo lógico completo agrega entidades maestras, catálogo y precios, y el flujo de cotización, facturación, pagos y devoluciones; esas piezas se abordan como roadmap por fases y no como parte de la entrega actual.

## Contexto Técnico

**Lenguaje/Versión**: JavaScript (ES2022), HTML, CSS  
**Dependencias Principales**: Vite, Vitest + jsdom (sin framework de interfaz)  
**Almacenamiento**: localStorage del navegador — clientes en `erp_base_module:entities` y colecciones de dominio con prefijo `erp_ventas:` (zonas, vendedores, catálogo, cotizaciones, pedidos, facturas, pagos, devoluciones, auditoría y secuencias)
**Modelo de Datos**: modelo de dos niveles (lógico completo y físico implementado) documentado en [data-model.md](data-model.md); este plan no replica el modelo entidad-relación  
**Estructura**: la carpeta `modulo-ventas/` es autocontenida (index.html, src/, tests/) y se ejecuta con `vite modulo-ventas` desde la raíz del repositorio  
**Comandos**: `npm run dev`, `npm run build`, `npm test` (apuntan a `modulo-ventas/`)

## Verificación de la Constitución

- **Calidad**: la personalización se realiza mediante configuración, sin bifurcar el código central; `storage.js` y los componentes conservan sus límites y responsabilidades.
- **Pruebas**: los flujos de clientes, pedidos, campos propios, ciclo de vida, búsqueda y cascada están cubiertos por la suite automatizada.
- **Experiencia de Usuario**: terminología de Ventas coherente, mensajes de validación claros y comportamiento consistente con el módulo base.
- **Rendimiento**: las colecciones se mantienen en el rango previsto por el módulo base y las operaciones de búsqueda y renderizado no cambian su complejidad.

## Estructura del Proyecto

### Documentación (esta funcionalidad)

```text
specs/002-modulo-ventas/
├── spec.md
├── data-model.md
└── plan.md
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
│   ├── module-config.js      ← único archivo editado para Ventas (userConfig)
│   └── components/
│       ├── shell.js
│       ├── dashboard.js
│       ├── entity-form.js
│       ├── entity-list.js
│       ├── document-form.js
│       ├── document-list.js
│       ├── custom-fields.js
│       └── search-bar.js
└── tests/
    ├── unit/
    └── integration/
```

**Decisión de Estructura**: `storage.js` y los componentes permanecen genéricos; toda la semántica de ventas entra por `userConfig`. Por eso el modelo físico no se implementa como un esquema paralelo, sino como la proyección del perfil de configuración sobre las dos colecciones genéricas. Las entidades planificadas del modelo lógico requerirán nuevas colecciones y vistas en fases posteriores, manteniendo el mismo principio de separación entre núcleo y dominio.

## Estrategia de Implementación por Fases

Las fases se derivan del estado de implementación declarado en `data-model.md` (§1.2 y §7.5). No se listan aquí entidades ni relaciones; cada fase referencia la sección correspondiente del modelo.

### Fase 0 — Subconjunto base (completada)

- Clientes y Pedidos de Venta sobre las colecciones genéricas.
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

- `COTIZACION` con estados propios y aceptación que origina un pedido (`quotes.js`).
- `PEDIDO_VENTA` y `DETALLE_PEDIDO` con consolidación de líneas y totales derivados (`orders.js`).
- Cálculo de subtotal, IVA por línea y total con redondeo monetario (`money.js`).

### Fase 4 — Facturación, pagos y devoluciones (completada)

- `FACTURA`, `PAGO`, `DEVOLUCION` y `DETALLE_DEVOLUCION` implementados en `invoices.js`, `payments.js` y `returns.js`.
- Reglas de saldo, sobrepago, plazo de 30 días, motivo obligatorio y límites de devolución.
- Ciclo completo `cotización → pedido → facturado → entregado`, con auditoría y estados terminales.

Las fases se completaron manteniendo la compatibilidad con los datos persistidos, la configuración como punto de entrada del dominio y `data-model.md` como fuente de verdad del modelo.

## Interfaz de usuario

- Nuevas vistas en `modulo-ventas/index.html` para pedidos, entregas, resumen, devoluciones, historial y facturación.
- Componentes de dominio en `modulo-ventas/src/components/ventas/` conectados desde `modulo-ventas/src/app.js`.
- Selector de rol activo en la barra superior y navegación de Ventas con clase propia (`nav-ventas`) para no alterar las pruebas del shell base.
- Estados vacíos, mensajes `aria-live`, tablas accesibles y estilos responsivos en `styles.css`.

## Cambios Realizados en esta Iteración

1. **Configuración de Ventas** en `modulo-ventas/src/module-config.js`: nombre, etiquetas, cuatro campos propios, ciclo de vida de cinco estados y color de acento.
2. **Modelo de datos v2.0** en `specs/002-modulo-ventas/data-model.md`: modelo lógico completo, modelo físico implementado, estados de implementación, restricciones y persistencia. Este plan se alinea con ese documento y delega en él todo el detalle entidad-relación.
3. **Ajustes menores**:
   - `index.html`: título por defecto → "Ventas".
   - `tests/unit/module-config.test.js`: verifica la configuración de Ventas en lugar del default nulo.
   - `package.json` (raíz): scripts `dev`, `build`, `preview` y `test` apuntan a `modulo-ventas/`.
4. **Reencuadre del alcance**: lo que antes se consideraba fuera de alcance (catálogo, líneas, cotización, facturación, pagos y devoluciones) quedó implementado en `modulo-ventas/src/ventas/` y expuesto en la interfaz.
5. **Dominio de Ventas**: 16 módulos JavaScript (`collections`, `money`, `numbering`, `lifecycle`, `roles`, `audit`, `masters`, `catalog`, `quotes`, `orders`, `delivery`, `summary`, `returns`, `history`, `invoices`, `payments`) y un barrel `index.js`.
6. **Pruebas**: suite nueva en `modulo-ventas/tests/ventas/` con cobertura de historias US1-US6, roles, concurrencia, rendimiento y consistencia.
7. **Documentación**: `data-model.md` v3.0 actualizado con las 14 entidades implementadas, colecciones, roles y `businessRules`.

## Verificación

- `npm test`: **226/226 pruebas pasan** (39 archivos; incluye las 111 pruebas base y las nuevas pruebas de Ventas).
- `npm run test:ventas`: suite específica de Ventas en `modulo-ventas/tests/ventas/`.
- `npm run build`: compila sin errores (salida en `modulo-ventas/dist/`).
- Coherencia con el modelo: la terminología, el ciclo de vida, las validaciones y la persistencia coinciden con `data-model.md` §7 y §8.
- El plan no reproduce el modelo entidad-relación: las entidades, atributos, relaciones y restricciones se consultan en `data-model.md` §2 a §5.

## Seguimiento de Complejidad

La entrega mantiene el núcleo base sin bifurcaciones: `storage.js` y los componentes base conservan sus responsabilidades, mientras el dominio nuevo vive en `modulo-ventas/src/ventas/` y sus vistas en `modulo-ventas/src/components/ventas/`. Las extensiones se justifican por el modelo lógico documentado en `data-model.md`, que sigue siendo la única fuente de verdad.
