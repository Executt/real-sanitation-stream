
-- =========================================================
-- 1) ATLAS INDICADORES (dados públicos do Atlas Esgotos)
-- =========================================================
CREATE TABLE public.atlas_indicadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bacia text,
  uf text,
  municipio text,
  ibge_code text,
  carga_dbo_kg_dia numeric,
  cobertura_coleta_pct numeric,
  cobertura_tratamento_pct numeric,
  rios_comprometidos_km numeric,
  populacao_urbana int,
  fonte text NOT NULL DEFAULT 'ANA/Atlas Esgotos',
  ano_referencia int,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.atlas_indicadores TO authenticated;
GRANT ALL ON public.atlas_indicadores TO service_role;

ALTER TABLE public.atlas_indicadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Atlas: leitura autenticada"
  ON public.atlas_indicadores FOR SELECT TO authenticated USING (true);

CREATE POLICY "Atlas: escrita superadmin"
  ON public.atlas_indicadores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE INDEX idx_atlas_bacia ON public.atlas_indicadores(bacia);
CREATE INDEX idx_atlas_uf_mun ON public.atlas_indicadores(uf, municipio);

CREATE TRIGGER trg_atlas_updated
  BEFORE UPDATE ON public.atlas_indicadores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 2) CORTEX_MODELOS (catálogo de modelos IA)
-- =========================================================
CREATE TABLE public.cortex_modelos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  versao text NOT NULL,
  tipo text NOT NULL,                        -- previsao_dbo | risco_bacia | anomalia | priorizacao
  descricao text,
  status text NOT NULL DEFAULT 'shadow',     -- shadow | prod | arquivado
  provider_model text NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  metricas jsonb NOT NULL DEFAULT '{}'::jsonb,
  causal_report_url text,
  falso_afluente_checklist jsonb NOT NULL DEFAULT jsonb_build_object(
    'variaveis_fisicas', false,
    'testado_anos_anomalos', false,
    'normalizado_maturidade_dados', false,
    'ablation_confusores', false,
    'homologado_shadow', false
  ),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (nome, versao)
);

GRANT SELECT ON public.cortex_modelos TO authenticated;
GRANT ALL ON public.cortex_modelos TO service_role;

ALTER TABLE public.cortex_modelos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Modelos: leitura autenticada"
  ON public.cortex_modelos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Modelos: escrita superadmin"
  ON public.cortex_modelos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE TRIGGER trg_cortex_modelos_updated
  BEFORE UPDATE ON public.cortex_modelos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: bloqueia promoção a 'prod' sem os requisitos da Regra do Falso Afluente
CREATE OR REPLACE FUNCTION public.enforce_falso_afluente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c jsonb;
BEGIN
  IF NEW.status = 'prod' THEN
    IF NEW.causal_report_url IS NULL OR length(NEW.causal_report_url) = 0 THEN
      RAISE EXCEPTION 'Falso Afluente: causal_report_url obrigatório para promover a prod';
    END IF;
    c := NEW.falso_afluente_checklist;
    IF NOT (
      COALESCE((c->>'variaveis_fisicas')::bool,false)
      AND COALESCE((c->>'testado_anos_anomalos')::bool,false)
      AND COALESCE((c->>'normalizado_maturidade_dados')::bool,false)
      AND COALESCE((c->>'ablation_confusores')::bool,false)
      AND COALESCE((c->>'homologado_shadow')::bool,false)
    ) THEN
      RAISE EXCEPTION 'Falso Afluente: todos os itens do checklist devem ser true para promover a prod';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cortex_modelos_falso_afluente
  BEFORE INSERT OR UPDATE ON public.cortex_modelos
  FOR EACH ROW EXECUTE FUNCTION public.enforce_falso_afluente();

-- Auditoria automática
CREATE TRIGGER trg_cortex_modelos_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.cortex_modelos
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- =========================================================
-- 3) CORTEX_PREDICOES
-- =========================================================
CREATE TABLE public.cortex_predicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id uuid NOT NULL REFERENCES public.cortex_modelos(id) ON DELETE CASCADE,
  escopo text NOT NULL,                       -- ete | concessionaria | agencia | bacia
  ete_id uuid REFERENCES public.etes(id) ON DELETE CASCADE,
  concessionaria_id uuid REFERENCES public.concessionarias(id) ON DELETE CASCADE,
  agencia_reguladora_id uuid REFERENCES public.agencias_reguladoras(id) ON DELETE CASCADE,
  bacia text,
  horizonte_dias int,
  metrica text NOT NULL,                      -- dbo_saida_mg_l | risco_nao_conformidade | anomalia_score | prioridade_investimento
  valor numeric,
  confianca numeric,
  classificacao text,                         -- baixo | medio | alto | critico
  features_hash text,
  features jsonb,
  explicacao text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cortex_predicoes TO authenticated;
GRANT ALL ON public.cortex_predicoes TO service_role;

ALTER TABLE public.cortex_predicoes ENABLE ROW LEVEL SECURITY;

-- Leitura respeita escopo do usuário (mesma lógica já usada em etes/dbo_medicoes)
CREATE POLICY "Predicoes: superadmin/gestor_ana leem tudo"
  ON public.cortex_predicoes FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'superadmin')
    OR public.has_role(auth.uid(),'gestor_ana')
  );

CREATE POLICY "Predicoes: gestor_ar lê sua jurisdição"
  ON public.cortex_predicoes FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'gestor_ar')
    AND (
      agencia_reguladora_id = public.current_user_agencia()
      OR concessionaria_id IN (
        SELECT id FROM public.concessionarias
        WHERE agencia_reguladora_id = public.current_user_agencia()
      )
      OR ete_id IN (
        SELECT e.id FROM public.etes e
        JOIN public.concessionarias c ON c.id = e.concessionaria_id
        WHERE c.agencia_reguladora_id = public.current_user_agencia()
      )
    )
  );

CREATE POLICY "Predicoes: operador lê sua concessionária"
  ON public.cortex_predicoes FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'operador')
    AND (
      concessionaria_id = public.current_user_concessionaria()
      OR ete_id IN (
        SELECT id FROM public.etes WHERE concessionaria_id = public.current_user_concessionaria()
      )
    )
  );

-- Escrita: somente service_role (edge functions). Nada para authenticated.
CREATE INDEX idx_cortex_pred_modelo ON public.cortex_predicoes(modelo_id);
CREATE INDEX idx_cortex_pred_ete ON public.cortex_predicoes(ete_id);
CREATE INDEX idx_cortex_pred_criado ON public.cortex_predicoes(criado_em DESC);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.cortex_predicoes;
