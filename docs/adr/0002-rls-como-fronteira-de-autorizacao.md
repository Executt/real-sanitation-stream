# ADR-0002 — Autorização por RLS no PostgreSQL, não na aplicação

- **Data**: 2026-08-03
- **Estado**: Aceito
- **Contexto correlato**: `docs/09_politicas_seguranca.md`, `docs/13_seguranca_hardening.md`, RN-02, RN-09

## Contexto

O cliente web fala com o banco via PostgREST com a chave publicável. Qualquer usuário autenticado pode
montar requisições arbitrárias fora da UI. Um modelo de autorização implementado em serviço de
aplicação seria contornável, e a plataforma trata dado operacional de terceiros (prestadores
concorrentes sob a mesma agência), onde vazamento horizontal é o risco mais caro.

## Decisão

A autorização é responsabilidade do banco:

1. Toda tabela do schema `public` tem RLS habilitada e ao menos uma policy explícita.
2. Toda tabela nova recebe `GRANT` explícito no mesmo migration; `anon` só recebe GRANT quando existe
   policy que o permita — o padrão é não receber.
3. Papéis ficam em `user_roles` (nunca em `profiles`), lidos por `has_role()` `SECURITY DEFINER` para
   evitar recursão de policy.
4. Toda policy de escrita tem `WITH CHECK` simétrico ao `USING` — impede o cliente de gravar registro
   fora do próprio escopo.
5. Trilhas de auditoria negam `UPDATE` e `DELETE` por policy.

A UI aplica os mesmos filtros por conveniência e desempenho, jamais como fronteira.

## Alternativas consideradas

| Alternativa | Por que não |
|-------------|-------------|
| API própria com autorização em middleware | Duplica a fronteira e exige bloquear PostgREST; mais superfície para manter |
| Views `SECURITY DEFINER` por perfil | Explosão combinatória de views; auditoria difícil |
| RLS só nas tabelas "sensíveis" | Classificação envelhece; a exceção vira o vazamento |

## Consequências

**Positivas** — fronteira única e testável; embeds de FK herdam RLS; segurança sobrevive a mudanças de UI.

**Negativas / trade-offs** — mensagens de erro do banco são pouco amigáveis e precisam de tradução na UI;
policies mal escritas degradam plano de consulta; depuração exige ler SQL, não só código de tela;
funções `SECURITY DEFINER` são poder concentrado e exigem `SET search_path = public` sem exceção.

## Reversibilidade

Baixa por desenho — e intencionalmente. Remover RLS exigiria reintroduzir uma fronteira equivalente
antes de qualquer desligamento.
