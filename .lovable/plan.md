

## Diagnóstico

El problema es claro: tanto el endpoint autenticado como el público de `/items/MLA1576204659` devuelven **403 (PA_UNAUTHORIZED)**. Esto probablemente ocurre porque el ítem pertenece a un **usuario de prueba** de MeLi, que tiene restricciones de visibilidad. En producción con ítems reales, el endpoint público debería funcionar. Sin embargo, necesitamos una solución robusta que no falle silenciosamente.

Actualmente, cuando el fetch del ítem falla, el código simplemente continúa e inserta la pregunta con `product_id: null` y `productTitle = "Producto"`, por eso la UI muestra "Producto".

## Plan de corrección

### 1. Agregar endpoint multiget como tercer fallback (edge function)

En `sync-meli-questions/index.ts`, agregar un tercer intento usando el endpoint multiget de MeLi (`/items?ids=ITEM_ID`) que tiene políticas de acceso diferentes y puede funcionar donde el endpoint individual falla.

```text
Flujo de fallback:
  1. GET /items/{id} con Authorization header
  2. Si 403 → GET /items/{id} sin header (público)
  3. Si 403 → GET /items?ids={id} con Authorization header (multiget)
  4. Si todo falla → crear producto mínimo con título = item_id
```

### 2. Crear producto mínimo cuando todo falla

Si los 3 endpoints fallan, igualmente crear un registro en `products` con:
- `title`: el `item_id` (ej: "MLA1576204659") para que al menos se muestre algo identificable
- `meli_item_id`: el item_id
- `company_id`: el company_id correspondiente

Así el `product_id` nunca será `null` y la UI mostrará al menos el ID del ítem en lugar de "Producto".

### 3. Parsear respuesta multiget

El multiget devuelve un array con `{code: 200, body: {...}}`. Hay que parsear esta estructura diferente para extraer el título, precio, atributos, etc.

### Archivos a modificar
- `supabase/functions/sync-meli-questions/index.ts`: agregar fallback multiget + creación de producto mínimo

### Resultado esperado
- Preguntas futuras siempre tendrán `product_id` vinculado
- La UI mostrará el título real del producto (si el fetch funciona) o al menos el item_id de MeLi (si todos los endpoints fallan)
- Las preguntas existentes con `product_id = null` no se corrigen automáticamente (solo aplica a nuevas)

