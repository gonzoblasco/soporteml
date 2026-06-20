## Objetivo
Agregar un buscador de texto y un filtro por tipo dentro del popover de Notificaciones, para que el usuario pueda encontrar rapidamente notificaciones especificas sin salir del panel.

## Alcance
- Solo cambios en el componente `NotificationBell.tsx` (frontend / presentacion).
- No se modifica la base de datos ni el backend.
- Se preserva toda la accesibilidad y navegacion por teclado ya implementada.

## Implementacion

1. **Estado de filtro local**
   - `searchText: string` — texto libre que busca en `title`, `message` y `type`.
   - `filterType: string | 'all'` — tipo de notificacion seleccionado.

2. **Controles en el header del popover**
   - Debajo de la fila "Notificaciones / Marcar todas", agregar una segunda fila compacta con:
     - Un `<Input>` con icono de lupa (placeholder: "Buscar...") para filtrar por texto.
     - Un `<Select>` con las opciones: "Todos los tipos" + los tipos mapeados en `typeLabelsEs` (new_question, priority_question, token_expiring, answer_published).
   - Estilos con `h-8` y `text-xs` para no romper la densidad del panel.

3. **Logica de filtrado**
   - Aplicar `searchText.toLowerCase()` contra `n.title`, `n.message` y el label del tipo.
   - Aplicar `filterType` solo cuando no sea `'all'`.
   - La lista renderizada usa el array filtrado.
   - El contador de "sin leer" del badge del campanillo **sigue siendo el total real** (no se ve afectado por el filtro).
   - El boton "Marcar todas" tambien marca el total real, no solo los visibles.

4. **Accesibilidad**
   - El `<Input>` y `<Select>` reciben `aria-label` descriptivos.
   - Se mantiene el `aria-live="polite"` para anunciar cambios de cuenta.
   - Los `itemRefs` se recalculan sobre la lista filtrada, para que la navegacion por flechas siga funcionando sobre los items visibles.

5. **Mensaje de estado vacio filtrado**
   - Si no hay notificaciones porque el filtro no coincide, mostrar: "Ninguna notificacion coincide con tu busqueda." en lugar de "Sin notificaciones".

## Archivo a editar
- `src/components/NotificationBell.tsx`

## Archivo a actualizar
- `CHANGELOG.md`