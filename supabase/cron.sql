-- Scheduled jobs, run entirely inside Postgres so they don't depend on Vercel's
-- cron limits. Run this ONCE after deploying, replacing the two placeholders.
--
--   APP_URL     e.g. https://jp-studio.vercel.app   (no trailing slash)
--   CRON_SECRET the value from your env
--
--   psql "$DIRECT_URL" -v app_url='https://…' -v cron_secret='…' -f supabase/cron.sql

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- helper: fire a cron endpoint
create or replace function public.jp_run_job(job text)
returns void language plpgsql security definer as $$
begin
  perform net.http_post(
    url := :'app_url' || '/api/cron/' || job,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || :'cron_secret',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
end;
$$;

select cron.unschedule(jobname) from cron.job
 where jobname in ('jp-publish-due','jp-refresh-tokens','jp-health-check','jp-prune');

select cron.schedule('jp-publish-due',   '* * * * *',      $$ select public.jp_run_job('publish-due') $$);
select cron.schedule('jp-refresh-tokens','0 * * * *',      $$ select public.jp_run_job('refresh-tokens') $$);
select cron.schedule('jp-health-check',  '0 */6 * * *',    $$ select public.jp_run_job('health-check') $$);
select cron.schedule('jp-prune',         '17 3 * * *',     $$ select public.jp_run_job('prune') $$);
