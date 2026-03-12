

## Diagnóstico: Auto-respuesta con contenido vacío/placeholder

### Causa raíz

El flujo de ingesta en `sync-meli-questions` SÍ genera una respuesta IA y la guarda en `ai_suggested_answer`. Sin embargo, hay dos problemas concretos:

1. **Contexto CRM ausente en la ingesta**: `sync-meli-questions` (línea 576) solo consulta `id, title, price, permalink, meli_category_id` del producto en DB. NO incluye los campos CRM (`support_summary`, `key_points`, `faq_bullets`, `do_not_say`, `shipping_notes`, `returns_notes`, `warranty_notes`) ni las variantes. En cambio, el copiloto (`ai-copilot`) SÍ los incluye (líneas 59-91). Esto produce respuestas de menor calidad o genéricas en la ingesta.

2. **Autopilot publica la respuesta de ingesta, no la del copiloto**: Cuando autopilot decide auto-publicar (línea 773), usa el `answer` generado en ingesta (sin CRM). El copiloto genera una respuesta mejor después, pero solo cuando un humano abre la pregunta en la UI, lo cual nunca pasa para auto-publicaciones.

3. **Si la IA falla o `aiSuggestionsEnabled` es false**: `answer` queda como `""`, se guarda como `ai_suggested_answer: null` (línea 761), y la UI muestra el textarea vacío con placeholder "Editá la respuesta...". No se auto-publica en este caso (línea 772 lo previene), pero la pregunta queda sin sugerencia.

### Plan de corrección

**Archivo: `supabase/functions/sync-meli-questions/index.ts`**

Enriquecer el contexto del producto en `processQuestion` para incluir los campos CRM antes de llamar a `generateAiAnswer`:

- Después de resolver `productId` (línea ~684), hacer un SELECT adicional de la tabla `products` con los campos CRM: `support_summary, key_points, faq_bullets, do_not_say, shipping_notes, returns_notes, warranty_notes`
- Hacer un SELECT de `product_variants` para ese `product_id` (sin archived)
- Concatenar esa información al `productContext` existente (que ya tiene datos de MeLi API)
- Esto unifica la calidad del contexto entre sync y copilot

Cambios específicos:
1. Agregar función `fetchCrmContext(supabase, productId, companyId)` que retorna string con datos CRM + variantes
2. Llamarla después de resolver productId y antes de `generateAiAnswer`
3. Concatenar resultado al `productContext`

**Sin cambios en:**
- `ai-copilot` (ya funciona bien)
- `QuestionDetail.tsx` (ya usa `ai_suggested_answer` correctamente)
- Esquema de DB (ya tiene todos los campos necesarios)
- Lógica de autopilot (ya publica `answer` correctamente, solo faltaba el contexto)

### Resultado esperado
- La respuesta IA generada en ingesta tendrá la misma calidad que la del copiloto
- Autopilot publicará respuestas con contexto CRM completo
- Preguntas pendientes llegarán a la UI con `ai_suggested_answer` prellenado con una respuesta de calidad
- El copiloto seguirá funcionando como segunda capa de refinamiento

### Checklist de prueba manual
1. Tener un producto con datos CRM completos (support_summary, key_points, etc.)
2. Forzar un sync manual
3. Verificar en DB que `ai_suggested_answer` contiene una respuesta que usa datos CRM
4. Si autopilot está activo: verificar que la respuesta auto-publicada en MeLi usa contexto CRM
5. Si no hay autopilot: abrir la pregunta en Inbox y verificar que el textarea ya tiene la respuesta prellenada

