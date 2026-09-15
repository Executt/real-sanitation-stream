CREATE OR REPLACE VIEW public.prioridade_investimento
WITH (security_invoker = on) AS
SELECT
  i.ibge_code,
  max(i.municipio) AS municipio,
  max(i.uf)        AS uf,
  count(*)                                                                        AS intervencoes,
  sum(i.estimated_value)                                                          AS total_previsto,
  sum(i.estimated_value) FILTER (WHERE i.status <> 'CONCLUIDO')                   AS deficit,
  sum(i.estimated_value) FILTER (WHERE i.category = 'PRODUCTION')                 AS producao,
  sum(i.estimated_value) FILTER (WHERE i.category = 'DISTRIBUTION')               AS distribuicao,
  sum(i.estimated_value) FILTER (WHERE i.category = 'REPLACEMENT')                AS reposicao,
  sum(i.estimated_value) FILTER (WHERE i.category = 'SEWAGE')                     AS esgotamento,
  max(ish.ish_u)                                                                  AS ish_u,
  max(ish.cobertura)                                                              AS cobertura,
  max(ish.perdas)                                                                 AS perdas,
  max(ish.populacao_urbana)                                                       AS populacao_urbana,
  max(ish.ano_referencia)                                                         AS ano_ish
FROM public.investments_planning i
LEFT JOIN public.ish_indicadores ish ON ish.ibge_code = i.ibge_code
WHERE i.ibge_code IS NOT NULL AND i.ibge_code <> ''
GROUP BY i.ibge_code;

GRANT SELECT ON public.prioridade_investimento TO authenticated;
GRANT SELECT ON public.prioridade_investimento TO anon;