# Políticas de Segurança — HydrosNet

Autorização real acontece **no banco**. O frontend apenas antecipa a decisão para melhorar a experiência.

## Camadas

1. **Autenticação** — Supabase Auth (e-mail/senha, Google, LDAP via `ldap-sync`). Sessão em `localStorage`, refresh automático.
2. **Guard de rota** — `ProtectedRoute` (`requiredRole`, bypass para `superadmin`). Ver `docs/ROUTES.md`.
3. **GRANT** — `anon` sem privilégio em `public`; `authenticated` com CRUD; `service_role` com tudo.
4. **RLS** — política por tabela usando `has_role()` e `can_access_org()`.
5. **Triggers de auditoria** — `log_audit_event()` em tabelas sensíveis; `log_access()` nos módulos de consulta.

## Papéis

| Papel | Escopo | Pode |
|-------|--------|------|
| `operador` | Prestador ao qual está vinculado | Ver e lançar dados das próprias ETEs |
| `gestor_ar` | Agência reguladora + prestadores subordinados | Ler tudo na jurisdição; não altera cadastro nacional |
| `gestor_ana` | Nacional | Ler tudo; gerir dados de referência do Atlas |
| `superadmin` | Global | Tudo, incluindo configuração e papéis |

Papéis vivem **exclusivamente** em `user_roles`. Nunca em `profiles`, nunca em `localStorage`, nunca em claims editáveis pelo cliente.

## Funções de escopo

```sql
has_role(auth.uid(), 'gestor_ana')            -- RBAC
can_access_org(org_id)                        -- org do usuário + subárvore recursiva
current_user_concessionaria() / current_user_agencia()  -- escopo legado
```

Todas são `SECURITY DEFINER` com `SET search_path = public`, evitando recursão de RLS e sequestro de search_path.

## Padrões de policy por tipo de tabela

| Tipo | SELECT | INSERT/UPDATE | DELETE |
|------|--------|---------------|--------|
| Operacional com dono (`etes`, `dbo_medicoes`, `water_sources`, `production_systems`, `distribution_metrics`) | `can_access_org(org_id)` ou escopo legado; `gestor_ana`/`superadmin` veem tudo | Mesmo escopo, com `WITH CHECK` idêntico ao `USING` | Restrito ao dono ou superadmin |
| Referência nacional (`investments_planning`, `atlas_indicadores`) | Qualquer autenticado | `gestor_ana` ou `superadmin` | `superadmin` |
| Configuração (`ldap_config`, `smtp_config`, `sei_config`, `system_parameters`, `cron_config`) | `superadmin` | `superadmin` | `superadmin` |
| Auditoria (`audit_log`, `access_audit_log`) | `superadmin` (e `gestor_ana` na trilha de acesso) | Inserção via função `SECURITY DEFINER` | **Negado** |
| Predições (`cortex_predicoes`) | Escopo do registro | **Negado ao cliente** — só `service_role` | Negado |
| Append-only (`api_probe_log`) | Autenticado | INSERT permitido | Negado |

Regra fixa: toda policy de escrita tem `WITH CHECK` equivalente ao `USING`, impedindo que um registro seja
movido para fora do escopo do autor.

## Governança do Córtex IA

Trigger `enforce_falso_afluente` impede `status = 'prod'` em `cortex_modelos` sem:
- `causal_report_url` preenchido, e
- `falso_afluente_checklist` 100% concluído com métricas dos anos anômalos.

A UI exibe o motivo do bloqueio; a validação é do banco e não pode ser burlada pelo cliente.

## Segredos

- Sem chave privada em código ou tabela — apenas `secret_ref`.
- `SUPABASE_SERVICE_ROLE_KEY` restrito às Edge Functions.
- Chave publicável (`anon`) pode aparecer no bundle: sozinha não concede acesso, pois `anon` não tem GRANT.

## Checklist para novas tabelas

1. `CREATE TABLE public.x (...)`
2. `REVOKE ALL ... FROM anon;` + `GRANT ... TO authenticated;` + `GRANT ALL ... TO service_role;`
3. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
4. Policies com `TO authenticated` e `USING`/`WITH CHECK` simétricos
5. Trigger de auditoria se a tabela for sensível
6. Atualizar `docs/DATABASE_SCHEMA.md` e `docs/ER_DIAGRAM.md`
