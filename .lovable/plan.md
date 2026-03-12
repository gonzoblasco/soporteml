

# Fase 2 Conocimiento: scope `categoria` — Plan de implementación

## Cambios incorporados del feedback

1. **Constraint de consistencia**: validación trigger que enforce `global → scope_ref IS NULL` y `categoria → scope_ref IS NOT NULL`
2. **Orden de prioridad en prompt**: restricciones primero, luego categoría, luego global, cada bloque por `priority DESC`
3. **UI defensiva**: si no hay categorías disponibles, mostrar mensaje claro y forzar scope `global`

---

## 1. Migración SQL

```sql
-- Add scope_ref column
ALTER TABLE public.knowledge_entries ADD COLUMN scope_ref text;

-- Validation trigger for scope/scope_ref consistency
CREATE OR REPLACE FUNCTION public.validate_knowledge_scope()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.scope = 'global' AND NEW.scope_ref IS NOT NULL THEN
    RAISE EXCEPTION 'scope_ref must be NULL when scope is global';
  END IF;
  IF NEW.scope = 'categoria' AND (NEW.scope_ref IS NULL OR NEW.scope_ref = '') THEN
    RAISE EXCEPTION 'scope_ref is required when scope is categoria';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_knowledge_scope_trigger
  BEFORE INSERT OR UPDATE ON public.knowledge_entries
  FOR EACH ROW EXECUTE FUNCTION public.validate_knowledge_scope();
```

---

## 2. AI prompt injection — nuevo orden

Both `ai-copilot` and `sync-meli-questions` change from fetching only `scope = 'global'` to:

```
WHERE company_id = X AND ai_visible = true AND is_active = true
  AND (scope = 'global' OR (scope = 'categoria' AND scope_ref = :categoryId))
ORDER BY priority DESC
```

Then build prompt in this order:
1. **Restricciones** (type = `restriccion`, categoría first then global) — `--- RESTRICCIONES ---`
2. **Conocimiento de categoría** (type != `restriccion`, scope = `categoria`) — `--- CONOCIMIENTO DE CATEGORÍA ---`
3. **Conocimiento global** (type != `restriccion`, scope = `global`) — `--- CONOCIMIENTO DEL NEGOCIO ---`

Each sub-block sorted by `priority DESC`. Total truncation at ~4000 chars, cutting from global positive (lowest priority first).

### ai-copilot changes
- Add `meli_category_id` to the existing product select (line ~60)
- Change knowledge query to include `categoria` entries matching product's category
- Reorder prompt assembly

### sync-meli-questions changes
- `fetchKnowledgeContext` gets new param `categoryId: string | null`
- Same query + ordering logic
- Call site (line ~805) passes `productCategoryId` which is already available

---

## 3. UI changes in KnowledgePage.tsx

### New state
- `editScope`: `'global'` | `'categoria'`
- `editScopeRef`: `string | null`
- `categories`: fetched from `products` table (`DISTINCT meli_category_id, meli_category_name`)
- `filterScope`: `'all'` | `'global'` | `'categoria'`

### Editor additions
- Scope select (Global / Categoría) below Type select
- When `categoria` selected:
  - If categories available → show category dropdown
  - If no categories → show info message "No hay categorías detectadas en productos sincronizados", disable save with scope `categoria`, keep user on `global`
- Populate editor with `scope`/`scope_ref` on selection
- Save includes `scope` and `scope_ref` (null if global)

### List additions
- Add scope filter dropdown (Todos / Global / Categoría)
- Show category name badge on entries with `scope = 'categoria'`
- Filter list also applies scope filter

### Insert flow
- New entries default to `scope = 'global'`, `scope_ref = null`

---

## 4. Files to modify

| File | Change |
|---|---|
| New SQL migration | `scope_ref` column + validation trigger |
| `src/pages/KnowledgePage.tsx` | Scope selector, category dropdown, filter, empty state |
| `supabase/functions/ai-copilot/index.ts` | Knowledge query includes category, reordered prompt |
| `supabase/functions/sync-meli-questions/index.ts` | `fetchKnowledgeContext` accepts categoryId, reordered prompt |
| `.lovable/plan.md` | Mark Fase 2 done |
| `CHANGELOG.md` | Document |

