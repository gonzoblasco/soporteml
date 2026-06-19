
-- 1. Create cron secret in vault if not present
do $$
declare
  v_secret text;
  v_exists boolean;
begin
  select exists(select 1 from vault.secrets where name = 'cron_secret') into v_exists;
  if not v_exists then
    v_secret := encode(extensions.gen_random_bytes(32), 'hex');
    perform vault.create_secret(v_secret, 'cron_secret', 'Authentication token for internal cron and webhook -> edge function calls');
  end if;
end $$;

-- 2. SECURITY DEFINER RPC to expose secret only to service_role
create or replace function public.get_cron_secret()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1;
$$;

revoke execute on function public.get_cron_secret() from public;
revoke execute on function public.get_cron_secret() from anon;
revoke execute on function public.get_cron_secret() from authenticated;
grant execute on function public.get_cron_secret() to service_role;

-- 3. Reschedule the hourly cron job to use the vault secret as X-Cron-Secret header
do $$
declare
  j record;
begin
  for j in select jobid from cron.job where jobname in ('sync-meli-questions-hourly-backup', 'sync-meli-questions-every-5min') loop
    perform cron.unschedule(j.jobid);
  end loop;
end $$;

select cron.schedule(
  'sync-meli-questions-hourly-backup',
  '0 * * * *',
  $cron$
  select net.http_post(
    url := 'https://ropbkdqhqdeiwrenrmjt.supabase.co/functions/v1/sync-meli-questions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1)
    ),
    body := '{"source": "cron"}'::jsonb
  ) as request_id;
  $cron$
);
