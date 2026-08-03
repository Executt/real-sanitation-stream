
CREATE TYPE public.org_type AS ENUM ('STATE_AGENCY','MUNICIPAL_AGENCY','CONCESSIONAIRE');

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sigla text,
  type public.org_type NOT NULL,
  parent_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  uf text,
  municipio text,
  ibge_code text,
  cnpj text,
  location_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ativa boolean NOT NULL DEFAULT true,
  legacy_agencia_id uuid REFERENCES public.agencias_reguladoras(id) ON DELETE SET NULL,
  legacy_concessionaria_id uuid REFERENCES public.concessionarias(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_organizations_parent ON public.organizations(parent_id);
CREATE INDEX idx_organizations_type ON public.organizations(type);
CREATE UNIQUE INDEX idx_org_legacy_ag ON public.organizations(legacy_agencia_id) WHERE legacy_agencia_id IS NOT NULL;
CREATE UNIQUE INDEX idx_org_legacy_conc ON public.organizations(legacy_concessionaria_id) WHERE legacy_concessionaria_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_organizations_audit AFTER INSERT OR UPDATE OR DELETE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- backfill: agências reguladoras
INSERT INTO public.organizations (name, sigla, type, uf, municipio, cnpj, legacy_agencia_id)
SELECT nome, sigla,
       CASE WHEN lower(coalesce(esfera,'')) LIKE '%municip%' THEN 'MUNICIPAL_AGENCY' ELSE 'STATE_AGENCY' END::public.org_type,
       uf, municipio, cnpj, id
FROM public.agencias_reguladoras;

-- backfill: concessionárias
INSERT INTO public.organizations (name, sigla, type, uf, cnpj, parent_id, legacy_concessionaria_id)
SELECT c.nome, c.sigla, 'CONCESSIONAIRE'::public.org_type, c.uf, c.cnpj,
       (SELECT o.id FROM public.organizations o WHERE o.legacy_agencia_id = c.agencia_reguladora_id),
       c.id
FROM public.concessionarias c;

-- vínculo do usuário
ALTER TABLE public.profiles ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

UPDATE public.profiles p SET org_id = o.id
FROM public.organizations o
WHERE p.concessionaria_id IS NOT NULL AND o.legacy_concessionaria_id = p.concessionaria_id;

UPDATE public.profiles p SET org_id = o.id
FROM public.organizations o
WHERE p.org_id IS NULL AND p.agencia_reguladora_id IS NOT NULL AND o.legacy_agencia_id = p.agencia_reguladora_id;

-- funções de hierarquia
CREATE OR REPLACE FUNCTION public.current_user_org()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT org_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.org_subtree(_root uuid)
RETURNS TABLE(id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH RECURSIVE tree AS (
    SELECT o.id FROM public.organizations o WHERE o.id = _root
    UNION ALL
    SELECT c.id FROM public.organizations c JOIN tree t ON c.parent_id = t.id
  )
  SELECT id FROM tree
$$;

CREATE OR REPLACE FUNCTION public.can_access_org(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'superadmin')
      OR public.has_role(auth.uid(),'gestor_ana')
      OR (_org IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.org_subtree(public.current_user_org()) s WHERE s.id = _org))
$$;

CREATE POLICY "Org subtree readable" ON public.organizations
FOR SELECT TO authenticated USING (public.can_access_org(id));

CREATE POLICY "Superadmins manage organizations" ON public.organizations
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'superadmin'))
WITH CHECK (public.has_role(auth.uid(),'superadmin'));
