
-- 1. Add SLA columns to company_settings
alter table public.company_settings
  add column if not exists sla_target_minutes integer not null default 60,
  add column if not exists sla_escalation_enabled boolean not null default true;

-- Guardrails for sane values
alter table public.company_settings
  drop constraint if exists company_settings_sla_target_minutes_check;
alter table public.company_settings
  add constraint company_settings_sla_target_minutes_check
  check (sla_target_minutes between 5 and 1440);

-- 2. Extend get_company_analytics with SLA compliance
create or replace function public.get_company_analytics(_company_id uuid, _days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
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

  v_sla_target int;
  v_sla_answered_in_target int;
  v_sla_answered_total int;
  v_sla_pending_breached int;
begin
  if not public.user_belongs_to_company(auth.uid(), _company_id) then
    raise exception 'Unauthorized';
  end if;

  select coalesce(sla_target_minutes, 60) into v_sla_target
    from public.company_settings where company_id = _company_id;
  if v_sla_target is null then v_sla_target := 60; end if;

  select
    count(*)::integer,
    count(*) filter (where answered_by_ai = true)::integer,
    count(*) filter (where requires_human = true)::integer,
    count(*) filter (where status = 'pending')::integer,
    round(avg(ai_confidence) filter (where ai_confidence is not null), 2)
  into v_total, v_auto, v_human, v_pending, v_avg_confidence
  from public.questions
  where company_id = _company_id
    and created_at >= _since;

  select
    count(*)::integer,
    count(*)::integer
  into v_sla_answered_in_target, v_sla_answered_total
  from public.questions
  where company_id = _company_id
    and created_at >= _since
    and answered_at is not null;

  -- recompute v_sla_answered_in_target with predicate
  select count(*)::integer
  into v_sla_answered_in_target
  from public.questions
  where company_id = _company_id
    and created_at >= _since
    and answered_at is not null
    and extract(epoch from (answered_at - created_at)) / 60 <= v_sla_target;

  -- pending questions already past target
  select count(*)::integer
  into v_sla_pending_breached
  from public.questions
  where company_id = _company_id
    and status = 'pending'
    and answered_at is null
    and extract(epoch from (now() - created_at)) / 60 > v_sla_target;

  select
    count(*)::integer,
    count(*) filter (where answered_by_ai = true)::integer
  into v_prev_total, v_prev_auto
  from public.questions
  where company_id = _company_id
    and created_at >= _prev_since
    and created_at < _since;

  select jsonb_build_object(
    'total_questions', v_total,
    'auto_answered', v_auto,
    'human_escalated', v_human,
    'pending', v_pending,
    'avg_confidence', coalesce(v_avg_confidence, 0),
    'auto_resolution_rate',
      case when v_total > 0
        then round((v_auto::numeric / v_total) * 100, 1)
        else 0 end,
    'sla_target_minutes', v_sla_target,
    'sla_answered_total', v_sla_answered_total,
    'sla_answered_in_target', v_sla_answered_in_target,
    'sla_compliance_pct',
      case when v_sla_answered_total > 0
        then round((v_sla_answered_in_target::numeric / v_sla_answered_total) * 100, 1)
        else null end,
    'sla_pending_breached', v_sla_pending_breached,
    'delta_total',
      case when v_prev_total > 0
        then round(((v_total - v_prev_total)::numeric / v_prev_total) * 100, 1)
        else null end,
    'delta_auto_rate',
      case when v_prev_total > 0 and v_total > 0
        then round(
          ((v_auto::numeric / v_total) - (v_prev_auto::numeric / nullif(v_prev_total,0))) * 100,
          1)
        else null end,
    'daily_volume', (
      select jsonb_agg(d order by (d->>'date'))
      from (
        select jsonb_build_object(
          'date', day::date,
          'total', count(q.id),
          'auto', count(q.id) filter (where q.answered_by_ai = true),
          'human', count(q.id) filter (where q.requires_human = true)
        ) as d
        from generate_series(
          (now() - (_days || ' days')::interval)::date,
          now()::date,
          '1 day'::interval
        ) as day
        left join public.questions q
          on q.company_id = _company_id
          and q.created_at::date = day::date
        group by day
      ) sub
    ),
    'by_category', (
      select jsonb_agg(
        jsonb_build_object('category', ai_category, 'count', cnt)
        order by cnt desc
      )
      from (
        select ai_category, count(*)::integer as cnt
        from public.questions
        where company_id = _company_id
          and created_at >= _since
          and ai_category is not null
        group by ai_category
      ) cats
    ),
    'top_products', (
      select jsonb_agg(
        jsonb_build_object(
          'product_id', p.id,
          'title', p.title,
          'questions', cnt,
          'auto_rate', round((auto_cnt::numeric / nullif(cnt,0)) * 100, 0)
        )
        order by cnt desc
      )
      from (
        select
          product_id,
          count(*)::integer as cnt,
          count(*) filter (where answered_by_ai = true)::integer as auto_cnt
        from public.questions
        where company_id = _company_id
          and created_at >= _since
          and product_id is not null
        group by product_id
        order by count(*) desc
        limit 5
      ) pq
      join public.products p on p.id = pq.product_id
    ),
    'top_buyers', (
      select jsonb_agg(
        jsonb_build_object(
          'buyer_nickname', coalesce(buyer_nickname, buyer_id, 'Desconocido'),
          'questions', cnt
        )
        order by cnt desc
      )
      from (
        select buyer_nickname, buyer_id, count(*)::integer as cnt
        from public.questions
        where company_id = _company_id
          and created_at >= _since
        group by buyer_nickname, buyer_id
        order by count(*) desc
        limit 5
      ) buyers
    )
  ) into result;

  return result;
end;
$$;
