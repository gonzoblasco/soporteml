## Why

Los compradores de Mercado Libre hacen múltiples preguntas sobre el mismo producto, y esas preguntas pueden estar divididas entre el Inbox normal y el Priority Inbox. Hoy, cuando una pregunta de un hilo es marcada como `requires_human`, el resto de sus preguntas relacionadas quedan en el Inbox normal, fragmentando la conversación. Además, los hilos con 2+ preguntas no tienen un resumen, obligando al vendedor a leer cada pregunta individualmente para entender el contexto.

## What Changes

1. **Hilos unificados cross-bandeja:** cuando un hilo (`buyer_id + product_id`) tiene al menos una pregunta `requires_human`, todas las preguntas de ese hilo se muestran juntas en Priority Inbox y desaparecen del Inbox normal.
2. **Resumen IA del hilo:** arriba del detalle de un hilo con 2+ preguntas, se muestra un resumen auto-generado (3-4 viñetas, ≤60 palabras) usando Lovable AI (`google/gemini-2.5-flash-lite`), cacheado en DB con invalidación por hash.

## Capabilities

### New Capabilities
- `thread-summary`: Resumen IA auto-generado y cacheado para hilos de 2+ preguntas

### Modified Capabilities
- `inbox`: absorción cross-bandeja ya implementada en código pero no spec'd — se formaliza como requirement del spec existente
- `ai-copilot`: nueva Edge Function `summarize-thread` reusa patrones de auth y AI Gateway del copiloto existente

## Impact

- **Frontend:** `PriorityInbox.tsx` (query ampliado), `Inbox.tsx` (filtrado de hilos absorbidos), `GroupedQuestionCard.tsx` (badge "N urgentes"), `QuestionDetail.tsx` (montar `ThreadSummary`), nuevo `ThreadSummary.tsx`
- **Backend:** nueva tabla `thread_summaries` + RLS + GRANTs, nueva Edge Function `summarize-thread`, registro en `config.toml`
- **DB:** migración nueva para `thread_summaries` (PK lógica: `company_id + buyer_id + product_id`)
- **Sin cambios:** `requires_human` en DB no se modifica (solo afecta visualización, no datos)