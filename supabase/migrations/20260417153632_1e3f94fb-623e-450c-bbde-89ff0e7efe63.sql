CREATE OR REPLACE FUNCTION public.get_company_analytics(
  _company_id uuid,
  _days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _since timestamptz := now() - (_days || ' days')::interval;
  _prev_since timestamptz := now() - ((_days * 2) || ' days')::interval;
  result jsonb;

  v_total integer;
  v_auto integer;
  v_human integer;
  v_pending integer;
  v_avg_confidence numeric;

  v_prev_total integer;
  v_prev_auto integer;

BEGIN
  IF NOT public.user_belongs_to_company(auth.uid(), _company_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT
    COUNT(*)::integer,
    COUNT(*) FILTER (WHERE answered_by_ai = true)::integer,
    COUNT(*) FILTER (WHERE requires_human = true)::integer,
    COUNT(*) FILTER (WHERE status = 'pending')::integer,
    ROUND(AVG(ai_confidence) FILTER (WHERE ai_confidence IS NOT NULL), 2)
  INTO v_total, v_auto, v_human, v_pending, v_avg_confidence
  FROM public.questions
  WHERE company_id = _company_id
    AND created_at >= _since;

  SELECT
    COUNT(*)::integer,
    COUNT(*) FILTER (WHERE answered_by_ai = true)::integer
  INTO v_prev_total, v_prev_auto
  FROM public.questions
  WHERE company_id = _company_id
    AND created_at >= _prev_since
    AND created_at < _since;

  SELECT jsonb_build_object(
    'total_questions', v_total,
    'auto_answered', v_auto,
    'human_escalated', v_human,
    'pending', v_pending,
    'avg_confidence', COALESCE(v_avg_confidence, 0),
    'auto_resolution_rate',
      CASE WHEN v_total > 0
        THEN ROUND((v_auto::numeric / v_total) * 100, 1)
        ELSE 0 END,
    'delta_total',
      CASE WHEN v_prev_total > 0
        THEN ROUND(((v_total - v_prev_total)::numeric / v_prev_total) * 100, 1)
        ELSE NULL END,
    'delta_auto_rate',
      CASE WHEN v_prev_total > 0 AND v_total > 0
        THEN ROUND(
          ((v_auto::numeric / v_total) - (v_prev_auto::numeric / NULLIF(v_prev_total,0))) * 100,
          1)
        ELSE NULL END,
    'daily_volume', (
      SELECT jsonb_agg(d ORDER BY (d->>'date'))
      FROM (
        SELECT jsonb_build_object(
          'date', day::date,
          'total', COUNT(q.id),
          'auto', COUNT(q.id) FILTER (WHERE q.answered_by_ai = true),
          'human', COUNT(q.id) FILTER (WHERE q.requires_human = true)
        ) AS d
        FROM generate_series(
          (now() - (_days || ' days')::interval)::date,
          now()::date,
          '1 day'::interval
        ) AS day
        LEFT JOIN public.questions q
          ON q.company_id = _company_id
          AND q.created_at::date = day::date
        GROUP BY day
      ) sub
    ),
    'by_category', (
      SELECT jsonb_agg(
        jsonb_build_object('category', ai_category, 'count', cnt)
        ORDER BY cnt DESC
      )
      FROM (
        SELECT ai_category, COUNT(*)::integer AS cnt
        FROM public.questions
        WHERE company_id = _company_id
          AND created_at >= _since
          AND ai_category IS NOT NULL
        GROUP BY ai_category
      ) cats
    ),
    'top_products', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'product_id', p.id,
          'title', p.title,
          'questions', cnt,
          'auto_rate', ROUND((auto_cnt::numeric / NULLIF(cnt,0)) * 100, 0)
        )
        ORDER BY cnt DESC
      )
      FROM (
        SELECT
          product_id,
          COUNT(*)::integer AS cnt,
          COUNT(*) FILTER (WHERE answered_by_ai = true)::integer AS auto_cnt
        FROM public.questions
        WHERE company_id = _company_id
          AND created_at >= _since
          AND product_id IS NOT NULL
        GROUP BY product_id
        ORDER BY cnt DESC
        LIMIT 5
      ) pq
      JOIN public.products p ON p.id = pq.product_id
    ),
    'top_buyers', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'buyer_nickname', COALESCE(buyer_nickname, buyer_id, 'Desconocido'),
          'questions', cnt
        )
        ORDER BY cnt DESC
      )
      FROM (
        SELECT buyer_nickname, buyer_id, COUNT(*)::integer AS cnt
        FROM public.questions
        WHERE company_id = _company_id
          AND created_at >= _since
        GROUP BY buyer_nickname, buyer_id
        ORDER BY cnt DESC
        LIMIT 5
      ) buyers
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_company_analytics(uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.get_company_analytics(uuid, integer) TO authenticated;