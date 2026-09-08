CREATE TABLE IF NOT EXISTS public.ufs (
  sigla text PRIMARY KEY,
  nome text NOT NULL,
  codigo_ibge integer,
  regiao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ufs TO authenticated;
GRANT ALL ON public.ufs TO service_role;
ALTER TABLE public.ufs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ufs_select_auth" ON public.ufs FOR SELECT TO authenticated USING (true);
CREATE POLICY "ufs_admin_all" ON public.ufs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'gestor_ana'))
  WITH CHECK (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'gestor_ana'));

CREATE TABLE IF NOT EXISTS public.municipios (
  codigo_ibge text PRIMARY KEY,
  nome text NOT NULL,
  uf text NOT NULL REFERENCES public.ufs(sigla) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_municipios_uf ON public.municipios(uf);
CREATE INDEX IF NOT EXISTS idx_municipios_nome ON public.municipios(nome);
GRANT SELECT ON public.municipios TO authenticated;
GRANT ALL ON public.municipios TO service_role;
ALTER TABLE public.municipios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "municipios_select_auth" ON public.municipios FOR SELECT TO authenticated USING (true);
CREATE POLICY "municipios_admin_all" ON public.municipios FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'gestor_ana'))
  WITH CHECK (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'gestor_ana'));

CREATE TRIGGER trg_ufs_updated BEFORE UPDATE ON public.ufs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_municipios_updated BEFORE UPDATE ON public.municipios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.water_sources ADD COLUMN IF NOT EXISTS external_key text;
ALTER TABLE public.water_sources ADD COLUMN IF NOT EXISTS fonte text;
ALTER TABLE public.water_sources ADD COLUMN IF NOT EXISTS import_batch_id uuid;
ALTER TABLE public.water_sources ALTER COLUMN org_id DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_water_sources_external_key ON public.water_sources(external_key) WHERE external_key IS NOT NULL;