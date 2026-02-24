
-- Policy para que el super admin pueda ver TODAS las companies
CREATE POLICY "Super admin can view all companies"
  ON public.companies FOR SELECT
  TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'gonzoblasco@icloud.com'
  );

-- Policy para que el super admin pueda insertar companies
CREATE POLICY "Super admin can insert companies"
  ON public.companies FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'gonzoblasco@icloud.com'
  );

-- Policy para que el super admin pueda eliminar consultas procesadas
CREATE POLICY "Super admin can delete inquiries"
  ON public.contact_inquiries FOR DELETE
  TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'gonzoblasco@icloud.com'
  );
