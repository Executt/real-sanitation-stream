# Inventário de Funções — HydrosNet

Lista funcional do sistema. Base para a contagem de pontos de função em `docs/FUNCTION_POINTS.md`.

## 1. Autenticação e sessão

| # | Função | Local |
|---|--------|-------|
| 1.1 | Login por e-mail/senha | `Login.tsx` |
| 1.2 | Login social (Google) | `Login.tsx` |
| 1.3 | Autenticação corporativa via LDAP | `ldap-sync` |
| 1.4 | Encerramento de sessão | `TopNavbar.tsx` |
| 1.5 | Carga de perfil e papéis | `AuthContext.tsx` |
| 1.6 | Guard de rota por papel | `ProtectedRoute.tsx` |

## 2. Esgotamento sanitário

| # | Função | Local |
|---|--------|-------|
| 2.1 | Dashboard do operador (KPIs) | `OperadorDashboard.tsx` |
| 2.2 | CRUD de ETEs com busca, filtro (status/UF/AR) e paginação | `Etes.tsx` |
| 2.3 | Lançamento manual de medição DBO | `CadastroManual.tsx` |
| 2.4 | Tabela de status das ETEs | `EteStatusTable.tsx` |
| 2.5 | Cálculo automático de eficiência e conformidade | trigger `set_conforme_dbo` |

## 3. Centro de Comando (ANA)

| # | Função | Local |
|---|--------|-------|
| 3.1 | KPIs nacionais | `CommandCenter.tsx` |
| 3.2 | Tendência de DBO por bacia | `TendenciaPage.tsx` / `DboTrendChart.tsx` |
| 3.3 | Mapa interativo de ETEs (Leaflet) | `MapaPage.tsx` / `EteMap.tsx` |
| 3.4 | Painel de alertas DBO em tempo real | `AlertasDboPage.tsx` |
| 3.5 | Painel de conformidade nacional | `ConformidadePage.tsx` |

## 4. Módulos Atlas Águas

| # | Função | Local |
|---|--------|-------|
| 4.1 | Mananciais: CRUD, vulnerabilidade, vazões | `Mananciais.tsx` |
| 4.2 | Sistemas produtores: CRUD, capacidade vs demanda 2035 | `SistemasProducao.tsx` |
| 4.3 | Distribuição e perdas: cobertura, IVI, TMA, PMS | `Distribuicao.tsx` |
| 4.4 | Dashboard ISH-U com classificação por município | `IshDashboard.tsx` |
| 4.5 | Carteira de investimentos EPPO | `Investimentos.tsx` |
| 4.6 | Filtros hierárquicos em cascata | `HierarchyFilters.tsx` / `useHierarchyFilter.ts` |

## 5. Córtex IA

| # | Função | Local |
|---|--------|-------|
| 5.1 | KPIs de risco por bacia e lista de ETEs em alerta preditivo | `CortexPage.tsx` |
| 5.2 | Aba de predições escopadas por entidade | `CortexTab.tsx` |
| 5.3 | Execução de inferência sob demanda com progresso realtime | `useCortexRun.ts` / `CortexRunStatus.tsx` |
| 5.4 | Cancelamento de execução | `useCortexRun.ts` |
| 5.5 | Auditoria de execuções (parâmetros, fontes, MCP, duração, erro) | `CortexExecucoes.tsx` |
| 5.6 | Gestão de modelos com validação do falso afluente | `CortexModelos.tsx` |
| 5.7 | Vínculo de fontes (repositórios, bases, MCP) ao modelo | `CortexModeloFontes.tsx` |
| 5.8 | Parametrização de thresholds por bacia/modelo | `CortexThresholdsPanel.tsx` |
| 5.9 | Ingestão incremental do Atlas | `cortex-ingest-atlas` |
| 5.10 | Job diário de inferência | `pg_cron` `cortex-infer-daily` |

## 6. Governança institucional

| # | Função | Local |
|---|--------|-------|
| 6.1 | CRUD de agências reguladoras | `AgenciasReguladoras.tsx` |
| 6.2 | Detalhe da AR com abas (ETEs, usuários, integrações, Córtex, auditoria) | `AgenciaRegDetail.tsx` |
| 6.3 | CRUD de concessionárias | `Concessionarias.tsx` |
| 6.4 | Detalhe da concessionária com abas | `ConcessionariaDetail.tsx` |
| 6.5 | Dashboard da agência reguladora | `AgenciaDashboard.tsx` |
| 6.6 | Contexto de organização e visibilidade | `OrgContext.tsx` |

## 7. Administração

| # | Função | Local |
|---|--------|-------|
| 7.1 | Hub de administração | `AdminHub.tsx` |
| 7.2 | Gestão de usuários, papéis e vínculos (autocomplete server-side) | `AdminPanel.tsx` |
| 7.3 | Convite de usuário | `invite-user` |
| 7.4 | Configuração LDAP | `LdapConfig.tsx` |
| 7.5 | Configuração SMTP | `SmtpConfig.tsx` |
| 7.6 | Configuração SEI | `SeiConfig.tsx` |
| 7.7 | Parâmetros do sistema | `SystemParameters.tsx` |
| 7.8 | Cadastro de repositórios de artefatos | `RepositoriosArtefatos.tsx` |
| 7.9 | Cadastro de bases de dados externas | `BasesDados.tsx` |
| 7.10 | Importação validada de planilhas do Atlas | `AtlasImport.tsx` |

## 8. Monitoramento e auditoria

| # | Função | Local |
|---|--------|-------|
| 8.1 | Monitoramento de API com probes persistidos | `ApiMonitoring.tsx` |
| 8.2 | Histórico por endpoint e falhas recorrentes | `EndpointFailuresPanel.tsx` |
| 8.3 | Log de integrações com busca e severidade | `IntegrationLog.tsx` |
| 8.4 | Trilha de alterações | `AuditLog.tsx` |
| 8.5 | Trilha de acessos por organização | `GovernancaAudit.tsx` |
| 8.6 | Registro automático de acesso a módulos | `useAccessLog.ts` |

## 9. Infraestrutura de UI

`DashboardLayout`, `TopNavbar`, `AppSidebar`, `SidebarFilters`, `ErrorBoundary`, `StatCard`,
`StatCardSkeleton`, `TablePagination`, `SortHeader`, `ModuleFilters`, `useTable`.

**Total: 9 grupos, 57 funções de negócio catalogadas.**
