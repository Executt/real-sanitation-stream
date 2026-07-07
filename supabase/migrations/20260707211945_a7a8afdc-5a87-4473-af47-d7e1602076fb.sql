
CREATE TABLE public.cortex_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bacia text,
  modelo_id uuid REFERENCES public.cortex_modelos(id) ON DELETE CASCADE,
  alto_min numeric NOT NULL DEFAULT 0.50 CHECK (alto_min >= 0 AND alto_min <= 1),
  critico_min numeric NOT NULL DEFAULT 0.75 CHECK (critico_min >= 0 AND critico_min <= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (critico_min >= alto_min)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cortex_thresholds TO authenticated;
GRANT ALL ON public.cortex_thresholds TO service_role;

ALTER TABLE public.cortex_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "thresholds_read_authenticated" ON public.cortex_thresholds
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "thresholds_write_superadmin" ON public.cortex_thresholds
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE UNIQUE INDEX cortex_thresholds_scope_uniq
  ON public.cortex_thresholds (
    COALESCE(lower(bacia), ''),
    COALESCE(modelo_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

CREATE TRIGGER cortex_thresholds_updated_at
  BEFORE UPDATE ON public.cortex_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER cortex_thresholds_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.cortex_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

INSERT INTO public.cortex_thresholds (bacia, modelo_id, alto_min, critico_min)
VALUES (NULL, NULL, 0.50, 0.75)
ON CONFLICT DO NOTHING;
