# Glossário — HydrosNet

Termos, siglas e unidades padronizadas para toda a plataforma. Sempre que um documento usar um
destes termos, deve fazê-lo com o significado abaixo — sem sinônimos criativos.

## Instituições e papéis

| Termo | Definição |
|-------|-----------|
| **ANA** | Agência Nacional de Águas e Saneamento Básico. Nível federal da hierarquia; alcance nacional na plataforma. |
| **AR / Agência Reguladora** | Agência reguladora estadual ou municipal de saneamento. Nível supervisório entre ANA e prestador. |
| **Prestador / Concessionária** | Entidade que opera sistemas de água e esgoto em um ou mais municípios. |
| **Órgão gestor estadual** | Autoridade competente por outorga em corpo hídrico de domínio estadual (ver RN-11). |
| **Operador** | Usuário de campo/operação vinculado a um prestador. Papel `operador`. |
| **gestor_ar** | Papel de usuário de agência reguladora; vê a própria AR e a subárvore de prestadores. |
| **gestor_ana** | Papel de usuário da ANA; alcance nacional de leitura. |
| **superadmin** | Papel de administração da plataforma: usuários, papéis, integrações e parâmetros. |
| **Tenant** | Organização (`organizations`) que delimita a visibilidade de dados. |

## Domínio técnico-setorial

| Termo | Definição |
|-------|-----------|
| **ETE** | Estação de Tratamento de Esgoto. Unidade operacional monitorada (`etes`). |
| **ETA** | Estação de Tratamento de Água. Compõe sistema produtor. |
| **DBO** | Demanda Bioquímica de Oxigênio, em **mg/L**. Indicador de carga orgânica. |
| **DBO afluente / entrada** | Concentração medida na chegada da ETE (`dbo_entrada_mg_l`). |
| **DBO efluente / saída** | Concentração medida na saída da ETE (`dbo_saida_mg_l`). |
| **Eficiência de remoção** | `(entrada − saída) / entrada × 100`, em %. Ver RN-01. |
| **Conformidade** | Eficiência ≥ `system_parameters.dbo_min`. Calculada no banco, nunca na UI. |
| **Manancial** | Corpo hídrico de captação (`water_sources`): superficial, subterrâneo ou misto. |
| **Sistema produtor** | Conjunto captação → adução → tratamento → reservação (`production_systems`); isolado ou integrado. |
| **Bacia hidrográfica** | Unidade territorial de agregação hídrica; chave de agrupamento em KPIs e limiares do Córtex. |
| **Outorga** | Autorização de uso de recurso hídrico; vazão outorgada em L/s. |
| **IVI** | Índice de Vazamentos da Infraestrutura — proxy de perdas na distribuição (`ivi_loss_index`). |
| **TMA** | Tempo Médio de Atendimento, em horas (`tma_hours`). |
| **PMS** | Pressão Média do Sistema (`pms_pressure`). |
| **GAD** | Métrica de garantia/adequação de disponibilidade hídrica (`gad_metric`). |
| **ISH-U** | Índice de Segurança Hídrica Urbana, composto por município/ano. Ver RN-03. |
| **EPPO** | Ciclo `ESTUDO → PLANO → PROJETO → OBRA` de investimentos. Ver RN-04. |
| **Atlas Águas / Atlas Esgotos** | Bases nacionais da ANA usadas para carga de indicadores e investimentos. |
| **SNIRH** | Sistema Nacional de Informações sobre Recursos Hídricos. Origem de integrações. |
| **SEI** | Sistema Eletrônico de Informações; abertura de processo via `sei-create-process`. |
| **Código IBGE** | Identificador oficial de município; obrigatório junto de nome/UF. |

## Plataforma e arquitetura

| Termo | Definição |
|-------|-----------|
| **Córtex IA** | Camada analítica preditiva (modelos, fontes, predições, limiares). Sempre **apoio à decisão**. |
| **Regra do Falso Afluente** | Governança que impede modelo em produção sem laudo causal, checklist e métricas de anos anômalos. Ver RN-06. |
| **RAG** | Recuperação aumentada por geração: fontes documentais vinculadas a um modelo (`papel = contexto_rag`). |
| **MCP** | Model Context Protocol; ferramentas externas consultadas pela inferência. |
| **RLS** | Row Level Security do PostgreSQL: filtro por linha aplicado no banco. |
| **GRANT** | Privilégio de tabela por papel de banco; obrigatório em toda tabela nova do schema `public`. |
| **Subárvore** | Conjunto `org_subtree(org)` — a organização e todos os descendentes. Base de `can_access_org`. |
| **Edge function** | Função serverless Deno do backend (`supabase/functions/*`). |
| **PostgREST** | API REST automática sobre o banco, usada pelo cliente com RLS aplicada. |
| **Realtime** | Canal de eventos do banco para atualização instantânea da UI. |
| **Probe** | Checagem periódica de endpoint de integração, persistida em `api_probe_log`. Ver RN-08. |
| **Trilha de acesso** | `access_audit_log`: quem consultou qual módulo, escopo e filtros. |
| **Trilha de alteração** | `audit_log`: quem alterou o quê, por trigger. Imutável. |
| **external_key** | Chave natural de idempotência das importações do Atlas. Ver RN-05. |
| **secret_ref** | Ponteiro para segredo gerenciado pela plataforma; credencial nunca em tabela. |
| **WORM** | *Write Once, Read Many* — retenção imutável de séries e trilhas. |
| **ADR** | Architecture Decision Record; registro datado de decisão arquitetural (`docs/adr/`). |
| **PFNA / PFA** | Pontos de Função Não Ajustados / Ajustados (contagem APF). |

## Unidades

| Grandeza | Unidade padrão | Observação |
|----------|----------------|-----------|
| Vazão operacional | **L/s** | `vazao_projeto_lps`, `vazao_atual_lps`, `capacidade_instalada_lps` |
| Vazão de bacia | **m³/s** | Nunca misturar com L/s na mesma coluna sem rótulo |
| DBO | **mg/L** | — |
| Eficiência, cobertura, perdas | **%** | 0–100 |
| Valor de investimento | **R$** | Sempre com `horizonte_ano` ou `horizonte_faixa` |
| Tempo de atendimento | **h** | — |
| Pressão | **mca** | Coluna `pms_pressure` |
| Carga orgânica | **kg/dia** | `carga_dbo_kg_dia` |

## Convenções de escrita

- Siglas na primeira ocorrência de cada documento: forma extensa seguida da sigla entre parênteses.
- Nomes de tabela, coluna e função sempre em `code`, no singular do schema real.
- Nunca chamar predição de "diagnóstico", "auto de infração" ou "ato regulatório".
- Estado de documento: `Vigente`, `Proposto`, `Descontinuado`.
