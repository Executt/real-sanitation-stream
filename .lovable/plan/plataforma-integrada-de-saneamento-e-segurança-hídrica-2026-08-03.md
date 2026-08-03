# Plataforma Integrada de Saneamento e Segurança Hídrica

Evolução do HydrosNet para governança multi-tenant hierárquica (Estado → Município → Concessionária) e cinco módulos de negócio baseados no Atlas Águas / Nota Técnica 4/2022 (ISH-U).

## 1. Governança hierárquica (banco)

Nova tabela `organizations` com auto-relacionamento:

```text
STATE_AGENCY (nível 1)
  └── MUNICIPAL_AGENCY (nível 2)
        └── CONCESSIONAIRE (nível 3)
  └── CONCESSIONAIRE (estadual, direto sob o estado)
```

- `organizations`: id, name, sigla, type, parent_id (FK self), uf, municipio, ibge_code, location_data (jsonb), ativa.
- `profiles.org_id` (FK) passa a ser o vínculo canônico do usuário.
- Função `public.org_subtree(_root uuid)` — CTE recursiva retornando o nó e todos os descendentes.
- Função `public.current_user_org()` (SECURITY DEFINER) e `public.can_access_org(_org uuid)` = `_org ∈ org_subtree(current_user_org())` ou `superadmin`.
- Migração de dados: `agencias_reguladoras` → organizations (STATE/MUNICIPAL conforme esfera); `concessionarias` → organizations (CONCESSIONAIRE, parent = sua AR). Tabelas legadas permanecem com `org_id` para não quebrar telas existentes.

## 2. Módulos e tabelas novas

- **Mananciais e Produção**: `water_sources` (type SURFACE/GROUNDWATER/MIXED, vulnerability_level, gad_metric, vazao, manancial nome, ibge_code), `production_systems` (type ISOLATED/INTEGRATED, status SATISFACTORY/NEEDS_ADEQUATION/NEEDS_AMPLIFICATION, capacidade, demanda).
- **Distribuição e Perdas**: `distribution_metrics` (coverage_percentage, ivi_loss_index, tma_hours, pms_pressure, ano_referencia, classificação técnica derivada do IVI).
- **ISH-U**: view `ish_urban_index` cruzando eficiência de produção (GAD/status do sistema) e de distribuição (cobertura + IVI + TMA + PMS) → classe MINIMA/BAIXA/MEDIA/ALTA/MAXIMA por município/org.
- **Investimentos (EPPOs)**: `investments_planning` (category PRODUCTION/DISTRIBUTION/REPLACEMENT/SEWAGE, tipo EPPO estudo/plano/projeto/obra, estimated_value, horizonte, status).
- **Esgotamento (legado)**: `etes` e `dbo_medicoes` ganham `org_id` alinhado à nova hierarquia.

Todas com GRANTs explícitos, `created_at/updated_at` + trigger, triggers de auditoria e RLS.

## 3. RLS recursiva

Padrão por tabela de módulo:

- SELECT: `public.can_access_org(org_id)` — agência estadual vê toda a subárvore, municipal vê a sua, concessionária só a si.
- INSERT/UPDATE/DELETE: apenas `org_id = current_user_org()` (ou superadmin) — subordinado escreve só o próprio dado; agência audita mas não edita operação alheia.
- `organizations`: leitura da própria subárvore; escrita restrita a superadmin e à agência pai.

## 4. Frontend

- **Menu lateral modular** (substitui/complementa a navbar atual): Esgotamento · Produção de Água · Distribuição e Perdas · Segurança Hídrica (ISH-U) · Investimentos · Córtex IA · Administração.
- **Contexto de organização**: `OrgContext` expõe org atual, tipo, nível e subárvore para filtros em cascata (UF → município → concessionária).
- **Dashboards por nível**:
  - Agências: mapa Leaflet colorido por classe ISH-U (vermelho → azul), filtros em cascata, gráfico consolidado de investimentos por categoria.
  - Concessionária: visão operacional — status dos mananciais, alertas de IVI/TMA, formulários de atualização de obras.
- **Páginas novas**: `/agua/mananciais`, `/agua/sistemas`, `/distribuicao`, `/ish-u`, `/investimentos`, cada uma com CRUD/tabela paginada (reuso de `useTable`, `SortHeader`, `TablePagination`).
- **Design system**: mantém a base institucional atual (Precision Industrial / gov.br), adiciona tokens semânticos para a escala ISH-U de 5 classes.

## 5. Carga dos dados do Atlas

Edge function `atlas-import` + script de ingestão das planilhas enviadas (Mananciais/Sistemas, Investimentos Produção, Distribuição v2, UF, Indicadores ISH) para popular `water_sources`, `production_systems`, `distribution_metrics` e `investments_planning` por código IBGE.

## Ordem de execução

1. Migração 1: `organizations`, funções recursivas, `profiles.org_id`, backfill a partir de agências/concessionárias.
2. Migração 2: tabelas dos módulos + RLS + GRANTs + view ISH-U.
3. Frontend: OrgContext, menu lateral modular, rotas.
4. Páginas de módulo com tabelas e formulários.
5. Dashboards ISH-U (mapa + KPIs) e Investimentos.
6. Ingestão das planilhas do Atlas e atualização de README/ARCHITECTURE/DATABASE_SCHEMA.

## Detalhes técnicos

- Hierarquia resolvida com `WITH RECURSIVE` dentro de funções `SECURITY DEFINER` para evitar recursão de RLS.
- ISH-U calculado como view `security_invoker=on`, herdando o RLS das tabelas base.
- Compatibilidade: telas atuais (ETEs, Córtex, Concessionárias, Agências) continuam funcionando sobre as tabelas legadas, agora espelhadas em `organizations`.
