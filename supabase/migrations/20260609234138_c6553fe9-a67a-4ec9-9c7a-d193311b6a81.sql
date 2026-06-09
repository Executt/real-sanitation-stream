
-- 1. Tabela de Agências Reguladoras
CREATE TABLE public.agencias_reguladoras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  sigla TEXT,
  esfera TEXT NOT NULL CHECK (esfera IN ('federal','estadual','distrital','municipal')),
  uf TEXT,
  municipio TEXT,
  cnpj TEXT,
  email_contato TEXT,
  site TEXT,
  telefone TEXT,
  endereco TEXT,
  observacoes TEXT,
  ativa BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agencias_reguladoras TO authenticated;
GRANT ALL ON public.agencias_reguladoras TO service_role;

ALTER TABLE public.agencias_reguladoras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view agencias_reguladoras"
  ON public.agencias_reguladoras FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins manage agencias_reguladoras"
  ON public.agencias_reguladoras FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'gestor_ana'))
  WITH CHECK (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'gestor_ana'));

CREATE TRIGGER update_agencias_reguladoras_updated_at
  BEFORE UPDATE ON public.agencias_reguladoras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER audit_agencias_reguladoras
  AFTER INSERT OR UPDATE OR DELETE ON public.agencias_reguladoras
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- 2. FKs em concessionarias e profiles
ALTER TABLE public.concessionarias
  ADD COLUMN IF NOT EXISTS agencia_reguladora_id UUID REFERENCES public.agencias_reguladoras(id) ON DELETE SET NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS agencia_reguladora_id UUID REFERENCES public.agencias_reguladoras(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_concessionarias_agencia ON public.concessionarias(agencia_reguladora_id);
CREATE INDEX IF NOT EXISTS idx_profiles_agencia ON public.profiles(agencia_reguladora_id);

-- 3. Função para retornar agência do usuário corrente
CREATE OR REPLACE FUNCTION public.current_user_agencia()
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT agencia_reguladora_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_agencia() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_agencia() TO authenticated, service_role;

-- 4. RLS de etes: incluir gestor_ar
DROP POLICY IF EXISTS "Etes visibility by concessionaria" ON public.etes;
CREATE POLICY "Etes visibility by concessionaria"
  ON public.etes FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(),'superadmin')
    OR public.has_role(auth.uid(),'gestor_ana')
    OR (
      public.has_role(auth.uid(),'operador')
      AND concessionaria_id IS NOT NULL
      AND concessionaria_id = public.current_user_concessionaria()
    )
    OR (
      public.has_role(auth.uid(),'gestor_ar')
      AND concessionaria_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.concessionarias c
        WHERE c.id = etes.concessionaria_id
          AND c.agencia_reguladora_id = public.current_user_agencia()
      )
    )
  );
