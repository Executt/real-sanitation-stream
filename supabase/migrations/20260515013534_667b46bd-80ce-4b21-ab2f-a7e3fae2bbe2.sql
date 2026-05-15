
CREATE TABLE public.dbo_medicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ete_id uuid NOT NULL,
  medido_em timestamptz NOT NULL DEFAULT now(),
  dbo_entrada_mg_l numeric NOT NULL,
  dbo_saida_mg_l numeric NOT NULL,
  eficiencia_pct numeric GENERATED ALWAYS AS (
    CASE WHEN dbo_entrada_mg_l > 0
         THEN ((dbo_entrada_mg_l - dbo_saida_mg_l) / dbo_entrada_mg_l) * 100
         ELSE NULL END
  ) STORED,
  conforme boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dbo_medicoes_ete_medido ON public.dbo_medicoes (ete_id, medido_em DESC);
CREATE INDEX idx_dbo_medicoes_medido ON public.dbo_medicoes (medido_em DESC);

ALTER TABLE public.dbo_medicoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view dbo_medicoes"
  ON public.dbo_medicoes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Operadores and superadmins can insert dbo_medicoes"
  ON public.dbo_medicoes FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'operador'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Operadores and superadmins can update dbo_medicoes"
  ON public.dbo_medicoes FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'operador'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'operador'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins can delete dbo_medicoes"
  ON public.dbo_medicoes FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE OR REPLACE FUNCTION public.set_conforme_dbo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_min numeric;
BEGIN
  SELECT dbo_min INTO v_min FROM public.system_parameters LIMIT 1;
  IF v_min IS NULL THEN v_min := 60; END IF;
  NEW.conforme := NEW.dbo_saida_mg_l <= v_min;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_conforme_dbo
BEFORE INSERT OR UPDATE ON public.dbo_medicoes
FOR EACH ROW EXECUTE FUNCTION public.set_conforme_dbo();
