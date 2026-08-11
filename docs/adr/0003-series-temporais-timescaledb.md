# ADR-0003 — Séries temporais em PostgreSQL nativo, TimescaleDB como alvo condicional

- **Data**: 2026-08-03
- **Estado**: Aceito (com adoção condicional)
- **Contexto correlato**: `docs/15_series_temporais_imutabilidade.md`, RN-01, RN-08

## Contexto

Duas séries crescem continuamente: `dbo_medicoes` (medições por ETE, escala de 3.668 estações) e
`api_probe_log` (probe a cada 30 s por endpoint). O volume de probes cresce muito mais rápido que o de
medições. A documentação de arquitetura já citava TimescaleDB como componente-alvo, mas o ambiente
gerenciado atual não tem a extensão disponível de forma garantida.

## Decisão

Manter as séries em PostgreSQL nativo por enquanto, com o desenho preparado para hypertables:

- coluna de tempo única e explícita por série (`medido_em`, `checked_at`), sempre `timestamptz`;
- índices compostos `(entidade, tempo DESC)` para as consultas de janela;
- retenção declarada por `system_parameters.retention_days`, com expurgo ainda pendente;
- imutabilidade por policy (`UPDATE`/`DELETE` negados) em vez de depender de recurso de extensão;
- agregações de tendência calculadas por consulta, não materializadas, enquanto o volume permitir.

TimescaleDB (hypertables + `continuous aggregates` + políticas de compressão e retenção) é adotado
quando qualquer gatilho for atingido: consulta de tendência de 12 meses acima de 1 s p95, ou
`api_probe_log` acima de ~100 milhões de linhas, ou custo de armazenamento dominado por séries.

## Alternativas consideradas

| Alternativa | Por que não agora |
|-------------|-------------------|
| Adotar TimescaleDB imediatamente | Dependência de extensão no ambiente gerenciado; complexidade sem ganho mensurado |
| Banco de séries separado (InfluxDB/Prometheus) | Perde RLS e junção com o modelo relacional — inaceitável para dado por tenant |
| Particionamento declarativo nativo por mês | Caminho intermediário válido; adotado antes do Timescale se o gatilho for só volume |

## Consequências

**Positivas** — uma só tecnologia de dados, RLS uniforme, operação simples; nenhuma reescrita necessária
para migrar depois, pois o esquema já é compatível com hypertable.

**Negativas / trade-offs** — sem compressão nativa, o custo por linha é maior; agregações repetidas em
janelas longas ficam caras; o expurgo por retenção precisa ser implementado como job, não como policy
de extensão.

## Reversibilidade

Alta. Converter tabela em hypertable é operação de migração incremental sobre o mesmo esquema.
