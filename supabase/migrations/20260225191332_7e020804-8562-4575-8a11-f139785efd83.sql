
-- 1. Remove admin SELECT policy on raw meli_tokens (fixes meli_tokens_view_leakage)
DROP POLICY IF EXISTS "Admins can view company tokens" ON public.meli_tokens;

-- 2. Fix get_admin_users() to raise exception on unauthorized access
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE(user_id uuid, email text, full_name text, company_id uuid, company_name text, role text, created_at timestamp with time zone)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: super admin access required';
  END IF;

  RETURN QUERY
  SELECT
    p.id AS user_id,
    u.email::text,
    p.full_name,
    p.company_id,
    c.name AS company_name,
    ur.role::text,
    p.created_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  LEFT JOIN public.companies c ON c.id = p.company_id
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  ORDER BY p.created_at DESC;
END;
$$;
