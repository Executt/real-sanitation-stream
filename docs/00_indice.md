# Índice da Documentação — HydrosNet

Plataforma Integrada de Saneamento e Segurança Hídrica.
Documentação de engenharia mantida de forma **cumulativa**: cada alteração relevante de produto,
banco, segurança ou operação deve refletir no documento correspondente na mesma entrega.

## Como ler

| Perfil | Comece por |
|--------|-----------|
| Novo desenvolvedor | `02_arquitetura.md` → `06_rotas.md` → `04_schema_do_banco.md` |
| DBA / engenheiro de dados | `03_banco_de_dados.md` → `04_schema_do_banco.md` → `05_diagrama_er.md` → `15_series_temporais_imutabilidade.md` |
| Segurança / GRC | `09_politicas_seguranca.md` → `13_seguranca_hardening.md` → `08_frameworks_conformidade.md` → `16`, `18`, `20` |
| SRE / plataforma | `17_zeroops_alertas_storage_por_orgao.md` → `21_guia_sustentacao_operacao.md` → `aws_deployment_guide.md` / `openshift_deployment_guide.md` |
| Designer / frontend | `01_padronizacao_visual.md` → `24_especificacao_frontend_gov_fiori.md` → `26_especificacao_hub_gov_design_governance_v1_2.md` |
| Gestão / negócio | `12_regras_de_negocio.md` → `11_inventario_funcoes.md` → `10_pontos_de_funcao.md` |

## Documentos

| # | Documento | Conteúdo |
|---|-----------|----------|
| 00 | `00_indice.md` | Este índice, convenções e mapa de leitura |
| 01 | `01_padronizacao_visual.md` | Tokens HSL, tipografia, espaçamento, ícones, escala ISH-U |
| 02 | `02_arquitetura.md` | Stack, diretórios, camadas, módulos de negócio |
| 03 | `03_banco_de_dados.md` | Visão consolidada: domínios, funções, GRANTs |
| 04 | `04_schema_do_banco.md` | Tabelas, colunas, tipos, relacionamentos |
| 05 | `05_diagrama_er.md` | Diagramas Mermaid (ER, hierarquia, fluxo Córtex) |
| 06 | `06_rotas.md` | Rotas do frontend, RBAC e query params |
| 07 | `07_apis_e_integracoes.md` | Edge functions, PostgREST, Realtime, segredos |
| 08 | `08_frameworks_conformidade.md` | Frameworks GRC importados e como aplicá-los |
| 09 | `09_politicas_seguranca.md` | RLS, autenticação, autorização |
| 10 | `10_pontos_de_funcao.md` | Contagem APF (PFNA/PFA) |
| 11 | `11_inventario_funcoes.md` | Lista de funcionalidades entregues |
| 12 | `12_regras_de_negocio.md` | Regras RN-xx e validações |
| 13 | `13_seguranca_hardening.md` | Práticas, hardening aplicado, STRIDE |
| 14 | `14_configuracao_ldap.md` | Diretório corporativo e mapeamento de atributos |
| 15 | `15_series_temporais_imutabilidade.md` | Séries temporais, retenção, WORM e prova de integridade |
| 16 | `16_seguranca_rosa_aws_logs.md` | ROSA/OpenShift na AWS e pipeline de logs |
| 17 | `17_zeroops_alertas_storage_por_orgao.md` | ZeroOps, alertas e storage segregado por órgão |
| 18 | `18_inspecao_antimalware_bloqueio_extensoes.md` | Antimalware no upload e bloqueio de extensões |
| 19 | `19_simulacao_processo_end_to_end_producao.md` | Simulação de processo ponta a ponta em produção |
| 20 | `20_geoip_threat_intel_ingestao_lote_segura.md` | GeoIP, threat intel e ingestão em lote segura |
| 21 | `21_guia_sustentacao_operacao.md` | Sustentação, runbooks, SLAs e plantão |
| 22 | `22_arquitetura_analytics_downstream_opencti_devsecops.md` | Analytics downstream, OpenCTI e DevSecOps |
| 23 | `23_sistema_de_relatorios_e_notificacoes_email.md` | Relatórios agendados e notificações por e-mail |
| 24 | `24_especificacao_frontend_gov_fiori.md` | Frontend padrão gov.br + princípios SAP Fiori |
| 25 | `25_governanca_sala_situacao_provisionamento_dinamico.md` | Sala de Situação e provisionamento dinâmico de tenants |
| 26 | `26_especificacao_hub_gov_design_governance_v1_2.md` | Hub Gov — design governance v1.2 |
| — | `aws_deployment_guide.md` | Implantação em AWS (ROSA/EKS, RDS, S3, WAF) |
| — | `openshift_deployment_guide.md` | Implantação em OpenShift/OKD on-premises |
| — | `security_and_performance_checklist.md` | Checklist de release: segurança e performance |

## Convenções

- Idioma: português do Brasil. Termos técnicos consagrados em inglês permanecem em inglês (`RLS`, `edge function`).
- Unidades: vazão em **L/s** (operação) e **m³/s** (bacia); DBO em **mg/L**; eficiência em **%**.
  Nunca misturar unidades na mesma coluna sem rótulo explícito.
- Municípios sempre identificados por **código IBGE** além de nome/UF.
- Hierarquia institucional obrigatória: **ANA → Agência Reguladora → Prestador → ETE/Sistema**.
  Filtros, RLS e relatórios não pulam níveis.
- Estados de documento: `Vigente`, `Proposto` (desenho aprovado, implementação parcial ou pendente),
  `Descontinuado`. Cada documento declara o seu estado no cabeçalho quando não for `Vigente`.
- Toda predição do Córtex IA é **apoio à decisão**, nunca ato regulatório.
- Números de normas, prazos e taxas só entram na documentação quando confirmados na fonte oficial;
  na dúvida, descreve-se o instrumento e sinaliza-se a necessidade de confirmação.

## Manutenção

1. Alterou schema? Atualize `04`, `05` e, se mudar GRANT/RLS, `03` e `09`.
2. Criou rota ou mudou RBAC? Atualize `06` e `11`.
3. Criou edge function ou integração? Atualize `07` e, se houver segredo novo, `13`.
4. Mudou regra de cálculo (DBO, ISH-U, perdas)? Atualize `12` com a fórmula.
5. Entregou funcionalidade nova? Recontagem incremental em `10` e item novo em `11`.
