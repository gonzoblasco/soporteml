-- Function to get all users data for the super admin panel
-- Returns profiles joined with auth.users email and user_roles
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  company_id uuid,
  company_name text,
  role text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
  WHERE public.is_super_admin()
  ORDER BY p.created_at DESC
$$;