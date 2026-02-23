
-- Add auto-reply columns to company_settings
ALTER TABLE public.company_settings
ADD COLUMN auto_reply_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN auto_reply_categories jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Add category columns to products
ALTER TABLE public.products
ADD COLUMN meli_category_id text,
ADD COLUMN meli_category_name text;
