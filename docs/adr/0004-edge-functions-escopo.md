# ADR-0004 — Edge functions apenas para o que não cabe no banco

- **Data**: 2026-08-03
- **Estado**: Aceito
- **Contexto correlato**: `docs/07_apis_e_integracoes.md`, RN-05, RN-06, RN-08

## Contexto

A plataforma é SPA + banco gerenciado. Integrações externas (LDAP, SMTP, SEI, Atlas, provedores de IA e
ferramentas MCP) exigem segredos e chamadas de saída que não podem ocorrer no navegador. Ao mesmo tempo,
mover lógica de negócio para funções serverless recriaria a fronteira de autorização fora do banco,
contrariando o ADR-0002.

## Decisão

Edge functions existem para exatamente quatro categorias:

1. **Guarda de segredo** — qualquer chamada que use credencial (`ldap-sync`, `smtp-send`,
   `sei-create-process`, `invite-user`, provedores de IA).
2. **Orquestração de I/O externo** — download e normalização do Atlas (`cortex-ingest-atlas`).
3. **Trabalho de longa duração fora do ciclo de request do PostgREST** — inferência (`cortex-infer`),
   com cancelamento por `AbortSignal`.
4. **Ações administrativas privilegiadas** — provisionamento inicial (`seed-admin`).

Regras de implementação: validar entrada antes de qualquer chamada externa; propagar status e corpo do
provedor em vez de `500` genérico; nunca reimplementar em função uma regra que já existe em trigger;
agendamento por `pg_cron` lendo URL e chave de `cron_config`.

## Alternativas consideradas

| Alternativa | Por que não |
|-------------|-------------|
| Backend monolítico dedicado | Infraestrutura permanente a operar sem necessidade atual |
| Tudo no cliente | Vazaria segredos; impossível para LDAP e SMTP |
| Toda regra de negócio em funções | Duplica a fronteira; regra deixaria de valer para escrita direta via PostgREST |

## Consequências

**Positivas** — superfície pequena e auditável; segredos concentrados; regras de negócio permanecem
inviáveis de burlar porque vivem em trigger e policy.

**Negativas / trade-offs** — cold start em funções pouco usadas; observabilidade dispersa entre logs de
função e trilhas do banco; rate limiting nas funções públicas ainda **pendente**; dependência de
`pg_cron` corretamente configurado para as rotinas agendadas.

## Reversibilidade

Alta. Cada função é isolada e pode ser reimplantada em outro runtime sem tocar o modelo de dados.
