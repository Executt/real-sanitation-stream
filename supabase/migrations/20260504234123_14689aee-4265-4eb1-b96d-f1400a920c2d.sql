-- Profiles: replace permissive read with owner-scoped + superadmin
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'));

-- Audit log: require user_id = auth.uid() (no NULL bypass)
DROP POLICY IF EXISTS "Authenticated users can insert audit entries" ON public.audit_log;

CREATE POLICY "Users can insert own audit entries"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- cron_config: explicit superadmin-only SELECT (defense in depth)
CREATE POLICY "Superadmins can view cron_config"
  ON public.cron_config FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'));