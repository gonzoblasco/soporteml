CREATE TABLE public.dismissed_meli_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meli_question_id text NOT NULL,
  company_id uuid NOT NULL,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(meli_question_id, company_id)
);

ALTER TABLE public.dismissed_meli_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert dismissed questions"
  ON public.dismissed_meli_questions FOR INSERT
  WITH CHECK (
    company_id = get_user_company_id(auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can view dismissed questions"
  ON public.dismissed_meli_questions FOR SELECT
  USING (
    company_id = get_user_company_id(auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );