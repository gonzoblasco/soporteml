-- Secure RPC: returns MeLi connection status without exposing tokens
-- Uses SECURITY DEFINER to bypass RLS on meli_tokens internally
-- Validates auth.uid() explicitly + company membership

CREATE OR REPLACE FUNCTION public.get_meli_connection_status(_company_id uuid)
RETURNS TABLE(
  id uuid,
  company_id uuid,
  meli_user_id text,
  expires_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  has_refresh_token boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Explicit authentication check
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate caller belongs to the requested company
  IF NOT public.user_belongs_to_company(auth.uid(), _company_id) THEN
    RETURN; -- empty result, no error (silent tenant isolation)
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.company_id,
    t.meli_user_id,
    t.expires_at,
    t.created_at,
    t.updated_at,
    (t.refresh_token IS NOT NULL) AS has_refresh_token
  FROM public.meli_tokens t
  WHERE t.company_id = _company_id
  LIMIT 1;
END;
$$;

-- Strict execution permissions
REVOKE ALL ON FUNCTION public.get_meli_connection_status(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_meli_connection_status(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_meli_connection_status(uuid) TO authenticated;