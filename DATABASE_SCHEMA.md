# Esquema do Banco de Dados — HydrosNet

## Enums

```sql
CREATE TYPE public.app_role AS ENUM ('operador', 'gestor_ana', 'gestor_ar', 'superadmin');
```

## Tabelas (estado atual)

### `profiles`
Perfis de usuário, vinculados a `auth.users` via `user_id`.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `user_id` | uuid | referência lógica a `auth.users` |
| `full_name` | text | |
| `organization` | text | |
| `position` | text | |
| `avatar_url` | text | |
| `concessionaria_id` | uuid → `concessionarias.id` | **novo** — escopo do operador |
| `created_at` / `updated_at` | timestamptz | |

**RLS:** usuário vê/edita o próprio; superadmin vê todos.

### `user_roles`
Atribuição de roles por usuário. **Auditada por trigger.**

| Coluna | Tipo |
|--------|------|
| `user_id` | uuid |
| `role` | `app_role` |
| `created_at` | timestamptz |

**RLS:** usuário vê suas próprias roles; superadmin gerencia todas.

### `concessionarias`
Prestadoras de saneamento (SABESP, COPASA, CAESB…). **Auditada por trigger.**

Campos: `nome`, `sigla`, `tipo`, `natureza`, `uf`, `cnpj`, `site`, `abrangencia`, `municipios_atendidos`, `populacao_atendida`, `email_contato`, `telefone`, `endereco`, `ativa`, `observacoes`.

**RLS:** autenticado lê; superadmin gerencia.

### `etes`
Estações de Tratamento de Esgoto. **Auditada por trigger.**

Campos: `concessionaria_id` (FK → `concessionarias.id`), `nome`, `codigo`, `municipio`, `uf`, `latitude`, `longitude`, `status` (`ativa`/`em_construcao`/`inativa`/`manutencao`), `tipo_tratamento`, `vazao_projeto_lps`, `vazao_atual_lps`, `populacao_atendida`, `data_inicio_operacao`, `observacoes`.

**RLS (atualizada):**
- SELECT: superadmin e gestor_ana veem tudo; **operador vê apenas ETEs da sua concessionária** (`profiles.concessionaria_id`).
- INSERT/UPDATE: operador e superadmin.
- DELETE: apenas superadmin.

### `dbo_medicoes`
Medições DBO entrada/saída por ETE. Conformidade calculada por trigger (`set_conforme_dbo`). **Realtime habilitado.**

Campos: `ete_id`, `dbo_entrada_mg_l`, `dbo_saida_mg_l`, `eficiencia_pct`, `conforme`, `medido_em`.

**RLS:** autenticado lê; operador/superadmin escreve; superadmin apaga.

### `api_probe_log`
Histórico de probes de endpoints externos (SNIRH, ANA, etc). **Realtime habilitado.**

Campos: `source`, `endpoint`, `state` (`up`/`down`/`degraded`), `http_status`, `duration_ms`, `error_message`, `checked_at`.

**RLS:** autenticado lê/insere; superadmin apaga.

### `audit_log`
Trilha imutável de auditoria. **Populada automaticamente** por triggers em `user_roles`, `etes`, `concessionarias`, `ldap_config`, `smtp_config`, `sei_config`, `system_parameters`.

Campos: `user_id`, `user_email`, `action` (`<TABLE>_<OP>`), `target` (nome da tabela), `severity` (`info`/`warning`), `metadata` (jsonb com `old`/`new`, com senhas/API keys mascaradas), `created_at`.

**RLS:** SELECT só superadmin; INSERT aceita registros de usuário ou de sistema (user_id NULL); UPDATE/DELETE bloqueados.

### Configurações administrativas (singleton, RLS = superadmin)

- `ldap_config` — servidor LDAP/AD. **Auditada.**
- `smtp_config` — servidor SMTP. **Auditada.**
- `sei_config` — integração SEI. **Auditada.**
- `system_parameters` — limites DBO, timeouts, retenção, intervalo de sync. **Auditada.**
- `cron_config` — URLs do `ldap-sync` para agendamento via `pg_cron`.

