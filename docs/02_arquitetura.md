# Arquitetura da Aplicação — HydrosNet

Plataforma Integrada de Saneamento e Segurança Hídrica: monitoramento de esgotamento sanitário,
produção e distribuição de água, índice ISH-U, carteira de investimentos e camada preditiva (Córtex IA),
sob governança multi-tenant hierárquica.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript 5 + Vite 5 |
| Estilização | Tailwind CSS v3 + design tokens HSL |
| UI | shadcn/ui + Radix Primitives + Lucide |
| Routing | React Router v6 |
| Estado | TanStack Query, React Context (`AuthContext`, `OrgContext`) |
| Gráficos | Recharts |
| Mapas | Leaflet + React-Leaflet |
| Backend | Lovable Cloud (Supabase) |
| Banco | PostgreSQL 15 + RLS + `pg_cron` + `pg_net` |
| Auth | Supabase Auth + RBAC + LDAP + Google |
| Edge Functions | Deno (TypeScript) |
| IA | Lovable AI Gateway (`google/gemini-3-flash-preview`) + MCP |
| Testes | Vitest |

## Estrutura de diretórios

```
.
├── docs/                       # Documentação de engenharia (este conjunto)
├── src/
│   ├── components/
│   │   ├── ui/                 # shadcn/ui
│   │   ├── layout/             # DashboardLayout, TopNavbar, AppSidebar, NavLink
│   │   ├── data/               # SortHeader, TablePagination, StatCard, ModuleFilters, HierarchyFilters
│   │   ├── esgoto/             # EteMap, EteStatusTable, DboTrendChart, AlertasDboPanel, ConformidadeCard
│   │   ├── cortex/             # CortexTab, CortexRunStatus, CortexModeloFontes, CortexThresholdsPanel
│   │   └── entity/             # EtesListTab, EntityUsersTab, EntityAuditTab, IntegrationsSnirhTab
│   ├── contexts/               # AuthContext, OrgContext
│   ├── hooks/                  # use-mobile, use-toast, useAccessLog, useCortexRun
│   ├── integrations/supabase/  # Autogerado — não editar
│   ├── lib/                    # utils, bacias, cortex, cortexThresholds, atlasDictionary,
│   │                           # useTable, useHierarchyFilter
│   ├── pages/                  # Uma página por rota (ver docs/06_rotas.md)
│   ├── types/governance.ts
│   ├── App.tsx
│   └── main.tsx
└── supabase/
    ├── functions/              # seed-admin, ldap-sync, sei-create-process, smtp-send,
    │                           # invite-user, cortex-infer, cortex-ingest-atlas
    └── config.toml
```

> Observação: os agrupamentos por domínio acima descrevem a organização lógica pretendida;
> hoje os componentes ainda residem em `src/components/` plano. É a refatoração estrutural recomendada
> quando o diretório passar de ~80 arquivos.

## Camadas lógicas

```
┌──────────────────────────────────────────────────────┐
│ Apresentação — React + Tailwind + shadcn/ui          │
│  ErrorBoundary por painel                            │
├──────────────────────────────────────────────────────┤
│ Roteamento — React Router + ProtectedRoute (RBAC UX) │
├──────────────────────────────────────────────────────┤
│ Estado — AuthContext, OrgContext, TanStack Query     │
│  useTable (paginação/ordenação server-side)          │
│  useHierarchyFilter (filtros em cascata)             │
├──────────────────────────────────────────────────────┤
│ Acesso a dados — cliente Supabase (PostgREST +       │
│  Realtime + functions.invoke)                        │
├──────────────────────────────────────────────────────┤
│ Backend — PostgreSQL + RLS + triggers + pg_cron      │
│  Edge Functions (Deno) para integrações e IA         │
└──────────────────────────────────────────────────────┘
```

## Governança multi-tenant hierárquica

Árvore `organizations` (`parent_id` recursivo): **ANA → Agência Reguladora → Prestador → ETE/Sistema**.
A visibilidade de qualquer registro com `org_id` é resolvida no banco por `can_access_org(org_id)`,
que consulta `org_subtree(current_user_org())`. O frontend usa `OrgContext` apenas para montar filtros
coerentes — nunca como controle de acesso.

O modelo legado (`agencias_reguladoras` → `concessionarias`) continua ativo e ligado à árvore por
`legacy_agencia_id` / `legacy_concessionaria_id`, em convergência gradual para `organizations`.

