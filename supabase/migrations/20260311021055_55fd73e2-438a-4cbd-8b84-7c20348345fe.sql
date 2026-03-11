
CREATE POLICY "Company members can view own connection status"
ON public.meli_tokens
FOR SELECT
TO authenticated
USING (
  user_belongs_to_company(auth.uid(), company_id)
);
