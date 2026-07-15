## 1. Absorción cross-bandeja (Parte 1)

- [ ] 1.1 Formalizar `fetchPriorityThreadKeys` en `priorityThreads.ts` — ya existe, verificar que cubre el caso de hilos mixtos
- [ ] 1.2 `PriorityInbox.tsx` — ampliar query: traer todas las preguntas de los pares `(buyer_id, product_id)` priority, no solo las `requires_human`
- [ ] 1.3 `Inbox.tsx` — verificar filtrado de hilos absorbidos (ya usa `priorityKeys`, confirmar que funciona bidireccional)
- [ ] 1.4 `GroupedQuestionCard.tsx` — agregar badge "N (M urg.)" cuando el hilo es mixto
- [ ] 1.5 Test manual: pregunta priority "salta" del Inbox al Priority via Realtime

## 2. Tabla thread_summaries (Parte 2 — backend)

- [ ] 2.1 Migración SQL: crear tabla `thread_summaries` con PK lógica, RLS, GRANTs, índice único
- [ ] 2.2 Edge Function `summarize-thread/index.ts`: auth JWT, membership check, resolver hilo, calcular hash, cache check, LLM call, upsert
- [ ] 2.3 Registrar `summarize-thread` en `supabase/config.toml` con `verify_jwt = true`
- [ ] 2.4 Prompt: rioplatense neutro, 3-4 viñetas, ≤60 palabras, temas + intención + pendientes

## 3. ThreadSummary component (Parte 2 — frontend)

- [ ] 3.1 Crear `src/components/ThreadSummary.tsx` — recibe hilo agrupado, llama a la EF al montar si ≥2 preguntas
- [ ] 3.2 Skeleton de 2 líneas mientras carga
- [ ] 3.3 Manejo de error: mensaje sutil + botón reintentar
- [ ] 3.4 Montar `ThreadSummary` arriba del `QuestionDetail` cuando el hilo tenga ≥2 preguntas
- [ ] 3.5 Cache cliente: `useState` local + refetch cuando cambia el hash de IDs visible

## 4. Deploy y verificación

- [ ] 4.1 Deploy migración via Lovable Cloud
- [ ] 4.2 Deploy Edge Function via Lovable Cloud
- [ ] 4.3 Test end-to-end: abrir hilo con 2+ preguntas, verificar resumen
- [ ] 4.4 Test cache: reabrir mismo hilo, verificar que no regenera
- [ ] 4.5 Test invalidación: nueva pregunta al hilo, verificar regeneración
- [ ] 4.6 CHANGELOG de SoporteML actualizado