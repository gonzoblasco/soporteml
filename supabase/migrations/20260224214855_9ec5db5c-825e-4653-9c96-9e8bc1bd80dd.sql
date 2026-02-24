-- Allow super admin to update any profile (needed for reassigning users to companies)
CREATE POLICY "Super admin can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_super_admin());