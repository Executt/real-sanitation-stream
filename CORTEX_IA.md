# Córtex IA — Metodologia, Governança e Fluxo

Módulo de análise preditiva do HydrosNet. Analisa dados operacionais (DBO) + contexto público (Atlas Esgotos ANA) para gerar alertas antecipados de não-conformidade, sob **governança do Falso Afluente**.

## 1. Metodologia

**Objetivo:** prever risco de não-conformidade DBO por ETE em horizonte configurável (padrão 30 dias) e classificar em `baixo | medio | alto | critico | indeterminado`.

**Features (por inferência):**
- Últimas 6 medições de `dbo_medicoes` (entrada, saída, eficiência, conformidade)
- Indicador Atlas Esgotos (`atlas_indicadores`) do estado/município: cobertura, carga DBO, rios comprometidos
- **Maturidade de dados** = `n_medições / 6 × 100%` — controla confiança e evita alucinação em séries curtas

**Modelo:** `google/gemini-3-flash-preview` via Lovable AI Gateway (`ai.gateway.lovable.dev`), com `response_format: json_object` e system prompt fixo que impõe as regras causais.

## 2. Governança do Falso Afluente

Todo modelo em produção **deve** provar que a saída não é fruto de correlação espúria (sazonalidade, calendário, ruído). Enforcement em dois lugares:

**Banco (trigger `enforce_falso_afluente` em `cortex_modelos`):**
Promoção para `status='prod'` só é aceita se:
1. `causal_report_url` preenchido (link para relatório causal externo)
2. `falso_afluente_checklist` com **todos** os itens `true`:
   - `variaveis_fisicas` — features físicas (vazão, DBO histórico) e não apenas temporais
   - `testado_anos_anomalos` — validado em períodos anômalos (estiagem/enchente)
   - `normalizado_maturidade_dados` — pondera cobertura de dados por município
   - `ablation_confusores` — ablação para remover Atlas/cobertura e medir queda
   - `homologado_shadow` — mínimo de rodadas em modo shadow com métricas registradas

**Prompt do modelo (`cortex-infer`):**
Se maturidade < 50%, a resposta deve baixar confiança e usar classificação `baixo` ou `indeterminado`, sempre justificando com as variáveis efetivamente usadas.

**Consequência prática:** modelos novos nascem em `shadow` (registro-apenas, não influenciam ação humana) até completarem o checklist.

## 3. Fluxo Ingestão → Inferência → UI

```
┌────────────────────┐   pg_cron/manual   ┌───────────────────────┐
│ Atlas Esgotos ANA  │ ──────────────────▶│ cortex-ingest-atlas   │
│ (WebApp + PDFs)    │  {seed|indicadores}│ upsert incremental    │
└────────────────────┘                    │ atlas_indicadores     │
                                          └──────────┬────────────┘
                                                     │
                                                     ▼
                    ┌──────────────────┐   pg_cron   ┌──────────────────────┐
                    │ dbo_medicoes     │──────┐      │ cortex-infer         │
                    │ (Realtime)       │      ├─────▶│ Lovable AI Gateway   │
                    └──────────────────┘      │      │ google/gemini-3-flash│
                    ┌──────────────────┐      │      │ Falso Afluente rules │
                    │ etes (RLS scope) │──────┘      └──────────┬───────────┘
                    └──────────────────┘                        │
                                                                ▼
                                          ┌──────────────────────────────┐
                                          │ cortex_predicoes (Realtime)  │
                                          │ RLS por concessionária/AR    │
                                          └──────────┬───────────────────┘
                                                     │
                                                     ▼
   ┌──────────────────────────┐   ┌──────────────────────────┐   ┌──────────────────────────┐
   │ /command-center/cortex   │   │ ConcessionariaDetail     │   │ AgenciaRegDetail         │
   │ (visão nacional)         │   │ aba "Córtex IA"          │   │ aba "Córtex IA"          │
   └──────────────────────────┘   └──────────────────────────┘   └──────────────────────────┘
```

### 3.1 Ingestão — `cortex-ingest-atlas`

Endpoint aceita dois modos:
- `{seed: true}` — carrega baseline agregado por UF (Atlas 2020) para bootstrap
- `{indicadores: [...]}` — payload de ETL externo (municípios, agregações customizadas)

**Upsert incremental** via índices únicos parciais:
- `(ibge_code, ano_referencia)` quando há município
- `(uf, ano_referencia)` para agregações estaduais

Cada execução registra probe em `api_probe_log` (source = `AtlasEsgotos`) para rastreabilidade.

### 3.2 Inferência — `cortex-infer`

- Seleciona modelo ativo (`prod` > `shadow` mais recente).
- Para cada ETE ativa do escopo (respeitando RLS via `service_role` mais filtro por `concessionaria_id`), monta features e chama Gemini via Lovable AI Gateway.
- Grava em `cortex_predicoes` com `concessionaria_id` para uso pelas policies de RLS de leitura.

**Job diário:** `pg_cron` job `cortex-infer-daily` (03:00 UTC), configurável via `public.schedule_cortex_infer(url, anon_key)`. Executa em lotes de 25 ETEs ativas, horizonte 30d.

### 3.3 UI

- **Central:** `/command-center/cortex` — governança do modelo (checklist Falso Afluente), últimas predições globais, execução manual.
- **Escopo Concessionária:** aba **Córtex IA** em `ConcessionariaDetail` — mostra apenas predições da concessionária + botão de inferência manual sobre as ETEs dela.
- **Escopo Agência Reguladora:** aba **Córtex IA** em `AgenciaRegDetail` — agrega predições de todas as concessionárias supervisionadas.

## 4. RLS

- `cortex_modelos`, `atlas_indicadores`: leitura para autenticados; escrita apenas `superadmin` (ingestão via `service_role`).
- `cortex_predicoes`: policies por role (`operador` da concessionária, `gestor_ar` da agência, `gestor_ana`, `superadmin`); INSERT apenas via `service_role` das edge functions.

## 5. Operação e observabilidade

- **Ingestão:** monitorada por `api_probe_log` filtrando `source='AtlasEsgotos'`.
- **Inferência:** cada predição carrega `features` (jsonb) para auditoria + `explicacao` para explicabilidade humana.
- **Governança:** promoção shadow → prod exige artefatos externos (relatório causal) — nunca automática.
- **Falhas do Gateway:** 429 (rate limit) e 402 (créditos) retornam status HTTP correspondente e são surfacadas no toast da UI.
