# Schema do Banco — HydrosNet

Convenções: PK `id uuid default gen_random_uuid()`; `created_at`/`updated_at timestamptz not null default now()`;
`updated_at` mantido por trigger `update_updated_at_column()`. RLS habilitado em todas as tabelas.

## Governança e identidade

### `organizations`
Árvore institucional (ANA → agência estadual/municipal → prestador).

| Coluna | Tipo | Notas |
|--------|------|-------|
| `name`, `sigla` | text | `name` obrigatório |
| `type` | `org_type` | STATE_AGENCY / MUNICIPAL_AGENCY / CONCESSIONAIRE |
| `parent_id` | uuid → `organizations.id` | auto-relacionamento (hierarquia) |
| `uf`, `municipio`, `ibge_code`, `cnpj` | text | localização |
| `location_data` | jsonb | metadados livres (default `{}`) |
| `ativa` | boolean | soft delete |
| `legacy_agencia_id`, `legacy_concessionaria_id` | uuid | ponte com o cadastro legado |

### `profiles`
1:1 com `auth.users` via `user_id`. Campos: `full_name`, `organization`, `position`, `avatar_url`,
`org_id → organizations`, `concessionaria_id`, `agencia_reguladora_id` (legado). Criado por `handle_new_user()`.

### `user_roles`
`user_id → auth.users`, `role app_role`, `unique(user_id, role)`. **Nunca** armazenar papel em `profiles`.

## Cadastro institucional (legado, em convergência para `organizations`)

- **`agencias_reguladoras`**: `nome`, `sigla`, `esfera`, `uf`, `municipio`, `cnpj`, contatos, `ativa`.
- **`concessionarias`**: `nome`, `sigla`, `tipo`, `natureza`, `cnpj`, `uf`, `abrangencia`,
  `municipios_atendidos`, `populacao_atendida`, contatos, `ativa`, `agencia_reguladora_id → agencias_reguladoras`.

## Esgotamento sanitário

### `etes`
| Coluna | Tipo | Notas |
|--------|------|-------|
| `nome`, `codigo` | text | `codigo` = identificador do prestador |
| `municipio`, `uf` | text | obrigatórios |
| `latitude`, `longitude` | numeric | WGS84, usados no mapa |
| `status` | text | `ativa`, `manutencao`, `inativa` |
| `tipo_tratamento` | text | lodo ativado, UASB, lagoa etc. |
| `vazao_projeto_lps`, `vazao_atual_lps` | numeric | **L/s** |
| `populacao_atendida` | bigint | habitantes |
| `data_inicio_operacao` | date | |
| `concessionaria_id`, `org_id` | uuid | escopo de visibilidade |

### `dbo_medicoes`
`ete_id → etes`, `medido_em timestamptz`, `dbo_entrada_mg_l`, `dbo_saida_mg_l` (**mg/L**),
`eficiencia_pct` e `conforme` calculados pelo trigger `set_conforme_dbo()`.

## Produção de água

- **`water_sources`**: `org_id`, `nome`, `type water_source_type`, `vulnerability_level`,
  `gad_metric`, `vazao_outorgada_lps`, `vazao_disponivel_lps`, localização + coordenadas.
- **`production_systems`**: `org_id`, `water_source_id → water_sources`, `nome`,
  `type production_system_type`, `status production_system_status`,
  `capacidade_instalada_lps`, `demanda_2035_lps`, `gad_metric`, localização.

## Distribuição e perdas

**`distribution_metrics`**: `org_id`, localização, `ano_referencia` (obrigatório),
`coverage_percentage` (%), `ivi_loss_index`, `tma_hours`, `pms_pressure`, `observacoes`.

## Investimentos (EPPO)

**`investments_planning`**: `titulo`, `category investment_category`, `eppo eppo_type`,
`estimated_value numeric` (R$), `status investment_status`, `horizonte_ano`, `horizonte_faixa`,
`tipo_intervencao`, `manancial`, `requer_estudo`, localização (`uf`, `municipio`, `ibge_code`),
`org_id` **nullable** (dado nacional do Atlas não tem dono), `fonte`, `external_key` (idempotência de reimportação),
`import_batch_id → atlas_import_batches`.

