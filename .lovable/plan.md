

# Módulo Conocimiento v1 — Plan Actualizado

Incorpora los 3 ajustes del feedback.

---

## Decisiones cerradas

1. **Scope v1 = solo `global`**. Sin categoría. Sin `scope_ref`. Sin selector condicional. Fase 2 agrega `categoria` con su UX y lógica de inyección selectiva.

2. **Campo `priority`** agregado a `knowledge_entries` (`integer DEFAULT 0`). El prompt de IA ordena entries por priority DESC. Truncación corta por prioridad baja, no por antigüedad.

3. **Restricciones separadas formalmente en el prompt**: entries con `type = 'restriccion'` se inyectan bajo `--- RESTRICCIONES (NO PROMETER / NO AFIRMAR) ---`, separadas del bloque afirmativo `--- CONOCIMIENTO DEL NEGOCIO ---` que agrupa `politica`, `faq`, `guia`.

---

## Modelo de datos

```sql
CREATE TABLE public.knowledge_entries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title         text NOT NULL,
  content       text NOT NULL,
  type          text NOT NULL,          -- 'politica' | 'faq' | 'guia' | 'restriccion'
  scope         text NOT NULL DEFAULT 'global',  -- v1: solo 'global'
  ai_visible    boolean NOT NULL DEFAULT true,
  is_active     boolean NOT NULL DEFAULT true,
  priority      integer NOT NULL DEFAULT 0,
  created_by    uuid,
  updated_by    uuid,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.knowledge_entries ENABLE ROW LEVEL SECURITY;

-- SELECT: company members
CREATE POLICY "Members can view" ON public.knowledge_entries
  FOR SELECT TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id));

-- INSERT/UPDATE: admin or agent
CREATE POLICY "Admin/agent can insert" ON public.knowledge_entries
  FOR INSERT TO authenticated
  WITH CHECK (user_belongs_to_company(auth.uid(), company_id)
    AND (has_membership_role(auth.uid(), company_id, 'admin')
      OR has_membership_role(auth.uid(), company_id, 'agent')));

CREATE POLICY "Admin/agent can update" ON public.knowledge_entries
  FOR UPDATE TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id)
    AND (has_membership_role(auth.uid(), company_id, 'admin')
      OR has_membership_role(auth.uid(), company_id, 'agent')));

-- DELETE: admin only
CREATE POLICY "Admin can delete" ON public.knowledge_entries
  FOR DELETE TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id)
    AND has_membership_role(auth.uid(), company_id, 'admin'));

-- updated_at trigger
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.knowledge_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Inyección al prompt de IA

Tanto en `ai-copilot` como en `sync-meli-questions`:

1. Query: `WHERE company_id = X AND ai_visible = true AND is_active = true AND scope = 'global' ORDER BY priority DESC`
2. Separar en dos bloques:
   - **Afirmativo** (type IN politica, faq, guia) → header `--- CONOCIMIENTO DEL NEGOCIO ---`
   - **Restrictivo** (type = restriccion) → header `--- RESTRICCIONES (NO PROMETER / NO AFIRMAR) ---`
3. Truncar a ~4000 chars total, cortando desde los de menor prioridad
4. Inyectar en el **system prompt**, después del CRM de producto

---

## UI

### Ruta y navegación
- Habilitar `Conocimiento` en sidebar (`enabled: true`, url: `/knowledge`)
- Nueva página `src/pages/KnowledgePage.tsx`

### Layout: split-view (mismo patrón que CatalogPage)
- **Izquierda**: lista de entries con búsqueda + filtro por tipo (dropdown)
- **Derecha**: editor con título, tipo (select), contenido (textarea), toggles ai_visible + is_active, input priority (0-10), botones guardar/eliminar
- **Mobile**: lista → tap → editor fullscreen con botón volver

### Badges por tipo
- `politica` → azul
- `faq` → verde
- `guia` → amarillo
- `restriccion` → rojo

### Indicador IA
- Icono o chip "IA" junto al título si `ai_visible = true`

---

## Archivos a crear/modificar

| Archivo | Cambio |
|---|---|
| Migración SQL | Tabla `knowledge_entries` + RLS + trigger |
| `src/pages/KnowledgePage.tsx` | Nueva página split-view |
| `src/components/AppSidebar.tsx` | Habilitar link Conocimiento → `/knowledge` |
| `src/App.tsx` | Agregar ruta `/knowledge` |
| `supabase/functions/ai-copilot/index.ts` | Fetch + inyectar knowledge entries al system prompt |
| `supabase/functions/sync-meli-questions/index.ts` | Fetch + inyectar knowledge entries al system prompt |
| `CHANGELOG.md` | Documentar v1 de Conocimiento |

---

## Fuera de v1 (Fase 2+)

- Scope `categoria` con selector de categoría MeLi y `scope_ref`
- Scope `producto` (redundante con ficha CRM, evaluar si conviene)
- Sugerencias proactivas del Copiloto para crear entries faltantes
- Editor markdown con preview
- Artículos de ejemplo en onboarding
- Vector search / embeddings para bases grandes

