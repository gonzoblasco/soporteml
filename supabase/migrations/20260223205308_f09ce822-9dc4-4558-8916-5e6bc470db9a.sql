-- Add requires_human flag to questions
ALTER TABLE public.questions
  ADD COLUMN requires_human boolean NOT NULL DEFAULT false,
  ADD COLUMN requires_human_reason text;

-- Add auto_reply_exclusion_rules to company_settings (replaces category-based approach)
ALTER TABLE public.company_settings
  ADD COLUMN auto_reply_exclusion_rules text;