## Funções

| Função | Propósito |
|--------|-----------|
| `has_role(user_id, role)` | RBAC sem recursão RLS. |
| `current_user_concessionaria()` | **Novo** — retorna `concessionaria_id` do usuário logado (usada pela RLS de `etes`). |
| `handle_new_user()` | Cria `profiles` após cadastro em `auth.users`. |
| `update_updated_at_column()` | Trigger genérico de timestamp. |
| `set_conforme_dbo()` | Marca `conforme` em `dbo_medicoes` conforme `system_parameters.dbo_min`. |
| `log_audit_event()` | Trigger genérico de auditoria; mascara senhas/API keys. |
| `schedule_ldap_sync(url, key)` | Agenda o `ldap-sync` via `pg_cron` + `pg_net`. |
| `reschedule_ldap_sync_on_change()` | Reagenda quando `sync_interval_minutes` muda. |

## Triggers (estado atual)

| Tabela | Trigger | Quando | Ação |
|--------|---------|--------|------|
| `user_roles` | `audit_user_roles` | AFTER I/U/D | `log_audit_event` |
| `etes` | `audit_etes` | AFTER I/U/D | `log_audit_event` |
| `concessionarias` | `audit_concessionarias` | AFTER I/U/D | `log_audit_event` |
| `ldap_config` | `audit_ldap_config` | AFTER I/U/D | `log_audit_event` |
| `smtp_config` | `audit_smtp_config` | AFTER I/U/D | `log_audit_event` |
| `sei_config` | `audit_sei_config` | AFTER I/U/D | `log_audit_event` |
| `system_parameters` | `audit_system_parameters` | AFTER I/U/D | `log_audit_event` |
| `dbo_medicoes` | (pré-existente) | BEFORE I/U | `set_conforme_dbo` |

## Realtime

Publicação `supabase_realtime` inclui:
- `dbo_medicoes` — para `AlertasDboPanel` e `ConformidadeCard`.
- `api_probe_log` — para `ApiMonitoring` e KPIs do dashboard.

## Edge Functions

- `seed-admin` — bootstrap do superadmin `admin@ana.gov.br`.
- `ldap-sync` — disparada por `pg_cron` no intervalo definido em `system_parameters`.
- `smtp-send` — envio transacional.
- `sei-create-process` — abre processo SEI a partir de alertas críticos.

## Diagrama de Relacionamento

```
auth.users
   ├── 1:1 ── profiles ── N:1 ── concessionarias ── 1:N ── etes
   └── 1:N ── user_roles                                    └── 1:N ── dbo_medicoes

audit_log ← (triggers em user_roles, etes, concessionarias, *_config, system_parameters)
api_probe_log (independente)
```

## Observações sobre a arquitetura de alertas

Decisão deliberada (princípio spec-driven): **não foi criada uma tabela `alertas` separada**.
O componente `AlertasDboPanel` deriva alertas dinamicamente de `dbo_medicoes` filtrando `conforme = false` e aplicando os limites de `system_parameters`. Manter uma tabela espelho geraria divergência sem benefício, dado que:
1. As consultas são rápidas (índice em `medido_em DESC`).
2. Realtime em `dbo_medicoes` já entrega novos alertas ao painel.
3. Evita sincronização e regras de invalidação extras.

## Camada Córtex IA

Tabelas dedicadas à análise preditiva. Ver `CORTEX_IA.md` para governança.

### `atlas_indicadores`
Indicadores públicos do Atlas Esgotos ANA (contexto para inferência).
Campos: `bacia`, `uf`, `municipio`, `ibge_code`, `carga_dbo_kg_dia`, `cobertura_coleta_pct`, `cobertura_tratamento_pct`, `rios_comprometidos_km`, `populacao_urbana`, `fonte`, `ano_referencia`, `raw` (jsonb).

