
CREATE OR REPLACE FUNCTION public.get_admin_company_metrics()
RETURNS TABLE(
  company_id uuid,
  company_name text,
  member_count bigint,
  total_questions bigint,
  pending_questions bigint,
  auto_answered bigint,
  human_answered bigint,
  total_products bigint,
  has_meli boolean,
  last_question_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: super admin access required';
  END IF;

  RETURN QUERY
  SELECT
    c.id AS company_id,
    c.name AS company_name,
    COALESCE(pm.cnt, 0) AS member_count,
    COALESCE(qm.total, 0) AS total_questions,
    COALESCE(qm.pending, 0) AS pending_questions,
    COALESCE(qm.auto_ans, 0) AS auto_answered,
    COALESCE(qm.human_ans, 0) AS human_answered,
    COALESCE(pr.cnt, 0) AS total_products,
    EXISTS(SELECT 1 FROM public.meli_tokens mt WHERE mt.company_id = c.id) AS has_meli,
    qm.last_q AS last_question_at
  FROM public.companies c
  LEFT JOIN (
    SELECT p.company_id, COUNT(*)::bigint AS cnt
    FROM public.profiles p WHERE p.company_id IS NOT NULL
    GROUP BY p.company_id
  ) pm ON pm.company_id = c.id
  LEFT JOIN (
    SELECT
      q.company_id,
      COUNT(*)::bigint AS total,
      COUNT(*) FILTER (WHERE q.status = 'pending')::bigint AS pending,
      COUNT(*) FILTER (WHERE q.answered_by_ai = true)::bigint AS auto_ans,
      COUNT(*) FILTER (WHERE q.answered_by_ai = false AND q.final_answer IS NOT NULL)::bigint AS human_ans,
      MAX(q.created_at) AS last_q
    FROM public.questions q
    GROUP BY q.company_id
  ) qm ON qm.company_id = c.id
  LEFT JOIN (
    SELECT pr2.company_id, COUNT(*)::bigint AS cnt
    FROM public.products pr2 WHERE pr2.status = 'active'
    GROUP BY pr2.company_id
  ) pr ON pr.company_id = c.id
  ORDER BY COALESCE(qm.total, 0) DESC;
END;
$$;
