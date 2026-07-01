---
name: Córtex IA
description: Motor de análise preditiva com Lovable AI Gateway, aplicando Regra do Falso Afluente (checklist + relatório causal) antes de promoção a produção
type: feature
---
Módulo `/command-center/cortex`.

Tabelas:
- `atlas_indicadores` (contexto público do Atlas Esgotos ANA)
- `cortex_modelos` (catálogo com status shadow/prod + falso_afluente_checklist jsonb + causal_report_url)
- `cortex_predicoes` (Realtime; escopo ete|concessionaria|agencia|bacia; RLS por role)

Edge Function `cortex-infer`: chama `google/gemini-3-flash-preview` via `https://ai.gateway.lovable.dev/v1/chat/completions` com header `Lovable-API-Key`, injeta features (histórico dbo_medicoes + atlas_indicadores + maturidade_dados_pct) e grava via service_role.

Regra do Falso Afluente enforced no BD: trigger `enforce_falso_afluente` bloqueia UPDATE para `status='prod'` sem checklist 100% true e `causal_report_url` preenchido.

Modelo seed: "Cortex Baseline v0.1" em shadow.
