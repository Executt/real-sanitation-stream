## Contexto

Hoje a página `CommandCenter` já tem: `EteMap` (dados reais), `DboTrendChart` (dados sintéticos), painel "Alertas Nacionais" (hardcoded) e nenhum bloco de "Conformidade". Não existe tabela de medições DBO no banco — sem ela, "Alertas DBO" e "Tendência DBO" continuariam fictícios.

## O que será feito

### 1. Backend (migration)
Criar tabela `dbo_medicoes` para suportar tendência, conformidade e alertas reais:

- `dbo_medicoes`: `ete_id` (fk lógica para `etes`), `medido_em` (timestamptz), `dbo_entrada_mg_l`, `dbo_saida_mg_l`, `eficiencia_pct` (gerada), `conforme` (gerada por trigger usando `system_parameters.dbo_min`).
- RLS: SELECT autenticado; INSERT/UPDATE para `operador`/`superadmin`; DELETE só `superadmin`.
- Índices em `(ete_id, medido_em desc)` e `(medido_em desc)`.
- Seed: gerar ~12 meses de medições para as ETEs já cadastradas, com variação por bacia/UF para o gráfico ter forma realista.

### 2. Tendência DBO (`DboTrendChart`)
- Trocar `generateData()` por consulta agregada das últimas 12 médias mensais de `eficiencia_pct`, agrupando por bacia (derivada da UF da ETE — mapa estático UF→bacia).
- Skeleton enquanto carrega; estado de erro propagado para o `ErrorBoundary` já existente.

### 3. Alertas DBO (`AlertasDboPanel`, novo)
Substitui o painel "Alertas Nacionais" hardcoded.
- Lê últimas medições por ETE (top 20 mais recentes) e gera alertas:
  - `critical` quando `dbo_saida > dbo_critico`
  - `warning` quando `dbo_saida > dbo_min` e ≤ `dbo_critico`
- Tempo relativo ("há X min") calculado do `medido_em`.
- Skeleton + erro via `ErrorBoundary`.

### 4. Conformidade (`ConformidadeCard`, novo)
Novo bloco no topo da grade de KPIs ou abaixo dela:
- KPI nacional: `% conformes` nos últimos 30 dias (count(conforme)/count(*)).
- Quebra por bacia (mesma derivação UF→bacia) com mini barras.
- Loading skeleton; erro via `ErrorBoundary`.

### 5. Mapa Interativo (`EteMap`)
- Adicionar filtro por status (chips clicáveis na legenda já existente) que esconde marcadores não selecionados sem reconsultar.
- Pop-up: incluir última `eficiencia_pct` e badge de conformidade quando houver medição.

### 6. Integração no `CommandCenter`
- Inserir `ConformidadeCard` após os KPIs.
- Trocar painel "Alertas Nacionais" hardcoded por `AlertasDboPanel`.
- Manter `ErrorBoundary` em torno de cada novo bloco.

## Detalhes técnicos

```text
dbo_medicoes
├─ ete_id uuid                       -- referência lógica
├─ medido_em timestamptz default now()
├─ dbo_entrada_mg_l numeric not null
├─ dbo_saida_mg_l numeric not null
├─ eficiencia_pct numeric generated  -- (entrada-saida)/entrada*100
└─ conforme boolean                  -- preenchido por trigger
```

Trigger `set_conforme_dbo()` lê `system_parameters.dbo_min` (default 60) e marca `conforme = dbo_saida_mg_l <= dbo_min`.

Mapa UF→bacia (constante no front): TODO simples baseado em estados (ex.: SP→Tietê, BA/MG/PE→São Francisco, etc.) — suficiente para visualização; pode evoluir depois para coluna `bacia` na ETE.

## Fora de escopo

- Filtros globais da sidebar conectarem em todos os blocos (já há `SidebarFilters` mas não emite eventos — fica para próxima iteração).
- Coluna `bacia` formal em `etes`.
- Ingestão real via API SNIRH/ANA (continuam mockadas no painel de endpoints).

## Arquivos

- Migration nova (via tool).
- `src/components/DboTrendChart.tsx` — refatorar para dados reais.
- `src/components/AlertasDboPanel.tsx` — novo.
- `src/components/ConformidadeCard.tsx` — novo.
- `src/components/EteMap.tsx` — filtro por status + dados de conformidade no popup.
- `src/pages/CommandCenter.tsx` — montar os novos blocos.
- `src/lib/bacias.ts` — novo, mapa UF→bacia + helper.
