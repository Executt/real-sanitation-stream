# Analytics Downstream, OpenCTI e DevSecOps — HydrosNet

Estado: **Proposto**.

Define para onde o dado vai depois do transacional (analytics), como a inteligência de ameaças é
correlacionada (OpenCTI) e como o ciclo de entrega mantém segurança embutida (DevSecOps).

## 1. Arquitetura de analytics downstream

```
  Transacional (PostgreSQL/RLS)
        │  CDC lógico (wal2json / Debezium) + export incremental
        ▼
  [ Landing ]  S3 raw — Parquet, particionado dt=/dominio=/org=
        │  qualidade: esquema, nulos, faixas, unicidade
        ▼
  [ Curated ]  modelagem dimensional + SCD2 em cadastro
        │
        ▼
  [ Marts ]  esgotamento · água · perdas · ISH-U · investimentos · governança
        │
        ├─► BI (painéis institucionais, com filtro de escopo)
        ├─► Córtex IA (features de treino, sem PII)
        └─► Publicação aberta (agregados, sem reidentificação)
```

Princípio: **o lago não afrouxa a governança**. Toda tabela curada carrega `org_id`; todo consumo
passa por uma camada semântica que aplica o mesmo escopo hierárquico do `can_access_org`.

### 1.1 Camadas

| Camada | Formato | Retenção | Acesso |
|--------|---------|----------|--------|
| Raw | Parquet + manifesto JSON | 5 anos | engenharia de dados |
| Curated | Parquet/Iceberg, particionado | 5 anos | analistas com escopo |
| Marts | tabelas agregadas | 10 anos | BI e API analítica |
| Publicação | CSV/JSON agregados | permanente | público |

### 1.2 Modelo dimensional

Fatos: `f_medicao_dbo`, `f_probe`, `f_predicao`, `f_investimento`, `f_acesso`.
Dimensões: `d_organizacao` (SCD2, preserva a hierarquia na data do fato), `d_ete`, `d_municipio`
(IBGE como chave), `d_bacia`, `d_tempo`, `d_modelo`.

Regra: fato guarda a chave da dimensão **na data do evento**. Reorganização institucional
(prestador troca de AR) não reescreve histórico.

### 1.3 Qualidade

Testes executados a cada carga: unicidade da chave, integridade referencial, não nulidade das
colunas obrigatórias, faixa física de DBO e vazão, soma de percentuais, freshness (dado do dia
anterior presente). Falha bloqueia a promoção da camada, mantendo a anterior servindo.

### 1.4 Linhagem

Cada tabela registra: origem, transformação, versão do código, `import_batch_id` quando aplicável,
e horário. Um indicador em painel deve ser rastreável até a linha transacional que o originou —
requisito de defesa em auditoria regulatória.

### 1.5 Anonimização para publicação

- Nenhum identificador de pessoa. `user_id` vira hash com sal rotacionado.
- Agregação com supressão de célula pequena (menos de 5 unidades) para evitar reidentificação.
- Coordenada de instalação sensível reduzida a centroide municipal na publicação.

## 2. OpenCTI

### 2.1 Papel

OpenCTI é a plataforma de correlação de ameaça: consolida feeds, mantém relação entre indicador,
ator, campanha e técnica (ATT&CK), e devolve indicador acionável para WAF, SIEM e upload scanner.
O HydrosNet é **consumidor** e **produtor** de inteligência.

### 2.2 Integração

```
Feeds externos (CTIR Gov, abuse.ch, MISP) ──► conectores OpenCTI
Eventos do HydrosNet (SIEM) ──────────────► conector interno (STIX 2.1)
                                              │
                                     [ OpenCTI knowledge graph ]
                                              │
      ┌───────────────────┬───────────────────┴────────────┐
      ▼                   ▼                                ▼
  WAF (IP/domínio)   Upload scanner (hash)        SIEM (enriquecimento)
```

- Transporte STIX 2.1 sobre TAXII 2.1, autenticado, com TLS mútuo quando a fonte suportar.
- Conector interno publica apenas *observables* técnicos (IP, hash, domínio) — nunca dado de
  saneamento, nunca identificação de usuário ou de órgão.
- Marcação TLP obrigatória; TLP:RED não sai do OpenCTI.
- Deduplicação por `value` + `type`; confiança consolidada pela fonte de maior score.

### 2.3 Casos de uso

