-- Allow super admin to view all profiles (needed for member counts in admin panel)
CREATE POLICY "Super admin can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'gonzoblasco@icloud.com'
  );

-- Allow super admin to view all meli_tokens (needed for connection status in admin panel)
CREATE POLICY "Super admin can view all meli_tokens"
  ON public.meli_tokens FOR SELECT
  TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'gonzoblasco@icloud.com'
  );