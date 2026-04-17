# Rotas e Endpoints — HydrosNet

## Rotas do Frontend (React Router)

| Rota | Componente | Acesso | Descrição |
|------|-----------|--------|-----------|
| `/login` | `Login` | Público | Autenticação split-screen (login + cadastro) |
| `/` | `OperadorDashboard` | Autenticado | Dashboard padrão (operador) |
| `/operador` | `OperadorDashboard` | Autenticado | Dashboard principal do operador B2B |
| `/operador/cadastro` | `CadastroManual` | Autenticado | Cadastro manual de dados ETE |
| `/operador/api` | `PlaceholderPage` | Autenticado | Monitoramento API (em desenvolvimento) |
| `/operador/logs` | `PlaceholderPage` | Autenticado | Log de integração (em desenvolvimento) |
| `/command-center` | `CommandCenter` | Autenticado | Centro de Comando ANA |
| `/command-center/tendencia` | `PlaceholderPage` | Autenticado | Tendência DBO (em desenvolvimento) |
| `/command-center/mapa` | `PlaceholderPage` | Autenticado | Mapa Interativo (em desenvolvimento) |
| `/command-center/alertas` | `PlaceholderPage` | Autenticado | Alertas DBO (em desenvolvimento) |
| `/command-center/conformidade` | `PlaceholderPage` | Autenticado | Conformidade (em desenvolvimento) |
| **`/admin`** | **`AdminHub`** | **Superadmin** | **Hub central de administração** |
| `/admin/usuarios` | `AdminPanel` | Superadmin | Gestão de usuários e roles |
| `/admin/ldap` | `LdapConfig` | Superadmin | Configuração LDAP/AD |
| `/admin/smtp` | `SmtpConfig` | Superadmin | Configuração SMTP |
| `/admin/sei` | `SeiConfig` | Superadmin | Integração SEI |
| `/admin/parametros` | `SystemParameters` | Superadmin | Parâmetros gerais |
| `/admin/auditoria` | `AuditLog` | Superadmin | Trilha de auditoria |
| `*` | `NotFound` | Público | Página 404 |

## Edge Functions (Backend)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/seed-admin` | POST | Cria/atualiza o superadmin (`admin@ana.gov.br`) |

## APIs Consumidas (Supabase Client)

| Tabela / Recurso | Operações | Onde é usado |
|-----------------|-----------|-------------|
| `profiles` | SELECT, INSERT, UPDATE | `AuthContext`, `AdminPanel` |
| `user_roles` | SELECT, INSERT, DELETE | `AuthContext`, `AdminPanel` |
| `auth.signInWithPassword` | — | `Login` |
| `auth.signUp` | — | `Login` (cadastro) |
| `auth.signOut` | — | `TopNavbar` |
| `auth.getSession` | — | `AuthContext` |
| `auth.onAuthStateChange` | — | `AuthContext` |

## Navegação (TopNavbar)

| Menu | Itens | Visibilidade |
|------|-------|-------------|
| **Operador B2B** | Status ETEs, Cadastro Manual, Monitoramento API, Log de Integração | Todos autenticados |
| **ANA Center** | Command Center, Tendência DBO, Mapa Interativo, Alertas DBO, Conformidade | Todos autenticados |
| **Administração** | Hub, Usuários & Roles, LDAP, SMTP, SEI, Parâmetros, Auditoria | Apenas superadmin |

## Endpoints REST Planejados (Roadmap)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/ldap-sync` | POST | Sincronização com servidor LDAP/AD |
| `/ldap-import-user` | POST | Importação individual de usuário do diretório |
| `/smtp-test` | POST | Envio de e-mail de teste com configuração SMTP |
| `/sei-create-process` | POST | Abertura de processo no SEI |
| `/ete-import-csv` | POST | Importação em lote de ETEs |
| `/audit-export` | GET | Exportação da trilha de auditoria (CSV/PDF) |
