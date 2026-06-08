
-- Tighten INSERT/UPDATE on etes so operador only touches own concessionaria
DROP POLICY IF EXISTS "Operadores and superadmins can insert etes" ON public.etes;
DROP POLICY IF EXISTS "Operadores and superadmins can update etes" ON public.etes;

CREATE POLICY "Etes insert scoped by concessionaria"
ON public.etes
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'superadmin')
  OR (
    public.has_role(auth.uid(), 'operador')
    AND concessionaria_id IS NOT NULL
    AND concessionaria_id = public.current_user_concessionaria()
  )
);

CREATE POLICY "Etes update scoped by concessionaria"
ON public.etes
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin')
  OR (
    public.has_role(auth.uid(), 'operador')
    AND concessionaria_id IS NOT NULL
    AND concessionaria_id = public.current_user_concessionaria()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'superadmin')
  OR (
    public.has_role(auth.uid(), 'operador')
    AND concessionaria_id IS NOT NULL
    AND concessionaria_id = public.current_user_concessionaria()
  )
);
