# Rotas do Frontend — HydrosNet

Roteador: React Router v6. Todas as rotas autenticadas ficam sob `<ProtectedRoute><DashboardLayout/></ProtectedRoute>`.
`ProtectedRoute` aceita `requiredRole` e também funciona como *layout route* (renderiza `<Outlet/>` quando não recebe `children`).

## Regra de RBAC no roteador

| Situação | Comportamento |
|----------|---------------|
| Sem sessão | Redireciona para `/login` |
| Sessão carregando | Spinner "Autenticando..." |
| `requiredRole` não atendido | Redireciona para `/operador` |
| `superadmin` | Bypass de qualquer `requiredRole` |

> O guard de rota é **conveniência de UX**. A autorização efetiva é do banco (RLS + `has_role`).

## Pública

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/login` | `Login` | Autenticação e cadastro (Supabase Auth) |
| `*` | `NotFound` | 404 |

## Operação (autenticado)

| Rota | Componente | Papel mínimo | Query params / estado |
|------|-----------|--------------|------------------------|
| `/`, `/operador` | `OperadorDashboard` | autenticado | — |
| `/operador/etes` | `Etes` | autenticado | busca, `status`, `uf`, `agencia_id`, paginação (`useTable`) |
| `/operador/cadastro` | `CadastroManual` | autenticado | — |
| `/operador/api` | `ApiMonitoring` | autenticado | polling 30 s |
| `/operador/logs` | `IntegrationLog` | autenticado | busca, `severity` |

## Centro de Comando (ANA)

| Rota | Componente | Papel mínimo | Observações |
|------|-----------|--------------|-------------|
| `/command-center` | `CommandCenter` | autenticado | KPIs nacionais |
| `/command-center/tendencia` | `TendenciaPage` | autenticado | filtro por bacia |
| `/command-center/mapa` | `MapaPage` | autenticado | Leaflet, filtro por status |
| `/command-center/alertas` | `AlertasDboPage` | autenticado | realtime `dbo_medicoes` |
| `/command-center/conformidade` | `ConformidadePage` | autenticado | — |
| `/command-center/cortex` | `CortexPage` | autenticado | filtros bacia/classificação, paginação |
| `/command-center/cortex/execucoes` | `CortexExecucoes` | autenticado | auditoria de execuções |

## Módulos Atlas Águas

| Rota | Componente | Filtros hierárquicos |
|------|-----------|----------------------|
| `/agua/mananciais` | `Mananciais` | UF, município, organização, subordinadas, busca |
| `/agua/sistemas` | `SistemasProducao` | idem + `type`, `status` |
| `/distribuicao` | `Distribuicao` | idem + `ano_referencia` |
| `/ish-u` | `IshDashboard` | idem |
| `/investimentos` | `Investimentos` | idem + `category`, `eppo`, `status` |

## Portal da Agência Reguladora

| Rota | Componente | Papel mínimo |
|------|-----------|--------------|
| `/agencia` | `AgenciaDashboard` | `gestor_ar` |

## Administração (`requiredRole="superadmin"`)

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/admin` | `AdminHub` | Hub de administração |
| `/admin/usuarios` | `AdminPanel` | Usuários, papéis e vínculos |
| `/admin/concessionarias` | `Concessionarias` | CRUD de prestadores |
| `/admin/concessionarias/:id` | `ConcessionariaDetail` | Abas: ETEs, usuários, integrações, Córtex, auditoria |
| `/admin/agencias` | `AgenciasReguladoras` | CRUD de agências reguladoras |
| `/admin/agencias/:id` | `AgenciaRegDetail` | Abas equivalentes, escopo da AR |
| `/admin/ldap` | `LdapConfig` | Diretório corporativo |
| `/admin/smtp` | `SmtpConfig` | E-mail transacional |
| `/admin/sei` | `SeiConfig` | Integração SEI |
| `/admin/parametros` | `SystemParameters` | Limites DBO, timeouts, retenção |
| `/admin/auditoria` | `AuditLog` | Trilha técnica (`audit_log`) |
| `/admin/governanca` | `GovernancaAudit` | Trilha de acesso por org (`access_audit_log`) |
| `/admin/atlas-import` | `AtlasImport` | Upload/validação de planilhas do Atlas |
| `/admin/cortex-modelos` | `CortexModelos` | Modelos de IA, fontes e thresholds |
| `/admin/repositorios` | `RepositoriosArtefatos` | Repositórios de artefatos |
| `/admin/bases-dados` | `BasesDados` | Bases de dados externas |

## Parâmetros de rota

| Parâmetro | Rotas | Tipo |
|-----------|-------|------|
| `:id` | `/admin/concessionarias/:id`, `/admin/agencias/:id` | UUID |

Filtros de listagem não são persistidos na URL — são estado local (`useTable` / `useHierarchyFilter`).
Evolução recomendada: sincronizar filtros com `searchParams` para permitir links compartilháveis.
