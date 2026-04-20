CREATE TABLE public.etes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concessionaria_id uuid REFERENCES public.concessionarias(id) ON DELETE SET NULL,
  nome text NOT NULL,
  codigo text UNIQUE,
  municipio text NOT NULL,
  uf text NOT NULL,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'em_construcao', 'inativa', 'manutencao')),
  tipo_tratamento text, -- preliminar, primario, secundario, terciario, lodos_ativados, UASB, etc.
  vazao_projeto_lps numeric(10, 2), -- vazão de projeto em L/s
  vazao_atual_lps numeric(10, 2),
  populacao_atendida bigint,
  data_inicio_operacao date,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_etes_concessionaria ON public.etes(concessionaria_id);
CREATE INDEX idx_etes_uf ON public.etes(uf);
CREATE INDEX idx_etes_municipio ON public.etes(municipio);
CREATE INDEX idx_etes_status ON public.etes(status);

ALTER TABLE public.etes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view etes"
  ON public.etes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Operadores and superadmins can insert etes"
  ON public.etes FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'operador'::app_role)
    OR has_role(auth.uid(), 'superadmin'::app_role)
  );

CREATE POLICY "Operadores and superadmins can update etes"
  ON public.etes FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'operador'::app_role)
    OR has_role(auth.uid(), 'superadmin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'operador'::app_role)
    OR has_role(auth.uid(), 'superadmin'::app_role)
  );

CREATE POLICY "Superadmins can delete etes"
  ON public.etes FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER trg_etes_updated_at
  BEFORE UPDATE ON public.etes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_etes_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.etes
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();