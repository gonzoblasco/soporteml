CREATE OR REPLACE FUNCTION public.create_company_for_user(_company_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid;
  _company_id uuid;
  _existing_membership uuid;
  _full_name text;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  IF _company_name IS NULL OR length(trim(_company_name)) = 0 THEN
    RETURN jsonb_build_object('error', 'El nombre de empresa es obligatorio');
  END IF;

  SELECT id INTO _existing_membership
  FROM public.memberships
  WHERE user_id = _user_id AND status = 'active'
  LIMIT 1;

  IF _existing_membership IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Ya pertenecés a una empresa');
  END IF;

  INSERT INTO public.companies (name)
  VALUES (trim(_company_name))
  RETURNING id INTO _company_id;

  INSERT INTO public.company_invites (company_id)
  VALUES (_company_id)
  ON CONFLICT (company_id) DO NOTHING;

  SELECT COALESCE(raw_user_meta_data->>'full_name', email)
  INTO _full_name
  FROM auth.users
  WHERE id = _user_id;

  INSERT INTO public.profiles (id, full_name, company_id)
  VALUES (_user_id, _full_name, _company_id)
  ON CONFLICT (id) DO UPDATE SET company_id = _company_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.memberships (user_id, company_id, role, status, is_default)
  VALUES (_user_id, _company_id, 'admin', 'active', true);

  RETURN jsonb_build_object(
    'success', true,
    'company_id', _company_id,
    'company_name', trim(_company_name)
  );
END;
$$;