
-- 1. Create company_invites table
CREATE TABLE public.company_invites (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  invite_code text NOT NULL DEFAULT encode(extensions.gen_random_bytes(6), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Migrate existing invite codes
INSERT INTO public.company_invites (company_id, invite_code, created_at, updated_at)
SELECT id, invite_code, created_at, now()
FROM public.companies;

-- 3. Enable RLS
ALTER TABLE public.company_invites ENABLE ROW LEVEL SECURITY;

-- 4. RLS: only admin of company or super admin can SELECT
CREATE POLICY "Company admins can view invite codes"
  ON public.company_invites FOR SELECT TO authenticated
  USING (
    has_membership_role(auth.uid(), company_id, 'admin'::app_role)
    OR is_super_admin()
  );

-- No direct INSERT/UPDATE/DELETE — all through SECURITY DEFINER functions

-- 5. Update get_company_invite_code to read from new table
CREATE OR REPLACE FUNCTION public.get_company_invite_code(_company_id uuid)
  RETURNS text
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (
    has_membership_role(auth.uid(), _company_id, 'admin'::app_role)
    OR is_super_admin()
  ) THEN
    RETURN NULL;
  END IF;

  RETURN (
    SELECT invite_code FROM public.company_invites WHERE company_id = _company_id
  );
END;
$$;

-- 6. Create regenerate function
CREATE OR REPLACE FUNCTION public.regenerate_company_invite_code(_company_id uuid)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  _new_code text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (
    has_membership_role(auth.uid(), _company_id, 'admin'::app_role)
    OR is_super_admin()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  _new_code := encode(extensions.gen_random_bytes(6), 'hex');

  INSERT INTO public.company_invites (company_id, invite_code, updated_at)
  VALUES (_company_id, _new_code, now())
  ON CONFLICT (company_id) DO UPDATE SET invite_code = _new_code, updated_at = now();

  RETURN _new_code;
END;
$$;

-- 7. Update join_company_by_invite to use new table
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

  -- Look up invite code in company_invites
  SELECT ci.company_id INTO _company_id
  FROM public.company_invites ci
  WHERE ci.invite_code = _invite_code;

  IF _company_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Código de invitación inválido');
  END IF;

  SELECT name INTO _company_name FROM public.companies WHERE id = _company_id;

  IF EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('error', 'Ya sos miembro de esta empresa');
  END IF;

  _is_first_membership := NOT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user_id AND status = 'active'
  );

  INSERT INTO public.memberships (user_id, company_id, role, status, is_default)
  VALUES (_user_id, _company_id, 'agent', 'active', _is_first_membership);

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

-- 8. Update handle_new_user to create invite in new table for new companies
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  _company_name text;
  _invite_code text;
  _full_name text;
  _company_id uuid;
BEGIN
  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  _company_name := NEW.raw_user_meta_data->>'company_name';
  _invite_code := NEW.raw_user_meta_data->>'invite_code';

  IF _company_name IS NOT NULL AND _company_name <> '' THEN
    -- Create new company flow
    INSERT INTO public.companies (name)
    VALUES (_company_name)
    RETURNING id INTO _company_id;

    -- Create invite code in new table
    INSERT INTO public.company_invites (company_id)
    VALUES (_company_id);

    INSERT INTO public.profiles (id, full_name, company_id)
    VALUES (NEW.id, _full_name, _company_id);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');

    INSERT INTO public.memberships (user_id, company_id, role, status, is_default)
    VALUES (NEW.id, _company_id, 'admin', 'active', true);

  ELSIF _invite_code IS NOT NULL AND _invite_code <> '' THEN
    -- Join existing company flow (now using company_invites)
    SELECT ci.company_id INTO _company_id
    FROM public.company_invites ci
    WHERE ci.invite_code = _invite_code;

    IF _company_id IS NULL THEN
      INSERT INTO public.profiles (id, full_name)
      VALUES (NEW.id, _full_name);
    ELSE
      INSERT INTO public.profiles (id, full_name, company_id)
      VALUES (NEW.id, _full_name, _company_id);

      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'agent');

      INSERT INTO public.memberships (user_id, company_id, role, status, is_default)
      VALUES (NEW.id, _company_id, 'agent', 'active', true);
    END IF;

  ELSE
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, _full_name);
  END IF;

  RETURN NEW;
END;
$$;

-- 9. Auto-create invite when a company is created (for admin panel flow)
CREATE OR REPLACE FUNCTION public.auto_create_company_invite()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  INSERT INTO public.company_invites (company_id)
  VALUES (NEW.id)
  ON CONFLICT (company_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_company_invite
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_company_invite();
