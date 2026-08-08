# Frameworks de Conformidade (GRC) — HydrosNet

Frameworks aplicáveis e como cada um se materializa no sistema. Este documento é o elo entre a exigência
normativa e o controle técnico implementado.

## LGPD (Lei 13.709/2018)

| Requisito | Controle no HydrosNet |
|-----------|------------------------|
| Minimização | Perfis guardam apenas nome, organização, cargo e avatar; não há dado pessoal sensível |
| Finalidade e base legal | Execução de política pública de saneamento (art. 7º, III) |
| Controle de acesso | RLS por organização (`can_access_org`) + RBAC em `user_roles` |
| Rastreabilidade | `audit_log` (alterações) e `access_audit_log` (quem consultou quais registros) |
| Retenção | `system_parameters.retention_days` — **expurgo automático ainda pendente** |
| Segurança | Sem GRANT para `anon`; segredos fora do banco (`secret_ref`) |

## Marco Legal do Saneamento (Lei 14.026/2020) e normas de referência da ANA

- Indicadores seguem a nomenclatura das normas de referência e do SNIS (cobertura, IVI, TMA, PMS).
- Comparabilidade entre prestadores garantida por unidades padronizadas (L/s, mg/L, código IBGE).
- Hierarquia ANA → Agência Reguladora → Prestador reproduzida na governança de dados (RN-02).
- Predição do Córtex é **apoio à decisão**, nunca ato regulatório (RN-06).

## PNRH (Lei 9.433/1997)

Instrumentos refletidos no modelo: planos por bacia (`bacia` em indicadores e thresholds),
enquadramento e monitoramento (`dbo_medicoes`, `atlas_indicadores`), sistema de informações (a própria plataforma).
Outorga em corpo hídrico estadual permanece competência do órgão gestor estadual (RN-11).

## ISO/IEC 27001 — controles priorizados

| Controle | Implementação |
|----------|---------------|
| A.5 Políticas | `docs/SECURITY_POLICIES.md` e `docs/SECURITY.md` |
| A.8 Gestão de ativos | Inventário em `docs/FUNCTION_INVENTORY.md` e `docs/DATABASE_SCHEMA.md` |
| A.9 Controle de acesso | RBAC + RLS + guard de rota |
| A.12 Operações | Logs de probe, auditoria imutável, jobs agendados |
| A.14 Desenvolvimento seguro | Checklist de migração (GRANT + RLS), revisão de dependências |
| A.16 Incidentes | Procedimento em `docs/SECURITY.md` |

## OWASP ASVS / Top 10 — mapeamento

| Risco | Mitigação |
|-------|-----------|
| A01 Broken Access Control | RLS em todas as tabelas; `WITH CHECK` simétrico; papéis em tabela dedicada |
| A02 Cryptographic Failures | TLS obrigatório; segredos no cofre, nunca no banco |
| A03 Injection | Acesso por PostgREST/consultas parametrizadas; sem SQL dinâmico no cliente |
| A05 Security Misconfiguration | `anon` sem privilégio; `search_path` fixo em funções `SECURITY DEFINER` |
| A07 Identification/Authentication | Supabase Auth; MFA para superadmin **pendente** |
| A09 Logging Failures | Auditoria dupla e imutável |

## e-PING / e-MAG (governo federal)

- Interoperabilidade: APIs REST com JSON, integração SEI e SNIRH.
- Acessibilidade: contraste WCAG AA, `aria-label`, foco visível — ver `docs/VISUAL_STANDARDS.md`.
- Autenticação federada: prevista via gov.br, hoje atendida por LDAP corporativo e Google.

## Governança de IA

Baseada na **Regra do Falso Afluente** (RN-06): causalidade documentada, variáveis físicas justificadas e
avaliação em anos anômalos. Alinha-se aos princípios de transparência e supervisão humana da
Estratégia Brasileira de IA e do PL de IA. Controle técnico: trigger `enforce_falso_afluente` +
`CortexExecucoes` (auditoria de cada inferência: parâmetros, fontes, ferramentas MCP, duração e erro).

## Como aplicar em novas entregas

1. Nova tabela → checklist de `docs/SECURITY_POLICIES.md` (GRANT, RLS, `WITH CHECK`, trigger de auditoria).
2. Novo módulo de consulta → instrumentar com `useAccessLog` (rastreabilidade LGPD).
3. Novo indicador → documentar fórmula e unidade em `docs/BUSINESS_RULES.md`.
4. Novo modelo de IA → laudo causal e checklist antes de `status = prod`.
5. Nova integração → registrar em `docs/INTEGRATIONS.md` e usar `secret_ref`, nunca credencial em tabela.

## Lacunas conhecidas

| Lacuna | Framework | Prioridade |
|--------|-----------|-----------|
| Expurgo automático por retenção | LGPD | Alta |
| MFA para superadmin | ISO 27001 / OWASP | Alta |
| Rate limiting em Edge Functions | OWASP | Média |
| Relatório de dados pessoais por titular | LGPD | Média |
| Tema escuro / preferências de acessibilidade | e-MAG | Baixa |
