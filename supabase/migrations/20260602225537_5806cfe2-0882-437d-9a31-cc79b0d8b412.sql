
-- ============================================================
-- 1) VÍNCULO OPERADOR ↔ CONCESSIONÁRIA
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS concessionaria_id uuid REFERENCES public.concessionarias(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_concessionaria_id ON public.profiles(concessionaria_id);

-- FK formal em etes.concessionaria_id (a coluna já existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'etes_concessionaria_id_fkey'
  ) THEN
    ALTER TABLE public.etes
      ADD CONSTRAINT etes_concessionaria_id_fkey
      FOREIGN KEY (concessionaria_id) REFERENCES public.concessionarias(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_etes_concessionaria_id ON public.etes(concessionaria_id);

-- Função para descobrir a concessionária do usuário corrente
CREATE OR REPLACE FUNCTION public.current_user_concessionaria()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT concessionaria_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- Atualizar RLS de etes: operador vê apenas ETEs da própria concessionária
-- (superadmin e gestor_ana continuam vendo tudo)
DROP POLICY IF EXISTS "Authenticated can view etes" ON public.etes;

CREATE POLICY "Etes visibility by concessionaria"
ON public.etes FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR has_role(auth.uid(), 'gestor_ana'::app_role)
  OR (
    has_role(auth.uid(), 'operador'::app_role)
    AND concessionaria_id IS NOT NULL
    AND concessionaria_id = public.current_user_concessionaria()
  )
);

-- ============================================================
-- 2) TRIGGERS DE AUDITORIA em tabelas sensíveis
-- ============================================================

DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;
CREATE TRIGGER audit_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_etes ON public.etes;
CREATE TRIGGER audit_etes
AFTER INSERT OR UPDATE OR DELETE ON public.etes
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_ldap_config ON public.ldap_config;
CREATE TRIGGER audit_ldap_config
AFTER INSERT OR UPDATE OR DELETE ON public.ldap_config
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_smtp_config ON public.smtp_config;
CREATE TRIGGER audit_smtp_config
AFTER INSERT OR UPDATE OR DELETE ON public.smtp_config
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_sei_config ON public.sei_config;
CREATE TRIGGER audit_sei_config
AFTER INSERT OR UPDATE OR DELETE ON public.sei_config
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_system_parameters ON public.system_parameters;
CREATE TRIGGER audit_system_parameters
AFTER INSERT OR UPDATE OR DELETE ON public.system_parameters
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_concessionarias ON public.concessionarias;
CREATE TRIGGER audit_concessionarias
AFTER INSERT OR UPDATE OR DELETE ON public.concessionarias
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Ajusta a função log_audit_event: como agora é disparada por triggers (sem usuário direto),
-- removemos a checagem WITH CHECK (auth.uid() = user_id) que bloquearia inserções vindas
-- de triggers SECURITY DEFINER quando auth.uid() é NULL. A função em si já roda como
-- SECURITY DEFINER; reforçamos a política de INSERT do audit_log para aceitar inserções
-- vindas de triggers (user_id pode ser NULL em ações de sistema/cron).
DROP POLICY IF EXISTS "Users can insert own audit entries" ON public.audit_log;
CREATE POLICY "Audit insert by user or system"
ON public.audit_log FOR INSERT
TO authenticated
WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- ============================================================
-- 3) REALTIME em dbo_medicoes e api_probe_log
-- ============================================================

ALTER TABLE public.dbo_medicoes REPLICA IDENTITY FULL;
ALTER TABLE public.api_probe_log REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'dbo_medicoes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dbo_medicoes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'api_probe_log'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.api_probe_log;
  END IF;
END $$;
