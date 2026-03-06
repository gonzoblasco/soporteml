
-- 1. Events table (append-only audit trail)
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type text NOT NULL,
  entity_type text,
  entity_id text,
  payload jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view events"
  ON public.events FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

-- 2. Questions: new ML metadata columns
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS ai_confidence numeric;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS answered_by_ai boolean DEFAULT false;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS ai_decision_reason text;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS auto_action text DEFAULT 'none';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS meli_status text;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS meli_permalink text;

-- 3. Company settings: feature flags + autopilot threshold
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS features_ai_suggestions boolean DEFAULT true;
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS features_autopilot_after_hours boolean DEFAULT false;
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS features_autopilot_in_hours boolean DEFAULT false;
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS autopilot_confidence_threshold numeric DEFAULT 0.85;

-- 4. Expand valid question statuses
CREATE OR REPLACE FUNCTION public.validate_question_status()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status NOT IN ('pending', 'published', 'archived', 'error', 'deleted', 'queued_auto', 'auto_published', 'needs_human') THEN
    RAISE EXCEPTION 'Invalid question status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$function$;
