
ALTER TABLE public.company_settings
  ADD COLUMN auto_reply_mode text NOT NULL DEFAULT 'off',
  ADD COLUMN business_hours jsonb NOT NULL DEFAULT '{"days":["lunes","martes","miércoles","jueves","viernes"],"start_time":"09:00","end_time":"18:00"}'::jsonb;

-- Migrate existing data: if auto_reply_enabled was true, set mode to 'always'
UPDATE public.company_settings
SET auto_reply_mode = 'always'
WHERE auto_reply_enabled = true;
