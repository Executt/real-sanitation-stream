# Rotas e Endpoints — HydrosNet

## Rotas do Frontend (React Router)

| Rota | Componente | Acesso | Descrição |
|------|-----------|--------|-----------|
| `/login` | `Login` | Público | Tela de autenticação split-screen (login + cadastro) |
| `/` | `OperadorDashboard` | Autenticado | Redirect para dashboard do operador |
| `/operador` | `OperadorDashboard` | Autenticado | Dashboard principal do operador B2B |
| `/operador/cadastro` | `CadastroManual` | Autenticado | Formulário de cadastro manual de dados ETE |
| `/operador/api` | — | Autenticado | Monitoramento API (placeholder) |
| `/operador/logs` | — | Autenticado | Log de integração (placeholder) |
| `/command-center` | `CommandCenter` | Autenticado | Centro de comando ANA |
| `/command-center/tendencia` | — | Autenticado | Tendência DBO (placeholder) |
| `/command-center/mapa` | — | Autenticado | Mapa interativo (placeholder) |
| `/command-center/alertas` | — | Autenticado | Alertas DBO (placeholder) |
| `/command-center/conformidade` | — | Autenticado | Conformidade (placeholder) |
| `/admin` | `AdminPanel` | Superadmin | Painel de administração de usuários e roles |
| `/admin/ldap` | `LdapConfig` | Superadmin | Configuração de integração LDAP/AD |
| `*` | `NotFound` | Público | Página 404 |

## Edge Functions (Backend)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/seed-admin` | POST | Cria/atualiza o usuário superadmin (`admin@ana.gov.br`) |

## APIs Consumidas (Supabase Client)

| Tabela | Operações | Onde é usado |
|--------|-----------|-------------|
| `profiles` | SELECT, INSERT, UPDATE | AuthContext, AdminPanel |
| `user_roles` | SELECT, INSERT, DELETE | AuthContext, AdminPanel |
| `auth.signInWithPassword` | — | Login |
| `auth.signUp` | — | Login (cadastro) |
| `auth.signOut` | — | TopNavbar |
| `auth.getSession` | — | AuthContext |
| `auth.onAuthStateChange` | — | AuthContext |

## Navegação (TopNavbar)

| Menu | Itens | Visibilidade |
|------|-------|-------------|
| Operador B2B | Status ETEs, Cadastro Manual, Monitoramento API, Log de Integração | Todos autenticados |
| ANA Center | Command Center, Tendência DBO, Mapa Interativo, Alertas DBO, Conformidade | Todos autenticados |
| Administração | Usuários & Roles, Configuração LDAP | Apenas superadmin |
