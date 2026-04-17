-- Ensure pg_cron + pg_net are available
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Drop any existing job and reschedule (idempotent)
do $$
declare j_id bigint;
begin
  for j_id in select jobid from cron.job where jobname = 'poll-telegram-updates' loop
    perform cron.unschedule(j_id);
  end loop;
end $$;

select cron.schedule(
  'poll-telegram-updates',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://sqdkkbawutwyfmnvfqqk.supabase.co/functions/v1/telegram-poll',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZGtrYmF3dXR3eWZtbnZmcXFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwODkxNTEsImV4cCI6MjA5MTY2NTE1MX0.yZU6aACZTNjM0pviByp_SIw1Xqeg96QqTpKInkF9u7A"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
