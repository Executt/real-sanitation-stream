CREATE TABLE public.api_probe_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  endpoint text NOT NULL,
  state text NOT NULL CHECK (state IN ('success','error')),
  http_status integer,
  duration_ms integer,
  error_message text,
  checked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_probe_log_endpoint_checked ON public.api_probe_log (source, endpoint, checked_at DESC);
CREATE INDEX idx_api_probe_log_checked_at ON public.api_probe_log (checked_at DESC);

ALTER TABLE public.api_probe_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view api_probe_log"
  ON public.api_probe_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert api_probe_log"
  ON public.api_probe_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Superadmins can delete api_probe_log"
  ON public.api_probe_log FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role));