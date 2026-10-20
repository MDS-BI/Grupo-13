# Plan de Implementación: Módulo de Ventas

**Rama**: `002-modulo-ventas` | **Fecha**: 2026-10-20 | **Especificación**: [spec.md](spec.md)
**Entrada**: Especificación de la funcionalidad desde `/specs/002-modulo-ventas/spec.md`

## Resumen

Generar el módulo ERP de **Ventas** como una carpeta autónoma (`modulo-ventas/`) a partir del módulo base (`001-erp-base-module`). El módulo base fue restaurado desde el historial de git (commit `501e9c6`, último estado completo antes de su eliminación en `a0062c0`) y colocado en la nueva carpeta junto con sus pruebas. Toda la adaptación al dominio de ventas se realizó mediante el único punto de configuración `userConfig` en `modulo-ventas/src/module-config.js`, sin modificar el código central:

- **Entidad → Cliente**, **Documento → Pedido de Venta** (etiquetas en todas las pantallas).
- **Campos personalizados**: vendedor asignado y zona (cliente); canal de venta y fecha de entrega (pedido).
- **Ciclo de vida**: cotización → pedido → facturado → entregado, con cancelación desde cotización o pedido.
- **Marca**: nombre "Ventas" y color de acento `#0f62fe`.

## Contexto Técnico

**Lenguaje/Versión**: JavaScript (ES2022), HTML, CSS  
**Dependencias Principales**: Vite, Vitest + jsdom (sin framework de interfaz)  
**Almacenamiento**: localStorage del navegador  
**Estructura**: la carpeta `modulo-ventas/` es autocontenida (index.html, src/, tests/) y se ejecuta con `vite modulo-ventas` desde la raíz del repositorio  
**Comandos**: `npm run dev`, `npm run build`, `npm test` (apuntan a `modulo-ventas/`)

## Estructura del Proyecto

### Documentación (esta funcionalidad)

```text
specs/002-modulo-ventas/
├── spec.md
└── plan.md
```

### Código Fuente (carpeta nueva)

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

## Cambios Realizados

1. **Restauración**: se recuperaron `index.html`, `src/` y `tests/` del commit `501e9c6` mediante un worktree temporal de git.
2. **Configuración de Ventas** en `modulo-ventas/src/module-config.js`:

```js
export const userConfig = {
  moduleName: 'Ventas',
  labels: { entity: 'Cliente', entities: 'Clientes',
            document: 'Pedido de Venta', documents: 'Pedidos de Venta' },
  customFields: [
    { target: 'entity', key: 'vendedor', label: 'Vendedor asignado', type: 'text' },
    { target: 'entity', key: 'zona', label: 'Zona', type: 'select',
      options: ['Norte', 'Sur', 'Este', 'Oeste', 'Centro'] },
    { target: 'document', key: 'canal', label: 'Canal de venta', type: 'select',
      options: ['Tienda', 'Web', 'Teléfono', 'Distribuidor'] },
    { target: 'document', key: 'fechaEntrega', label: 'Fecha de entrega', type: 'date' }
  ],
  statusLifecycle: {
    statuses: ['cotización', 'pedido', 'facturado', 'entregado', 'cancelado'],
    transitions: {
      cotización: ['pedido', 'cancelado'],
      pedido: ['facturado', 'cancelado'],
      facturado: ['entregado'],
      entregado: [],
      cancelado: []
    }
  },
  theme: { accentColor: '#0f62fe' }
};
```

3. **Ajustes menores**:
   - `index.html`: título por defecto → "Ventas".
   - `tests/unit/module-config.test.js`: la prueba de `loadModuleConfig` ahora verifica la configuración de Ventas en lugar del default nulo.
   - `package.json` (raíz): scripts `dev`, `build`, `preview` y `test` apuntan a `modulo-ventas/`.

## Verificación

- `npm test`: **111/111 pruebas pasan** (12 archivos: unit + integration).
- `npm run build`: compila sin errores (salida en `modulo-ventas/dist/`).

## Seguimiento de Complejidad

Este plan no introdujo violaciones de la constitución: la adaptación se hizo únicamente a través del mecanismo de configuración previsto por el módulo base, con cero cambios en el código central.
