DROP POLICY "Company admins can update memberships" ON public.memberships;

CREATE POLICY "Company admins can update memberships"
ON public.memberships
FOR UPDATE
TO authenticated
USING (
  has_membership_role(auth.uid(), company_id, 'admin'::app_role)
  AND role = 'agent'::app_role
)
WITH CHECK (
  has_membership_role(auth.uid(), company_id, 'admin'::app_role)
  AND role = 'agent'::app_role
);