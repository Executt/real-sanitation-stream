-- Função genérica de auditoria
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_action text;
  v_severity text := 'info';
  v_metadata jsonb;
BEGIN
  v_user_id := auth.uid();

  BEGIN
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  EXCEPTION WHEN OTHERS THEN
    v_user_email := NULL;
  END;

  v_action := upper(TG_TABLE_NAME) || '_' || TG_OP;

  IF TG_OP = 'DELETE' THEN
    v_metadata := jsonb_build_object('old', to_jsonb(OLD));
    v_severity := 'warning';
  ELSIF TG_OP = 'UPDATE' THEN
    v_metadata := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  ELSE
    v_metadata := jsonb_build_object('new', to_jsonb(NEW));
  END IF;

  -- Mascarar campos sensíveis
  IF TG_TABLE_NAME IN ('ldap_config','smtp_config','sei_config') THEN
    v_metadata := v_metadata #- '{old,bind_password}' #- '{new,bind_password}'
                            #- '{old,password}'      #- '{new,password}'
                            #- '{old,api_key}'       #- '{new,api_key}';
  END IF;

  IF TG_TABLE_NAME = 'user_roles' THEN
    v_severity := 'warning';
  END IF;

  INSERT INTO public.audit_log (user_id, user_email, action, target, severity, metadata)
  VALUES (v_user_id, v_user_email, v_action, TG_TABLE_NAME, v_severity, v_metadata);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recriar triggers (idempotente)
DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;
CREATE TRIGGER audit_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_ldap_config ON public.ldap_config;
CREATE TRIGGER audit_ldap_config
AFTER INSERT OR UPDATE OR DELETE ON public.ldap_config
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_smtp_config ON public.smtp_config;
CREATE TRIGGER audit_smtp_config
AFTER INSERT OR UPDATE OR DELETE ON public.smtp_config
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_sei_config ON public.sei_config;
CREATE TRIGGER audit_sei_config
AFTER INSERT OR UPDATE OR DELETE ON public.sei_config
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_system_parameters ON public.system_parameters;
CREATE TRIGGER audit_system_parameters
AFTER INSERT OR UPDATE OR DELETE ON public.system_parameters
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();