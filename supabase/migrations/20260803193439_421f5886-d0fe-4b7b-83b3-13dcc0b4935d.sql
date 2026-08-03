
CREATE TYPE public.water_source_type AS ENUM ('SURFACE','GROUNDWATER','MIXED');
CREATE TYPE public.vulnerability_level AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');
CREATE TYPE public.production_system_type AS ENUM ('ISOLATED','INTEGRATED');
CREATE TYPE public.production_system_status AS ENUM ('SATISFACTORY','NEEDS_ADEQUATION','NEEDS_AMPLIFICATION');
CREATE TYPE public.investment_category AS ENUM ('PRODUCTION','DISTRIBUTION','REPLACEMENT','SEWAGE');
CREATE TYPE public.eppo_type AS ENUM ('ESTUDO','PLANO','PROJETO','OBRA');
CREATE TYPE public.investment_status AS ENUM ('PLANEJADO','EM_ANDAMENTO','CONCLUIDO','CANCELADO');

CREATE TABLE public.water_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  nome text NOT NULL,
  type public.water_source_type NOT NULL,
  vulnerability_level public.vulnerability_level NOT NULL DEFAULT 'MEDIUM',
  gad_metric numeric,
  vazao_outorgada_lps numeric,
  vazao_disponivel_lps numeric,
  uf text,
  municipio text,
  ibge_code text,
  latitude numeric,
  longitude numeric,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.production_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  water_source_id uuid REFERENCES public.water_sources(id) ON DELETE SET NULL,
  nome text NOT NULL,
  type public.production_system_type NOT NULL,
  status public.production_system_status NOT NULL DEFAULT 'SATISFACTORY',
  capacidade_instalada_lps numeric,
  demanda_2035_lps numeric,
  gad_metric numeric,
  uf text,
  municipio text,
  ibge_code text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.distribution_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  uf text,
  municipio text,
  ibge_code text,
  ano_referencia integer NOT NULL DEFAULT date_part('year', now())::int,
  coverage_percentage numeric,
  ivi_loss_index numeric,
  tma_hours numeric,
  pms_pressure numeric,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.investments_planning (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  category public.investment_category NOT NULL,
  eppo public.eppo_type NOT NULL DEFAULT 'OBRA',
  estimated_value numeric NOT NULL DEFAULT 0,
  status public.investment_status NOT NULL DEFAULT 'PLANEJADO',
  horizonte_ano integer,
  uf text,
  municipio text,
  ibge_code text,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.etes ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
UPDATE public.etes e SET org_id = o.id FROM public.organizations o
WHERE e.concessionaria_id IS NOT NULL AND o.legacy_concessionaria_id = e.concessionaria_id;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.water_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_systems TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.distribution_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investments_planning TO authenticated;
GRANT ALL ON public.water_sources TO service_role;
GRANT ALL ON public.production_systems TO service_role;
GRANT ALL ON public.distribution_metrics TO service_role;
GRANT ALL ON public.investments_planning TO service_role;

ALTER TABLE public.water_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distribution_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments_planning ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ws_select" ON public.water_sources FOR SELECT TO authenticated USING (public.can_access_org(org_id));
CREATE POLICY "ws_insert" ON public.water_sources FOR INSERT TO authenticated WITH CHECK (org_id = public.current_user_org() OR public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "ws_update" ON public.water_sources FOR UPDATE TO authenticated USING (org_id = public.current_user_org() OR public.has_role(auth.uid(),'superadmin')) WITH CHECK (org_id = public.current_user_org() OR public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "ws_delete" ON public.water_sources FOR DELETE TO authenticated USING (org_id = public.current_user_org() OR public.has_role(auth.uid(),'superadmin'));

CREATE POLICY "ps_select" ON public.production_systems FOR SELECT TO authenticated USING (public.can_access_org(org_id));
CREATE POLICY "ps_insert" ON public.production_systems FOR INSERT TO authenticated WITH CHECK (org_id = public.current_user_org() OR public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "ps_update" ON public.production_systems FOR UPDATE TO authenticated USING (org_id = public.current_user_org() OR public.has_role(auth.uid(),'superadmin')) WITH CHECK (org_id = public.current_user_org() OR public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "ps_delete" ON public.production_systems FOR DELETE TO authenticated USING (org_id = public.current_user_org() OR public.has_role(auth.uid(),'superadmin'));

CREATE POLICY "dm_select" ON public.distribution_metrics FOR SELECT TO authenticated USING (public.can_access_org(org_id));
CREATE POLICY "dm_insert" ON public.distribution_metrics FOR INSERT TO authenticated WITH CHECK (org_id = public.current_user_org() OR public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "dm_update" ON public.distribution_metrics FOR UPDATE TO authenticated USING (org_id = public.current_user_org() OR public.has_role(auth.uid(),'superadmin')) WITH CHECK (org_id = public.current_user_org() OR public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "dm_delete" ON public.distribution_metrics FOR DELETE TO authenticated USING (org_id = public.current_user_org() OR public.has_role(auth.uid(),'superadmin'));

CREATE POLICY "ip_select" ON public.investments_planning FOR SELECT TO authenticated USING (public.can_access_org(org_id));
CREATE POLICY "ip_insert" ON public.investments_planning FOR INSERT TO authenticated WITH CHECK (org_id = public.current_user_org() OR public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "ip_update" ON public.investments_planning FOR UPDATE TO authenticated USING (org_id = public.current_user_org() OR public.has_role(auth.uid(),'superadmin')) WITH CHECK (org_id = public.current_user_org() OR public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "ip_delete" ON public.investments_planning FOR DELETE TO authenticated USING (org_id = public.current_user_org() OR public.has_role(auth.uid(),'superadmin'));

CREATE TRIGGER trg_ws_updated BEFORE UPDATE ON public.water_sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ps_updated BEFORE UPDATE ON public.production_systems FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_dm_updated BEFORE UPDATE ON public.distribution_metrics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ip_updated BEFORE UPDATE ON public.investments_planning FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_ws_audit AFTER INSERT OR UPDATE OR DELETE ON public.water_sources FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_ps_audit AFTER INSERT OR UPDATE OR DELETE ON public.production_systems FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_dm_audit AFTER INSERT OR UPDATE OR DELETE ON public.distribution_metrics FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER trg_ip_audit AFTER INSERT OR UPDATE OR DELETE ON public.investments_planning FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE INDEX idx_ws_org ON public.water_sources(org_id);
CREATE INDEX idx_ps_org ON public.production_systems(org_id);
CREATE INDEX idx_dm_org ON public.distribution_metrics(org_id);
CREATE INDEX idx_ip_org ON public.investments_planning(org_id);

CREATE VIEW public.ish_urban_index WITH (security_invoker=on) AS
WITH prod AS (
  SELECT org_id, uf, municipio, ibge_code,
         avg(COALESCE(gad_metric, CASE status WHEN 'SATISFACTORY' THEN 100 WHEN 'NEEDS_ADEQUATION' THEN 70 ELSE 40 END)) AS prod_score
  FROM public.production_systems GROUP BY 1,2,3,4
),
dist AS (
  SELECT org_id, uf, municipio, ibge_code,
         avg(
           0.4 * LEAST(COALESCE(coverage_percentage,0),100)
         + 0.3 * GREATEST(0, 100 - COALESCE(ivi_loss_index,4) * 12.5)
         + 0.2 * LEAST(COALESCE(tma_hours,24) / 24 * 100, 100)
         + 0.1 * CASE WHEN COALESCE(pms_pressure,0) BETWEEN 10 AND 50 THEN 100 ELSE 50 END
         ) AS dist_score
  FROM public.distribution_metrics GROUP BY 1,2,3,4
)
SELECT
  COALESCE(p.org_id, d.org_id) AS org_id,
  COALESCE(p.uf, d.uf) AS uf,
  COALESCE(p.municipio, d.municipio) AS municipio,
  COALESCE(p.ibge_code, d.ibge_code) AS ibge_code,
  ROUND(COALESCE(p.prod_score,0)::numeric, 1) AS production_score,
  ROUND(COALESCE(d.dist_score,0)::numeric, 1) AS distribution_score,
  ROUND(((COALESCE(p.prod_score,0) + COALESCE(d.dist_score,0)) / 2)::numeric, 1) AS ish_score,
  CASE
    WHEN (COALESCE(p.prod_score,0) + COALESCE(d.dist_score,0)) / 2 >= 90 THEN 'MAXIMA'
    WHEN (COALESCE(p.prod_score,0) + COALESCE(d.dist_score,0)) / 2 >= 75 THEN 'ALTA'
    WHEN (COALESCE(p.prod_score,0) + COALESCE(d.dist_score,0)) / 2 >= 55 THEN 'MEDIA'
    WHEN (COALESCE(p.prod_score,0) + COALESCE(d.dist_score,0)) / 2 >= 35 THEN 'BAIXA'
    ELSE 'MINIMA'
  END AS ish_class
FROM prod p
FULL OUTER JOIN dist d
  ON p.org_id = d.org_id AND COALESCE(p.ibge_code,p.municipio,'') = COALESCE(d.ibge_code,d.municipio,'');

GRANT SELECT ON public.ish_urban_index TO authenticated;
GRANT SELECT ON public.ish_urban_index TO service_role;
