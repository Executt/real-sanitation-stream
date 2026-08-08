# Simulação de Processo Ponta a Ponta em Produção — HydrosNet

Estado: **Proposto**.

Descreve o *synthetic journey*: uma execução automatizada, recorrente e segura de um processo real
de negócio em ambiente de produção, com dados sintéticos claramente marcados, para provar que a
cadeia inteira funciona — e não apenas que os pods estão de pé.

## 1. Por que em produção

Ambiente de homologação não reproduz RLS com dado real, cota por órgão, latência do gateway de IA
nem a configuração de rede do órgão. A simulação em produção detecta a falha que o usuário sentiria,
antes de ele sentir. O custo é a disciplina de isolamento: dado sintético nunca contamina indicador.

## 2. Organização-sonda

Uma organização dedicada, criada pelo provisionamento normal:

| Campo | Valor |
|-------|-------|
| `name` | `[SONDA] Órgão Sintético de Verificação` |
| `type` | `CONCESSIONAIRE` |
| `parent_id` | AR sintética, filha da raiz sintética |
| `uf` / `municipio` / `ibge_code` | `ZZ` / `Sintético` / `0000000` |
| `ativa` | `true` |
| Marcação | `location_data->>'sintetico' = 'true'` |

Regras de exclusão obrigatórias:

- Todo KPI nacional, painel do Command Center, ISH-U, agregação por bacia e export filtra
  `NOT (location_data->>'sintetico')::boolean IS TRUE` — implementado em **uma** função
  `is_synthetic(org_id)` reutilizada, não copiada em cada consulta.
- O treinamento e o contexto RAG do Córtex ignoram a subárvore sintética.
- Relatórios oficiais e notificações a órgãos reais nunca incluem a sonda.
- Um teste automatizado verifica, a cada release, que nenhum KPI muda ao inserir 100 medições sintéticas.

## 3. Jornadas simuladas

### J1 — Ciclo operacional de medição (a cada 15 min)

1. Autentica como usuário-sonda `operador` (credencial rotacionada semanalmente, MFA por segredo TOTP em cofre).
2. `INSERT` em `dbo_medicoes` para uma ETE sintética com valores que forçam `conforme = true`.
3. Verifica que a trigger calculou `eficiencia_pct` e `conforme` corretamente.
4. Insere uma segunda medição fora do limite e confirma que `conforme = false`.
5. Confirma que o evento Realtime chegou ao canal em < 3 s.
6. Confirma que o alerta de não conformidade foi gerado e roteado ao destinatário sintético.
7. Limpa nada — a série sintética é retida 30 dias e expurgada pelo `retention-sweep`.

**Assert de segurança**: ao final, tenta ler uma ETE de órgão real com o mesmo token.
Deve receber zero linhas. Se retornar dado, é P1 imediato — falha de RLS.

### J2 — Importação Atlas (diária, 05:00 UTC)

1. Upload de planilha sintética válida → lote deve concluir com `status='concluido'` e contagem exata.
2. Upload de planilha com coluna renomeada → deve falhar na validação de dicionário, sem gravar.
3. Upload de arquivo EICAR renomeado para `.xlsx` → deve ser bloqueado pela inspeção (doc. 18).
4. Verifica idempotência: reimportar o mesmo lote não duplica (`external_key`).

### J3 — Inferência Córtex (a cada 6 h)

1. Dispara `cortex-infer` no escopo sintético com modelo em `shadow`.
2. Verifica gravação em `cortex_predicoes` com `features_hash` presente.
3. Verifica latência ponta a ponta e o custo reportado pelo gateway.
4. Tenta promover o modelo sintético a `prod` sem laudo causal → **deve** ser bloqueado pela trigger
   `enforce_falso_afluente`. Sucesso na promoção é P1 (governança rompida).
5. Cancela uma execução em andamento e confirma que o estado reflete o cancelamento.

### J4 — Ciclo de acesso e governança (diária)

1. Convida um usuário sintético e confirma o e-mail transacional (caixa de teste dedicada).
2. Troca o papel do usuário e confirma o registro em `audit_log`.
3. Executa uma consulta escopada e confirma o registro em `access_audit_log` com `registros` correto.
4. Tenta acessar `/admin` com papel `operador` → deve ser redirecionado.

### J5 — Relatório e notificação (semanal)

1. Agenda um relatório sintético, aguarda a geração, baixa o arquivo e valida o checksum.
2. Confirma o recebimento do e-mail, o assunto padronizado e a ausência de dado real no anexo.

### J6 — Recuperação (mensal, em janela declarada)

1. Restaura o backup mais recente em ambiente efêmero.
2. Executa J1 contra a restauração.
3. Mede o RTO real e registra no relatório de sustentação.

## 4. Execução

| Item | Definição |
|------|-----------|
| Orquestração | `CronJob` no namespace `hydrosnet-obs`, um por jornada |
| Implementação | Playwright (jornada de UI) + cliente HTTP (jornada de API) |
| Identidade | ServiceAccount própria; segredo por External Secrets; **nunca** `service_role` |
| Isolamento de rede | Só alcança a borda pública, como um usuário real |
| Idempotência | Cada execução usa `run_id` UUID; artefatos nomeados por `run_id` |
| Timeout | 5 min por jornada; estouro conta como falha |
| Evidência | Screenshot, HAR redigido e log JSON por passo, retidos 30 dias |

## 5. Métricas e SLO

| Métrica | Fonte | SLO |
|---------|-------|-----|
| `synthetic_journey_success_ratio` | resultado por jornada | ≥ 99% em 30 d |
| `synthetic_step_duration_seconds` | por passo | J1 p95 < 8 s |
| `synthetic_realtime_lag_seconds` | J1 passo 5 | p95 < 3 s |
| `synthetic_inference_duration_seconds` | J3 | p95 < 45 s |
| `synthetic_rls_violation_total` | asserts de segurança | **0**, sempre |

Duas falhas consecutivas da mesma jornada → alerta na classe correspondente
(J1/J3 → P1; J2/J4/J5 → P2). Qualquer `synthetic_rls_violation_total > 0` → P1 com acionamento imediato.

## 6. Segurança da simulação

- Usuário-sonda tem o **menor** papel necessário por jornada; nenhum tem `superadmin`.
- Credenciais rotacionadas automaticamente e nunca impressas em log ou screenshot
  (mascaramento no Playwright antes da captura).
- A sonda não pode ser usada como porta de entrada: seu escopo é apenas a subárvore sintética,
  garantido pelo próprio RLS — o mesmo controle que protege órgãos reais.
- Evidências ficam em bucket separado, com retenção curta e sem acesso a operadores de órgão.

## 7. Governança do dado sintético

1. Todo registro sintético é rastreável até a organização-sonda por FK.
2. Nenhum dado sintético entra em publicação, API pública, export oficial ou base de treino.
3. Revisão trimestral: consulta que soma indicadores com e sem a sonda e comprova diferença zero.
4. Ao desligar a simulação, a subárvore sintética é desativada e purgada após 90 dias.

## 8. Checklist

- [ ] Organização-sonda criada e marcada
- [ ] Função `is_synthetic()` aplicada em todos os agregados e exports
- [ ] Teste de contaminação zero no pipeline de CI
- [ ] J1 a J5 implementadas e agendadas; J6 na rotina mensal
- [ ] Asserts de RLS em toda jornada autenticada
- [ ] Métricas e alertas da seção 5 no observability
- [ ] Rotação automática das credenciais-sonda
