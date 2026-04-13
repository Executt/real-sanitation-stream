# Arquitetura do Sistema — HydrosNet

## Diagrama de Alto Nível

```
┌─────────────────────────────────────────────────┐
│                    Frontend                      │
│  React 18 + Vite 5 + TypeScript + Tailwind CSS  │
│                                                  │
│  ┌──────────┐ ┌───────────┐ ┌────────────────┐  │
│  │  Pages   │ │Components │ │   Contexts     │  │
│  └──────────┘ └───────────┘ └────────────────┘  │
└──────────────────┬──────────────────────────────┘
                   │ Supabase JS SDK
┌──────────────────▼──────────────────────────────┐
│              Lovable Cloud (Supabase)            │
│  ┌──────────┐ ┌───────────┐ ┌────────────────┐  │
│  │   Auth   │ │ Database  │ │ Edge Functions │  │
│  │ (email)  │ │(PostgreSQL│ │  (Deno)        │  │
│  └──────────┘ │  + RLS)   │ └────────────────┘  │
│               └───────────┘                      │
└─────────────────────────────────────────────────┘
```

## Camadas

### 1. Apresentação (Frontend)
- **Pages**: Login, OperadorDashboard, CommandCenter, CadastroManual, AdminPanel, NotFound
- **Components**: StatCard, EteStatusTable, AlertItem, DboTrendChart, AppSidebar, DashboardLayout, ProtectedRoute, NavLink
- **Contexts**: AuthContext (sessão, perfil, roles)
- **UI Library**: shadcn/ui com tokens semânticos em `index.css`

### 2. Roteamento
- React Router v6 com layout aninhado (`DashboardLayout` com `Outlet`)
- Proteção de rotas via `ProtectedRoute` com verificação de sessão e roles

### 3. Estado
- AuthContext para estado de autenticação global
- React Query para cache e sincronização de dados
- Estado local via `useState` para formulários

### 4. Backend (Lovable Cloud)
- **Auth**: Supabase Auth com e-mail/senha, auto-confirm habilitado
- **Database**: PostgreSQL com RLS, tabelas `profiles` e `user_roles`
- **Edge Functions**: `seed-admin` para criação do superadmin inicial
- **Funções SQL**: `has_role()`, `handle_new_user()`, `update_updated_at_column()`

### 5. Segurança
- Row Level Security (RLS) em todas as tabelas
- Roles armazenadas em tabela separada (`user_roles`)
- Função `has_role()` com `SECURITY DEFINER` para evitar recursão RLS
- Trigger para criação automática de perfil no signup
