-- Add MP billing fields to companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS mp_preapproval_id text,
  ADD COLUMN IF NOT EXISTS billing_status text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS billing_period_end timestamptz;

-- Webhook events log
CREATE TABLE IF NOT EXISTS public.mp_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mp_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can view mp events"
  ON public.mp_webhook_events
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin());