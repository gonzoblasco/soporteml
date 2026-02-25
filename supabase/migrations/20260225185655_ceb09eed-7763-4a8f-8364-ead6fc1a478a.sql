
-- 1. Fix contact_inquiries: restrict SELECT to super admin only
DROP POLICY IF EXISTS "Authenticated users can read inquiries" ON public.contact_inquiries;

CREATE POLICY "Super admin can read inquiries"
  ON public.contact_inquiries FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

-- 2. Add missing DELETE policy on dismissed_meli_questions
CREATE POLICY "Admins can delete dismissed questions"
  ON public.dismissed_meli_questions FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id(auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- 3. Create safe view for meli_tokens (hides access_token/refresh_token)
CREATE OR REPLACE VIEW public.meli_connection_status AS
SELECT 
  id,
  company_id,
  meli_user_id,
  expires_at,
  created_at,
  updated_at,
  CASE WHEN refresh_token IS NOT NULL THEN true ELSE false END as has_refresh_token
FROM public.meli_tokens;

-- Make the view respect RLS of underlying table
ALTER VIEW public.meli_connection_status SET (security_invoker = true);
