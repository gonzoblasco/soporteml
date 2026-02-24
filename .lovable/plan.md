

## Diagnóstico

El bug es claro: cuando se vacían las preguntas de la papelera (hard delete), el próximo sync con MercadoLibre las vuelve a descargar porque ya no existen en la tabla `questions`, y el chequeo de duplicados falla.

En `sync-meli-questions`, la lógica es:
```
SELECT id FROM questions WHERE meli_question_id = X
-> si no existe, la inserta como nueva
```

Una vez borradas de la DB, el sync las trata como preguntas nuevas.

## Solución propuesta

Crear una tabla `dismissed_meli_questions` que registre los `meli_question_id` que fueron eliminados permanentemente. El flujo sería:

1. **Nueva tabla `dismissed_meli_questions`** con columnas `meli_question_id` (text), `company_id` (uuid), y `dismissed_at` (timestamp). RLS para admins de la company.

2. **Modificar `handleEmptyTrash`** en SettingsPage: antes de hacer el DELETE, insertar los `meli_question_id` de las preguntas a eliminar en `dismissed_meli_questions`.

3. **Modificar `processQuestion`** en `sync-meli-questions`: antes de insertar una pregunta nueva, verificar si su `meli_question_id` existe en `dismissed_meli_questions`. Si existe, saltarla.

## Detalle técnico

### 1. Migración SQL
```sql
CREATE TABLE public.dismissed_meli_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meli_question_id text NOT NULL,
  company_id uuid NOT NULL,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(meli_question_id, company_id)
);

ALTER TABLE public.dismissed_meli_questions ENABLE ROW LEVEL SECURITY;

-- Admins pueden insertar (al vaciar papelera)
CREATE POLICY "Admins can insert dismissed questions"
  ON public.dismissed_meli_questions FOR INSERT
  WITH CHECK (
    company_id = get_user_company_id(auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- Admins pueden ver
CREATE POLICY "Admins can view dismissed questions"
  ON public.dismissed_meli_questions FOR SELECT
  USING (
    company_id = get_user_company_id(auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.dismissed_meli_questions;
```

### 2. SettingsPage - `handleEmptyTrash`
Antes del `DELETE`, consultar los `meli_question_id` de los items a eliminar e insertarlos en `dismissed_meli_questions`. Luego hacer el DELETE como antes.

### 3. Edge Function - `processQuestion`
Agregar un chequeo al inicio:
```ts
const { data: dismissed } = await supabase
  .from("dismissed_meli_questions")
  .select("id")
  .eq("meli_question_id", meliQuestionId)
  .eq("company_id", companyId)
  .maybeSingle();

if (dismissed) return false; // ya fue descartada permanentemente
```

Esto se ejecuta con service_role, así que no hay problema de RLS.

### 4. Actualizar types.ts
Se actualizará automáticamente al crear la migración.

