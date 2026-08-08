# Pontos de Função — HydrosNet (APF / IFPUG)

Contagem estimada segundo o IFPUG CPM 4.3.1, com base em `docs/11_inventario_funcoes.md`,
`docs/04_schema_do_banco.md` e `docs/06_rotas.md`. Tipo: **contagem de aplicação instalada**.

## Fronteira da aplicação

Dentro: SPA React, PostgreSQL do projeto, Edge Functions próprias.
Fora (aplicações externas): Atlas ANA, SNIRH, LDAP/AD, servidor SMTP, SEI, Lovable AI Gateway, servidores MCP,
repositórios de artefatos e bases de dados de terceiros.

## Arquivos Lógicos Internos (ALI)

| # | ALI | TD (aprox.) | TR | Complexidade | PF |
|---|-----|-------------|----|--------------|----|
| 1 | Organizações e hierarquia | 15 | 1 | Baixa | 7 |
| 2 | Perfis e papéis | 14 | 2 | Baixa | 7 |
| 3 | Agências reguladoras | 15 | 1 | Baixa | 7 |
| 4 | Concessionárias | 17 | 1 | Baixa | 7 |
| 5 | ETEs | 18 | 1 | Baixa | 7 |
| 6 | Medições DBO | 8 | 1 | Baixa | 7 |
| 7 | Mananciais | 15 | 1 | Baixa | 7 |
| 8 | Sistemas produtores | 14 | 1 | Baixa | 7 |
| 9 | Métricas de distribuição | 12 | 1 | Baixa | 7 |
| 10 | Investimentos e lotes de importação | 20 | 2 | Baixa | 7 |
| 11 | Indicadores Atlas | 14 | 1 | Baixa | 7 |
| 12 | Modelos Córtex + fontes + thresholds | 25 | 3 | Média | 10 |
| 13 | Predições Córtex | 17 | 1 | Baixa | 7 |
| 14 | Repositórios de artefatos | 12 | 1 | Baixa | 7 |
| 15 | Bases de dados externas | 13 | 1 | Baixa | 7 |
| 16 | Configurações do sistema (LDAP, SMTP, SEI, parâmetros, cron) | 45 | 5 | Média | 10 |
| 17 | Auditoria (alterações e acessos) | 19 | 2 | Baixa | 7 |
| 18 | Log de probes de API | 9 | 1 | Baixa | 7 |
| | **Subtotal ALI** | | | | **135** |

## Arquivos de Interface Externa (AIE)

| # | AIE | Complexidade | PF |
|---|-----|--------------|----|
| 1 | Planilhas Atlas Águas / Atlas Esgotos | Baixa | 5 |
| 2 | Diretório LDAP/AD | Baixa | 5 |
| 3 | SNIRH | Baixa | 5 |
| 4 | Catálogo de ferramentas MCP | Baixa | 5 |
| | **Subtotal AIE** | | **20** |

## Entradas Externas (EE)

| Grupo | Qtde | Complexidade | PF unit. | PF |
|-------|------|--------------|----------|-----|
| CRUD de ETEs (incluir/alterar/excluir) | 3 | Média | 4 | 12 |
| CRUD de mananciais | 3 | Baixa | 3 | 9 |
| CRUD de sistemas produtores | 3 | Baixa | 3 | 9 |
| CRUD de métricas de distribuição | 3 | Baixa | 3 | 9 |
| CRUD de investimentos | 3 | Média | 4 | 12 |
| CRUD de concessionárias | 3 | Baixa | 3 | 9 |
| CRUD de agências reguladoras | 3 | Baixa | 3 | 9 |
| CRUD de repositórios de artefatos | 3 | Baixa | 3 | 9 |
| CRUD de bases de dados externas | 3 | Baixa | 3 | 9 |
| CRUD de modelos Córtex (com validação do falso afluente) | 3 | Alta | 6 | 18 |
| Vínculo de fontes ao modelo (incluir/remover) | 2 | Média | 4 | 8 |
| Thresholds por bacia/modelo (salvar/excluir) | 2 | Média | 4 | 8 |
| Lançamento manual de medição DBO | 1 | Média | 4 | 4 |
| Login / logout / cadastro | 3 | Média | 4 | 12 |
| Convite de usuário | 1 | Média | 4 | 4 |
| Atribuição de papel e vínculo organizacional | 2 | Média | 4 | 8 |
| Configurações (LDAP, SMTP, SEI, parâmetros) | 4 | Média | 4 | 16 |
| Upload e importação validada do Atlas | 1 | Alta | 6 | 6 |
| Disparo de inferência Córtex | 1 | Alta | 6 | 6 |
| Cancelamento de inferência | 1 | Baixa | 3 | 3 |
| Registro de probe de API | 1 | Baixa | 3 | 3 |
| Abertura de processo SEI | 1 | Média | 4 | 4 |
| **Subtotal EE** | | | | **187** |

