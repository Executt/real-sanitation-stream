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

## Tabelas de Configuração Administrativa

### `ldap_config` (singleton)
Configuração do servidor LDAP/AD. Campos: `enabled`, `host`, `port`, `use_tls`, `base_dn`, `bind_dn`, `bind_password`, `user_filter`, `attr_email`, `attr_name`, `attr_org`, `default_role` (`app_role`).
**RLS:** apenas `superadmin` (ALL).

### `smtp_config` (singleton)
Configuração SMTP. Campos: `enabled`, `host`, `port`, `username`, `password`, `from_email`, `from_name`, `use_tls`.
**RLS:** apenas `superadmin` (ALL).

### `sei_config` (singleton)
Integração SEI. Campos: `enabled`, `api_url`, `api_key`, `orgao_id`, `unidade_id`, `tipo_processo`.
**RLS:** apenas `superadmin` (ALL).

### `system_parameters` (singleton)
Parâmetros gerais. Campos: `dbo_min`, `dbo_critico`, `api_timeout_seconds`, `sync_interval_minutes`, `retention_days`, `max_upload_mb`.
**RLS:** apenas `superadmin` (ALL).

### `audit_log` (append-only)
Trilha de auditoria imutável. Campos: `user_id`, `user_email`, `action`, `target`, `severity`, `metadata` (jsonb), `created_at`.
**RLS:**
- SELECT: apenas `superadmin`.
- INSERT: qualquer usuário autenticado (apenas com seu próprio `user_id` ou nulo).
- UPDATE/DELETE: bloqueado (sem políticas).
**Índices:** `created_at DESC`, `user_id`.

## Tabelas Planejadas (Roadmap)

- `etes` — Cadastro de Estações de Tratamento de Esgoto.
- `medicoes` — Time-series de medições de DBO/DQO/Vazão (TimescaleDB).

## Diagrama de Relacionamento

```
auth.users (Supabase)
    │
    ├── 1:1 ── profiles (via user_id)
    └── 1:N ── user_roles (via user_id)
```
