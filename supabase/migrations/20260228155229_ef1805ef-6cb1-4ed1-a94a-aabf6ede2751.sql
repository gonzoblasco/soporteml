
-- ============================================================
-- Epic 1 — Phase 1: Catalog CRM Migration
-- ============================================================

-- 1.1 ALTER products
ALTER TABLE public.products
  ALTER COLUMN meli_item_id DROP NOT NULL,
  ADD COLUMN sku text,
  ADD COLUMN status text NOT NULL DEFAULT 'active',
  ADD COLUMN source text NOT NULL DEFAULT 'meli',
  ADD COLUMN external_id text,
  ADD COLUMN external_url text,
  ADD COLUMN support_summary text,
  ADD COLUMN key_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN shipping_notes text,
  ADD COLUMN returns_notes text,
  ADD COLUMN warranty_notes text,
  ADD COLUMN faq_bullets jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN do_not_say jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_by uuid;

-- Populate source/external_id for existing rows
UPDATE public.products SET source = 'meli', external_id = meli_item_id WHERE meli_item_id IS NOT NULL;

-- Indexes
CREATE INDEX idx_products_company_sku ON public.products (company_id, sku) WHERE sku IS NOT NULL;
CREATE INDEX idx_products_company_source_extid ON public.products (company_id, source, external_id) WHERE external_id IS NOT NULL;

-- Unique constraint for multi-source
CREATE UNIQUE INDEX uq_products_company_source_extid ON public.products (company_id, source, external_id) WHERE external_id IS NOT NULL;

-- Status validation trigger
CREATE OR REPLACE FUNCTION public.validate_product_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'archived') THEN
    RAISE EXCEPTION 'Invalid product status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_product_status
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.validate_product_status();

-- Auto-update updated_at trigger (reuse existing function)
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update RLS: allow agents to insert/update products
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;

CREATE POLICY "Company members can insert products"
  ON public.products FOR INSERT
  WITH CHECK (
    company_id = get_user_company_id(auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'agent'))
  );

CREATE POLICY "Company members can update products"
  ON public.products FOR UPDATE
  USING (
    company_id = get_user_company_id(auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'agent'))
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;

-- ============================================================
-- 1.2 CREATE product_variants
-- ============================================================
CREATE TABLE public.product_variants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_name text NOT NULL,
  variant_sku text,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  support_notes text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

CREATE INDEX idx_product_variants_product ON public.product_variants (product_id);
CREATE INDEX idx_product_variants_company ON public.product_variants (company_id);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view variants"
  ON public.product_variants FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company members can insert variants"
  ON public.product_variants FOR INSERT
  WITH CHECK (
    company_id = get_user_company_id(auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'agent'))
  );

CREATE POLICY "Company members can update variants"
  ON public.product_variants FOR UPDATE
  USING (
    company_id = get_user_company_id(auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'agent'))
  );

CREATE POLICY "Company members can delete variants"
  ON public.product_variants FOR DELETE
  USING (
    company_id = get_user_company_id(auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'agent'))
  );

CREATE TRIGGER trg_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 1.3 CREATE audit_logs
-- ============================================================
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  actor_user_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  before_snapshot jsonb,
  after_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_company ON public.audit_logs (company_id, created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

-- No INSERT/UPDATE/DELETE policies for users — logs are written by service role only
