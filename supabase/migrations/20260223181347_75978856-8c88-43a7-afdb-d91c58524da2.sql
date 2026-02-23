
-- 1. Create company_settings table for AI config
CREATE TABLE public.company_settings (
  company_id UUID NOT NULL PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  ai_tone TEXT NOT NULL DEFAULT 'profesional',
  ai_custom_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Admins can view their company settings
CREATE POLICY "Admins can view company settings"
ON public.company_settings
FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- Admins can insert company settings
CREATE POLICY "Admins can insert company settings"
ON public.company_settings
FOR INSERT
TO authenticated
WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- Admins can update company settings
CREATE POLICY "Admins can update company settings"
ON public.company_settings
FOR UPDATE
TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- 2. Allow admins to update company name
CREATE POLICY "Admins can update company"
ON public.companies
FOR UPDATE
TO authenticated
USING (id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- 3. Allow admins to delete meli_tokens (disconnect)
CREATE POLICY "Admins can delete company tokens"
ON public.meli_tokens
FOR DELETE
TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- 4. Trigger for updated_at on company_settings
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
