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
**Almacenamiento**: localStorage del navegador — colecciones `erp_base_module:entities` (Clientes) y `erp_base_module:documents` (Pedidos de Venta)  
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

### Fase 0 — Subconjunto implementado (actual)

- Clientes y Pedidos de Venta sobre las colecciones genéricas.
- Campos propios de Ventas, búsqueda y ciclo de vida configurado.
- Validaciones R-01 a R-18 y cascada cliente → pedidos.
- Sin cambios en el núcleo del módulo base.

### Fase 1 — Maestros normalizados

- Normalizar las entidades maestras que hoy existen como campos parciales, según `data-model.md` §3.1, §3.2 y §4.
- Sustituir los valores de texto libre o enumerados por referencias validadas.
- Incorporar las restricciones del modelo lógico asociadas a esos maestros.

### Fase 2 — Catálogo y precios

- Incorporar las entidades de catálogo y tarifario descritas en `data-model.md` §3.4 a §3.7.
- Añadir sus restricciones de unicidad, vigencia y valoración.
- Preparar la base para que los pedidos tomen precios desde listas.

### Fase 3 — Cotizaciones y líneas de pedido

- Incorporar la cotización como entidad propia y las líneas de pedido, según `data-model.md` §3.8, §3.10 y §4.3.
- Derivar los importes de la cabecera a partir de las líneas.
- Aplicar las restricciones de coherencia de importes y de líneas.

### Fase 4 — Facturación, pagos y devoluciones

- Incorporar factura, pago y devolución con sus detalles, según `data-model.md` §3.11 a §3.14 y §4.4 a §4.5.
- Aplicar las reglas de saldo, sobrepago y límites de devolución.
- Completar la trazabilidad del ciclo comercial de punta a punta.

Cada fase debe conservar la compatibilidad con los datos ya persistidos, mantener la configuración como punto de entrada del dominio y actualizar `data-model.md` cuando cambie el estado de implementación.

## Cambios Realizados en esta Iteración

1. **Configuración de Ventas** en `modulo-ventas/src/module-config.js`: nombre, etiquetas, cuatro campos propios, ciclo de vida de cinco estados y color de acento.
2. **Modelo de datos v2.0** en `specs/002-modulo-ventas/data-model.md`: modelo lógico completo, modelo físico implementado, estados de implementación, restricciones y persistencia. Este plan se alinea con ese documento y delega en él todo el detalle entidad-relación.
3. **Ajustes menores**:
   - `index.html`: título por defecto → "Ventas".
   - `tests/unit/module-config.test.js`: verifica la configuración de Ventas en lugar del default nulo.
   - `package.json` (raíz): scripts `dev`, `build`, `preview` y `test` apuntan a `modulo-ventas/`.
4. **Reencuadre del alcance**: lo que antes se consideraba fuera de alcance (catálogo, líneas, cotización, facturación, pagos y devoluciones) pasa a ser roadmap por fases del modelo lógico, sin alterar la implementación física actual.

## Verificación

- `npm test`: **111/111 pruebas pasan** (12 archivos: unit + integration).
- `npm run build`: compila sin errores (salida en `modulo-ventas/dist/`).
- Coherencia con el modelo: la terminología, los campos propios, el ciclo de vida, las validaciones R-01 a R-18 y la persistencia del plan coinciden con `data-model.md` §7 y §8.
- El plan no reproduce el modelo entidad-relación: las entidades, atributos, relaciones y restricciones se consultan en `data-model.md` §2 a §5.

## Seguimiento de Complejidad

La adaptación actual no introduce violaciones de la constitución: se realiza únicamente a través del mecanismo de configuración del módulo base, con cero cambios en el código central. Las fases futuras deberán justificar cualquier extensión del núcleo (nuevas colecciones, servicios de cálculo o validaciones transversales) y mantener el modelo lógico documentado en `data-model.md` como única fuente de verdad.
