# Configuração Lovable Cloud — HydrosNet

## Visão Geral

O HydrosNet utiliza Lovable Cloud como backend, fornecendo autenticação, banco PostgreSQL com RLS, edge functions e secrets gerenciados.

## Serviços Ativos

### Autenticação
- **Métodos:** e-mail/senha (ativo), LDAP/AD (módulo administrativo).
- **Trigger:** criação automática de perfil via `handle_new_user()`.
- **Auto-confirm:** habilitado em desenvolvimento.

### Banco de Dados
- **Tabelas:** `profiles`, `user_roles`.
- **Enum:** `app_role` (`operador`, `gestor_ana`, `superadmin`).
- **RLS:** habilitada em todas as tabelas.
- **Funções:** `has_role()`, `handle_new_user()`, `update_updated_at_column()`.

### Edge Functions
| Função | Descrição |
|--------|-----------|
| `seed-admin` | Cria/atualiza o superadmin inicial (`admin@ana.gov.br`) |

## Secrets Configuradas

| Nome | Descrição |
|------|-----------|
| `LOVABLE_API_KEY` | Chave da Lovable AI Gateway |
| `SUPABASE_URL` | URL do projeto |
| `SUPABASE_ANON_KEY` | Chave pública (anon) |
| `SUPABASE_PUBLISHABLE_KEY` | Chave pública (publishable) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (admin) |
| `SUPABASE_DB_URL` | URL de conexão direta ao banco |

## Variáveis de Ambiente (Frontend)

| Variável | Uso |
|----------|-----|
| `VITE_SUPABASE_URL` | URL do backend |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave anon para o cliente |
| `VITE_SUPABASE_PROJECT_ID` | ID do projeto |

## Hub de Administração

A página `/admin` agrega todas as parametrizações:

| Módulo | Rota | Status |
|--------|------|--------|
| Usuários & Roles | `/admin/usuarios` | ✅ Ativo |
| LDAP/AD | `/admin/ldap` | ✅ UI ativa (backend planejado) |
| SMTP | `/admin/smtp` | ✅ UI ativa (backend planejado) |
| SEI | `/admin/sei` | ✅ UI ativa (backend planejado) |
| Parâmetros Gerais | `/admin/parametros` | ✅ UI ativa (backend planejado) |
| Auditoria & Segurança | `/admin/auditoria` | ✅ UI ativa (backend planejado) |

## Roadmap Backend

Próximos componentes a serem implementados via edge functions + tabelas:

- `ldap-sync` — sincronização periódica de diretório.
- `smtp-test` — envio real de e-mail de teste.
- `sei-create-process` — abertura de processo no SEI.
- Tabela `audit_log` com inserção via triggers.
- Tabelas `ldap_config`, `smtp_config`, `sei_config`, `system_parameters`.
