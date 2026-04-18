-- Extensões para cron e HTTP
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Função que agenda/reagenda o job de sincronização LDAP
CREATE OR REPLACE FUNCTION public.schedule_ldap_sync(_function_url text, _anon_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  v_interval int;
  v_schedule text;
  v_jobid bigint;
BEGIN
  SELECT sync_interval_minutes INTO v_interval FROM public.system_parameters LIMIT 1;
  IF v_interval IS NULL OR v_interval < 1 THEN
    v_interval := 15;
  END IF;

  -- Constrói expressão cron: a cada N minutos
  IF v_interval >= 60 THEN
    v_schedule := format('0 */%s * * *', GREATEST(1, v_interval / 60));
  ELSE
    v_schedule := format('*/%s * * * *', v_interval);
  END IF;

  -- Remove job anterior se existir
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'ldap-sync-cron';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;

  PERFORM cron.schedule(
    'ldap-sync-cron',
    v_schedule,
    format($job$
      SELECT net.http_post(
        url := %L,
        headers := %L::jsonb,
        body := '{"source":"cron"}'::jsonb
      );
    $job$, _function_url, json_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || _anon_key
    )::text)
  );
END;
$$;

-- Trigger: ao alterar sync_interval_minutes, reagenda automaticamente
-- (usa parâmetros guardados em GUC custom; setados no insert inicial)
CREATE OR REPLACE FUNCTION public.reschedule_ldap_sync_on_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_key text;
BEGIN
  IF NEW.sync_interval_minutes IS DISTINCT FROM OLD.sync_interval_minutes THEN
    BEGIN
      v_url := current_setting('app.ldap_sync_url', true);
      v_key := current_setting('app.ldap_sync_anon_key', true);
    EXCEPTION WHEN OTHERS THEN
      v_url := NULL;
    END;
    IF v_url IS NOT NULL AND v_key IS NOT NULL AND v_url <> '' THEN
      PERFORM public.schedule_ldap_sync(v_url, v_key);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reschedule_ldap_sync ON public.system_parameters;
CREATE TRIGGER reschedule_ldap_sync
AFTER UPDATE ON public.system_parameters
FOR EACH ROW EXECUTE FUNCTION public.reschedule_ldap_sync_on_change();