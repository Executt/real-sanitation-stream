# Regras de Negócio — HydrosNet

Unidades e nomenclatura seguem o setor: vazão em **L/s** (operação) e **m³/s** (bacia), DBO em **mg/L**,
eficiência em **%**, municípios identificados por **código IBGE** além de nome/UF.

## RN-01 — Conformidade de DBO

Calculada no banco pelo trigger `set_conforme_dbo()` em `dbo_medicoes`:

```
eficiencia_pct = (dbo_entrada_mg_l - dbo_saida_mg_l) / dbo_entrada_mg_l * 100
conforme       = eficiencia_pct >= system_parameters.dbo_min
```

- `dbo_entrada_mg_l` deve ser maior que zero; medição com entrada nula ou zero é rejeitada.
- Limiares vêm de `system_parameters` (`dbo_min`, `dbo_critico`) — **nunca** hardcoded na UI.
- Classificação de alerta: `eficiencia_pct < dbo_critico` → crítico; entre `dbo_critico` e `dbo_min` → atenção; acima de `dbo_min` → conforme.

## RN-02 — Escopo hierárquico de visibilidade

Hierarquia: **ANA → Agência Reguladora → Prestador → ETE/Sistema**. Não se pula nível em filtro nem em RLS.
Um usuário enxerga a própria organização e toda a subárvore descendente (`can_access_org`).
`gestor_ana` e `superadmin` enxergam a árvore inteira.

## RN-03 — Índice de Segurança Hídrica Urbana (ISH-U)

Composto por município/ano a partir de quatro dimensões normalizadas (0–1):

| Dimensão | Origem |
|----------|--------|
| Cobertura de abastecimento | `distribution_metrics.coverage_percentage` |
| Perdas na distribuição | `distribution_metrics.ivi_loss_index` (invertido) |
| Folga de produção | `production_systems.capacidade_instalada_lps` vs `demanda_2035_lps` |
| Vulnerabilidade do manancial | `water_sources.vulnerability_level` |

Classes: **Mínima**, **Baixa**, **Média**, **Alta**, **Máxima** — tokens `--ish-*` em `src/index.css`.
Município sem dado em alguma dimensão fica **não classificado** (não recebe classe otimista por omissão).

## RN-04 — Ciclo EPPO de investimentos

`ESTUDO → PLANO → PROJETO → OBRA`, com `status` em `PLANEJADO → EM_ANDAMENTO → CONCLUIDO` (ou `CANCELADO`).

- `estimated_value` em R$, sempre acompanhado de `horizonte_ano` ou `horizonte_faixa`.
- `requer_estudo = true` sinaliza intervenção que ainda depende de estudo prévio — não deve ser contabilizada como carteira executável.
- `org_id` nulo significa **dado nacional do Atlas**, sem dono operacional.

## RN-05 — Idempotência de importação do Atlas

Cada linha importada recebe `external_key` (arquivo + planilha + chave natural). Reimportar o mesmo arquivo
faz **upsert** por `external_key`, nunca duplica. Cada execução gera um `atlas_import_batches` com
`linhas_lidas`, `linhas_gravadas`, `linhas_ignoradas` e `erros`.
Antes de gravar, `atlasDictionary.ts` valida colunas e domínios; divergência bloqueia a carga.

## RN-06 — Regra do Falso Afluente (governança de IA)

Nenhum modelo do Córtex vai a produção sem:
1. `causal_report_url` — laudo de causalidade publicado;
2. `falso_afluente_checklist` 100% concluído;
3. métricas reportadas também para os **anos anômalos** (seca/cheia extrema), não só para o cenário médio.

Aplicado pelo trigger `enforce_falso_afluente`. Toda predição é rotulada como **apoio à decisão** e
jamais apresentada como ato regulatório.

## RN-07 — Limiares de risco preditivo

`cortex_thresholds` define `alto_min` e `critico_min` por bacia e/ou modelo. Sem registro específico,
vale o padrão global. Alterar o limiar reflete imediatamente em KPIs e filtros — não há cache de limiar.

## RN-08 — Monitoramento de integrações

Probe a cada 30 s por endpoint, persistido em `api_probe_log`.
Disponibilidade = probes `ok` / total na janela. Endpoint com falha consecutiva é destacado em
`EndpointFailuresPanel`. Timeout do probe = `system_parameters.api_timeout_seconds`.

## RN-09 — Vínculo de usuário

Todo usuário tem exatamente um `org_id` (ou vínculo legado a concessionária/agência). Usuário sem vínculo
e sem papel de alcance nacional **não enxerga dado operacional algum** — comportamento intencional.
Convites são emitidos por `superadmin` através da Edge Function `invite-user`.

## RN-10 — Rastreabilidade

- Alteração em tabela sensível → `audit_log` (trigger).
- Consulta a módulo com escopo de organização → `access_audit_log` (`log_access` via `useAccessLog`).
- Ambas as trilhas são imutáveis: `UPDATE` e `DELETE` negados por policy.

## RN-11 — Competência regulatória

Outorga em corpo hídrico de domínio **estadual** é do órgão gestor estadual, não da ANA. Relatórios e
rótulos devem deixar essa distinção explícita e não atribuir à ANA ato fora de sua competência.
