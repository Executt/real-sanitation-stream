-- 1) investments_planning: suportar dados nacionais do Atlas (sem dono) + rastreabilidade da origem
ALTER TABLE public.investments_planning ALTER COLUMN org_id DROP NOT NULL;
ALTER TABLE public.investments_planning
  ADD COLUMN IF NOT EXISTS fonte text,
  ADD COLUMN IF NOT EXISTS external_key text,
  ADD COLUMN IF NOT EXISTS tipo_intervencao text,
  ADD COLUMN IF NOT EXISTS manancial text,
  ADD COLUMN IF NOT EXISTS horizonte_faixa text,
  ADD COLUMN IF NOT EXISTS requer_estudo boolean,
  ADD COLUMN IF NOT EXISTS import_batch_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS investments_planning_external_key_uidx
  ON public.investments_planning (external_key) WHERE external_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS investments_planning_ibge_idx ON public.investments_planning (ibge_code);
CREATE INDEX IF NOT EXISTS investments_planning_uf_cat_idx ON public.investments_planning (uf, category);

-- RLS: dados nacionais (org_id NULL) são de leitura pública autenticada; escrita restrita
DROP POLICY IF EXISTS ip_select ON public.investments_planning;
DROP POLICY IF EXISTS "investments_select" ON public.investments_planning;
CREATE POLICY ip_select_scope ON public.investments_planning
  FOR SELECT TO authenticated
  USING (org_id IS NULL OR public.can_access_org(org_id));

DROP POLICY IF EXISTS ip_national_write ON public.investments_planning;
CREATE POLICY ip_national_write ON public.investments_planning
  FOR ALL TO authenticated
  USING (org_id IS NULL AND (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'gestor_ana')))
  WITH CHECK (org_id IS NULL AND (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'gestor_ana')));

-- 2) Lotes de importação do Atlas
CREATE TABLE IF NOT EXISTS public.atlas_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arquivo text NOT NULL,
  planilha text,
  dataset text NOT NULL,
  status text NOT NULL DEFAULT 'processando',
  linhas_lidas integer NOT NULL DEFAULT 0,
  linhas_gravadas integer NOT NULL DEFAULT 0,
  linhas_ignoradas integer NOT NULL DEFAULT 0,
  erros jsonb NOT NULL DEFAULT '[]'::jsonb,
  mapeamento jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.atlas_import_batches TO authenticated;
GRANT ALL ON public.atlas_import_batches TO service_role;
ALTER TABLE public.atlas_import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY aib_read ON public.atlas_import_batches FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'gestor_ana'));
CREATE POLICY aib_write ON public.atlas_import_batches FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'gestor_ana'));
CREATE POLICY aib_update ON public.atlas_import_batches FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'gestor_ana'))
  WITH CHECK (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'gestor_ana'));
CREATE TRIGGER trg_aib_updated BEFORE UPDATE ON public.atlas_import_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Auditoria de governança: quem acessou o quê (por org_id / módulo)
CREATE TABLE IF NOT EXISTS public.access_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  modulo text NOT NULL,
  acao text NOT NULL DEFAULT 'VIEW',
  org_id uuid REFERENCES public.organizations(id),
  record_id uuid,
  registros integer,
  filtros jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.access_audit_log TO authenticated;
GRANT ALL ON public.access_audit_log TO service_role;
ALTER TABLE public.access_audit_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS access_audit_log_created_idx ON public.access_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS access_audit_log_org_idx ON public.access_audit_log (org_id);

CREATE POLICY aal_insert_self ON public.access_audit_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY aal_read_scope ON public.access_audit_log FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(),'superadmin')
    OR public.has_role(auth.uid(),'gestor_ana')
    OR (org_id IS NOT NULL AND public.can_access_org(org_id))
  );

CREATE OR REPLACE FUNCTION public.log_access(
  _modulo text, _acao text DEFAULT 'VIEW', _org uuid DEFAULT NULL,
  _record uuid DEFAULT NULL, _registros integer DEFAULT NULL, _filtros jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  BEGIN SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  EXCEPTION WHEN OTHERS THEN v_email := NULL; END;
  INSERT INTO public.access_audit_log (user_id, user_email, modulo, acao, org_id, record_id, registros, filtros)
  VALUES (auth.uid(), v_email, _modulo, COALESCE(_acao,'VIEW'), _org, _record, _registros, COALESCE(_filtros,'{}'::jsonb));
END; $$;
GRANT EXECUTE ON FUNCTION public.log_access(text,text,uuid,uuid,integer,jsonb) TO authenticated;

-- 4) Auditoria de alterações nos módulos novos
CREATE TRIGGER trg_investments_audit AFTER INSERT OR UPDATE OR DELETE ON public.investments_planning
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();