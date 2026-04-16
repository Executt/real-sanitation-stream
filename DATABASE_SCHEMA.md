# Esquema do Banco de Dados — HydrosNet

## Enums

### `app_role`
```sql
CREATE TYPE public.app_role AS ENUM ('operador', 'gestor_ana', 'superadmin');
```

## Tabelas

### `profiles`
Armazena informações de perfil dos usuários.

| Coluna | Tipo | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | Não | `gen_random_uuid()` |
| `user_id` | uuid | Não | — |
| `full_name` | text | Sim | — |
| `organization` | text | Sim | — |
| `position` | text | Sim | — |
| `avatar_url` | text | Sim | — |
| `created_at` | timestamptz | Não | `now()` |
| `updated_at` | timestamptz | Não | `now()` |

**Políticas RLS:**
- Usuários autenticados podem visualizar todos os perfis
- Usuários podem inserir e atualizar apenas o próprio perfil

---

### `user_roles`
Armazena as roles atribuídas a cada usuário.

| Coluna | Tipo | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | Não | `gen_random_uuid()` |
| `user_id` | uuid | Não | — |
| `role` | `app_role` | Não | — |
| `created_at` | timestamptz | Não | `now()` |

**Políticas RLS:**
- Superadmins podem gerenciar (CRUD) todas as roles
- Usuários podem visualizar apenas as próprias roles

## Funções SQL

### `has_role(_user_id uuid, _role app_role) → boolean`
Verifica se um usuário possui determinada role. Usa `SECURITY DEFINER` para evitar recursão RLS.

### `handle_new_user() → trigger`
Trigger executado após inserção em `auth.users`. Cria automaticamente um registro em `profiles`.

### `update_updated_at_column() → trigger`
Atualiza o campo `updated_at` automaticamente antes de um `UPDATE`.

## Edge Functions

### `seed-admin`
Cria ou atualiza o usuário superadmin `admin@ana.gov.br` e atribui a role `superadmin`.

## Diagrama de Relacionamento

```
auth.users (gerenciado pelo Supabase)
    │
    ├── 1:1 ── profiles (via user_id)
    │           Perfil completo do usuário
    │
    └── 1:N ── user_roles (via user_id)
                Roles atribuídas ao usuário
```
