
do $$
declare j record;
begin
  for j in select jobid from cron.job where jobname = 'sla-breach-notifier-5min' loop
    perform cron.unschedule(j.jobid);
  end loop;
  for j in select jobid from cron.job where jobname = 'sla-breach-notifier-15min' loop
    perform cron.unschedule(j.jobid);
  end loop;
end $$;

select cron.schedule(
  'sla-breach-notifier-15min',
  '*/15 * * * *',
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
