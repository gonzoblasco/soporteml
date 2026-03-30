
-- 1. Drop the permissive SELECT policy that exposes raw access_token/refresh_token to all company members
DROP POLICY IF EXISTS "Company members can view own connection status" ON public.meli_tokens;

-- 2. Drop the DELETE policy that uses 'public' role and recreate with 'authenticated' role
DROP POLICY IF EXISTS "Admins can delete company tokens" ON public.meli_tokens;

CREATE POLICY "Admins can delete company tokens"
ON public.meli_tokens
FOR DELETE
TO authenticated
USING (
  user_belongs_to_company(auth.uid(), company_id)
  AND has_membership_role(auth.uid(), company_id, 'admin'::app_role)
);

-- 3. Add admin-scoped policies on memberships for company admins
-- Allow company admins to manage memberships within their company
CREATE POLICY "Company admins can insert memberships"
ON public.memberships
FOR INSERT
TO authenticated
WITH CHECK (
  has_membership_role(auth.uid(), company_id, 'admin'::app_role)
);

CREATE POLICY "Company admins can update memberships"
ON public.memberships
FOR UPDATE
TO authenticated
USING (
  has_membership_role(auth.uid(), company_id, 'admin'::app_role)
);

CREATE POLICY "Company admins can delete memberships"
ON public.memberships
FOR DELETE
TO authenticated
USING (
  has_membership_role(auth.uid(), company_id, 'admin'::app_role)
);
