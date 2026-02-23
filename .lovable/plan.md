

## Diagnóstico del problema real

El bug NO es solo el 403 de sandbox. Hay un problema de lógica en `processQuestion`:

```text
if (existing) return false;   ← AQUÍ ESTÁ EL BUG
```

Cuando una pregunta ya existe en la DB **pero tiene `product_id = null`** (porque falló el fetch del ítem), la función simplemente la ignora. Re-ejecutar el sync nunca arregla las preguntas rotas.

**Evidencia:** 9+ preguntas con `product_id = null` que nunca se van a arreglar aunque el endpoint `/items/{id}` funcione perfectamente.

Además, el contador `totalSynced++` está mal ubicado en el path del webhook: siempre incrementa aunque `processQuestion` retorne `false`.

---

## Plan de corrección

### Cambio en `supabase/functions/sync-meli-questions/index.ts`

**1. Cuando la pregunta ya existe pero tiene `product_id = null`, re-intentar obtener los datos del producto**

En lugar de simplemente `return false`, si `existing` tiene `product_id = null` y la pregunta de MeLi tiene `item_id`, ejecutar la lógica de fetch del ítem y actualizar el registro existente con el `product_id` correcto.

```text
Flujo actual:
  existing? → return false (siempre)

Flujo corregido:
  existing? → ¿tiene product_id? → sí → return false
                                  → no → ¿tiene item_id? → sí → fetch ítem → update question
                                                           → no → return false
```

**2. Corregir el contador en el path del webhook**

Mover `totalSynced++` para que solo incremente cuando `processQuestion` retorna `true`.

**3. Mejorar la consulta del existing para traer `product_id`**

Cambiar `select("id")` a `select("id, product_id")` para poder evaluar si necesita re-procesamiento.

### Detalle técnico

Cuando se detecta una pregunta existente sin `product_id`:
- Se ejecuta solo la parte de fetch del ítem (no se re-genera la respuesta AI)
- Se crea el producto en la tabla `products` si no existe
- Se hace `UPDATE` en la pregunta con el nuevo `product_id`
- Retorna `true` para contabilizar como sincronizada

### Archivo a modificar
- `supabase/functions/sync-meli-questions/index.ts`

### Resultado esperado
- Las preguntas existentes con `product_id = null` se arreglarán automáticamente en el próximo sync
- Nuevas preguntas seguirán funcionando igual
- El título del producto se mostrará correctamente en la UI

