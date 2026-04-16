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
│  │(email+   │ │(PostgreSQL│ │  (Deno)        │  │
│  │ LDAP)    │ │  + RLS)   │ └────────────────┘  │
│  └──────────┘ └───────────┘                      │
└─────────────────────────────────────────────────┘
```

## Camadas

### 1. Apresentação (Frontend)
- **Pages**: Login, OperadorDashboard, CommandCenter, CadastroManual, AdminPanel, LdapConfig, NotFound
- **Components**: TopNavbar, DashboardLayout, ProtectedRoute, NavLink, StatCard, EteStatusTable, AlertItem, DboTrendChart, EteMap
- **Contexts**: AuthContext (sessão, perfil, roles)
- **UI Library**: shadcn/ui com tokens semânticos em `index.css`

### 2. Navegação
- Navegação horizontal superior (TopNavbar) com menus dropdown
- Menus organizados por contexto: Operador B2B, ANA Center, Administração
- Menu mobile responsivo com hamburger menu
- React Router v6 com layout aninhado (`DashboardLayout` com `Outlet`)
- Proteção de rotas via `ProtectedRoute` com verificação de sessão e roles

### 3. Estado
- AuthContext para estado de autenticação global
- React Query para cache e sincronização de dados
- Estado local via `useState` para formulários e UI

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

### 6. Integração LDAP
- Módulo de configuração no painel de administração
- Conexão com diretórios LDAP/Active Directory
- Mapeamento de atributos LDAP → perfil HydrosNet
- Importação e sincronização de usuários
- Atribuição automática de role padrão

### 7. Visualização de Dados
- **Recharts**: Gráficos de tendência DBO por bacia hidrográfica
- **Leaflet/React-Leaflet**: Mapa interativo com marcadores georreferenciados
- **Marcadores customizados**: SVG coloridos por status (ativa/construção/inativa)

## Estrutura de Diretórios

```
src/
├── components/
│   ├── ui/              # shadcn/ui components (42+)
│   ├── TopNavbar.tsx    # Navegação horizontal superior
│   ├── DashboardLayout.tsx # Layout principal
│   ├── ProtectedRoute.tsx  # Guarda de rota
│   ├── NavLink.tsx      # Link com estado ativo
│   ├── StatCard.tsx     # Card de indicador
│   ├── EteStatusTable.tsx  # Tabela de status
│   ├── AlertItem.tsx    # Item de alerta
│   ├── DboTrendChart.tsx   # Gráfico Recharts
│   └── EteMap.tsx       # Mapa Leaflet
├── contexts/
│   └── AuthContext.tsx   # Contexto de autenticação
├── hooks/
│   ├── use-mobile.tsx   # Detecção de mobile
│   └── use-toast.ts     # Toast notifications
├── integrations/
│   └── supabase/
│       ├── client.ts    # Cliente Supabase (auto-gen)
│       └── types.ts     # Tipos do DB (auto-gen)
├── lib/
│   └── utils.ts         # Utilitário cn()
├── pages/
│   ├── Login.tsx        # Tela de login split-screen
│   ├── OperadorDashboard.tsx
│   ├── CommandCenter.tsx
│   ├── CadastroManual.tsx
│   ├── AdminPanel.tsx
│   ├── LdapConfig.tsx   # Configuração LDAP
│   ├── Index.tsx
│   └── NotFound.tsx
├── App.tsx              # Rotas e providers
├── main.tsx             # Entry point
└── index.css            # Design tokens
```
