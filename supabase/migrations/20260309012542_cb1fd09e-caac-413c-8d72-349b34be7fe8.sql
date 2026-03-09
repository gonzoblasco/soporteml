-- Epic Multi-Company v2.0.0: Cierre Final — Admin Functions migradas a Memberships

-- ═══════════════════════════════════════════════════════════════════
-- get_admin_users(): Migrado a memberships
-- ═══════════════════════════════════════════════════════════════════
-- Se debe DROP primero porque se agrega columna "memberships" al return type

DROP FUNCTION IF EXISTS public.get_admin_users();

CREATE FUNCTION public.get_admin_users()
 RETURNS TABLE(
   user_id uuid, 
   email text, 
   full_name text, 
   memberships jsonb,
   company_id uuid, 
   company_name text, 
   role text, 
   created_at timestamp with time zone
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: super admin access required';
  END IF;

  RETURN QUERY
  SELECT
    p.id AS user_id,
    u.email::text,
    p.full_name,
    -- Array de companies como JSONB para usuarios multi-company
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'company_id', m.company_id,
          'company_name', c.name,
          'role', m.role,
          'is_default', m.is_default
        ) ORDER BY m.is_default DESC, m.created_at ASC
      ) FILTER (WHERE m.company_id IS NOT NULL),
      '[]'::jsonb
    ) AS memberships,
    -- Mantener company_id legacy (primera membership o profiles.company_id)
    COALESCE(
      (SELECT m2.company_id FROM public.memberships m2 
       WHERE m2.user_id = p.id AND m2.status = 'active' 
       ORDER BY m2.is_default DESC, m2.created_at ASC LIMIT 1),
      p.company_id
    ) AS company_id,
    -- Company name correspondiente al company_id legacy
    COALESCE(
      (SELECT c2.name FROM public.companies c2 
       WHERE c2.id = COALESCE(
         (SELECT m3.company_id FROM public.memberships m3 
          WHERE m3.user_id = p.id AND m3.status = 'active' 
          ORDER BY m3.is_default DESC, m3.created_at ASC LIMIT 1),
         p.company_id
       )),
      ''
    ) AS company_name,
    -- Rol legacy (primera membership o user_roles)
    COALESCE(
      (SELECT m4.role::text FROM public.memberships m4 
       WHERE m4.user_id = p.id AND m4.status = 'active' 
       ORDER BY m4.is_default DESC, m4.created_at ASC LIMIT 1),
      ur.role::text
    ) AS role,
    p.created_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  LEFT JOIN public.memberships m ON m.user_id = p.id AND m.status = 'active'
  LEFT JOIN public.companies c ON c.id = m.company_id
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  GROUP BY p.id, u.email, p.full_name, p.company_id, p.created_at, ur.role
  ORDER BY p.created_at DESC;
END;
$function$;

-- ═══════════════════════════════════════════════════════════════════
-- get_admin_company_metrics(): Migrado a memberships
-- ═══════════════════════════════════════════════════════════════════
-- Antes: member_count leía desde profiles.company_id
-- Ahora: cuenta usuarios DISTINCT desde memberships activas

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
   last_question_at timestamp with time zone
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  -- Nueva subquery: cuenta desde memberships (usuarios multi-company correctamente contados)
  LEFT JOIN (
    SELECT m.company_id, COUNT(DISTINCT m.user_id)::bigint AS cnt
    FROM public.memberships m 
    WHERE m.status = 'active'
    GROUP BY m.company_id
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
$function$;