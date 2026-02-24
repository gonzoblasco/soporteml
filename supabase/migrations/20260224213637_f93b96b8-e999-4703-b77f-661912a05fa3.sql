-- Create security definer function to check super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND email = 'gonzoblasco@icloud.com'
  )
$$;

-- Drop old policies that reference auth.users directly
DROP POLICY IF EXISTS "Super admin can view all companies" ON public.companies;
DROP POLICY IF EXISTS "Super admin can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Super admin can delete inquiries" ON public.contact_inquiries;
DROP POLICY IF EXISTS "Super admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can view all meli_tokens" ON public.meli_tokens;

-- Recreate policies using the security definer function
CREATE POLICY "Super admin can view all companies"
  ON public.companies FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Super admin can insert companies"
  ON public.companies FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admin can delete inquiries"
  ON public.contact_inquiries FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Super admin can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Super admin can view all meli_tokens"
  ON public.meli_tokens FOR SELECT
  TO authenticated
  USING (public.is_super_admin());