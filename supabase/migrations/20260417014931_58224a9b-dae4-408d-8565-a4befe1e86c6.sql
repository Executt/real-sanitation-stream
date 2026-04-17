-- =========================================
-- LDAP CONFIG
-- =========================================
CREATE TABLE public.ldap_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT false,
  host text NOT NULL DEFAULT '',
  port integer NOT NULL DEFAULT 389,
  use_tls boolean NOT NULL DEFAULT true,
  base_dn text NOT NULL DEFAULT '',
  bind_dn text NOT NULL DEFAULT '',
  bind_password text NOT NULL DEFAULT '',
  user_filter text NOT NULL DEFAULT '(objectClass=person)',
  attr_email text NOT NULL DEFAULT 'mail',
  attr_name text NOT NULL DEFAULT 'cn',
  attr_org text NOT NULL DEFAULT 'o',
  default_role app_role NOT NULL DEFAULT 'operador',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ldap_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins manage ldap_config"
  ON public.ldap_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE TRIGGER trg_ldap_config_updated
  BEFORE UPDATE ON public.ldap_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- SMTP CONFIG
-- =========================================
CREATE TABLE public.smtp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT false,
  host text NOT NULL DEFAULT '',
  port integer NOT NULL DEFAULT 587,
  username text NOT NULL DEFAULT '',
  password text NOT NULL DEFAULT '',
  from_email text NOT NULL DEFAULT '',
  from_name text NOT NULL DEFAULT 'HydrosNet',
  use_tls boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.smtp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins manage smtp_config"
  ON public.smtp_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE TRIGGER trg_smtp_config_updated
  BEFORE UPDATE ON public.smtp_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- SEI CONFIG
-- =========================================
CREATE TABLE public.sei_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT false,
  api_url text NOT NULL DEFAULT '',
  api_key text NOT NULL DEFAULT '',
  orgao_id text NOT NULL DEFAULT '',
  unidade_id text NOT NULL DEFAULT '',
  tipo_processo text NOT NULL DEFAULT 'Monitoramento Saneamento',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sei_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins manage sei_config"
  ON public.sei_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE TRIGGER trg_sei_config_updated
  BEFORE UPDATE ON public.sei_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- SYSTEM PARAMETERS
-- =========================================
CREATE TABLE public.system_parameters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dbo_min numeric NOT NULL DEFAULT 60,
  dbo_critico numeric NOT NULL DEFAULT 40,
  api_timeout_seconds integer NOT NULL DEFAULT 30,
  sync_interval_minutes integer NOT NULL DEFAULT 15,
  retention_days integer NOT NULL DEFAULT 365,
  max_upload_mb integer NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.system_parameters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins manage system_parameters"
  ON public.system_parameters FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE TRIGGER trg_system_parameters_updated
  BEFORE UPDATE ON public.system_parameters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- AUDIT LOG (imutável)
-- =========================================
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  action text NOT NULL,
  target text,
  severity text NOT NULL DEFAULT 'info',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_log_created_at ON public.audit_log (created_at DESC);
CREATE INDEX idx_audit_log_user_id ON public.audit_log (user_id);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins view audit_log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Authenticated users can insert audit entries"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Sem políticas de UPDATE/DELETE => imutável

-- =========================================
-- Seed de linhas singleton (uma por tabela de config)
-- =========================================
INSERT INTO public.ldap_config DEFAULT VALUES;
INSERT INTO public.smtp_config (from_email) VALUES ('noreply@hydrosnet.gov.br');
INSERT INTO public.sei_config (api_url) VALUES ('https://sei.gov.br/api/v1');
INSERT INTO public.system_parameters DEFAULT VALUES;