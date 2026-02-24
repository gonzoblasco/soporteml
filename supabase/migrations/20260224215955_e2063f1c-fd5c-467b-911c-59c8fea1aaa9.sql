
-- Add sync interval and last synced timestamp to company_settings
ALTER TABLE public.company_settings
  ADD COLUMN sync_interval_minutes integer NOT NULL DEFAULT 15,
  ADD COLUMN last_synced_at timestamp with time zone;
