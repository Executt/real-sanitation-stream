# Arquitetura da Aplicação — HydrosNet

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript 5 + Vite 5 |
| Estilização | Tailwind CSS v3 + design tokens HSL |
| UI | shadcn/ui + Radix Primitives + Lucide |
| Routing | React Router v6 |
| Estado | TanStack Query, React Context |
| Gráficos | Recharts |
| Mapas | Leaflet + React-Leaflet |
| Backend | Lovable Cloud (Supabase) |
| DB | PostgreSQL 15 + RLS + `pg_cron` + `pg_net` |
| Auth | Supabase Auth + RBAC + LDAP + Google |
| Edge Functions | Deno (TypeScript) |

## Estrutura de Diretórios

```
.
├── src/
│   ├── components/
│   │   ├── ui/                       # shadcn/ui (42 componentes)
│   │   ├── TopNavbar.tsx
│   │   ├── DashboardLayout.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── EteMap.tsx
│   │   ├── EteStatusTable.tsx
│   │   ├── DboTrendChart.tsx
│   │   ├── ConformidadeCard.tsx
│   │   ├── AlertasDboPanel.tsx
│   │   ├── EndpointFailuresPanel.tsx
│   │   ├── StatCard.tsx
│   │   ├── StatCardSkeleton.tsx
│   │   ├── AlertItem.tsx
│   │   ├── AppSidebar.tsx
│   │   ├── SidebarFilters.tsx
│   │   └── NavLink.tsx
│   ├── contexts/AuthContext.tsx
│   ├── hooks/{use-mobile,use-toast}.ts
│   ├── integrations/supabase/        # Auto-gerado
│   ├── lib/{utils,bacias}.ts
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Index.tsx                 # Redirect → /operador
│   │   ├── OperadorDashboard.tsx     # KPIs reais (etes + api_probe_log + dbo_medicoes)
│   │   ├── Etes.tsx                  # CRUD de ETEs
│   │   ├── CadastroManual.tsx
│   │   ├── ApiMonitoring.tsx
│   │   ├── IntegrationLog.tsx
│   │   ├── CommandCenter.tsx         # KPIs nacionais
│   │   ├── TendenciaPage.tsx
│   │   ├── MapaPage.tsx
│   │   ├── AlertasDboPage.tsx
│   │   ├── ConformidadePage.tsx
│   │   ├── AdminHub.tsx              # ★ Hub de Administração
│   │   ├── AdminPanel.tsx
│   │   ├── Concessionarias.tsx
│   │   ├── LdapConfig.tsx
│   │   ├── SmtpConfig.tsx
│   │   ├── SeiConfig.tsx
│   │   ├── SystemParameters.tsx
│   │   ├── AuditLog.tsx
│   │   └── NotFound.tsx
│   ├── App.tsx
│   └── main.tsx
├── supabase/
│   ├── functions/
│   │   ├── seed-admin/
│   │   ├── ldap-sync/
│   │   ├── sei-create-process/
│   │   └── smtp-send/
│   └── config.toml
└── docs/                             # README, ARCHITECTURE, DATABASE_SCHEMA, BUSINESS_RULES, etc.
```

## Camadas Lógicas

```
┌──────────────────────────────────────────────┐
│  Apresentação (React + Tailwind + shadcn/ui) │
├──────────────────────────────────────────────┤
│  Roteamento (React Router) + ProtectedRoute  │
├──────────────────────────────────────────────┤
│  Estado (Context + TanStack Query)           │
├──────────────────────────────────────────────┤
│  Cliente Supabase (auth, db, edge fns)       │
├──────────────────────────────────────────────┤
│  Lovable Cloud — PostgreSQL + RLS + Triggers │
│  + pg_cron (ldap-sync) + pg_net              │
└──────────────────────────────────────────────┘
```

## Mapa de Rotas (estado real, sem placeholders)

### Públicas
- `/login`

### Autenticadas (Operador / Gestor ANA)
- `/`, `/operador` — Dashboard B2B
- `/operador/etes` — CRUD de ETEs
- `/operador/cadastro` — Lançamento manual de medições
- `/operador/api` — Monitoramento de probes (persistente em `api_probe_log`)
- `/operador/logs` — Log de integrações automáticas
- `/command-center` — KPIs nacionais
- `/command-center/tendencia` — `DboTrendChart`
- `/command-center/mapa` — `EteMap` (Leaflet)
- `/command-center/alertas` — `AlertasDboPanel`
- `/command-center/conformidade` — `ConformidadeCard`

### Superadmin
- `/admin` — Hub de Administração
- `/admin/usuarios`, `/admin/concessionarias`, `/admin/ldap`, `/admin/smtp`, `/admin/sei`, `/admin/parametros`, `/admin/auditoria`

## Padrões Adotados

- Design tokens HSL em `index.css` e `tailwind.config.ts`.
- Componentes funcionais com hooks; cada painel de domínio é envolvido por `ErrorBoundary` próprio.
- RBAC client-side via `useAuth().hasRole(...)` + guards; validação **efetiva** no backend (RLS + função `has_role`).
- Auditoria automática via triggers `AFTER INSERT/UPDATE/DELETE` em tabelas sensíveis chamando `log_audit_event()`.
- Persistência de probes de integração em `api_probe_log` (com histórico por endpoint).
- Vínculo `profiles.concessionaria_id → concessionarias.id` e `etes.concessionaria_id → concessionarias.id` para escopo de operador.
- Realtime habilitado em `dbo_medicoes` e `api_probe_log` para painéis “ao vivo”.

## Decisões Removidas (cleanup)

- `PlaceholderPage.tsx` removido — todas as rotas têm componentes reais.
- KPIs mockados (`SABESP | ID-OP: 4421-A`, `87.4%` fixos) substituídos por dados do banco.
- Probes inline em `CommandCenter` (duplicados de `ApiMonitoring`) removidos em iteração anterior.
