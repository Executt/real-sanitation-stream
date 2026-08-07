# Diagrama Entidade-Relacionamento — HydrosNet

Fonte Mermaid abaixo (também disponível em `/mnt/documents/HydrosNet_ER.mmd`).

```mermaid
erDiagram
  organizations ||--o{ organizations : parent_id
  organizations ||--o{ profiles : org_id
  organizations ||--o{ etes : org_id
  organizations ||--o{ water_sources : org_id
  organizations ||--o{ production_systems : org_id
  organizations ||--o{ distribution_metrics : org_id
  organizations ||--o{ investments_planning : org_id
  agencias_reguladoras ||--o{ concessionarias : agencia_reguladora_id
  concessionarias ||--o{ etes : concessionaria_id
  etes ||--o{ dbo_medicoes : ete_id
  etes ||--o{ cortex_predicoes : ete_id
  water_sources ||--o{ production_systems : water_source_id
  atlas_import_batches ||--o{ investments_planning : import_batch_id
  cortex_modelos ||--o{ cortex_modelos_fontes : modelo_id
  cortex_modelos ||--o{ cortex_predicoes : modelo_id
  cortex_modelos ||--o{ cortex_thresholds : modelo_id
  repositorios_artefatos ||--o{ cortex_modelos_fontes : repositorio_id
  bases_dados_externas ||--o{ cortex_modelos_fontes : base_dados_id
  organizations ||--o{ access_audit_log : org_id
```

## Hierarquia de visibilidade

```mermaid
flowchart TD
  ANA[ANA - orgao federal] --> AR[Agencia Reguladora estadual ou municipal]
  AR --> PRE[Prestador / Concessionaria]
  PRE --> ETE[ETE / Sistema produtor]
  ETE --> MED[Medicoes DBO e indicadores]
  ANA -.-> RLS[[can_access_org: org do usuario + subarvore]]
  AR -.-> RLS
  PRE -.-> RLS
```

## Fluxo Córtex IA

```mermaid
flowchart LR
  ATLAS[Atlas Esgotos ANA] --> ING[cortex-ingest-atlas]
  ING --> IND[(atlas_indicadores)]
  MED[(dbo_medicoes)] --> INF[cortex-infer]
  IND --> INF
  FON[(repositorios / bases / MCP)] --> INF
  INF --> PRED[(cortex_predicoes)]
  PRED --> UI[Command Center / CortexTab]
  THR[(cortex_thresholds)] --> UI
```

Tabelas sem relacionamento por chave estrangeira (isoladas por natureza): `user_roles` (liga a `auth.users`),
`audit_log`, `api_probe_log`, `atlas_indicadores`, `ldap_config`, `smtp_config`, `sei_config`,
`system_parameters`, `cron_config`.
