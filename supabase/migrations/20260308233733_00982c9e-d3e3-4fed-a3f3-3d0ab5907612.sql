-- 1. Create memberships table
CREATE TABLE public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'agent',
  status text NOT NULL DEFAULT 'active',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- 2. Create validation function for membership status
CREATE OR REPLACE FUNCTION public.validate_membership_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'invited', 'disabled') THEN
    RAISE EXCEPTION 'Invalid membership status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Attach status validation trigger
CREATE TRIGGER validate_membership_status_trigger
  BEFORE INSERT OR UPDATE ON public.memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_membership_status();

-- 4. Attach updated_at trigger
CREATE TRIGGER update_memberships_updated_at
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Create partial unique index for is_default
CREATE UNIQUE INDEX idx_memberships_one_default_per_user 
  ON public.memberships (user_id) WHERE is_default = true;

-- 6. Enable RLS
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
-- Users can view their own memberships
CREATE POLICY "Users can view own memberships"
  ON public.memberships
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Super admin can view all memberships
CREATE POLICY "Super admin can view all memberships"
  ON public.memberships
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

-- Super admin can insert memberships
CREATE POLICY "Super admin can insert memberships"
  ON public.memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

-- Super admin can update memberships
CREATE POLICY "Super admin can update memberships"
  ON public.memberships
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin());

-- Super admin can delete memberships
CREATE POLICY "Super admin can delete memberships"
  ON public.memberships
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- 8. Migrate existing data from profiles + user_roles
INSERT INTO public.memberships (user_id, company_id, role, status, is_default)
SELECT 
  p.id,
  p.company_id,
  COALESCE(ur.role, 'agent'),
  'active',
  true
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
WHERE p.company_id IS NOT NULL;

-- 9. Helper function: get active companies for a user
CREATE OR REPLACE FUNCTION public.get_user_active_companies(_user_id uuid)
RETURNS TABLE(company_id uuid, role app_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.company_id, m.role
  FROM public.memberships m
  WHERE m.user_id = _user_id
    AND m.status = 'active'
  ORDER BY m.is_default DESC, m.created_at ASC
$$;

-- 10. Helper function: get default company for a user
CREATE OR REPLACE FUNCTION public.get_user_default_company(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT m.company_id FROM public.memberships m 
     WHERE m.user_id = _user_id AND m.status = 'active' AND m.is_default = true 
     LIMIT 1),
    (SELECT m.company_id FROM public.memberships m 
     WHERE m.user_id = _user_id AND m.status = 'active' 
     ORDER BY m.created_at ASC LIMIT 1)
  )
$$;

-- 11. Helper function: check if user belongs to company
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = _user_id
      AND m.company_id = _company_id
      AND m.status = 'active'
  )
$$;