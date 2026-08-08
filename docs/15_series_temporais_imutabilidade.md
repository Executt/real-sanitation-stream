# Séries Temporais e Imutabilidade — HydrosNet

Estado: **Proposto** (particionamento e prova criptográfica pendentes; retenção e append-only já vigentes em parte).

Este documento define como o HydrosNet trata dado que muda no tempo (medições, probes, predições,
indicadores anuais) e como garante que trilha de auditoria e série histórica não sejam adulteradas.

## 1. Classes de dado temporal

| Classe | Tabelas | Cardinalidade esperada | Granularidade | Mutabilidade |
|--------|---------|------------------------|---------------|--------------|
| Medição operacional | `dbo_medicoes` | alta (3.668 ETEs × diária → ~1,3 M/ano) | timestamp | **append-only** após validação |
| Telemetria de integração | `api_probe_log` | muito alta (probe 30 s × N endpoints) | timestamp | append-only |
| Predição | `cortex_predicoes` | média | timestamp + horizonte | imutável (INSERT só por `service_role`) |
| Trilha de alteração | `audit_log` | média-alta | timestamp | **imutável** (UPDATE/DELETE negados) |
| Trilha de consulta | `access_audit_log` | alta | timestamp | imutável |
| Indicador de referência | `atlas_indicadores`, `distribution_metrics` | baixa | ano de referência | versionado por `ano_referencia` |
| Cadastro | `etes`, `organizations`, ... | baixa | — | mutável com auditoria |

Regra: **série temporal não sofre UPDATE**. Correção de medição errada é feita por lançamento
compensatório ou por marcação de invalidação — nunca sobrescrevendo o valor original.

## 2. Modelo de armazenamento

### 2.1 Chave temporal

Toda tabela de série usa uma coluna `timestamptz` **não nula** como eixo (`medido_em`, `checked_at`,
`criado_em`, `created_at`) e um `id uuid` como identidade. O horário é sempre gravado em UTC;
a conversão para America/Sao_Paulo acontece na apresentação.

### 2.2 Particionamento (proposto)

Para `dbo_medicoes`, `api_probe_log` e `access_audit_log`, adotar particionamento declarativo por
intervalo mensal quando a tabela ultrapassar ~10 M linhas:

```sql
-- Padrão de partição mensal
CREATE TABLE public.dbo_medicoes_2026_08
  PARTITION OF public.dbo_medicoes
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
```

Automatizar a criação da partição do mês seguinte por job `pg_cron` diário. A partição herda
RLS e GRANTs da tabela-pai; nenhuma policy adicional é necessária.

### 2.3 Índices

| Tabela | Índice recomendado | Uso |
|--------|--------------------|-----|
| `dbo_medicoes` | `(ete_id, medido_em DESC)` | série por ETE, último valor |
| `dbo_medicoes` | `(medido_em DESC) WHERE conforme = false` | painel de alertas |
| `api_probe_log` | `(endpoint, checked_at DESC)` | histórico por endpoint |
| `cortex_predicoes` | `(escopo, criado_em DESC)`, `(ete_id, criado_em DESC)` | KPIs e listagem |
| `access_audit_log` | `(created_at DESC)`, `(org_id, created_at DESC)` | auditoria de governança |

Índices parciais são preferidos a índices totais em colunas booleanas de baixa seletividade.

### 2.4 Agregações materializadas

Consulta de tendência não deve varrer a série bruta. Materializar:

- `mv_dbo_diario` — média/mín./máx. de eficiência e contagem de não conformes por ETE por dia.
- `mv_dbo_mensal_bacia` — carga e conformidade por bacia por mês (alimenta o Command Center).
- `mv_probe_hora` — disponibilidade e p50/p95 por endpoint por hora.

Refresh incremental por `pg_cron` (`REFRESH MATERIALIZED VIEW CONCURRENTLY`) a cada hora para
a série horária e à 01:00 UTC para as diárias. Views materializadas em `public` recebem GRANT
`SELECT` apenas a `authenticated` e são protegidas por view-wrapper com filtro de escopo quando
expuserem dado com `org_id`.

## 3. Retenção e expurgo

Parâmetro-mestre: `system_parameters.retention_days`.

| Dado | Retenção quente | Retenção fria | Destino após expurgo |
|------|-----------------|---------------|----------------------|
| `dbo_medicoes` | 24 meses | indefinida (agregados) | agregado mensal + export Parquet |
| `api_probe_log` | 90 dias | 12 meses agregado | `mv_probe_hora` |
| `cortex_predicoes` | 12 meses | 5 anos | export Parquet |
| `audit_log` / `access_audit_log` | 12 meses | **5 anos mínimo** | WORM (object lock) |
| `atlas_import_batches` | 24 meses | — | expurgo com log |

