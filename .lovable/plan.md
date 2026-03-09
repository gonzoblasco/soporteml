

## Mega-Cambio: Autopilot con Guardrails + Base Firme

Dos bloques ejecutados como un único cambio coordinado.

---

### Bloque A — Base Firme (5 fixes)

**A1. Feature flags por empresa**

Agregar columnas a `company_settings`:
```sql
features_ai_suggestions boolean DEFAULT true,
features_autopilot_after_hours boolean DEFAULT false,
features_autopilot_in_hours boolean DEFAULT false,
autopilot_confidence_threshold numeric DEFAULT 0.85
```
El sync y la UI respetan estos flags antes de actuar.

**A2. Tabla `events` (append-only audit trail)**

```sql
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type text NOT NULL,  -- SYNC_STARTED, SYNC_DONE, AI_DECISION, AUTO_REPLY_SENT, ERROR, ...
  entity_type text,    -- question, product, token
  entity_id text,
  payload jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
-- RLS: SELECT for company members, INSERT only via service role
```

Integrar en `sync-meli-questions`: log SYNC_STARTED, SYNC_DONE, AI_DECISION (con confidence + action), AUTO_REPLY_SENT, ERROR.

**A3. Metadata ML completa en `questions`**

```sql
ALTER TABLE questions ADD COLUMN IF NOT EXISTS
  ai_confidence numeric,
  answered_by_ai boolean DEFAULT false,
  ai_decision_reason text,
  auto_action text DEFAULT 'none',  -- none | suggest | auto_reply
  meli_status text,
  meli_permalink text;
```

`requires_human` y `requires_human_reason` ya existen. `auto_action` registra qué decidió el sistema.

**A4. Seguridad — validación de no filtrado de service role**

Auditar que ninguna Edge Function devuelve tokens o service role keys al frontend. Esto ya está cubierto por la vista `meli_connection_status`, pero se refuerza revisando `debug-meli` (solo super admin) y asegurando que `notify` no expone datos sensibles.

**A5. Health checks livianos**

Nueva Edge Function `health-check` que:
- Verifica conectividad DB (SELECT 1)
- Verifica que la función responde
- Devuelve status + timestamp

Registrar en `config.toml`.

---

### Bloque B — Autopilot Controlado (4 piezas)

**B1. State machine de preguntas**

Expandir los estados válidos del trigger `validate_question_status`:
```
pending → published | archived | queued_auto
queued_auto → auto_published | needs_human | error
```

Nuevos estados: `queued_auto`, `auto_published`, `needs_human`.

**B2. Motor de decisión en `sync-meli-questions`**

Refactorizar la lógica de auto-reply actual para incorporar:

```text
1. IA genera respuesta + confidence score (0-1)
2. Evaluar feature flags de la empresa:
   - Si autopilot_after_hours ON y estamos fuera de horario:
     → si confidence >= threshold y !requires_human → auto_action = 'auto_reply'
     → sino → auto_action = 'suggest', status = 'needs_human'
   - Si autopilot_in_hours ON y estamos en horario:
     → si confidence >= threshold y !requires_human → auto_action = 'auto_reply'
     → sino → auto_action = 'suggest'
   - Si ningún autopilot ON:
     → auto_action = 'suggest' (solo sugiere, humano aprueba)
3. Registrar en events: AI_DECISION con payload {confidence, action, reason}
4. Si auto_reply → publicar en MeLi → status = 'auto_published', answered_by_ai = true
5. Failsafe: si publish falla → status = 'needs_human'
```

Modificar el prompt de IA para que devuelva `confidence` (0-1) además de los campos actuales.

**B3. Función de evaluación de horario comercial**

Extraer la lógica de "¿estamos dentro o fuera del horario?" a una función reutilizable en `sync-meli-questions`, usando `business_hours` de `company_settings` y timezone Argentina (UTC-3).

**B4. UI: Panel Autopilot en Settings**

Expandir la sección Auto-Respuesta existente con:
- Toggle "Autopilot fuera de horario" (ya existe como modo)
- Toggle "Autopilot en horario" (nuevo, opt-in)
- Slider de umbral de confianza (0.5–1.0, default 0.85)
- Indicador de última sync + estado de conexión (ya existe en MeliConnectionSection)
- Chip visual del modo activo: "Solo sugiere" | "Auto fuera de horario" | "Auto siempre"

---

### Migración SQL (una sola)

```sql
-- 1. Events table
CREATE TABLE public.events (...);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can view events" ON public.events FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));

-- 2. Questions: nuevas columnas
ALTER TABLE public.questions ADD COLUMN ai_confidence numeric;
ALTER TABLE public.questions ADD COLUMN answered_by_ai boolean DEFAULT false;
ALTER TABLE public.questions ADD COLUMN ai_decision_reason text;
ALTER TABLE public.questions ADD COLUMN auto_action text DEFAULT 'none';
ALTER TABLE public.questions ADD COLUMN meli_status text;
ALTER TABLE public.questions ADD COLUMN meli_permalink text;

-- 3. Company settings: feature flags
ALTER TABLE public.company_settings ADD COLUMN features_ai_suggestions boolean DEFAULT true;
ALTER TABLE public.company_settings ADD COLUMN features_autopilot_after_hours boolean DEFAULT false;
ALTER TABLE public.company_settings ADD COLUMN features_autopilot_in_hours boolean DEFAULT false;
ALTER TABLE public.company_settings ADD COLUMN autopilot_confidence_threshold numeric DEFAULT 0.85;

-- 4. Expand valid statuses
CREATE OR REPLACE FUNCTION validate_question_status() ...
  IF NEW.status NOT IN ('pending','published','archived','error','deleted','queued_auto','auto_published','needs_human') ...
```

### Archivos a crear/modificar

| Archivo | Cambio |
|---|---|
| Migración SQL | events + columnas questions + flags settings + estados |
| `supabase/functions/health-check/index.ts` | Nuevo — ping DB + status |
| `supabase/functions/sync-meli-questions/index.ts` | Motor de decisión autopilot + logging events + confidence |
| `supabase/config.toml` | Registrar health-check |
| `src/pages/SettingsPage.tsx` | Expandir AutoReplySection con flags + threshold slider |
| `src/types/question.ts` | Nuevos campos del tipo |
| `src/pages/Inbox.tsx` / `PriorityInbox.tsx` | Mostrar badge auto_published / needs_human |
| `CHANGELOG.md` | Documentar cambios |

