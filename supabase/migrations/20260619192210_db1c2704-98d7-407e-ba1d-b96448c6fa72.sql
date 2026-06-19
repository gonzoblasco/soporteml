
alter table public.company_settings
  add column if not exists sla_alert_emails text[] not null default '{}';

alter table public.questions
  add column if not exists sla_alert_sent_at timestamptz;

create index if not exists idx_questions_sla_pending
  on public.questions (company_id, created_at)
  where status = 'pending' and answered_at is null and sla_alert_sent_at is null;

create or replace function public.reset_sla_alert_on_reopen()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.answered_at is not null and new.answered_at is null then
    new.sla_alert_sent_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reset_sla_alert on public.questions;
create trigger trg_reset_sla_alert
  before update on public.questions
  for each row
  execute function public.reset_sla_alert_on_reopen();

do $$
declare j record;
begin
  for j in select jobid from cron.job where jobname = 'sla-breach-notifier-5min' loop
    perform cron.unschedule(j.jobid);
  end loop;
end $$;

select cron.schedule(
  'sla-breach-notifier-5min',
  '*/5 * * * *',
  $cron$
  select net.http_post(
    url := 'https://ropbkdqhqdeiwrenrmjt.supabase.co/functions/v1/sla-breach-notifier',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1)
    ),
    body := '{"source": "cron"}'::jsonb
  ) as request_id;
  $cron$
);