Job `pg_cron` `retention-sweep` (04:00 UTC) executa a rotina `run_retention_sweep()` que:

1. Lê `retention_days` de `system_parameters`.
2. Para série particionada, faz `DETACH PARTITION` + export + `DROP`.
3. Para série não particionada, `DELETE` em lotes de 10.000 linhas com `pg_sleep(0.1)` entre lotes.
4. Registra o resultado em `audit_log` com `severity='info'` e contagem de linhas afetadas.

Nunca expurgar trilha de auditoria antes do prazo legal aplicável ao órgão; em caso de conflito,
o prazo mais longo prevalece e o parâmetro é ignorado para essas tabelas.

## 4. Imutabilidade

### 4.1 Nível de banco

Padrão já aplicado às tabelas de auditoria — replicar em toda tabela append-only:

```sql
REVOKE UPDATE, DELETE ON public.audit_log FROM authenticated;
CREATE POLICY "sem update" ON public.audit_log FOR UPDATE TO authenticated USING (false);
CREATE POLICY "sem delete" ON public.audit_log FOR DELETE TO authenticated USING (false);
```

Complementar com trigger defensiva, que também bloqueia acesso por `service_role`
em código de aplicação com bug:

```sql
CREATE OR REPLACE FUNCTION public.deny_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'registro imutável: % em %', TG_OP, TG_TABLE_NAME;
END $$;

CREATE TRIGGER trg_audit_log_immutable
  BEFORE UPDATE OR DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.deny_mutation();
```

O expurgo por retenção usa uma função `SECURITY DEFINER` dedicada que desabilita a trigger
dentro da própria transação (`ALTER TABLE ... DISABLE TRIGGER`) e a reabilita ao final, com o
evento registrado. Nenhum caminho de aplicação tem esse privilégio.

### 4.2 Encadeamento por hash (proposto)

Para prova de não adulteração independente do banco, cada linha de `audit_log` recebe:

- `row_hash` — `sha256(id || created_at || user_id || action || target || metadata::text)`
- `prev_hash` — `row_hash` da linha imediatamente anterior por `created_at, id`
- `chain_hash` — `sha256(prev_hash || row_hash)`

Preenchidos por trigger `BEFORE INSERT`. Um job diário calcula o `chain_hash` da última linha do
dia (âncora) e o publica em armazenamento WORM externo (S3 Object Lock em modo *compliance*).
Verificação: recalcular a cadeia do período e comparar com a âncora publicada. Divergência em
qualquer ponto localiza o intervalo adulterado.

### 4.3 WORM externo

Exports de auditoria e âncoras diárias vão para bucket com Object Lock habilitado, retenção
mínima de 5 anos, versionamento ativo e política que nega `s3:DeleteObjectVersion` e
`s3:PutObjectRetention` com redução de prazo, inclusive para o principal administrativo.

## 5. Qualidade da série

| Verificação | Implementação | Ação em falha |
|-------------|---------------|---------------|
| Valor fora de faixa física (DBO < 0 ou > 5.000 mg/L) | `CHECK` na tabela | rejeita INSERT |
| Eficiência calculada fora de 0–100% | trigger `set_conforme_dbo` | grava e sinaliza outlier |
| Medição no futuro | `CHECK (medido_em <= now() + interval '1 hour')` | rejeita |
| Duplicidade lógica | `UNIQUE (ete_id, medido_em)` | rejeita |
| Lacuna na série (gap) | job diário compara contagem esperada × observada | alerta em `audit_log` + notificação |
| Degrau anômalo (salto > 3σ) | job diário | marca para revisão; entra no checklist do Falso Afluente |

Lacuna e degrau **não** são corrigidos automaticamente: dado hidrológico interpolado sem laudo
técnico é a origem clássica do falso afluente. A interpolação, quando necessária, é feita apenas
em camada analítica e sempre rotulada como estimada.

## 6. Efeito no Córtex IA

- Feature engineering usa exclusivamente a série imutável e os agregados materializados.
- Toda predição grava `features_hash` — o hash do vetor de entrada — permitindo reproduzir
  exatamente a inferência a partir da série histórica.
- Reprocessar histórico gera **novas linhas** em `cortex_predicoes`; predição antiga jamais é
  sobrescrita, preservando a comparação entre versões de modelo.

## 7. Checklist de implantação

- [ ] `CHECK` de faixa física em `dbo_medicoes`
- [ ] `UNIQUE (ete_id, medido_em)`
- [ ] Índices da seção 2.3
- [ ] Views materializadas + refresh agendado
- [ ] Função `run_retention_sweep()` + job `retention-sweep`
- [ ] Trigger `deny_mutation` nas tabelas append-only
- [ ] Colunas de hash e job de ancoragem WORM
- [ ] Job de detecção de gap e degrau
- [ ] Particionamento mensal quando ultrapassar 10 M linhas
