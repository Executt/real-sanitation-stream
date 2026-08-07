# LDAP / Active Directory — HydrosNet

Integração de diretório corporativo para autenticação e provisionamento de usuários.
Configuração em `/admin/ldap` (somente `superadmin`), persistida na tabela `ldap_config` (linha única).

## Parâmetros

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `enabled` | boolean | Liga/desliga a sincronização |
| `host` | text | Servidor LDAP |
| `port` | integer | 389 (StartTLS) ou 636 (LDAPS) |
| `use_tls` | boolean | Exige canal cifrado |
| `base_dn` | text | Ex.: `dc=ana,dc=gov,dc=br` |
| `bind_dn` | text | Conta de serviço de leitura |
| `bind_password` | text | Senha da conta de serviço |
| `user_filter` | text | Ex.: `(&(objectClass=person)(mail=*))` |
| `attr_email` | text | Atributo de e-mail (`mail`) |
| `attr_name` | text | Atributo de nome (`displayName` / `cn`) |
| `attr_org` | text | Atributo de organização (`department` / `o`) |
| `default_role` | `app_role` | Papel atribuído a novo usuário sincronizado |

## Mapeamento de atributos

| LDAP | Destino |
|------|---------|
| `attr_email` | `auth.users.email` (chave de identidade) |
| `attr_name` | `profiles.full_name` |
| `attr_org` | `profiles.organization` e tentativa de casamento com `organizations.name`/`sigla` para preencher `org_id` |
| — | `user_roles.role` = `default_role` na criação |

Regras:
- **E-mail é a chave**. Usuário existente é atualizado, nunca duplicado.
- Papel só é atribuído na **criação**. Alterações posteriores feitas em `/admin/usuarios` não são sobrescritas pela sincronização.
- Se `attr_org` não casar com nenhuma organização, o usuário fica sem `org_id` — e, por RN-09, sem acesso a dado operacional até ser vinculado manualmente.
- Usuário removido do diretório não é excluído automaticamente; é sinalizado para revisão do administrador.

## Sincronização

Executada pela Edge Function `ldap-sync`, agendada por `pg_cron` conforme
`system_parameters.sync_interval_minutes`. O trigger `reschedule_ldap_sync_on_change` reagenda o job
sempre que `ldap_config` é alterada; a URL e a chave usadas pelo job ficam em `cron_config`.

Fluxo por execução:
1. Lê `ldap_config` (aborta se `enabled = false`).
2. Faz bind com `bind_dn` / `bind_password`.
3. Busca em `base_dn` aplicando `user_filter`.
4. Para cada entrada: upsert em `auth.users` + `profiles`; cria `user_roles` se for usuário novo.
5. Registra o resultado em `audit_log` (severidade `info` em sucesso, `error` em falha).

## Segurança

- Sempre usar `use_tls = true`; bind sem cifra expõe a senha da conta de serviço.
- A conta de serviço deve ter **somente leitura** e escopo restrito à OU necessária.
- `ldap_config` é legível apenas por `superadmin` (RLS) e `service_role`; `anon` não tem GRANT.
- Nenhuma senha de usuário final trafega ou é armazenada — a autenticação é validada no diretório.

## Diagnóstico

| Sintoma | Causa provável |
|---------|----------------|
| Nenhum usuário sincronizado | `user_filter` restritivo demais ou `base_dn` incorreto |
| Falha de bind | Credencial expirada ou TLS exigido pelo servidor com `use_tls = false` |
| Usuário criado sem organização | `attr_org` ausente ou sem correspondência em `organizations` |
| Job não executa | `ldap_config.enabled = false` ou `cron_config` sem URL/chave |

Os erros de cada execução ficam em `audit_log`, visíveis em `/admin/auditoria` e `/operador/logs`.
