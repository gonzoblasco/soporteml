

## Plan: Modo Auto-Respuesta con filtros por categoría de producto MeLi

### Resumen
Agregar un modo donde las respuestas de IA se publican automáticamente en MercadoLibre sin intervención humana. El admin puede seleccionar en qué categorías de producto (ej: Accesorios) se auto-responde y cuáles requieren revisión humana (ej: Vehículos).

### Cambios en Base de Datos

**Migración 1 - Columnas nuevas:**

- `company_settings`: agregar `auto_reply_enabled boolean default false` y `auto_reply_categories jsonb default '[]'` (array de category IDs de MeLi habilitadas para auto-respuesta).
- `products`: agregar `meli_category_id text` y `meli_category_name text` para almacenar la categoría del producto de MeLi.

### Cambios en Edge Function `sync-meli-questions`

1. **Guardar categoría del producto**: Al obtener datos del item de MeLi (`/items/{id}`), extraer `category_id` y hacer un fetch a `/categories/{id}` para obtener el nombre legible. Guardar ambos en la tabla `products`.

2. **Lógica de auto-publicación**: Después de insertar la pregunta con la sugerencia de IA:
   - Leer `auto_reply_enabled` y `auto_reply_categories` de `company_settings`.
   - Si está habilitado, la respuesta de IA no está vacía, y la categoría del producto está en la lista permitida → llamar directamente a la API de MeLi (`POST /answers`) con la respuesta de IA.
   - Actualizar la pregunta a `status: 'published'`, `final_answer`, `answered_at`.
   - Si la categoría no está en la lista o auto-reply está deshabilitado, dejar como `pending` (comportamiento actual).

### Cambios en Settings (`src/pages/SettingsPage.tsx`)

**Nueva sección `AutoReplySection`** (solo admins), ubicada después de `AiConfigSection`:

- **Toggle principal**: "Habilitar auto-respuesta" con Switch.
- **Lista de categorías**: Consulta `SELECT DISTINCT meli_category_id, meli_category_name FROM products WHERE company_id = X AND meli_category_id IS NOT NULL` para mostrar las categorías disponibles del vendedor.
- **Checkboxes** por cada categoría (ej: "Accesorios para Vehículos", "Repuestos de Autos") para marcar cuáles se auto-responden.
- **Botón Guardar** que hace upsert en `company_settings`.
- **Nota informativa**: texto explicando que solo las categorías seleccionadas se responderán automáticamente, y las demás llegarán al Inbox para revisión humana.

### Flujo del usuario

```text
Settings > Auto-Respuesta
  → Activar toggle "Habilitar auto-respuesta"
  → Ver lista de categorías de sus productos (ej: Accesorios, Vehículos, Electrónica)
  → Tildar "Accesorios" ✓, dejar "Vehículos" sin tildar
  → Guardar

Llega pregunta sobre un producto de "Accesorios":
  → IA genera respuesta → se publica automáticamente en MeLi → status = 'published'

Llega pregunta sobre un producto de "Vehículos":
  → IA genera sugerencia → queda como 'pending' en Inbox → agente revisa y publica manualmente
```

### Seguridad
- Las policies RLS existentes en `company_settings` ya cubren que solo admins pueden leer/escribir la configuración.
- La auto-publicación ocurre en la edge function con service role (server-side), no hay riesgo de abuso client-side.

### Archivos a modificar
- **Migración SQL**: nuevas columnas en `company_settings` y `products`
- **`supabase/functions/sync-meli-questions/index.ts`**: guardar categoría, lógica de auto-reply
- **`src/pages/SettingsPage.tsx`**: nueva sección `AutoReplySection`

