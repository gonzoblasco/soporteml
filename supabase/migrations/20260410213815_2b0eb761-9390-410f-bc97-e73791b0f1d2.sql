
-- Drop existing INSERT/UPDATE policies for company admins
DROP POLICY "Company admins can insert memberships" ON public.memberships;
DROP POLICY "Company admins can update memberships" ON public.memberships;

-- Recreate INSERT: company admin can only add 'agent' role members
CREATE POLICY "Company admins can insert memberships"
  ON public.memberships FOR INSERT TO authenticated
  WITH CHECK (
    has_membership_role(auth.uid(), company_id, 'admin'::app_role)
    AND role = 'agent'::app_role
  );

-- Recreate UPDATE: company admin can only set role to 'agent'
CREATE POLICY "Company admins can update memberships"
  ON public.memberships FOR UPDATE TO authenticated
  USING (
    has_membership_role(auth.uid(), company_id, 'admin'::app_role)
  )
  WITH CHECK (
    has_membership_role(auth.uid(), company_id, 'admin'::app_role)
    AND role = 'agent'::app_role
  );
