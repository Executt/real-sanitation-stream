DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND p.proname IN ('has_role','can_access_org','current_user_org','current_user_agencia','current_user_concessionaria','org_subtree','log_access','schedule_ldap_sync','schedule_cortex_infer')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon, PUBLIC', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
  END LOOP;
END $$;