## Consultas Externas (CE)

| Grupo | Qtde | Complexidade | PF unit. | PF |
|-------|------|--------------|----------|-----|
| Listagens paginadas com filtro (ETEs, mananciais, sistemas, distribuição, investimentos, concessionárias, agências, usuários, repositórios, bases, modelos) | 11 | Média | 4 | 44 |
| Detalhes com abas (concessionária, agência) | 2 | Alta | 6 | 12 |
| Mapa interativo de ETEs | 1 | Média | 4 | 4 |
| Log de integrações (busca + severidade) | 1 | Média | 4 | 4 |
| Trilha de alterações | 1 | Média | 4 | 4 |
| Trilha de acessos por organização | 1 | Média | 4 | 4 |
| Histórico de execuções do Córtex | 1 | Média | 4 | 4 |
| Autocomplete de organização/concessionária | 1 | Baixa | 3 | 3 |
| Feed de predições escopadas | 1 | Média | 4 | 4 |
| **Subtotal CE** | | | | **83** |

## Saídas Externas (SE)

| Grupo | Qtde | Complexidade | PF unit. | PF |
|-------|------|--------------|----------|-----|
| KPIs do dashboard do operador | 1 | Média | 5 | 5 |
| KPIs nacionais do Centro de Comando | 1 | Alta | 7 | 7 |
| Gráfico de tendência de DBO | 1 | Média | 5 | 5 |
| Painel de conformidade nacional | 1 | Média | 5 | 5 |
| Painel de alertas DBO (realtime) | 1 | Alta | 7 | 7 |
| Dashboard ISH-U com classificação | 1 | Alta | 7 | 7 |
| KPIs de risco por bacia (Córtex) | 1 | Alta | 7 | 7 |
| Disponibilidade e latência de API | 1 | Média | 5 | 5 |
| Painel de falhas por endpoint | 1 | Média | 5 | 5 |
| KPIs de conformidade nas abas de entidade | 1 | Média | 5 | 5 |
| Dashboard da agência reguladora | 1 | Média | 5 | 5 |
| Relatório de lote de importação Atlas | 1 | Média | 5 | 5 |
| E-mail transacional (SMTP) | 1 | Média | 5 | 5 |
| **Subtotal SE** | | | | **73** |

## Resumo

| Tipo | PF |
|------|----|
| ALI | 135 |
| AIE | 20 |
| EE | 187 |
| CE | 83 |
| SE | 73 |
| **Pontos de Função Não Ajustados (PFNA)** | **498** |

## Fator de ajuste (VAF) — informativo

As 14 características gerais do sistema, avaliadas de 0 a 5:

| CGS | Grau | CGS | Grau |
|-----|------|-----|------|
| Comunicação de dados | 5 | Atualização on-line | 5 |
| Processamento distribuído | 4 | Complexidade de processamento | 4 |
| Performance | 4 | Reusabilidade | 4 |
| Configuração intensiva | 3 | Facilidade de instalação | 2 |
| Volume de transações | 4 | Facilidade de operação | 4 |
| Entrada de dados on-line | 5 | Múltiplos locais | 4 |
| Eficiência do usuário final | 4 | Facilidade de mudança | 4 |

NGI = 56 → VAF = 0,65 + (0,01 × 56) = **1,21**
**PF Ajustados ≈ 498 × 1,21 ≈ 603**

> O VAF é mantido apenas como referência histórica; o IFPUG desencoraja seu uso em contratações modernas.
> Para efeito de medição, adote **498 PFNA**.

## Manutenção da contagem

Recontar sempre que: nova tabela em `public`, novo módulo de negócio, nova Edge Function com transação de
usuário, ou nova integração externa. Registrar a data e o delta abaixo.

| Data | PFNA | Observação |
|------|------|-----------|
| Contagem inicial | 498 | Baseline pós-módulos Atlas Águas e Córtex IA |
