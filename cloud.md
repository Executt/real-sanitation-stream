# Configuração Lovable Cloud — HydrosNet

## Visão Geral

O HydrosNet utiliza Lovable Cloud como backend, fornecendo autenticação, banco de dados PostgreSQL com Row Level Security (RLS) e edge functions.

## Serviços Ativos

### Autenticação
- **Método**: E-mail e senha
- **Auto-confirm**: Habilitado (para desenvolvimento)
- **Trigger**: Criação automática de perfil no signup via `handle_new_user()`
- **LDAP**: Módulo de configuração disponível no painel de administração

### Banco de Dados
- **Tabelas**: `profiles`, `user_roles`
- **Enum**: `app_role` (operador, gestor_ana, superadmin)
- **RLS**: Ativo em todas as tabelas
- **Funções**: `has_role()`, `handle_new_user()`, `update_updated_at_column()`

### Edge Functions
- **seed-admin**: Criação do usuário superadmin inicial

## Secrets Configuradas

| Nome | Descrição |
|------|-----------|
| `LOVABLE_API_KEY` | Chave da API Lovable |
| `SUPABASE_URL` | URL do projeto |
| `SUPABASE_PUBLISHABLE_KEY` | Chave pública (anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (admin) |
| `SUPABASE_DB_URL` | URL de conexão ao banco |

## Variáveis de Ambiente (Frontend)

| Variável | Uso |
|----------|-----|
| `VITE_SUPABASE_URL` | URL do backend |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave anon para o client |
| `VITE_SUPABASE_PROJECT_ID` | ID do projeto |

## Políticas de Segurança (RLS)

### profiles
- SELECT: Todos os usuários autenticados
- INSERT: Apenas o próprio usuário
- UPDATE: Apenas o próprio usuário

### user_roles
- ALL: Superadmins podem gerenciar todas as roles
- SELECT: Usuários podem ver suas próprias roles

## Integração LDAP

O módulo LDAP é implementado no frontend (`/admin/ldap`) e permite:
- Configuração de servidor LDAP/Active Directory (host, porta, Base DN, Bind DN)
- Suporte a SSL/TLS (LDAPS)
- Mapeamento de atributos LDAP para campos do perfil HydrosNet
- Visualização e importação de usuários do diretório
- Sincronização manual do diretório
- Atribuição automática de role padrão para usuários importados

**Nota**: A integração LDAP completa com backend (edge function para conexão ao servidor LDAP) pode ser implementada conforme necessidade.
