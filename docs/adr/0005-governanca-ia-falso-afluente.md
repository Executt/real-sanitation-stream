# ADR-0005 — Governança de IA pela Regra do Falso Afluente

- **Data**: 2026-08-03
- **Estado**: Aceito
- **Contexto correlato**: `docs/12_regras_de_negocio.md` (RN-06, RN-07), `CORTEX_IA.md`, `docs/13_seguranca_hardening.md`

## Contexto

O Córtex IA produz predições de risco por ETE, bacia e prestador. O risco central do domínio não é o erro
estatístico médio: é o **falso afluente** — o modelo aprender uma correlação espúria (por exemplo, série
de vazão contaminada por evento hidrológico atípico) e essa saída ser tratada como evidência para ato
regulatório. Métricas agregadas em cenário médio escondem exatamente esse erro, porque os anos anômalos
são minoria na amostra.

## Decisão

Governança executada pelo banco, não por processo humano opcional. Nenhum modelo assume
`status = 'prod'` sem três condições, verificadas pelo trigger `enforce_falso_afluente()`:

1. `causal_report_url` — laudo de causalidade publicado e acessível;
2. `falso_afluente_checklist` integralmente concluído;
3. métricas reportadas também para os **anos anômalos** (seca e cheia extremas), além do cenário médio.

Complementos obrigatórios:

- `cortex_predicoes` é somente leitura para o cliente — grava apenas a inferência no backend;
- toda predição exibida carrega o rótulo **apoio à decisão**, nunca "ato regulatório" ou "diagnóstico";
- limiares de alto/crítico são parametrizados por bacia e modelo em `cortex_thresholds` (RN-07), sem
  cache — mudar o limiar reflete imediatamente em KPI e filtro;
- execuções ficam auditáveis com parâmetros, fontes, ferramentas MCP e erros (`CortexExecucoes`).

## Alternativas consideradas

| Alternativa | Por que não |
|-------------|-------------|
| Revisão manual em code review | Depende de disciplina; falha silenciosamente sob pressão de prazo |
| Bloqueio só na UI | Contornável por escrita direta via PostgREST |
| Limiar fixo global | Bacias têm regimes hidrológicos incomparáveis; limiar único gera alarme falso sistemático |

## Consequências

**Positivas** — promoção de modelo a produção é fisicamente impossível sem evidência causal; a trilha de
governança é consultável; o rótulo protege a instituição de atribuir a si ato fora de competência (RN-11).

**Negativas / trade-offs** — ciclo de publicação de modelo mais lento; o checklist pode ser preenchido de
forma cerimonial se a revisão do laudo não for levada a sério — o trigger garante a existência do laudo,
não a sua qualidade; anos anômalos exigem série histórica suficiente, o que atrasa modelos em bacias com
dado escasso.

## Reversibilidade

Baixa e deliberadamente custosa: remover o trigger é mudança de migração explícita e visível em revisão.
