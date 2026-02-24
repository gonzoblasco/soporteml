-- Allow super admin to delete companies
CREATE POLICY "Super admin can delete companies"
  ON public.companies FOR DELETE
  TO authenticated
  USING (public.is_super_admin());