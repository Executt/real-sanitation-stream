# Segurança — Práticas, Hardening e Ameaças

Complemento operacional de `docs/SECURITY_POLICIES.md` (que descreve as regras) — aqui ficam práticas, endurecimento aplicado e modelo de ameaças.

## Hardening aplicado

| Item | Estado |
|------|--------|
| `anon` sem GRANT em `public` (tabelas e views) | Aplicado |
| `ALTER DEFAULT PRIVILEGES` revogando `anon` em tabelas futuras | Aplicado |
| `EXECUTE` das funções de negócio `SECURITY DEFINER` revogado de `anon`/`PUBLIC` | Aplicado |
| `SET search_path = public` em todas as funções `SECURITY DEFINER` | Aplicado |
| Papéis fora de `profiles` (tabela `user_roles` dedicada) | Aplicado |
| Guard de papel nas rotas `/admin/*` e `/agencia` | Aplicado |
| Auditoria imutável (UPDATE/DELETE negados) | Aplicado |
| Credenciais externas por `secret_ref`, nunca em tabela | Aplicado |
| Expurgo automático por `retention_days` | **Pendente** |
| MFA para superadmin | **Pendente** |
| Rate limiting nas Edge Functions públicas | **Pendente** |

## Modelo de ameaças (STRIDE resumido)

| Ameaça | Vetor no HydrosNet | Mitigação |
|--------|--------------------|-----------|
| **Spoofing** | Uso de sessão roubada | Tokens de curta duração + refresh; sessão só via Supabase Auth |
| **Tampering** | Cliente forjando `org_id` ao gravar | `WITH CHECK` simétrico em toda policy de escrita |
| **Repudiation** | Negar alteração de cadastro | `audit_log` por trigger, imutável, com `user_email` |
| **Information disclosure** | Operador acessando ETE de outro prestador | RLS por `can_access_org` + revogação de `anon` |
| **Denial of service** | Loop de inferência do Córtex | Cancelamento via `AbortSignal`, job diário em lote, `api_timeout_seconds` |
| **Elevation of privilege** | Auto-atribuição de papel | Escrita em `user_roles` restrita a `superadmin`; `has_role` é `SECURITY DEFINER` |

## Riscos específicos do domínio

- **Falso afluente**: modelo preditivo aprender correlação espúria e induzir ato regulatório indevido.
  Mitigação: trigger `enforce_falso_afluente` + laudo causal obrigatório + rótulo "apoio à decisão" na UI.
- **Dado de terceiro em base nacional**: `investments_planning` sem `org_id` é público a autenticados por
  desenho (dado do Atlas). Nunca gravar dado operacional sensível sem `org_id`.
- **Vazamento por embed de FK**: `select` com embed pode expor tabela relacionada; RLS é aplicada também no
  embed, mas revise novos embeds em code review.

## Práticas de desenvolvimento

1. Nenhum segredo em código versionado; `.env` gerenciado pela plataforma.
2. Toda migração revisada quanto a GRANT + RLS antes de aplicar (checklist em `SECURITY_POLICIES.md`).
3. Validação de entrada nas Edge Functions antes de qualquer chamada externa.
4. Erros de provedor propagados com status e corpo — sem `500` genérico que esconda a causa.
5. Dependências revisadas periodicamente (scan de dependências).
6. `ErrorBoundary` por painel: falha de um módulo não derruba a tela.

## Resposta a incidentes

1. Identificar escopo em `audit_log` e `access_audit_log` (quem, quando, quais registros).
2. Revogar papéis do usuário afetado em `user_roles`.
3. Rotacionar `secret_ref` das integrações envolvidas.
4. Registrar o incidente e a correção neste documento.
