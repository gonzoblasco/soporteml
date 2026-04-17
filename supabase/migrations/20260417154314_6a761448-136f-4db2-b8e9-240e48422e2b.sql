-- Add KB RAG settings to company_settings
ALTER TABLE public.company_settings 
  ADD COLUMN IF NOT EXISTS kb_top_k integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS kb_similarity_threshold numeric NOT NULL DEFAULT 0.45;

-- Add soft-delete column to companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Index for filtering active companies efficiently
CREATE INDEX IF NOT EXISTS idx_companies_deleted_at ON public.companies (deleted_at) WHERE deleted_at IS NULL;