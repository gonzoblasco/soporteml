
-- Drop the recursive/insecure policy
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Replace with super-admin-only policy for ALL operations
CREATE POLICY "Super admin can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());
