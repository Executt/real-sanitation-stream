DROP POLICY IF EXISTS ws_select ON public.water_sources;
CREATE POLICY ws_select ON public.water_sources FOR SELECT TO authenticated
USING (org_id IS NULL OR public.can_access_org(org_id));

DROP POLICY IF EXISTS ws_insert ON public.water_sources;
CREATE POLICY ws_insert ON public.water_sources FOR INSERT TO authenticated
WITH CHECK (
  (org_id IS NOT NULL AND (org_id = public.current_user_org() OR public.has_role(auth.uid(),'superadmin')))
  OR (org_id IS NULL AND (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'gestor_ana')))
);

DROP POLICY IF EXISTS ws_update ON public.water_sources;
CREATE POLICY ws_update ON public.water_sources FOR UPDATE TO authenticated
USING (
  (org_id IS NOT NULL AND (org_id = public.current_user_org() OR public.has_role(auth.uid(),'superadmin')))
  OR (org_id IS NULL AND (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'gestor_ana')))
)
WITH CHECK (
  (org_id IS NOT NULL AND (org_id = public.current_user_org() OR public.has_role(auth.uid(),'superadmin')))
  OR (org_id IS NULL AND (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'gestor_ana')))
);

DROP POLICY IF EXISTS ws_delete ON public.water_sources;
CREATE POLICY ws_delete ON public.water_sources FOR DELETE TO authenticated
USING (
  (org_id IS NOT NULL AND (org_id = public.current_user_org() OR public.has_role(auth.uid(),'superadmin')))
  OR (org_id IS NULL AND (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'gestor_ana')))
);