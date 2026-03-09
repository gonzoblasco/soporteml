
-- Hito 5: Multi-company — Admin & Invite Adaptations

-- 1. Function to get members of a company (for TeamSection and AdminPanel)
CREATE OR REPLACE FUNCTION public.get_company_members(_company_id uuid)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  role app_role,
  status text,
  joined_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_membership_role(auth.uid(), _company_id, 'admin') OR
    public.is_super_admin()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    m.user_id,
    COALESCE(p.full_name, '') AS full_name,
    m.role,
    m.status,
    m.created_at AS joined_at
  FROM public.memberships m
  LEFT JOIN public.profiles p ON p.id = m.user_id
  WHERE m.company_id = _company_id
    AND m.status = 'active'
  ORDER BY m.created_at ASC;
END;
$$;

-- 2. Function for existing authenticated users to join a company via invite code
CREATE OR REPLACE FUNCTION public.join_company_by_invite(_invite_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company_id uuid;
  _user_id uuid;
  _company_name text;
  _is_first_membership boolean;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  SELECT id, name INTO _company_id, _company_name
  FROM public.companies
  WHERE invite_code = _invite_code;

  IF _company_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Código de invitación inválido');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('error', 'Ya sos miembro de esta empresa');
  END IF;

  -- Determine if this is the first membership for the user
  _is_first_membership := NOT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user_id AND status = 'active'
  );

  INSERT INTO public.memberships (user_id, company_id, role, status, is_default)
  VALUES (_user_id, _company_id, 'agent', 'active', _is_first_membership);

  -- Update profiles.company_id only if user had no company before (backward compat)
  IF _is_first_membership THEN
    UPDATE public.profiles
    SET company_id = _company_id
    WHERE id = _user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'company_id', _company_id,
    'company_name', _company_name
  );
END;
$$;

-- 3. Function for super admin to add a membership for any user
CREATE OR REPLACE FUNCTION public.add_company_membership(
  _user_id uuid,
  _company_id uuid,
  _role app_role DEFAULT 'agent'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_first_membership boolean;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: super admin access required';
  END IF;

  _is_first_membership := NOT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user_id AND status = 'active'
  );

  IF EXISTS (SELECT 1 FROM public.memberships WHERE user_id = _user_id AND company_id = _company_id) THEN
    UPDATE public.memberships
    SET role = _role, status = 'active', updated_at = now()
    WHERE user_id = _user_id AND company_id = _company_id;
  ELSE
    INSERT INTO public.memberships (user_id, company_id, role, status, is_default)
    VALUES (_user_id, _company_id, _role, 'active', _is_first_membership);
  END IF;

  -- Update profiles.company_id if user had no company before (backward compat)
  IF _is_first_membership THEN
    UPDATE public.profiles SET company_id = _company_id WHERE id = _user_id;
  END IF;
END;
$$;

-- 4. Function to remove a membership (admin of company or super admin)
CREATE OR REPLACE FUNCTION public.remove_company_membership(
  _user_id uuid,
  _company_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_membership_role(auth.uid(), _company_id, 'admin') OR
    public.is_super_admin()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM public.memberships
  WHERE user_id = _user_id AND company_id = _company_id;
END;
$$;

-- 5. Function to update a membership role (admin of company or super admin)
CREATE OR REPLACE FUNCTION public.update_membership_role(
  _user_id uuid,
  _company_id uuid,
  _new_role app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_membership_role(auth.uid(), _company_id, 'admin') OR
    public.is_super_admin()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.memberships
  SET role = _new_role, updated_at = now()
  WHERE user_id = _user_id AND company_id = _company_id;
END;
$$;