## Módulos de negócio

| Módulo | Rota base | Tabelas principais |
|--------|-----------|--------------------|
| Esgotamento sanitário | `/operador`, `/command-center` | `etes`, `dbo_medicoes` |
| Mananciais | `/agua/mananciais` | `water_sources` |
| Sistemas produtores | `/agua/sistemas` | `production_systems` |
| Distribuição e perdas | `/distribuicao` | `distribution_metrics` |
| Segurança hídrica urbana | `/ish-u` | view `ish_urban_index` |
| Investimentos EPPO | `/investimentos` | `investments_planning` |
| Córtex IA | `/command-center/cortex` | `cortex_*` |
| Administração | `/admin` | configuração, fontes, auditoria |

## Camada Córtex IA

Detalhe completo em `CORTEX_IA.md`.

```
Atlas ANA ──► cortex-ingest-atlas ──► atlas_indicadores ─┐
dbo_medicoes ────────────────────────────────────────────┼──► cortex-infer ──► cortex_predicoes
repositórios / bases / MCP ──────────────────────────────┘         (Realtime) ──► UI escopada por RLS
```

Governança: trigger `enforce_falso_afluente` bloqueia promoção de modelo a `prod` sem laudo causal e
checklist completo. Job `cortex-infer-daily` roda às 03:00 UTC.

## Padrões adotados

- Design tokens HSL exclusivos; nenhuma cor literal em componente (`docs/01_padronizacao_visual.md`).
- `ErrorBoundary` por painel de domínio — falha isolada não derruba a tela.
- Paginação, ordenação e busca **server-side** em toda tabela (`useTable`), inclusive autocompletes.
- Auditoria dupla: `audit_log` por trigger (alterações) e `access_audit_log` via `log_access` (consultas).
- Realtime em `dbo_medicoes`, `api_probe_log` e `cortex_predicoes`.
- Toda migração que cria tabela em `public` inclui GRANT + RLS na mesma migração.

## Decisões e limpezas registradas

- `PlaceholderPage.tsx` removido — toda rota tem componente real.
- KPIs mockados substituídos por consultas reais.
- Probes duplicados no `CommandCenter` centralizados em `ApiMonitoring`.
- `CommandCenter` reduzido a KPIs; Tendência, Mapa, Alertas e Conformidade viraram rotas próprias.
- `investments_planning.org_id` tornado opcional para acomodar dado nacional do Atlas.

## Evoluções recomendadas

1. Sincronizar filtros de listagem com `searchParams` (links compartilháveis).
2. Concluir a migração do cadastro legado para `organizations` e aposentar as colunas `legacy_*`.
3. Implementar o expurgo automático regido por `system_parameters.retention_days`.
4. Definir o bloco `.dark` de tokens e habilitar tema escuro.
5. Agrupar `src/components/` por domínio conforme a estrutura acima.
6. Exportação de relatórios (PDF/XLSX) nos módulos ISH-U e Investimentos.

## Índice da documentação

| Documento | Conteúdo |
|-----------|----------|
| `docs/01_padronizacao_visual.md` | Cores, tipografia, espaçamento, ícones |
| `docs/02_arquitetura.md` | Stack, diretórios, camadas, módulos |
| `docs/03_banco_de_dados.md` | Visão consolidada: domínios, funções, GRANTs |
| `docs/04_schema_do_banco.md` | Tabelas, colunas, relacionamentos |
| `docs/05_diagrama_er.md` | Diagramas Mermaid |
| `docs/06_rotas.md` | Rotas, RBAC e parâmetros |
| `docs/07_apis_e_integracoes.md` | Edge functions, PostgREST, realtime, segredos |
| `docs/08_frameworks_conformidade.md` | Frameworks GRC e como aplicá-los |
| `docs/09_politicas_seguranca.md` | RLS, autenticação, autorização |
| `docs/13_seguranca_hardening.md` | Práticas, hardening, ameaças |
| `docs/10_pontos_de_funcao.md` | Contagem APF |
| `docs/11_inventario_funcoes.md` | Lista de funcionalidades |
| `docs/12_regras_de_negocio.md` | Regras e validações |
| `docs/14_configuracao_ldap.md` | Configuração e mapeamento de atributos |
