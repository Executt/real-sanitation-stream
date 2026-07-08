
-- Enums
DO $$ BEGIN
  CREATE TYPE public.repo_artefato_tipo AS ENUM ('aws_s3','oci','gcp_gcs','azure_blob','filesystem','onedrive','google_drive','sharepoint','ftp','sftp','outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.base_dados_tipo AS ENUM ('postgres','mysql','oracle','sqlserver','mongodb','snowflake','bigquery','clickhouse','duckdb','outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.cortex_fonte_papel AS ENUM ('treino','contexto_rag','inferencia','validacao');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ repositorios_artefatos ============
CREATE TABLE public.repositorios_artefatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo public.repo_artefato_tipo NOT NULL,
  descricao text,
  bucket_ou_path text,
  endpoint text,
  regiao text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  secret_ref text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.repositorios_artefatos TO authenticated;
GRANT ALL ON public.repositorios_artefatos TO service_role;

ALTER TABLE public.repositorios_artefatos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "repositorios_artefatos_select_auth"
  ON public.repositorios_artefatos FOR SELECT TO authenticated USING (true);
CREATE POLICY "repositorios_artefatos_insert_superadmin"
  ON public.repositorios_artefatos FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "repositorios_artefatos_update_superadmin"
  ON public.repositorios_artefatos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "repositorios_artefatos_delete_superadmin"
  ON public.repositorios_artefatos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE TRIGGER update_repositorios_artefatos_updated_at
  BEFORE UPDATE ON public.repositorios_artefatos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER audit_repositorios_artefatos
  AFTER INSERT OR UPDATE OR DELETE ON public.repositorios_artefatos
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ============ bases_dados_externas ============
CREATE TABLE public.bases_dados_externas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo public.base_dados_tipo NOT NULL,
  descricao text,
  host text,
  porta integer,
  database_name text,
  usuario text,
  ssl_mode text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  secret_ref text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bases_dados_externas TO authenticated;
GRANT ALL ON public.bases_dados_externas TO service_role;

ALTER TABLE public.bases_dados_externas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bases_dados_externas_select_auth"
  ON public.bases_dados_externas FOR SELECT TO authenticated USING (true);
CREATE POLICY "bases_dados_externas_insert_superadmin"
  ON public.bases_dados_externas FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "bases_dados_externas_update_superadmin"
  ON public.bases_dados_externas FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "bases_dados_externas_delete_superadmin"
  ON public.bases_dados_externas FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE TRIGGER update_bases_dados_externas_updated_at
  BEFORE UPDATE ON public.bases_dados_externas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER audit_bases_dados_externas
  AFTER INSERT OR UPDATE OR DELETE ON public.bases_dados_externas
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ============ cortex_modelos_fontes (join) ============
CREATE TABLE public.cortex_modelos_fontes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id uuid NOT NULL REFERENCES public.cortex_modelos(id) ON DELETE CASCADE,
  repositorio_id uuid REFERENCES public.repositorios_artefatos(id) ON DELETE CASCADE,
  base_dados_id uuid REFERENCES public.bases_dados_externas(id) ON DELETE CASCADE,
  papel public.cortex_fonte_papel NOT NULL DEFAULT 'contexto_rag',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cortex_modelos_fontes_xor CHECK (
    (repositorio_id IS NOT NULL)::int + (base_dados_id IS NOT NULL)::int = 1
  )
);

CREATE INDEX cortex_modelos_fontes_modelo_idx ON public.cortex_modelos_fontes(modelo_id);
CREATE UNIQUE INDEX cortex_modelos_fontes_repo_uniq
  ON public.cortex_modelos_fontes(modelo_id, repositorio_id, papel) WHERE repositorio_id IS NOT NULL;
CREATE UNIQUE INDEX cortex_modelos_fontes_base_uniq
  ON public.cortex_modelos_fontes(modelo_id, base_dados_id, papel) WHERE base_dados_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cortex_modelos_fontes TO authenticated;
GRANT ALL ON public.cortex_modelos_fontes TO service_role;

ALTER TABLE public.cortex_modelos_fontes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cortex_modelos_fontes_select_auth"
  ON public.cortex_modelos_fontes FOR SELECT TO authenticated USING (true);
CREATE POLICY "cortex_modelos_fontes_write_superadmin"
  ON public.cortex_modelos_fontes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE TRIGGER audit_cortex_modelos_fontes
  AFTER INSERT OR UPDATE OR DELETE ON public.cortex_modelos_fontes
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
