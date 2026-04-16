# Políticas de Segurança — HydrosNet

## Visão Geral

O HydrosNet implementa segurança em múltiplas camadas, desde a autenticação de usuários até o controle de acesso a dados no nível de banco de dados (Row Level Security).

---

## 1. Autenticação

### Método Principal
- **E-mail/Senha** via Supabase Auth
- Senhas com mínimo de 6 caracteres
- Auto-confirm habilitado (ambiente de desenvolvimento)

### LDAP/Active Directory
- Integração configurável com diretórios LDAP
- Importação de usuários com atribuição automática de role
- SSL/TLS opcional (LDAPS)

### Sessão
- Tokens JWT gerenciados pelo Supabase
- Listener `onAuthStateChange` para estado reativo
- `getSession()` para verificação inicial

---

## 2. Autorização (RBAC)

### Roles

| Role | Descrição | Nível de Acesso |
|------|-----------|----------------|
| `operador` | Operador de concessionária B2B | Painel Operador, Cadastro Manual |
| `gestor_ana` | Gestor da Agência Nacional de Águas | Centro de Comando ANA |
| `superadmin` | Administrador do sistema | Acesso total + Administração + LDAP |

### Armazenamento de Roles
- Tabela separada `user_roles` (não no perfil do usuário)
- Previne ataques de escalação de privilégios
- Constraint `UNIQUE(user_id, role)` evita duplicatas

### Verificação de Roles
- Função SQL `has_role()` com `SECURITY DEFINER`
- Evita recursão em políticas RLS
- `search_path` fixo em `public` para segurança

---

## 3. Row Level Security (RLS)

### Tabela `profiles`

| Operação | Regra |
|----------|-------|
| SELECT | Todos os usuários autenticados podem visualizar todos os perfis |
| INSERT | Apenas o próprio usuário (`auth.uid() = user_id`) |
| UPDATE | Apenas o próprio usuário (`auth.uid() = user_id`) |
| DELETE | **Não permitido** |

### Tabela `user_roles`

| Operação | Regra |
|----------|-------|
| ALL (SELECT, INSERT, UPDATE, DELETE) | Superadmins (`has_role(auth.uid(), 'superadmin')`) |
| SELECT | Usuários podem ver suas próprias roles (`auth.uid() = user_id`) |

---

## 4. Proteção de Rotas (Frontend)

### Componente `ProtectedRoute`
- Verifica `session` (autenticação)
- Verifica `requiredRole` (autorização)
- Superadmin tem bypass automático para qualquer role
- Redireciona para `/login` se não autenticado
- Redireciona para `/operador` se role insuficiente

### Navegação Condicional
- Menu "Administração" visível apenas para `superadmin` (`isSuperAdmin`)
- Páginas `/admin/*` protegidas no nível de componente

---

## 5. Edge Functions

### `seed-admin`
- Usa `SUPABASE_SERVICE_ROLE_KEY` (chave de administração)
- Cria usuário e atribui role de superadmin
- Não exposta no frontend (execução manual/deploy)

### Boas Práticas
- Validação CORS em todas as funções
- Validação de input com Zod
- Headers de segurança em todas as respostas
- Nunca executa SQL raw fornecido pelo cliente

---

## 6. Segurança no Banco de Dados

### Funções com SECURITY DEFINER
- `has_role()`: Executa com privilégios do owner, evitando recursão RLS
- `handle_new_user()`: Cria perfil automaticamente com segurança

### Proteções Adicionais
- Nenhuma tabela sem RLS habilitado
- Foreign keys não referenciam `auth.users` diretamente
- Timestamps automáticos via triggers
- `search_path` fixo nas funções para evitar injection
