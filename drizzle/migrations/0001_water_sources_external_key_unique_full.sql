DROP INDEX IF EXISTS public.water_sources_external_key_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS water_sources_external_key_uidx
  ON public.water_sources (external_key);