| Caso | Fluxo |
|------|-------|
| Bloqueio reputacional | OpenCTI → lista de IP confiança ≥ 80 → regra WAF, atualizada de hora em hora |
| Varredura de upload | hash do arquivo → OpenCTI → veredito complementar ao ClamAV |
| Caça (hunting) | técnica ATT&CK relevante → consulta retroativa de 90 d no SIEM |
| Resposta a incidente | IOC do incidente → grafo → identifica campanha e amplia a busca |
| Contribuição | IOC confirmado internamente → publicado com TLP adequado |

### 2.4 Higiene

Indicador expira; allowlist tem dono e prazo; toda regra de bloqueio derivada é revisável e
reversível em minutos. Métrica de saúde: taxa de falso positivo por feed, revisada mensalmente —
feed acima de 5% de falso positivo é rebaixado para enriquecimento apenas.

## 3. DevSecOps

### 3.1 Esteira

```
commit → pre-commit (lint, secret scan)
       → PR: build · testes · SAST · SCA · IaC scan · lint de migração
       → merge: build de imagem · SBOM · assinatura · scan de imagem
       → deploy dev (auto) → hml (auto + DAST) → prod (aprovação)
       → pós-deploy: smoke + jornadas sintéticas + observação de 30 min
```

### 3.2 Portões de qualidade

| Portão | Ferramenta | Critério de bloqueio |
|--------|-----------|----------------------|
| Segredo em código | gitleaks | qualquer achado |
| SAST | Semgrep / SonarQube | vulnerabilidade alta ou crítica |
| Dependências (SCA) | scan de dependências | CVE crítica com correção disponível |
| IaC | Checkov / Kubelinter | política crítica violada |
| Imagem | Trivy / ACS | CVE crítica fixável, imagem sem assinatura |
| Migração SQL | lint próprio | `CREATE TABLE` sem GRANT + RLS; policy sem `WITH CHECK` |
| Cobertura de teste | Vitest | queda maior que 2 pontos em relação à base |
| DAST | ZAP baseline | alerta alto |
| A11y | axe | violação crítica em rota principal |

O lint de migração é específico deste projeto e checa, no mínimo:
tabela nova em `public` com `GRANT` e `ENABLE ROW LEVEL SECURITY`; função `SECURITY DEFINER`
com `SET search_path = public`; ausência de `GRANT ... TO anon`; policy de escrita com
`WITH CHECK` equivalente ao `USING`.

### 3.3 Cadeia de suprimentos

- SBOM (CycloneDX) gerado por build e arquivado com a imagem.
- Imagens assinadas com Cosign; verificação na admissão do cluster.
- Base images fixadas por digest, atualizadas semanalmente por bot com PR automático.
- Provenance SLSA nível 3 como meta; build isolado, sem acesso a segredo de produção.

### 3.4 Ambientes e promoção

Artefato único promovido entre ambientes — nunca rebuild por ambiente. Configuração por
`ConfigMap`/segredo externo. Rollback é o redeploy do artefato anterior, testado a cada release.

### 3.5 Métricas DORA

| Métrica | Alvo |
|---------|------|
| Frequência de deploy | ≥ 1/semana em produção |
| Lead time para mudança | < 5 dias |
| Taxa de falha de mudança | < 15% |
| Tempo de restauração | < 1 h |

### 3.6 Segurança no ciclo

- Modelagem de ameaça obrigatória para feature que toque autenticação, RLS, upload ou integração externa.
- Revisão de segurança obrigatória em PR que altere policy, papel, edge function ou dependência de rede.
- Todo achado de scanner tem dono e prazo; achado ignorado exige justificativa registrada na
  memória de segurança do projeto.
- Treinamento anual do time em OWASP Top 10 e nas particularidades de RLS multi-tenant.

## 4. Checklist

- [ ] CDC ou export incremental com contrato de esquema versionado
- [ ] Camadas raw/curated/marts com testes de qualidade bloqueantes
- [ ] `d_organizacao` em SCD2 preservando a hierarquia histórica
- [ ] Camada semântica aplicando escopo equivalente ao RLS
- [ ] Supressão de célula pequena na publicação aberta
- [ ] Conectores OpenCTI (entrada e saída) com TLP e expiração
- [ ] WAF e upload scanner consumindo indicadores com confiança ≥ 80
- [ ] Todos os portões da seção 3.2 ativos e bloqueantes
- [ ] SBOM + assinatura + verificação na admissão
- [ ] Rollback testado no release corrente
