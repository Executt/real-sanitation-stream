# ZeroOps, Alertas e Storage por Órgão — HydrosNet

Estado: **Proposto**.

ZeroOps aqui significa: o time de produto não abre chamado de infraestrutura para operar o dia a dia.
Provisionamento, cota, alerta e limpeza são dirigidos por declaração e executados por automação,
com o operador humano intervindo apenas em exceção.

## 1. Princípios

1. **Tudo declarado em Git** — nenhum recurso criado por console; GitOps (ArgoCD) reconcilia.
2. **Autosserviço com guarda** — o órgão pede via formulário; a automação valida cota, nomenclatura
   e política antes de aplicar.
3. **Falha barulhenta, recuperação silenciosa** — reinício, rebalanceamento e retry são automáticos;
   só vira alerta o que exige decisão humana.
4. **Custo é métrica de produto** — cada órgão vê o próprio consumo de storage e de inferência.
5. **Nenhum dado cruza fronteira de órgão** — nem em bucket, nem em log, nem em métrica com rótulo.

## 2. Storage segregado por órgão

### 2.1 Modelo de isolamento

| Nível | Recurso | Isolamento |
|-------|---------|-----------|
| Objeto | bucket/prefixo | `s3://hydrosnet-{env}-org/{org_id}/{dominio}/{ano}/{arquivo}` |
| Chave | KMS | uma CMK por órgão de grande porte; CMK compartilhada com contexto de criptografia por `org_id` para os demais |
| Banco | linhas | RLS por `can_access_org(org_id)` — sem schema por tenant |
| Cache | prefixo | chave sempre prefixada por `org_id` |

Política de bucket exige o contexto de criptografia, o que impede um órgão de ler objeto de outro
mesmo que obtenha o caminho:

```json
{
  "Effect": "Deny",
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::hydrosnet-prod-org/*",
  "Condition": {
    "StringNotEquals": { "s3:ExistingObjectTag/org_id": "${aws:PrincipalTag/org_id}" }
  }
}
```

No backend gerenciado atual, o equivalente é o bucket privado com política de storage baseada em
`(storage.foldername(name))[1] = current_user_org()::text`, aplicada em SELECT, INSERT, UPDATE e DELETE.

### 2.2 Cotas

| Porte do órgão | Cota de objetos | Cota de linhas de série | Cota de inferência/mês |
|----------------|-----------------|-------------------------|------------------------|
| Pequeno (≤ 20 ETEs) | 20 GB | 5 M | 2.000 |
| Médio (≤ 200 ETEs) | 200 GB | 50 M | 20.000 |
| Grande (> 200 ETEs) | 2 TB | 500 M | 200.000 |
| ANA (nacional) | ilimitado com revisão trimestral | — | — |

A cota é registrada em tabela de configuração por organização e verificada em três pontos:
no upload (bloqueio em 100%, aviso em 80%), no job noturno de consolidação e no painel do órgão.
Estouro de cota **nunca** apaga dado automaticamente — bloqueia escrita nova e abre alerta.

### 2.3 Ciclo de vida

| Classe | Transição | Expiração |
|--------|-----------|-----------|
| Upload operacional (planilhas, laudos) | Standard → IA em 90 d → Glacier IR em 365 d | conforme retenção do domínio |
| Export de relatório | Standard | 30 d |
| Artefato de modelo | Standard | mantido enquanto o modelo existir |
| Auditoria | Standard + Object Lock | 5 anos, sem transição para classe sem Object Lock |

## 3. Provisionamento automático de órgão

```
Formulário (nome, tipo, UF, IBGE, parent) 
  → validação (CNPJ, IBGE existente, parent coerente com a hierarquia)
  → INSERT em organizations
  → automação:
       • prefixo de storage + política
       • cota conforme porte
       • dashboards e alertas com filtro org_id
       • convite do primeiro gestor (edge function invite-user)
       • entrada no catálogo da Sala de Situação
  → verificação pós-provisionamento (smoke test de leitura/escrita escopada)
```

