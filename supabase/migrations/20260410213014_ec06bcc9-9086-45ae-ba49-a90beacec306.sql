
-- 1. Create super_admins table
CREATE TABLE public.super_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- 2. Seed current super admin
INSERT INTO public.super_admins (user_id)
SELECT id FROM auth.users WHERE email = 'gonzoblasco@icloud.com'
ON CONFLICT DO NOTHING;

-- 3. Rewrite is_super_admin() to use the table
CREATE OR REPLACE FUNCTION public.is_super_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE user_id = auth.uid()
  )
$$;

-- 4. RLS: only super admins can read/manage this table
CREATE POLICY "Super admins can view" ON public.super_admins
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Super admins can insert" ON public.super_admins
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can delete" ON public.super_admins
  FOR DELETE TO authenticated
  USING (public.is_super_admin());