**`atlas_import_batches`**: `arquivo`, `planilha`, `dataset`, `status`,
`linhas_lidas`, `linhas_gravadas`, `linhas_ignoradas`, `erros jsonb`, `mapeamento jsonb`, `created_by`.

## Índice ISH-U

View **`ish_urban_index`** — cruza cobertura/perdas (`distribution_metrics`) com capacidade e demanda
(`production_systems`, `water_sources`) por município/ano e devolve a classe de segurança hídrica urbana
(Mínima, Baixa, Média, Alta, Máxima). Fórmula em `docs/12_regras_de_negocio.md`.

## Atlas / indicadores externos

**`atlas_indicadores`**: `bacia`, `uf`, `municipio`, `ibge_code`, `carga_dbo_kg_dia`,
`cobertura_coleta_pct`, `cobertura_tratamento_pct`, `rios_comprometidos_km`, `populacao_urbana`,
`fonte`, `ano_referencia`, `raw jsonb`.

## Córtex IA

- **`cortex_modelos`**: `nome`, `versao`, `tipo`, `status` (`shadow`/`prod`/`arquivado`),
  `provider_model`, `metricas jsonb`, `causal_report_url`, `falso_afluente_checklist jsonb`.
- **`cortex_modelos_fontes`**: liga modelo a `repositorios_artefatos` ou `bases_dados_externas` com `papel cortex_fonte_papel`.
- **`cortex_predicoes`**: `modelo_id`, `escopo`, `ete_id`/`concessionaria_id`/`agencia_reguladora_id`/`bacia`,
  `horizonte_dias`, `metrica`, `valor`, `confianca`, `classificacao`, `features jsonb`, `features_hash`, `explicacao`.
  Somente escrita por `service_role` (Edge Function).
- **`cortex_thresholds`**: `bacia`, `modelo_id`, `alto_min`, `critico_min`.

## Fontes de dados externas

- **`repositorios_artefatos`**: `nome`, `tipo repo_artefato_tipo`, `bucket_ou_path`, `endpoint`, `regiao`,
  `config jsonb`, `secret_ref`, `ativo`.
- **`bases_dados_externas`**: `nome`, `tipo base_dados_tipo`, `host`, `porta`, `database_name`, `usuario`,
  `ssl_mode`, `config jsonb`, `secret_ref`, `ativo`.

> Credenciais **não** são armazenadas nessas tabelas: apenas `secret_ref`, ponteiro para o cofre de segredos.

## Integrações e operação

- **`api_probe_log`**: `source`, `endpoint`, `state`, `http_status`, `duration_ms`, `error_message`, `checked_at`. Append-only.
- **`ldap_config`**, **`smtp_config`**, **`sei_config`**: uma linha cada, acesso restrito a superadmin.
- **`system_parameters`**: `dbo_min`, `dbo_critico`, `api_timeout_seconds`, `sync_interval_minutes`, `retention_days`, `max_upload_mb`.
- **`cron_config`**: URLs e chaves usadas pelos jobs `pg_cron`.

## Auditoria

- **`audit_log`** (o quê mudou): `user_id`, `user_email`, `action`, `target`, `severity`, `metadata jsonb`.
  Alimentado por triggers `AFTER INSERT/UPDATE/DELETE`. UPDATE e DELETE negados por policy.
- **`access_audit_log`** (quem viu o quê): `user_id`, `user_email`, `modulo`, `acao`, `org_id`, `record_id`,
  `registros`, `filtros jsonb`. Alimentado por `log_access()` via hook `useAccessLog`.

## Relacionamentos principais

```
organizations ─┬─(parent_id)─ organizations
               ├── profiles.org_id
               ├── etes.org_id
               ├── water_sources.org_id ── production_systems.water_source_id
               ├── production_systems.org_id
               ├── distribution_metrics.org_id
               └── investments_planning.org_id (nullable)

agencias_reguladoras ── concessionarias ── etes ── dbo_medicoes
cortex_modelos ─┬─ cortex_modelos_fontes ─┬─ repositorios_artefatos
                │                          └─ bases_dados_externas
                ├─ cortex_predicoes
                └─ cortex_thresholds
```
