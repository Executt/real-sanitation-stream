# Políticas de Segurança — Row Level Security (RLS)

Toda tabela em `public` tem RLS **habilitada**. Para a visão geral de segurança, ver [SECURITY.md](./SECURITY.md).

## Princípios

1. RLS sempre ativo em tabelas com dados sensíveis.
2. Roles em tabela separada (`user_roles`) — nunca em `profiles`.
3. Verificação via `has_role()` com `SECURITY DEFINER` (evita recursão).
4. Validação client-side é UX; a verdade está no RLS.
5. Chaves privadas só em secrets do backend.

## Tabela `profiles`

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
```

| Política | Comando | Roles | Expressão |
|----------|---------|-------|-----------|
| Profiles are viewable by authenticated users | SELECT | `authenticated` | `true` |
| Users can insert own profile | INSERT | `authenticated` | with check `auth.uid() = user_id` |
| Users can update own profile | UPDATE | `authenticated` | `auth.uid() = user_id` |

DELETE não é permitido.

## Tabela `user_roles`

```sql
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
```

| Política | Comando | Roles | Expressão |
|----------|---------|-------|-----------|
| Superadmins can manage roles | ALL | `authenticated` | `has_role(auth.uid(), 'superadmin')` |
| Superadmins can view all roles | SELECT | `authenticated` | `has_role(auth.uid(), 'superadmin')` |
| Users can view own roles | SELECT | `authenticated` | `auth.uid() = user_id` |

## Função `has_role()`

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

`SECURITY DEFINER` evita recursão de RLS quando usada dentro de outra política.

## Padrão para Novas Tabelas

```sql
CREATE TABLE public.minha_tabela (...);
ALTER TABLE public.minha_tabela ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read by authenticated" ON public.minha_tabela
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Superadmins manage all" ON public.minha_tabela
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));
```

## Tabelas de Configuração Administrativa (Roadmap)

Tabelas planejadas — todas devem nascer com RLS restrita a `superadmin`:

- `ldap_config`, `smtp_config`, `sei_config`, `system_parameters`, `audit_log`.

## Erros Comuns a Evitar

❌ Armazenar `role` em `profiles` — risco de escalação.
❌ Verificar admin via `localStorage`.
❌ Desabilitar RLS para "facilitar dev".
❌ `WITH CHECK` mais permissivo que `USING`.
❌ Usar `SUPABASE_SERVICE_ROLE_KEY` no frontend.
