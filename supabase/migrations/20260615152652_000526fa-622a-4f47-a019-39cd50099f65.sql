-- Restrict concessionarias visibility for gestor_ar to their own agencia
DROP POLICY IF EXISTS "Authenticated can view concessionarias" ON public.concessionarias;

CREATE POLICY "Admins, gestor_ana and operadores view concessionarias"
ON public.concessionarias
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR has_role(auth.uid(), 'gestor_ana'::app_role)
  OR has_role(auth.uid(), 'operador'::app_role)
);

CREATE POLICY "Gestor AR views own concessionarias"
ON public.concessionarias
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'gestor_ar'::app_role)
  AND agencia_reguladora_id IS NOT NULL
  AND agencia_reguladora_id = current_user_agencia()
);

-- Restrict dbo_medicoes visibility for gestor_ar
DROP POLICY IF EXISTS "Authenticated can view dbo_medicoes" ON public.dbo_medicoes;

CREATE POLICY "Scoped view dbo_medicoes"
ON public.dbo_medicoes
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR has_role(auth.uid(), 'gestor_ana'::app_role)
  OR (
    has_role(auth.uid(), 'operador'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.etes e
      WHERE e.id = dbo_medicoes.ete_id
        AND e.concessionaria_id = current_user_concessionaria()
    )
  )
  OR (
    has_role(auth.uid(), 'gestor_ar'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.etes e
      JOIN public.concessionarias c ON c.id = e.concessionaria_id
      WHERE e.id = dbo_medicoes.ete_id
        AND c.agencia_reguladora_id = current_user_agencia()
    )
  )
);