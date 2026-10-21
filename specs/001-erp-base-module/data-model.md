# Modelo de Datos: Módulo Base ERP

**Módulo**: Base reutilizable (`001-erp-base-module`)  
**Implementación de referencia**: `modulo-ventas/src/storage.js` y `modulo-ventas/src/module-config.js`

## Propósito

Este documento describe el modelo genérico del módulo base: dos colecciones (datos maestros y documentos transaccionales) más el objeto de configuración que permite especializarlas en un dominio concreto.

El modelo entidad-relación aplicado al dominio de **Ventas** (CLIENTE → PEDIDO DE VENTA) se documenta en [`../002-modulo-ventas/data-model.md`](../002-modulo-ventas/data-model.md).

## Colecciones del modelo base

| Colección | Naturaleza | Identificador de vínculo | Claves de `localStorage` |
|---|---|---|---|
| `Entity` (datos maestros) | Registro maestro genérico: nombre, código, fiscalidad, contacto, clasificaciones, fechas y condiciones comerciales | `entity_id` (autogenerado, único) | `erp_base_module:entities` |
| `Document` (transaccional) | Documento asociado a un maestro: serie, folio, fechas, desglose económico, estado | `entity_id` (FK → `Entity.entity_id`) | `erp_base_module:documents` |

Relación: `Entity` 1 → N `Document`, con borrado en cascada de los documentos al eliminar la entidad.

## Forma de la configuración (`ModuleConfig`)

```json
{
  "moduleName": "Ventas",
  "labels": {
    "entity": "Cliente",
    "entities": "Clientes",
    "document": "Pedido de Venta",
    "documents": "Pedidos de Venta"
  },
  "customFields": [
    { "target": "entity", "key": "zona", "label": "Zona", "type": "select", "options": ["Norte", "Sur"] },
    { "target": "document", "key": "canal", "label": "Canal de venta", "type": "select", "options": ["Tienda", "Web"] }
  ],
  "statusLifecycle": {
    "statuses": ["cotización", "pedido", "facturado"],
    "transitions": { "cotización": ["pedido"], "pedido": ["facturado"], "facturado": [] }
  },
  "theme": { "accentColor": "#0f62fe" }
}
```

Claves: `moduleName` (nombre del módulo) · `labels` (terminología) · `customFields` (campos propios de `entity` y `document`, tipos `text`, `number`, `date`, `select`) · `statusLifecycle` (estados y transiciones de los documentos) · `theme` (color de acento).

Restricciones de la configuración: las claves de `customFields` no pueden colisionar con los campos base ni repetirse; los estados y las transiciones deben referirse entre sí; el color debe ser un hexadecimal válido. Una configuración inválida se reporta en pantalla y el módulo retrocede a los valores predeterminados.

## Trazabilidad

- Contrato de datos: [`contracts/entity-storage.md`](contracts/entity-storage.md)
- Requisitos del módulo base: [`spec.md`](spec.md) (FR-009, FR-023 a FR-031, XR-001 a XR-005)
- Especialización de ventas: [`../002-modulo-ventas/data-model.md`](../002-modulo-ventas/data-model.md)
