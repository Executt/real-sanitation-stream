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
- SELECT: Todos os usuários autenticados.
- INSERT/UPDATE: Apenas o próprio usuário.

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
- ALL: Superadmins gerenciam todas as roles.
- SELECT: Usuários veem suas próprias roles.

## Funções SQL

### `has_role(_user_id uuid, _role app_role) → boolean`
Verifica se um usuário possui determinada role. `SECURITY DEFINER` para evitar recursão RLS.

### `handle_new_user() → trigger`
Trigger após inserção em `auth.users`. Cria registro em `profiles`.

### `update_updated_at_column() → trigger`
Atualiza `updated_at` antes de UPDATE.

## Edge Functions

### `seed-admin`
Cria ou atualiza o usuário superadmin `admin@ana.gov.br` e atribui `superadmin`.

## Tabelas Planejadas (Roadmap)

Estas tabelas estão previstas e referenciadas pelos módulos administrativos do frontend; serão criadas via migrations conforme cada módulo for ativado:

- `etes` — Cadastro de Estações de Tratamento de Esgoto.
- `medicoes` — Time-series de medições de DBO/DQO/Vazão (TimescaleDB).
- `ldap_config` — Configuração de servidor LDAP/AD.
- `smtp_config` — Configuração SMTP.
- `sei_config` — Configuração da integração SEI.
- `system_parameters` — Parâmetros globais do sistema.
- `audit_log` — Trilha de auditoria de ações críticas.

## Diagrama de Relacionamento

```
auth.users (Supabase)
    │
    ├── 1:1 ── profiles (via user_id)
    └── 1:N ── user_roles (via user_id)
```
