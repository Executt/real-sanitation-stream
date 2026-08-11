# Relatório de Verificação de Documentação e Qualidade Técnica

- **Data da verificação**: 2026-08-11
- **Escopo**: `docs/` (00–27, ADRs, glossário e guias), com conferência cruzada contra o schema do banco e as rotas do frontend.

## 1. Resultado consolidado

| Verificação | Resultado |
|-------------|-----------|
| Documentos previstos no índice existentes | 30/30 — nenhum arquivo faltante |
| Links relativos entre documentos | 0 quebrados |
| Blocos de código com cerca desbalanceada | 0 |
| Blocos Mermaid | 3, todos em `05_diagrama_er.md`, sintaxe válida (ER, hierarquia, fluxo Córtex) |
| Tabelas do banco documentadas em `04` | Cobertura total das tabelas do schema `public` |
| Regras de negócio com rastreabilidade | 11/11 mapeadas em `27_matriz_rastreabilidade.md` |
| Decisões arquiteturais registradas | 5 ADRs |

## 2. Consistência entre documentos

- Numeração, títulos e descrições do índice batem com os arquivos em disco.
- Convenções de unidade (L/s, m³/s, mg/L, %, R$, h) aplicadas de forma uniforme; o glossário passa a ser
  a fonte única e é referenciado pelo índice.
- Hierarquia **ANA → AR → Prestador → ETE** descrita de forma idêntica em `02`, `05`, `09` e `12`.
- Papéis (`operador`, `gestor_ar`, `gestor_ana`, `superadmin`) coerentes entre `06`, `09` e `14`.
- Rótulo "apoio à decisão" para predições reafirmado em `12` (RN-06), `13` e ADR-0005 — sem divergência.

## 3. Divergências corrigidas nesta verificação

| Item | Situação anterior | Ação |
|------|-------------------|------|
| Siglas do domínio (IVI, TMA, PMS, GAD, EPPO, ISH-U) definidas de forma dispersa | Repetição em vários documentos | Centralizadas em `Glossario.md`; demais documentos passam a apontar para ele |
| Rastreabilidade RN → banco → RLS | Implícita, exigia leitura cruzada de `09` e `12` | Explicitada em `27_matriz_rastreabilidade.md` com status por regra |
| Decisões de arquitetura | Descritas apenas como estado atual, sem alternativas nem trade-offs | Registradas em `docs/adr/` com data e reversibilidade |
| Índice sem glossário, matriz e ADRs | Estrutura incompleta | Índice atualizado |

## 4. Pendências técnicas confirmadas (não são erros de documentação)

Itens declarados como pendentes nos documentos e confirmados como ainda em aberto — mantidos visíveis
para não gerarem falsa sensação de conformidade:

| Pendência | Documento | Impacto |
|-----------|-----------|---------|
| Expurgo automático por `retention_days` | 13, 15, ADR-0003 | Crescimento indefinido de `api_probe_log` e trilhas |
| MFA para `superadmin` | 13 | Conta de maior privilégio com fator único |
| Rate limiting nas edge functions públicas | 13, ADR-0004 | Superfície de abuso e custo em provedores de IA |
| Bloco `.dark` não definido em `src/index.css` | 01 | Tema escuro anunciado nos tokens, não entregue |
| ISH-U sem teste automatizado de composição | 12 (RN-03), 27 | Regra classificada como parcial |
| Competência regulatória (RN-11) sem verificação sistemática de rótulo | 12, 27 | Risco de atribuir à ANA ato fora de competência |

## 5. Qualidade técnica observada

**Pontos fortes**
- Fronteira de autorização única no banco, com `WITH CHECK` simétrico — evita a classe mais comum de
  vazamento horizontal entre prestadores.
- Regras críticas (conformidade de DBO, governança de IA, idempotência de importação) implementadas em
  trigger e constraint, não em UI: não são contornáveis por chamada direta à API.
- Trilhas de auditoria imutáveis por policy, com separação entre alteração e acesso.
- Documentação declara estado (`Vigente` / `Proposto`) e distingue arquitetura-alvo de arquitetura vigente.

**Riscos técnicos a acompanhar**
- `can_access_org` avaliada por linha pode degradar consultas amplas em módulos nacionais; monitorar
  plano de execução nas telas de Investimentos e ISH-U.
- Recursão em `org_subtree` sem guarda explícita contra ciclo em `parent_id`.
- Volume de `api_probe_log` (probe de 30 s) é o primeiro candidato a estourar o gatilho do ADR-0003.
- Concentração de poder em funções `SECURITY DEFINER`: toda nova função precisa de `SET search_path`
  e revisão de `EXECUTE`.

## 6. Recomendações priorizadas

1. Implementar o expurgo por `retention_days` como job agendado e registrar a execução em `audit_log`.
2. Habilitar MFA para `superadmin` e rate limiting nas funções públicas.
3. Adicionar guarda contra ciclo em `organizations.parent_id`.
4. Cobrir RN-01, RN-03 e RN-06 com testes que consultem o banco, promovendo os status **P** para **A** em `27`.
5. Definir o bloco `.dark` ou remover a promessa de tema escuro de `01`.

## 7. Método

Conferência automatizada de existência de arquivos, integridade de links relativos, balanceamento de
cercas de código e contagem de blocos Mermaid sobre todo o diretório `docs/`; leitura cruzada manual
entre índice, schema do banco, rotas do frontend e regras de negócio.

Repetir esta verificação a cada entrega que altere schema, rota, RBAC ou regra de cálculo.
