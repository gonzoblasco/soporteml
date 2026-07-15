## Context

SoporteML tiene un Inbox y un Priority Inbox separados. Hoy, `fetchPriorityThreadKeys` ya calcula qué hilos tienen preguntas `requires_human` y el Inbox ya filtra esos hilos. El cambio formaliza esto en specs y agrega el resumen IA.

El copiloto IA (`ai-copilot`) ya usa Lovable AI Gateway con Gemini. La nueva Edge Function `summarize-thread` reusa el mismo patrón de auth (JWT + `get_user_company_id`) y el mismo gateway.

## Goals / Non-Goals

**Goals:**
- Formalizar la absorción cross-bandeja como requirement del spec `inbox`
- Agregar resumen IA cacheado para hilos de 2+ preguntas
- Usar un modelo barato (`gemini-2.5-flash-lite`) para minimizar costo

**Non-Goals:**
- Mover preguntas físicamente (no se cambia `requires_human` en DB)
- Resumen para hilos de 1 sola pregunta
- Editar/regenerar resumen manualmente (se puede agregar luego)
- Mover la lógica de cruce a RPC (empezar en frontend, migrar si se nota lentitud)

## Decisions

1. **Cruce en frontend, no RPC:** dos queries acotados a la company. En volúmenes altos se puede migrar a RPC `get_priority_thread_questions(_company_id)`. Decisión: empezar simple.
2. **Cache por hash:** `questions_hash` = sha256 de IDs + `final_answer` concatenados ordenados. Si llega una pregunta nueva, el hash cambia y se regenera.
3. **Modelo:** `google/gemini-2.5-flash-lite` vía Lovable AI Gateway. Barato y suficiente para 3-4 viñetas.
4. **Tabla nueva:** `thread_summaries` con PK lógica `(company_id, buyer_id, product_id)`. RLS estándar.
5. **Invalidación:** automática por hash. Botón de regenerar manual opcional (no en scope inicial).

## Risks / Trade-offs

- **Performance del cruce:** dos queries por render del Inbox. Aceptable para volumen actual (3 empresas beta). Migrar a RPC si crece.
- **Costo de IA:** cada apertura de hilo con 2+ preguntas puede generar una llamada IA. Mitigado por cache con hash.
- **Latencia:** primera generación del resumen toma 1-3s. Skeleton de loading maneja la UX.