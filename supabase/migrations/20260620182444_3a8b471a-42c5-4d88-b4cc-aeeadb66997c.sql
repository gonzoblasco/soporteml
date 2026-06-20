
CREATE TABLE public.thread_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  buyer_id text NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  summary text NOT NULL,
  questions_hash text NOT NULL,
  model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, buyer_id, product_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.thread_summaries TO authenticated;
GRANT ALL ON public.thread_summaries TO service_role;

ALTER TABLE public.thread_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read thread summaries"
  ON public.thread_summaries FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Members can insert thread summaries"
  ON public.thread_summaries FOR INSERT
  TO authenticated
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Members can update thread summaries"
  ON public.thread_summaries FOR UPDATE
  TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));

CREATE TRIGGER update_thread_summaries_updated_at
  BEFORE UPDATE ON public.thread_summaries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_thread_summaries_lookup
  ON public.thread_summaries(company_id, buyer_id, product_id);
