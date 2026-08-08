# Banco de Dados — Visão Consolidada

Motor: PostgreSQL 15 (Lovable Cloud). Acesso via PostgREST (Data API) e Edge Functions (Deno).
Detalhe coluna a coluna em `docs/04_schema_do_banco.md`; diagrama em `docs/05_diagrama_er.md`.

## Domínios funcionais

| Domínio | Tabelas |
|---------|---------|
| **Governança / Identidade** | `organizations`, `profiles`, `user_roles` |
| **Cadastro institucional (legado)** | `agencias_reguladoras`, `concessionarias` |
| **Esgotamento sanitário** | `etes`, `dbo_medicoes` |
| **Produção de água** | `water_sources`, `production_systems` |
| **Distribuição e perdas** | `distribution_metrics` |
| **Investimentos (EPPO)** | `investments_planning`, `atlas_import_batches` |
| **Índice ISH-U** | view `ish_urban_index` |
| **Atlas / indicadores externos** | `atlas_indicadores` |
| **Córtex IA** | `cortex_modelos`, `cortex_modelos_fontes`, `cortex_predicoes`, `cortex_thresholds` |
| **Fontes de dados** | `repositorios_artefatos`, `bases_dados_externas` |
| **Integrações e operação** | `api_probe_log`, `ldap_config`, `smtp_config`, `sei_config`, `system_parameters`, `cron_config` |
| **Auditoria** | `audit_log` (alterações), `access_audit_log` (acessos) |

## Tipos enumerados

| Enum | Valores |
|------|---------|
| `app_role` | `operador`, `gestor_ar`, `gestor_ana`, `superadmin` |
| `org_type` | `STATE_AGENCY`, `MUNICIPAL_AGENCY`, `CONCESSIONAIRE` |
| `water_source_type` | `SURFACE`, `GROUNDWATER`, `MIXED` |
| `vulnerability_level` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `production_system_type` | `ISOLATED`, `INTEGRATED` |
| `production_system_status` | `SATISFACTORY`, `NEEDS_ADEQUATION`, `NEEDS_AMPLIFICATION` |
| `investment_category` | `PRODUCTION`, `DISTRIBUTION`, `REPLACEMENT`, `SEWAGE` |
| `investment_status` | `PLANEJADO`, `EM_ANDAMENTO`, `CONCLUIDO`, `CANCELADO` |
| `eppo_type` | `ESTUDO`, `PLANO`, `PROJETO`, `OBRA` |
| `base_dados_tipo` | `postgres`, `mysql`, `oracle`, `sqlserver`, `mongodb`, `snowflake`, `bigquery`, `clickhouse`, `duckdb`, `outro` |
| `repo_artefato_tipo` | `aws_s3`, `oci`, `gcp_gcs`, `azure_blob`, `filesystem`, `onedrive`, `google_drive`, `sharepoint`, `ftp`, `sftp`, `outro` |
| `cortex_fonte_papel` | `treino`, `contexto_rag`, `inferencia`, `validacao` |

## Funções do banco

| Função | Retorno | Tipo | Papel |
|--------|---------|------|-------|
| `has_role(_user_id, _role)` | boolean | SQL, SECURITY DEFINER | Base de todo RBAC; evita recursão de RLS em `user_roles` |
| `current_user_org()` | uuid | SECURITY DEFINER | `org_id` do perfil autenticado |
| `org_subtree(_root)` | setof uuid | SECURITY DEFINER | Subárvore recursiva de organizações |
| `can_access_org(_org)` | boolean | SECURITY DEFINER | Visibilidade em cascata (org do usuário + descendentes) |
| `current_user_concessionaria()` | uuid | SECURITY DEFINER | Escopo legado do operador |
| `current_user_agencia()` | uuid | SECURITY DEFINER | Escopo legado do gestor de AR |
| `log_access(...)` | void | SECURITY DEFINER | Grava em `access_audit_log` |
| `handle_new_user()` | trigger | SECURITY DEFINER | Cria `profiles` no signup |
| `log_audit_event()` | trigger | SECURITY DEFINER | Grava em `audit_log` |
| `set_conforme_dbo()` | trigger | SECURITY DEFINER | Calcula eficiência e conformidade |
| `enforce_falso_afluente()` | trigger | SECURITY DEFINER | Bloqueia promoção de modelo a `prod` sem laudo causal |
| `update_updated_at_column()` | trigger | — | Mantém `updated_at` |
| `schedule_ldap_sync(...)`, `schedule_cortex_infer(...)` | void | SECURITY DEFINER | (Re)agenda jobs `pg_cron` |
| `reschedule_ldap_sync_on_change()` | trigger | SECURITY DEFINER | Reagenda ao alterar `ldap_config` |

## Modelo de GRANTs

Padrão aplicado a **todas** as tabelas e views de `public`:

```sql
REVOKE ALL ON public.<t> FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.<t> TO authenticated;
GRANT ALL ON public.<t> TO service_role;
```

- `anon` **não tem privilégio algum** em `public` — a aplicação exige sessão. `ALTER DEFAULT PRIVILEGES ... REVOKE ALL ON TABLES FROM anon` garante o padrão para tabelas futuras.
- `EXECUTE` nas funções `SECURITY DEFINER` de negócio (`has_role`, `can_access_org`, `org_subtree`, `log_access`, `current_user_*`, `schedule_*`) foi revogado de `anon`/`PUBLIC` e concedido a `authenticated` e `service_role`.
- Funções de trigger não recebem `EXECUTE` direto — são invocadas pelo motor.
- `service_role` é usado exclusivamente pelas Edge Functions; a chave nunca circula no frontend.

> Regra: toda migração que criar tabela em `public` deve conter o bloco de GRANT acima na mesma migração, antes de habilitar RLS e criar policies.

## Extensões

`pgcrypto` (UUID), `pg_cron` (agendamentos), `pg_net` (chamadas HTTP a Edge Functions a partir do banco).

## Jobs agendados

| Job | Frequência | Efeito |
|-----|-----------|--------|
| `ldap-sync` | conforme `ldap_config` | Invoca a Edge Function `ldap-sync` |
| `cortex-infer-daily` | 03:00 UTC | Invoca `cortex-infer` em lote para ETEs ativas |

Endpoints e chaves usados pelos jobs ficam em `cron_config` (leitura restrita a superadmin).

## Realtime

Publicação habilitada em `dbo_medicoes`, `api_probe_log` e `cortex_predicoes` (`REPLICA IDENTITY FULL`).

## Retenção

`system_parameters.retention_days` define a janela alvo de retenção de logs (`audit_log`, `access_audit_log`, `api_probe_log`).
Pendência conhecida: a rotina de expurgo ainda não é executada automaticamente.