**Índices únicos parciais para upsert incremental:**
- `atlas_indicadores_ibge_ano_uidx` sobre `(ibge_code, ano_referencia)` quando `ibge_code IS NOT NULL`
- `atlas_indicadores_uf_ano_uidx` sobre `(uf, ano_referencia)` para agregações estaduais

**RLS:** leitura autenticada; escrita apenas via `service_role` (edge function `cortex-ingest-atlas`).

### `cortex_modelos`
Catálogo de modelos preditivos.
Campos: `nome`, `versao`, `tipo`, `provider_model`, `status` (`shadow`|`prod`), `metricas` (jsonb), `falso_afluente_checklist` (jsonb com 5 booleans), `causal_report_url`.

**Trigger `enforce_falso_afluente`** (BEFORE UPDATE): bloqueia `status='prod'` sem checklist completo ou sem `causal_report_url`.

### `cortex_predicoes`
Saída do modelo, uma linha por inferência.
Campos: `modelo_id`, `escopo` (`ete|concessionaria|agencia|bacia`), `ete_id`, `concessionaria_id`, `agencia_reguladora_id`, `bacia`, `horizonte_dias`, `metrica`, `valor`, `confianca`, `classificacao`, `features` (jsonb), `explicacao`, `criado_em`. **Realtime habilitado.**

**RLS:** operador vê predições da sua concessionária; `gestor_ar` vê da sua agência; `gestor_ana`/`superadmin` veem tudo. INSERT apenas via `service_role`.

## Nova função de agendamento

| Função | Propósito |
|--------|-----------|
| `schedule_cortex_infer(url, anon_key)` | Registra/atualiza job `cortex-infer-daily` (03:00 UTC) via `pg_cron` + `pg_net`. |

## Extensão do `cron_config`

Colunas adicionadas: `cortex_infer_url`, `cortex_ingest_url` — persistem as URLs das edge functions para reagendamento após rotação de chaves.

## Repositórios e Bases externas (fontes de dados para o Córtex)

### `repositorios_artefatos`
Cadastro de repositórios de arquivos (PDF, imagens, planilhas, arquivos geoespaciais, etc).
Campos: `nome`, `tipo` (enum `repo_artefato_tipo`: `aws_s3|oci|gcp_gcs|azure_blob|filesystem|onedrive|google_drive|sharepoint|ftp|sftp|outro`), `descricao`, `bucket_ou_path`, `endpoint`, `regiao`, `config` (jsonb), `secret_ref` (**nome** da secret no Lovable Cloud — nunca o valor), `ativo`.
**RLS:** leitura autenticada; escrita apenas `superadmin`. Auditada.

### `bases_dados_externas`
Cadastro de bancos externos consumíveis pelos modelos Córtex.
Campos: `nome`, `tipo` (enum `base_dados_tipo`: `postgres|mysql|oracle|sqlserver|mongodb|snowflake|bigquery|clickhouse|duckdb|outro`), `descricao`, `host`, `porta`, `database_name`, `usuario`, `ssl_mode`, `config` (jsonb), `secret_ref`, `ativo`.
**RLS:** leitura autenticada; escrita apenas `superadmin`. Auditada.

### `cortex_modelos_fontes`
Vínculo N:N entre modelos Córtex e fontes (repositório **ou** base — CHECK XOR).
Campos: `modelo_id`, `repositorio_id`, `base_dados_id`, `papel` (enum `cortex_fonte_papel`: `treino|contexto_rag|inferencia|validacao`), `observacoes`.
Índices únicos parciais impedem vincular a mesma fonte duas vezes com o mesmo papel.
**RLS:** leitura autenticada; escrita apenas `superadmin`. Auditada.

**Segurança:** credenciais dos repositórios e bases são armazenadas exclusivamente como segredos no Lovable Cloud (Edge Function Secrets). As tabelas guardam somente `secret_ref` — o nome da secret — e nunca o valor.
