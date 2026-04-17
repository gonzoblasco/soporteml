-- EL-6: Clientes — CRM liviano de buyers MeLi

-- Tabla de clientes (buyers únicos por empresa)
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  buyer_id text NOT NULL,
  buyer_nickname text,
  notes text,
  tags text[] NOT NULL DEFAULT '{}',
  total_questions integer NOT NULL DEFAULT 0,
  last_interaction_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, buyer_id)
);

CREATE INDEX idx_customers_company_id ON public.customers(company_id);
CREATE INDEX idx_customers_last_interaction ON public.customers(company_id, last_interaction_at DESC);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read customers"
  ON public.customers FOR SELECT
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Members can insert customers"
  ON public.customers FOR INSERT
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Members can update customers"
  ON public.customers FOR UPDATE
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Tabla de tags custom por empresa
CREATE TABLE public.customer_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#888888',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);

CREATE INDEX idx_customer_tags_company_id ON public.customer_tags(company_id);

ALTER TABLE public.customer_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read tags"
  ON public.customer_tags FOR SELECT
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Admins can insert tags"
  ON public.customer_tags FOR INSERT
  WITH CHECK (public.has_membership_role(auth.uid(), company_id, 'admin'::public.app_role));

CREATE POLICY "Admins can update tags"
  ON public.customer_tags FOR UPDATE
  USING (public.has_membership_role(auth.uid(), company_id, 'admin'::public.app_role));

CREATE POLICY "Admins can delete tags"
  ON public.customer_tags FOR DELETE
  USING (public.has_membership_role(auth.uid(), company_id, 'admin'::public.app_role));

-- RPC backfill: poblar customers desde questions existentes
CREATE OR REPLACE FUNCTION public.backfill_customers(_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  upserted_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.user_belongs_to_company(auth.uid(), _company_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  INSERT INTO public.customers (
    company_id, buyer_id, buyer_nickname,
    total_questions, last_interaction_at
  )
  SELECT
    _company_id,
    q.buyer_id,
    MAX(q.buyer_nickname),
    COUNT(*)::integer,
    MAX(q.created_at)
  FROM public.questions q
  WHERE q.company_id = _company_id
    AND q.buyer_id IS NOT NULL
  GROUP BY q.buyer_id
  ON CONFLICT (company_id, buyer_id) DO UPDATE SET
    buyer_nickname = COALESCE(EXCLUDED.buyer_nickname, public.customers.buyer_nickname),
    total_questions = EXCLUDED.total_questions,
    last_interaction_at = GREATEST(public.customers.last_interaction_at, EXCLUDED.last_interaction_at),
    updated_at = now();

  GET DIAGNOSTICS upserted_count = ROW_COUNT;
  RETURN jsonb_build_object('upserted', upserted_count);
END;
$$;

REVOKE ALL ON FUNCTION public.backfill_customers(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.backfill_customers(uuid) TO authenticated;

-- RPC para incrementar contador desde el sync (idempotente — usa UPDATE)
CREATE OR REPLACE FUNCTION public.increment_customer_questions(
  _company_id uuid,
  _buyer_id text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.customers
  SET
    total_questions = total_questions + 1,
    last_interaction_at = now(),
    updated_at = now()
  WHERE company_id = _company_id
    AND buyer_id = _buyer_id;
$$;

REVOKE ALL ON FUNCTION public.increment_customer_questions(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.increment_customer_questions(uuid, text) TO service_role;