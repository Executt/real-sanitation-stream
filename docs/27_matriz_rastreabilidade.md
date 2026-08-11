# Matriz de Rastreabilidade — Regras de Negócio × Banco × Segurança

Liga cada regra de `12_regras_de_negocio.md` ao artefato que a implementa no banco, à política de
segurança correspondente em `09_politicas_seguranca.md` / `13_seguranca_hardening.md` e à superfície
de UI onde ela é observável. Alterar uma regra exige atualizar todas as colunas da sua linha.

Legenda de status: **A** aplicado e verificado · **P** parcial (implementado sem verificação automatizada) · **D** desenhado, ainda não implementado.

## Visão geral

| RN | Regra | Implementação no banco | Controle de acesso | Superfície de UI | Status |
|----|-------|------------------------|--------------------|------------------|--------|
| RN-01 | Conformidade de DBO | Trigger `set_conforme_dbo()` em `dbo_medicoes`; limiares em `system_parameters` | Policies de `dbo_medicoes` por `can_access_org`; `system_parameters` só `superadmin` escreve | `ConformidadePage`, `AlertasDboPanel`, `DboTrendChart` | A |
| RN-02 | Escopo hierárquico | `organizations.parent_id`, `org_subtree()`, `can_access_org()`, `current_user_org()` | RLS `USING` + `WITH CHECK` simétrico em todas as tabelas de negócio | `OrgContext`, `HierarchyFilters`, `ModuleFilters` | A |
| RN-03 | ISH-U | View de composição sobre `distribution_metrics`, `production_systems`, `water_sources` | RLS herdada das tabelas-base (view sem `SECURITY DEFINER`) | `IshDashboard`, mapa e legenda `--ish-*` | P |
| RN-04 | Ciclo EPPO | Enums `eppo_type`, `investment_status`, `investment_category` em `investments_planning` | `org_id NULL` = dado nacional legível por autenticados; escrita exige org | `Investimentos` | A |
| RN-05 | Idempotência do Atlas | `external_key` única + `atlas_import_batches`; upsert por chave | Importação restrita a papéis administrativos; lote registra `created_by` | `AtlasImport` | A |
| RN-06 | Falso Afluente | Trigger `enforce_falso_afluente()` em `cortex_modelos` | Escrita de modelo restrita a `superadmin`; `cortex_predicoes` sem INSERT/UPDATE/DELETE pelo cliente | `CortexModelos`, rótulo "apoio à decisão" em toda predição | A |
| RN-07 | Limiares de risco | `cortex_thresholds` (`alto_min`, `critico_min`) por bacia/modelo | Leitura autenticada; escrita administrativa | `CortexThresholdsPanel`, KPIs de `/command-center/cortex` | A |
| RN-08 | Monitoramento de integrações | `api_probe_log` (UPDATE negado); timeout de `system_parameters.api_timeout_seconds` | Inserção pelo app autenticado; log sem UPDATE | `ApiMonitoring`, `EndpointFailuresPanel` | A |
| RN-09 | Vínculo de usuário | `profiles.org_id` (+ vínculos legados), `handle_new_user()` | Sem org e sem papel nacional ⇒ nenhuma linha visível; convite via `invite-user` | `AdminPanel`, `EntityUsersTab` | A |
| RN-10 | Rastreabilidade | `log_audit_event()` (trigger) e `log_access()`; `audit_log` e `access_audit_log` com UPDATE/DELETE negados | Leitura conforme papel; escrita apenas por função `SECURITY DEFINER` | `AuditLog`, `GovernancaAudit`, `EntityAuditTab` | A |
| RN-11 | Competência regulatória | Tipagem `organizations.type` (`STATE_AGENCY`, `MUNICIPAL_AGENCY`, `CONCESSIONAIRE`) | Escopo de leitura pela subárvore da AR competente | Rótulos de relatório e detalhe de AR | P |

## Detalhamento por regra

### RN-01 — Conformidade de DBO
- **Entradas**: `dbo_medicoes.dbo_entrada_mg_l`, `dbo_saida_mg_l`, `system_parameters.dbo_min`, `dbo_critico`.
- **Cálculo**: no banco, por trigger `BEFORE INSERT OR UPDATE`. Nenhum caminho de escrita contorna a regra.
- **Falha esperada**: entrada nula ou zero é rejeitada — a UI deve exibir a mensagem do banco, não mascará-la.
- **Verificação**: consultar medições com `eficiencia_pct` nulo ou `conforme` divergente do limiar vigente.

### RN-02 — Escopo hierárquico
- **Função central**: `can_access_org(_org uuid)` — `SECURITY DEFINER`, `SET search_path = public`.
- **Regra de code review**: toda tabela nova com `org_id` recebe policy de leitura e escrita usando `can_access_org(org_id)`, com `WITH CHECK` idêntico ao `USING`.
- **Antipadrão**: filtrar apenas no frontend; o filtro de UI é conveniência, a fronteira é o banco.

### RN-03 — ISH-U
- Município sem qualquer dimensão fica **não classificado**; nunca receber classe otimista por omissão.
- Pendência: teste automatizado de composição e congelamento de série por ano de referência.

### RN-05 — Idempotência do Atlas
- Reimportação do mesmo arquivo não pode alterar `linhas_gravadas` acumulado sem gerar novo lote.
- `atlasDictionary.ts` valida colunas e domínios **antes** de qualquer escrita.

### RN-06 — Falso Afluente
- Bloqueios: `status = 'prod'` sem `causal_report_url`, sem checklist completo ou sem métricas de anos anômalos.
- A mensagem de erro do trigger deve chegar íntegra à UI — sem `500` genérico.

### RN-10 — Rastreabilidade
- Duas trilhas complementares: alteração (trigger) e acesso (`useAccessLog` → `log_access`).
- Ambas imutáveis por policy; expurgo por `retention_days` ainda **pendente** (ver `13_seguranca_hardening.md`).

## Controles transversais

| Controle | Onde | Documento |
|----------|------|-----------|
| `anon` sem GRANT em `public` | Migrações + `ALTER DEFAULT PRIVILEGES` | 09, 13 |
| `SET search_path = public` em toda função `SECURITY DEFINER` | Definição das funções | 09, 13 |
| Papéis fora de `profiles` (`user_roles` + `has_role`) | Schema | 09 |
| Guard de papel nas rotas `/admin/*`, `/agencia` | `ProtectedRoute` | 06 |
| Imutabilidade de trilhas e séries | Policies + WORM | 15 |

## Manutenção

1. Nova RN em `12` ⇒ nova linha aqui na mesma entrega.
2. Mudança de trigger, função ou policy ⇒ atualizar a coluna correspondente e o status.
3. Status **P** ou **D** só vira **A** com evidência: teste, consulta de verificação ou item de checklist em `security_and_performance_checklist.md`.
