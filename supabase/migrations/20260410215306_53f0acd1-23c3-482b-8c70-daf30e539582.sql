
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
    SELECT invite_code FROM public.companies WHERE id = _company_id
  );
END;
$$;
