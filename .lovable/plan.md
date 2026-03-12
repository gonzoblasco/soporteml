

## Diagnóstico exacto: por qué las respuestas siguen siendo distintas

### Diferencias reales encontradas

**1. Ubicación del contexto CRM en el prompt (CAUSA PRINCIPAL)**
- **Copiloto IA** (`ai-copilot/index.ts`, línea 106): inyecta `${productKnowledge}` **dentro del system prompt** con headers estructurados (`--- CONOCIMIENTO CRM DEL PRODUCTO ---`, `Puntos clave:`, `FAQ:`, `NO PROMETER:`). El modelo trata esto como conocimiento autoritativo.
- **Sync** (`sync-meli-questions`, línea 112): mete el CRM como texto plano dentro del **user prompt** bajo "Datos del producto:". El modelo le da menos peso, lo mezcla con datos del comprador y lo interpreta como contexto secundario.

**2. Copiloto incluye `ai_category` y `ai_suggested_answer` como referencia**
- El copiloto recibe la categoría IA previa y la sugerencia previa como inputs adicionales (línea 132-133 de ai-copilot). Esto le permite refinar sobre la respuesta existente.
- El sync no tiene esta ventaja (lógico, es la primera generación).

**3. Copiloto tiene guard incorrecto que oculta datos CRM**
- `ai-copilot` línea 66: `if (crmProduct?.support_summary)` — si no hay `support_summary`, ignora TODOS los campos CRM (key_points, faq, etc.). Hay que arreglar esto también.

**4. Descripción del producto (meli_cache) no se usa en ninguno**
- El campo `meli_cache.description` tiene texto rico y detallado que ni sync ni copiloto usan. Incluirlo mejoraría ambos.

### Plan de corrección

#### A. Sync: mover CRM al system prompt (como hace el Copiloto)
**Archivo: `supabase/functions/sync-meli-questions/index.ts`**

1. Modificar `generateAiAnswer` para recibir un parámetro `crmKnowledge: string` separado del `productContext`
2. Inyectar `crmKnowledge` en el **system prompt** (no en el user prompt), con los mismos headers que usa el Copiloto (`--- CONOCIMIENTO CRM DEL PRODUCTO ---`)
3. En `processQuestion`: llamar `fetchCrmContext` y pasar el resultado como `crmKnowledge` a `generateAiAnswer`, no concatenarlo a `productContext`

#### B. Sync: incluir descripción de MeLi cuando esté disponible
**Archivo: `supabase/functions/sync-meli-questions/index.ts`**

1. En `processQuestion`, después de hacer fetch del item de MeLi, si `item.description` existe o si hay `meli_cache.description` en DB, incluirlo en `productContext`
2. Si el item de MeLi no trae description directamente, hacer un fetch adicional a `/items/{id}/description` (endpoint público de MeLi) y agregarlo

#### C. Sync: enriquecer `fetchCrmContext` con formato Copiloto
**Archivo: `supabase/functions/sync-meli-questions/index.ts`**

1. Cambiar el formato de salida de `fetchCrmContext` para que use los mismos headers del Copiloto:
   - `--- CONOCIMIENTO CRM DEL PRODUCTO ---`
   - `Resumen:`, `Puntos clave:`, `FAQ:`, `NO PROMETER:`, `Envíos:`, `Devoluciones:`, `Garantía:`
   - `Variantes:` con el mismo formato

#### D. Fix del Copiloto: guard demasiado restrictivo
**Archivo: `supabase/functions/ai-copilot/index.ts`**

1. Cambiar línea 66 de `if (crmProduct?.support_summary)` a `if (crmProduct)` para que incluya CRM aun cuando falta el resumen pero hay key_points, FAQ, etc.

#### E. Backfill masivo de preguntas existentes
**Nuevo archivo: `supabase/functions/backfill-ai-answers/index.ts`**

1. Edge function que selecciona todas las questions con status `pending` o `needs_human` que tienen `product_id`
2. Para cada una, regenera `ai_suggested_answer` usando la lógica unificada (con CRM en system prompt)
3. Actualiza el registro en DB
4. Rate-limited para no saturar el gateway de IA

#### F. AICopilotPanel: revertir el skip de auto-trigger
**Archivo: `src/components/AICopilotPanel.tsx`**

1. Revertir el cambio de línea 127 que impide auto-trigger cuando ya existe `ai_suggested_answer`
2. Dado que ahora sync genera respuestas de calidad equivalente, el panel debe mostrar la respuesta guardada directamente sin regenerar — pero solo DESPUÉS de que el backfill se complete y la nueva lógica esté activa
3. Mantener el botón manual "Sugerir respuesta con IA" siempre disponible para refinamiento

#### G. Error `Cannot read properties of null (reading 'useState')`
Revisé los logs y no hay evidencia actual de este error. Si persiste, probablemente fue un hot-reload transitorio. La corrección del AICopilotPanel lo resuelve implícitamente.

### Resumen de cambios por archivo

| Archivo | Cambio |
|---|---|
| `sync-meli-questions/index.ts` | CRM al system prompt, incluir description de MeLi, nuevo param `crmKnowledge` |
| `ai-copilot/index.ts` | Fix guard `support_summary` → incluir CRM siempre que haya datos |
| `backfill-ai-answers/index.ts` | Nueva edge function para regenerar respuestas existentes |
| `AICopilotPanel.tsx` | Mantener auto-trigger skip (respuestas de sync ahora son equivalentes) |

