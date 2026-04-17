# Segurança — HydrosNet

Documento abrangente de segurança da plataforma. Para políticas RLS específicas, ver [SECURITY_POLICIES.md](./SECURITY_POLICIES.md).

## Modelo de Ameaças (resumo)

| Ameaça | Mitigação |
|--------|-----------|
| Escalação de privilégios via cliente | Roles em tabela separada + verificação por RLS |
| Vazamento de dados entre operadores | RLS por organização (planejado) |
| Acesso a admin sem autorização | `has_role()` em RLS + `ProtectedRoute` no frontend |
| SQL injection | Cliente Supabase com queries parametrizadas; **proibido `rpc("execute_sql")`** |
| XSS | React escapa por padrão; nunca usar `dangerouslySetInnerHTML` com input do usuário |
| CSRF em edge functions | JWT + CORS restritivo |
| Roubo de credenciais | Hashing PBKDF2 do Supabase, HTTPS, secrets fora do código |
| Brute-force de login | Rate limit do Supabase Auth |

## Autenticação

- **Provedores:** e-mail/senha (ativo), LDAP/AD (módulo administrativo).
- **Sessão:** JWT armazenado pelo Supabase Auth no `localStorage` com refresh automático.
- **Logout:** invalida a sessão local e remota.
- **Confirmação de e-mail:** habilitada em produção; auto-confirm apenas em dev.

## Autorização (RBAC)

Três roles, em tabela `user_roles` separada de `profiles`:

| Role | Capacidades |
|------|-------------|
| `operador` | Painel operador, cadastro manual |
| `gestor_ana` | Centro de comando, indicadores nacionais |
| `superadmin` | Acesso total + administração |

Verificação **em duas camadas**:
1. **Frontend:** `ProtectedRoute` + `useAuth().isSuperAdmin` → UX.
2. **Backend:** RLS com `has_role()` → segurança real.

## Gestão de Secrets

| Local | Como armazenar |
|-------|---------------|
| Supabase Edge Functions | Secrets do projeto (`SUPABASE_SERVICE_ROLE_KEY`, etc.) |
| Frontend | Apenas chaves **publishable** (`VITE_SUPABASE_PUBLISHABLE_KEY`) |
| LDAP/SMTP/SEI | Tabelas de config no DB com RLS restrita a superadmin |

❌ **Nunca** comitar chaves privadas no repositório.

## Criptografia

- **Em trânsito:** HTTPS/TLS obrigatório (Lovable Cloud).
- **Em repouso:** AES-256 (gerenciado pelo Supabase/Postgres).
- **LDAP:** suporte LDAPS (TLS) configurável.
- **SMTP:** STARTTLS/SSL obrigatórios para envio.

## Auditoria

- Tabela `audit_log` (planejada) registra: login, logout, mudança de role, alteração de configuração, importação LDAP, abertura de processo SEI.
- Visualização em `/admin/auditoria` (apenas superadmin).
- Retenção configurável em `/admin/parametros` (default: 365 dias).

## Conformidade

- **LGPD:** dados pessoais limitados ao essencial; direito ao esquecimento via remoção de perfil.
- **ANA:** alinhado ao SNIRH e Atlas Esgotos.
- **Gov.br:** suporte planejado para autenticação federada.

## Procedimentos de Resposta a Incidentes

1. Revogar sessões via Supabase Auth (`auth.admin.signOut`).
2. Rotacionar `SUPABASE_SERVICE_ROLE_KEY` se comprometida.
3. Inspecionar `audit_log` para identificar escopo.
4. Notificar usuários afetados (LGPD art. 48).
5. Documentar e revisar políticas.

## Boas Práticas para Desenvolvedores

✅ Sempre habilitar RLS em novas tabelas.
✅ Usar `has_role()` para verificações de papel.
✅ Validar input em edge functions com Zod.
✅ Limitar consultas com `.limit()`.
✅ Logs em edge functions sem PII.
❌ Nunca usar `service_role` no frontend.
❌ Nunca confiar em validação só do cliente.
❌ Nunca expor erros do banco diretamente ao usuário.
