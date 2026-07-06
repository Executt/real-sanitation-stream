
-- 1) Trigger reforçado do Falso Afluente
CREATE OR REPLACE FUNCTION public.enforce_falso_afluente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c jsonb;
  m jsonb;
  anos jsonb;
BEGIN
  IF NEW.status = 'prod' THEN
    IF NEW.causal_report_url IS NULL OR length(trim(NEW.causal_report_url)) = 0 THEN
      RAISE EXCEPTION 'FALSO_AFLUENTE: relatório causal (causal_report_url) é obrigatório para promover o modelo a produção.';
    END IF;

    c := COALESCE(NEW.falso_afluente_checklist, '{}'::jsonb);
    IF NOT (
      COALESCE((c->>'variaveis_fisicas')::bool,false)
      AND COALESCE((c->>'testado_anos_anomalos')::bool,false)
      AND COALESCE((c->>'normalizado_maturidade_dados')::bool,false)
      AND COALESCE((c->>'ablation_confusores')::bool,false)
      AND COALESCE((c->>'homologado_shadow')::bool,false)
    ) THEN
      RAISE EXCEPTION 'FALSO_AFLUENTE: todos os itens do checklist devem estar marcados como verdadeiros para promover o modelo a produção.';
    END IF;

    m := COALESCE(NEW.metricas, '{}'::jsonb);
    anos := m->'anos_anomalos';
    IF anos IS NULL
       OR jsonb_typeof(anos) <> 'object'
       OR (SELECT count(*) FROM jsonb_object_keys(anos)) = 0 THEN
      RAISE EXCEPTION 'FALSO_AFLUENTE: registre as métricas dos anos anômalos (metricas.anos_anomalos = { "2014": {...}, "2021": {...} }) antes de promover o modelo a produção.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 2) Políticas de escrita restritas a superadmin em cortex_modelos
DROP POLICY IF EXISTS "Autenticados gerenciam modelos" ON public.cortex_modelos;
DROP POLICY IF EXISTS "Superadmin gerencia modelos" ON public.cortex_modelos;

CREATE POLICY "Superadmin gerencia modelos"
  ON public.cortex_modelos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- 3) Índice para KPIs por bacia
CREATE INDEX IF NOT EXISTS idx_cortex_pred_bacia_criado
  ON public.cortex_predicoes(bacia, criado_em DESC);
