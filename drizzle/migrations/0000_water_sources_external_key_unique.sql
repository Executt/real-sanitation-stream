CREATE UNIQUE INDEX IF NOT EXISTS water_sources_external_key_uidx
  ON public.water_sources (external_key)
  WHERE external_key IS NOT NULL;