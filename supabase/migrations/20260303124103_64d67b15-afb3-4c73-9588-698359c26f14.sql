
-- Enable pg_trgm for fuzzy title matching
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

-- Add meli_cache columns to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS meli_cache jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS meli_cache_fetched_at timestamptz DEFAULT NULL;

-- Create GIN index on title for trigram similarity searches
CREATE INDEX IF NOT EXISTS idx_products_title_trgm
  ON public.products USING gin (title extensions.gin_trgm_ops);

-- Create index on external_id for fast dedupe lookups
CREATE INDEX IF NOT EXISTS idx_products_external_id
  ON public.products (company_id, source, external_id)
  WHERE external_id IS NOT NULL;

-- Create index on meli_item_id for fast dedupe lookups
CREATE INDEX IF NOT EXISTS idx_products_meli_item_id
  ON public.products (company_id, meli_item_id)
  WHERE meli_item_id IS NOT NULL;

-- Create index on sku for dedupe
CREATE INDEX IF NOT EXISTS idx_products_sku
  ON public.products (company_id, sku)
  WHERE sku IS NOT NULL;
