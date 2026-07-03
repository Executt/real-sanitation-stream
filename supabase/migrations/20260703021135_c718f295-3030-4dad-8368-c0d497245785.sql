
-- 1) Unique para upsert incremental do Atlas
CREATE UNIQUE INDEX IF NOT EXISTS atlas_indicadores_ibge_ano_uidx
  ON public.atlas_indicadores (ibge_code, ano_referencia)
  WHERE ibge_code IS NOT NULL;

-- Fallback quando não há ibge_code (agregação por UF)
CREATE UNIQUE INDEX IF NOT EXISTS atlas_indicadores_uf_ano_uidx
  ON public.atlas_indicadores (uf, ano_referencia)
  WHERE ibge_code IS NULL AND municipio IS NULL;

-- 2) Colunas para armazenar URLs de agendamento do Córtex
ALTER TABLE public.cron_config
  ADD COLUMN IF NOT EXISTS cortex_infer_url text,
  ADD COLUMN IF NOT EXISTS cortex_ingest_url text;

-- 3) Função para agendar cortex-infer diariamente
CREATE OR REPLACE FUNCTION public.schedule_cortex_infer(_function_url text, _anon_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'cortex-infer-daily';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;

  PERFORM cron.schedule(
    'cortex-infer-daily',
    '0 3 * * *', -- diariamente 03:00 UTC
    format($job$
      SELECT net.http_post(
        url := %L,
        headers := %L::jsonb,
        body := '{"source":"cron","limit":25,"horizonte_dias":30}'::jsonb
      );
    $job$, _function_url, json_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || _anon_key
    )::text)
  );
END;
$$;
