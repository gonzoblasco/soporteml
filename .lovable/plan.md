


## Módulo Conocimiento v1 — IMPLEMENTADO ✅

Implementado en v1.1.0. Tabla `knowledge_entries` con RLS, UI split-view en `/knowledge`, inyección en `ai-copilot` y `sync-meli-questions`.

## Módulo Conocimiento Fase 2 — IMPLEMENTADO ✅

Implementado en v1.2.0. Scope `categoria` con selector de categoría MeLi y `scope_ref`.

### Cambios Fase 2
- Columna `scope_ref` en `knowledge_entries` con trigger de validación de consistencia (`global` → NULL, `categoria` → NOT NULL)
- UI: selector de alcance (Global / Categoría), dropdown de categorías MeLi, filtro por scope, badges de categoría
- UI defensiva: si no hay categorías sincronizadas, deshabilita scope `categoria` y muestra mensaje claro
- IA: inyección ordenada por prioridad: restricciones (categoría → global), conocimiento de categoría, conocimiento global
- Truncación inteligente a ~4000 chars cortando desde global positivo de menor prioridad

## Módulo Conocimiento Fase 3 — IMPLEMENTADO ✅

Implementado en v1.3.0. Sugerencias proactivas de gaps de conocimiento global (política, restricción, FAQ) en el Copiloto IA. Anti-spam con dedup por sesión (max 1 sugerencia por render). Solo gaps globales; categoría diferida a Fase 3.1.

### Fase 3.1 — IMPLEMENTADO ✅

Implementado en v1.3.1. Sugerencia proactiva por categoría MeLi cuando no hay entries con `scope=categoria` para el producto actual. Combinada con sugerencias globales, max 2 totales.

### Fase 3.2+ (pendiente)
- Editor markdown con preview
- Artículos de ejemplo en onboarding
- Vector search / embeddings para bases grandes
