CREATE TABLE public.ish_indicadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ibge_code text NOT NULL,
  municipio text NOT NULL,
  uf text,
  regiao text,
  populacao_urbana integer,
  classificacao_manancial text,
  classificacao_sistema_produtor text,
  eficiencia_producao text,
  perdas text,
  perdas_preenchido text,
  cobertura numeric,
  cobertura_preenchido numeric,
  eficiencia_distribuicao text,
  ish_u text,
  ano_referencia integer NOT NULL DEFAULT 2021,
  fonte text,
  import_batch_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ish_indicadores_unico UNIQUE (ibge_code, ano_referencia)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ish_indicadores TO authenticated;
GRANT ALL ON public.ish_indicadores TO service_role;

ALTER TABLE public.ish_indicadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY ish_select ON public.ish_indicadores FOR SELECT TO authenticated USING (true);
CREATE POLICY ish_insert ON public.ish_indicadores FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'superadmin') OR has_role(auth.uid(), 'gestor_ana'));
CREATE POLICY ish_update ON public.ish_indicadores FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'superadmin') OR has_role(auth.uid(), 'gestor_ana'))
  WITH CHECK (has_role(auth.uid(), 'superadmin') OR has_role(auth.uid(), 'gestor_ana'));
CREATE POLICY ish_delete ON public.ish_indicadores FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'superadmin') OR has_role(auth.uid(), 'gestor_ana'));

CREATE INDEX idx_ish_uf ON public.ish_indicadores (uf);
CREATE INDEX idx_ish_municipio ON public.ish_indicadores (municipio);

CREATE TRIGGER trg_ish_updated_at BEFORE UPDATE ON public.ish_indicadores
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();