CREATE TABLE IF NOT EXISTS public.cron_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ldap_sync_url text NOT NULL,
  ldap_sync_anon_key text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cron_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins manage cron_config"
ON public.cron_config FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'))
WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE OR REPLACE FUNCTION public.reschedule_ldap_sync_on_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_key text;
BEGIN
  IF NEW.sync_interval_minutes IS DISTINCT FROM OLD.sync_interval_minutes THEN
    SELECT ldap_sync_url, ldap_sync_anon_key INTO v_url, v_key
      FROM public.cron_config LIMIT 1;
    IF v_url IS NOT NULL AND v_key IS NOT NULL THEN
      PERFORM public.schedule_ldap_sync(v_url, v_key);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;