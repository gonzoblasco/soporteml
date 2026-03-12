

# Fase 3.1: Sugerencias de conocimiento por categoría en el Copiloto

## Cambios

### 1. `ai-copilot/index.ts` — agregar sugerencia por categoría

Después de las sugerencias globales existentes (líneas 268-276), agregar una sugerencia por categoría si:
- `productCategoryId` existe (el producto tiene categoría MeLi)
- No hay entries con `scope = 'categoria'` y `scope_ref` matching en `kEntries`

Sugerencia: `"No hay conocimiento específico para la categoría [categoryName]. Agregá artículos para respuestas más precisas en esta categoría"` con `type: "categoria"`.

Se necesita obtener el `meli_category_name` del producto (ya se hace el select de `products` en línea ~107, solo agregar `meli_category_name` al select).

Mantener max 2 sugerencias totales (globales + categoría combinadas).

### 2. `AICopilotPanel.tsx` — sin cambios de lógica

El componente ya renderiza `knowledge_suggestions` con dedup por `type` via sessionStorage. La sugerencia de categoría llega con `type: "categoria"` y se filtra/muestra igual que las globales. No hace falta cambiar nada en el frontend.

### 3. Archivos

| Archivo | Cambio |
|---|---|
| `supabase/functions/ai-copilot/index.ts` | Agregar `meli_category_name` al select de products, agregar sugerencia por categoría al array |
| `.lovable/plan.md` | Marcar 3.1 como implementado |
| `CHANGELOG.md` | Documentar |