Detalhe em `25_governanca_sala_situacao_provisionamento_dinamico.md`.
Desprovisionamento é sempre lógico primeiro (`ativa = false`), com purga física só após
o prazo de retenção e aprovação de dois responsáveis.

## 4. Alertas

### 4.1 Taxonomia

| Classe | Definição | Canal | Prazo de resposta |
|--------|-----------|-------|-------------------|
| P1 — Crítico | Indisponibilidade total, perda ou vazamento de dado | Telefone + e-mail + chat | 15 min |
| P2 — Alto | Módulo indisponível, integração parada > 30 min, cota estourada | E-mail + chat | 1 h |
| P3 — Médio | Degradação de performance, falha de job recuperável | Chat | 1 dia útil |
| P4 — Informativo | Cota em 80%, novo lote Atlas importado | Painel + digest diário | — |

### 4.2 Alertas de plataforma

| Alerta | Condição | Classe |
|--------|----------|--------|
| API indisponível | disponibilidade < 99% em 5 min | P1 |
| Latência p95 | > 2 s por 10 min | P2 |
| Erro 5xx | > 2% das requisições por 5 min | P1 |
| Job Córtex falhou | 2 execuções consecutivas com erro | P2 |
| Ingestão Atlas falhou | lote com `status='erro'` | P3 |
| Cota de storage | ≥ 80% / ≥ 100% | P4 / P2 |
| Fila de expurgo travada | `retention-sweep` sem sucesso há 48 h | P3 |
| Certificado | expira em < 21 dias | P2 |

### 4.3 Alertas de negócio (setoriais)

| Alerta | Condição | Destinatário |
|--------|----------|--------------|
| DBO não conforme | `conforme = false` em medição nova | operador do prestador + gestor da AR |
| DBO crítico | eficiência abaixo de `system_parameters.dbo_critico` | AR + ANA |
| Série sem dado | ETE ativa sem medição há 7 dias | operador |
| Risco preditivo alto | predição acima do `alto_min` da bacia | AR (rotulado como apoio à decisão) |
| Risco preditivo crítico | predição acima do `critico_min` | AR + ANA |
| Manancial vulnerável | `vulnerability_level` em CRITICAL | gestor do órgão |
| Investimento estagnado | EPPO `EM_ANDAMENTO` sem atualização há 180 d | gestor do órgão |

Todo alerta setorial carrega o rótulo da origem (medição validada × predição) e o `org_id`,
e respeita a hierarquia: o alerta sobe (prestador → AR → ANA), nunca desce nem cruza lateralmente.

### 4.4 Antirruído

- Agrupamento por `org_id` + tipo + janela de 15 min.
- Silenciamento automático durante janela de manutenção declarada.
- Supressão em cascata: alerta de infraestrutura suprime os alertas de negócio dependentes.
- Alerta que dispara mais de 20 vezes por semana sem ação é revisado e reclassificado ou removido.
- Todo alerta tem runbook obrigatório (`21_guia_sustentacao_operacao.md`); alerta sem runbook não sobe para P1/P2.

## 5. Observabilidade mínima por órgão

Cada órgão enxerga, no próprio painel: disponibilidade das suas integrações, latência das consultas,
volume de storage consumido × cota, execuções do Córtex no mês × cota, lotes de importação e
últimos alertas. Métricas são rotuladas por `org_id`, e a consulta ao painel é filtrada pelo mesmo
`can_access_org` do banco — nunca por filtro apenas de frontend.

## 6. Checklist

- [ ] Prefixo e política de storage por `org_id` aplicados e testados com tentativa de acesso cruzado
- [ ] Cotas cadastradas por porte e verificadas nos três pontos
- [ ] Ciclo de vida configurado, com Object Lock preservado na auditoria
- [ ] Automação de provisionamento com smoke test pós-criação
- [ ] Todos os alertas das seções 4.2 e 4.3 implantados com runbook
- [ ] Antirruído configurado (agrupamento, silenciamento, supressão em cascata)
- [ ] Painel por órgão com métricas escopadas
