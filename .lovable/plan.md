# Plan: Hilos unificados en Priority + Resumen IA

## Objetivo
1. Cuando un comprador tiene **al menos una pregunta priority** sobre un producto, **todas** sus preguntas de ese producto (priority + normales) se muestran **juntas en Priority Inbox** y **desaparecen del Inbox normal**. Sin duplicados.
2. Encima del detalle de un hilo con **2+ preguntas**, mostrar un **resumen IA** auto-generado y cacheado de lo conversado.

---

## Parte 1 — Agrupación cross-bandeja

### Concepto
Una "clave de hilo" = `buyer_id + product_id`. Un hilo es **priority** si contiene al menos una pregunta con `requires_human = true`.

### Cambios

**`src/pages/PriorityInbox.tsx`** — ampliar el query:
- Hoy filtra `requires_human=true`. Pasará a:
  1. Traer todas las preguntas `requires_human=true` de la company (como hoy).
  2. Extraer los pares únicos `(buyer_id, product_id)` de ese resultado.
  3. Hacer un segundo query trayendo **todas las preguntas** de la company que matcheen cualquiera de esos pares (incluye las de inbox normal del mismo hilo).
  4. Unir, deduplicar por `id`, y pasar al `groupQuestions` existente — que ya agrupa por `buyer + product`.
- Resultado: cada card en Priority puede contener preguntas que individualmente no son priority, pero pertenecen al hilo.

**`src/pages/Inbox.tsx`** — excluir hilos absorbidos por priority:
- Después del query actual, calcular el set de pares `(buyer_id, product_id)` que están en algún hilo priority (mismo cómputo que arriba, o vía RPC compartida — ver técnico).
- Filtrar `questions` quitando las que matcheen ese set.
- Estado vacío del inbox sigue funcionando.

**Realtime**: ambas páginas ya escuchan `postgres_changes` en `questions`. Al llegar una nueva pregunta priority, el refetch reevalúa la pertenencia y la pregunta "salta" sola del Inbox al Priority.

**Indicador visual** en la card de Priority cuando agrupa preguntas de ambos tipos:
- Pequeño badge "Hilo mixto" o contador "N preguntas (M urgentes)" en `GroupedQuestionCard`.

### Edge cases
- Hilo con `product_id = null`: no se cruza (ya pasa hoy con `groupQuestions`).
- Pregunta soft-deleted (`status='deleted'`): excluida del cruce.
- Múltiples productos del mismo buyer: cada producto es su propio hilo, independiente.

---

## Parte 2 — Resumen IA del hilo

### Comportamiento
- Se muestra en un bloque arriba del `QuestionDetail` **solo si el hilo tiene ≥ 2 preguntas**.
- Se genera automáticamente al abrir el detalle, **cacheado** en DB.
- Se **invalida** cuando llega una pregunta nueva al hilo (mediante hash del set de IDs de preguntas).
- Mientras carga: skeleton de 2 líneas. Si falla: mensaje sutil "No se pudo generar el resumen" + botón reintentar.

### UI
```text
┌─ QuestionDetail ─────────────────────┐
│ ┌─ Resumen del hilo ──────────────┐  │
│ │ 💬 El comprador consultó por... │  │
│ │ Intención: negociar precio.     │  │
│ │ Pendiente: confirmar envío.     │  │
│ └─────────────────────────────────┘  │
│ [resto del detalle igual]            │
└──────────────────────────────────────┘
```
Estilo calmo, sin destacar de más, alineado al control center.

### Backend
- Tabla nueva `thread_summaries`:
  - `id`, `company_id`, `buyer_id`, `product_id`, `summary text`, `questions_hash text`, `model text`, `created_at`, `updated_at`.
  - PK lógica: `(company_id, buyer_id, product_id)`.
  - RLS + GRANTs estándar (authenticated lectura/escritura solo a su company; service_role full).
- Edge function nueva `summarize-thread`:
  - Input: `{ company_id, buyer_id, product_id }`.
  - Resuelve las preguntas del hilo, calcula `questions_hash` (sha256 de IDs + final_answer concatenados ordenados).
  - Si ya existe summary con mismo hash → devuelve cache.
  - Si no, llama a Lovable AI (modelo barato tipo `google/gemini-2.5-flash-lite`) con prompt en rioplatense neutro, 3-4 viñetas máx: temas, intención, pendientes.
  - Upsert en `thread_summaries`.
  - `verify_jwt = true`, valida membership con `user_belongs_to_company`.

### Frontend
- `src/components/QuestionDetail.tsx`: nuevo sub-componente `ThreadSummary` que recibe el hilo agrupado, llama a la edge function al montar (si ≥2 preguntas), muestra el resumen.
- Cache cliente vía `useState` local + refetch cuando cambia el hash de IDs visible.

---

## Detalles técnicos

### Performance del cruce buyer+product
Para no traer toda la tabla `questions`, el cruce se hace en dos queries acotados a la company. En volúmenes altos podemos mover la lógica a un **RPC** `get_priority_thread_questions(_company_id)` que devuelva directamente el set unificado con SQL (más eficiente). Decisión: empezar en frontend, migrar a RPC si se nota lentitud.

### Archivos a tocar
- `src/pages/PriorityInbox.tsx` — query ampliado, indicador "hilo mixto".
- `src/pages/Inbox.tsx` — filtrado de hilos absorbidos.
- `src/components/GroupedQuestionCard.tsx` — badge opcional "N urgentes".
- `src/components/QuestionDetail.tsx` — montar `ThreadSummary`.
- `src/components/ThreadSummary.tsx` — nuevo.
- `supabase/migrations/...` — tabla `thread_summaries` + RLS + GRANTs.
- `supabase/functions/summarize-thread/index.ts` — nueva edge function.
- `supabase/config.toml` — registrar la función.
- `CHANGELOG.md` — registrar cambio.

### Fuera de alcance
- Mover preguntas físicamente (no se cambia `requires_human` en DB; solo afecta visualización).
- Resumen para hilos de 1 sola pregunta.
- Editar/regenerar resumen manualmente (se puede agregar luego).

---

## Orden de implementación sugerido
1. Parte 1 (cruce de bandejas) — valor inmediato, sin IA.
2. Parte 2 (resumen IA) — sobre la agrupación ya consolidada.

¿Avanzo así, o querés que arranque solo por la Parte 1 y dejemos el resumen para después?