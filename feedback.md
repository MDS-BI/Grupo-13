Feedback Avance 01 (26/10/26)

- porque esta el MER en el plan? revisar data-model y plan respecto del template.
- modelo es demasiado simple para generar tareas y US.

Proximos pasos:
 
- rectificar puntos anteriores 
- trabajar en los specs (historias de usuario, US) para definir tareas
- dividirse las US y tareas para una siguiente iteracion (avances cada semana)
- ejecutar una version integrada de prueba

Feedback Avance 02 (2/11/26)

- se agradece respuesta parcial al feedback anterior
- no se observan historias de usuario por miembro del grupo (solo actividad de 1 persona)
- proyecto implementado es un incremento minimo reltivo al template original

Proximos pasos:

- rectificar puntos anteriores y crear tareas a partir de los specs
- hacer primera implmentacion, registar modificaciones/incremental y volver al spec
- dividir el grupo entre modificaciones (ajustes previos) e incremental (nueva funcionalidad)
- integrar nueva version en 2 semanas

Feedback Avance 03 (16/11/26)

Cambios en la especificación:

- spec.md y tasks.md son nuevos: 7 US, FR-001 a FR-048 y T001–T094, todas marcadas. La trazabilidad [USx] entre ambos es clara.
- Incoherencia menor: T050 incluye el estado `rechazada` de devoluciones y FR-029 no.

Consistencia sitio–especificación:

- T069/FR-048 está marcada hecha, pero el formulario de pago en modulo-ventas/index.html solo pide monto y método. Faltan fecha y referencia.
- T079/SC-011 piden ~0,5 s y performance.test.js valida < 3000 ms.
- Siguen las vistas genéricas Entidades y Documentos en index.html. Documentos permite crear pedidos sin stock ni ciclo (FR-012, FR-014), y hay botón de eliminar cliente aunque el supuesto dice que no se expone.
- quotes.js (T022) no tiene vista. La acción cotización → pedido: no verificable (order-form.js no incluido).
- hacer mejoras de funcionalidad e interfaz de usuario, incluir data simulada para probar campos, incluir mejoras de estilo, transicion, navegacion, etcetera.

Presentacion de MVP final en 2 semanas.
