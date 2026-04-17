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
| DB | PostgreSQL 15 + RLS |
| Auth | Supabase Auth + RBAC + LDAP |
| Edge Functions | Deno (TypeScript) |

## Estrutura de Diretórios

```
.
├── src/
│   ├── components/
│   │   ├── ui/                   # shadcn/ui (42 componentes)
│   │   ├── TopNavbar.tsx
│   │   ├── DashboardLayout.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── EteMap.tsx
│   │   ├── EteStatusTable.tsx
│   │   ├── DboTrendChart.tsx
│   │   ├── StatCard.tsx
│   │   ├── AlertItem.tsx
│   │   └── NavLink.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── integrations/supabase/    # Auto-gerado
│   ├── lib/utils.ts
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── OperadorDashboard.tsx
│   │   ├── CommandCenter.tsx
│   │   ├── CadastroManual.tsx
│   │   ├── AdminHub.tsx          # ★ Hub de Administração
│   │   ├── AdminPanel.tsx
│   │   ├── LdapConfig.tsx
│   │   ├── SmtpConfig.tsx
│   │   ├── SeiConfig.tsx
│   │   ├── SystemParameters.tsx
│   │   ├── AuditLog.tsx
│   │   ├── PlaceholderPage.tsx
│   │   ├── Index.tsx
│   │   └── NotFound.tsx
│   ├── App.tsx
│   └── main.tsx
├── supabase/
│   ├── functions/seed-admin/
│   └── config.toml
└── docs/                          # README, ARCHITECTURE, etc.
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
│  Lovable Cloud — PostgreSQL + RLS + Auth     │
└──────────────────────────────────────────────┘
```

## Mapa de Rotas

### Públicas
- `/login`

### Autenticadas
- `/`, `/operador`, `/operador/cadastro`
- `/operador/api`, `/operador/logs` (placeholders)
- `/command-center`
- `/command-center/{tendencia,mapa,alertas,conformidade}` (placeholders)

### Superadmin
- `/admin` — **Hub de Administração**
- `/admin/usuarios`, `/admin/ldap`, `/admin/smtp`, `/admin/sei`, `/admin/parametros`, `/admin/auditoria`

## Padrões Adotados

- Design tokens HSL em `index.css` e `tailwind.config.ts`.
- Componentes funcionais com hooks.
- RBAC client-side via guards; validação efetiva no backend (RLS).
- Páginas placeholder padronizadas para rotas em desenvolvimento (sem 404).
- Hub de Administração agregando todas as parametrizações em uma única entrada.
