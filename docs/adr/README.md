# ADRs — Registros de Decisão de Arquitetura

Cada ADR registra **uma** decisão com data, contexto, alternativas, consequências e reversibilidade.
ADR não se edita para mudar de ideia: cria-se um novo que **supersede** o anterior, e o antigo passa a
`Substituído por ADR-XXXX`.

| # | Decisão | Data | Estado |
|---|---------|------|--------|
| [0001](0001-multi-tenant-hierarquico.md) | Multi-tenant hierárquico por árvore de organizações | 2026-08-03 | Aceito |
| [0002](0002-rls-como-fronteira-de-autorizacao.md) | RLS no PostgreSQL como fronteira de autorização | 2026-08-03 | Aceito |
| [0003](0003-series-temporais-timescaledb.md) | Séries em PostgreSQL nativo; TimescaleDB condicional | 2026-08-03 | Aceito (condicional) |
| [0004](0004-edge-functions-escopo.md) | Edge functions apenas para segredo, I/O externo e trabalho longo | 2026-08-03 | Aceito |
| [0005](0005-governanca-ia-falso-afluente.md) | Governança de IA pela Regra do Falso Afluente | 2026-08-03 | Aceito |

## Como escrever um ADR novo

1. Numere na sequência; nome do arquivo em `kebab-case` descrevendo a decisão.
2. Seções fixas: Data, Estado, Contexto correlato, Contexto, Decisão, Alternativas consideradas,
   Consequências (positivas e trade-offs), Reversibilidade.
3. Estados válidos: `Proposto`, `Aceito`, `Substituído por ADR-XXXX`, `Descontinuado`.
4. Registre trade-offs reais. ADR sem custo declarado é propaganda, não decisão.
5. Adicione a linha na tabela acima na mesma entrega.
