-- Tabela de Concessionárias e Agências Reguladoras de Saneamento
CREATE TABLE public.concessionarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  sigla text,
  tipo text NOT NULL CHECK (tipo IN ('concessionaria', 'agencia_reguladora')),
  natureza text, -- estatal, privada, mista, autarquia, etc.
  cnpj text,
  uf text NOT NULL,
  abrangencia text, -- estadual, municipal, regional, federal
  municipios_atendidos integer,
  populacao_atendida bigint,
  site text,
  email_contato text,
  telefone text,
  endereco text,
  ativa boolean NOT NULL DEFAULT true,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_concessionarias_uf ON public.concessionarias(uf);
CREATE INDEX idx_concessionarias_tipo ON public.concessionarias(tipo);
CREATE UNIQUE INDEX idx_concessionarias_cnpj ON public.concessionarias(cnpj) WHERE cnpj IS NOT NULL;

ALTER TABLE public.concessionarias ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer autenticado
CREATE POLICY "Authenticated can view concessionarias"
  ON public.concessionarias FOR SELECT
  TO authenticated
  USING (true);

-- Escrita: apenas superadmin
CREATE POLICY "Superadmins manage concessionarias"
  ON public.concessionarias FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Trigger updated_at
CREATE TRIGGER trg_concessionarias_updated_at
  BEFORE UPDATE ON public.concessionarias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger de auditoria (reaproveita log_audit_event)
CREATE TRIGGER trg_concessionarias_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.concessionarias
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();