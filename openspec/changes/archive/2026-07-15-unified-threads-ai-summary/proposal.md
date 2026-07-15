## Why

Los compradores de Mercado Libre hacen múltiples preguntas sobre el mismo producto. Cuando una pregunta de un hilo es marcada como `requires_human`, el resto de sus preguntas relacionadas quedaban fragmentadas entre bandejas. La absorción cross-bandeja ya fue implementada en código. Este change formaliza el resumen IA del hilo como capability nueva y documenta el estado final.

## What Changes

1. **Resumen IA del hilo (nuevo):** arriba del detalle de un hilo con 2+ preguntas, se muestra un resumen auto-generado (3-4 viñetas, ≤60 palabras) usando Lovable AI (`google/gemini-2.5-flash-lite`), cacheado en DB con invalidación por hash.
2. **Absorción cross-bandeja (ya implementada, no spec-level change):** el spec as-built de `inbox` ya incluye este requirement. No se modifica.

## Capabilities

### New Capabilities
- `thread-summary`: Resumen IA auto-generado y cacheado para hilos de 2+ preguntas

### Modified Capabilities
- (ninguna — la absorción cross-bandeja ya está en el spec as-built de `inbox`)

## Impact

- **Frontend:** nuevo `ThreadSummary.tsx`, montado en `QuestionDetail.tsx` cuando hilo ≥2 preguntas
- **Backend:** tabla `thread_summaries` + RLS + GRANTs, Edge Function `summarize-thread`
- **DB:** migración `20260620182444` con tabla, índice único, RLS, trigger updated_at
- **Sin cambios:** `requires_human` en DB no se modifica, `inbox` spec sin cambios