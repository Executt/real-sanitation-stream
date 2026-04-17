# Inventário, Contagem de Funções e Pontos de Função — HydrosNet

---

## PARTE 1 — Visão Técnica

### Resumo Quantitativo

| Categoria | Quantidade |
|-----------|-----------|
| **Componentes React (páginas)** | 14 |
| **Componentes React (UI/layout)** | 9 |
| **Componentes shadcn/ui** | 42 |
| **Context Providers** | 1 |
| **Custom Hooks** | 2 |
| **Funções Utilitárias** | 1 |
| **Funções SQL (banco)** | 3 |
| **Edge Functions** | 1 |
| **Total de funções/componentes da aplicação** | **73** |

### Detalhamento — Páginas (14)

| # | Arquivo | Função | Tipo |
|---|---------|--------|------|
| 1 | `src/pages/Login.tsx` | `Login` | Page Component |
| 2 | `src/pages/OperadorDashboard.tsx` | `OperadorDashboard` | Page Component |
| 3 | `src/pages/CommandCenter.tsx` | `CommandCenter` | Page Component |
| 4 | `src/pages/CadastroManual.tsx` | `CadastroManual` | Page Component |
| 5 | `src/pages/AdminHub.tsx` | `AdminHub` | Page Component (★ Hub) |
| 6 | `src/pages/AdminPanel.tsx` | `AdminPanel` | Page Component |
| 7 | `src/pages/LdapConfig.tsx` | `LdapConfig` | Page Component |
| 8 | `src/pages/SmtpConfig.tsx` | `SmtpConfig` | Page Component |
| 9 | `src/pages/SeiConfig.tsx` | `SeiConfig` | Page Component |
| 10 | `src/pages/SystemParameters.tsx` | `SystemParameters` | Page Component |
| 11 | `src/pages/AuditLog.tsx` | `AuditLog` | Page Component |
| 12 | `src/pages/PlaceholderPage.tsx` | `PlaceholderPage` | Page Component |
| 13 | `src/pages/NotFound.tsx` | `NotFound` | Page Component |
| 14 | `src/pages/Index.tsx` | `Index` | Page Component (redirect) |

### Detalhamento — Componentes de Aplicação (9)

| # | Arquivo | Função | Responsabilidade |
|---|---------|--------|-----------------|
| 1 | `src/components/TopNavbar.tsx` | `TopNavbar` | Navegação horizontal superior |
| 2 | `src/components/TopNavbar.tsx` | `NavDropdown` | Menu dropdown da navbar |
| 3 | `src/components/DashboardLayout.tsx` | `DashboardLayout` | Layout principal com outlet |
| 4 | `src/components/ProtectedRoute.tsx` | `ProtectedRoute` | Guarda de rota |
| 5 | `src/components/StatCard.tsx` | `StatCard` | Card de indicador numérico |
| 6 | `src/components/EteStatusTable.tsx` | `EteStatusTable` | Tabela de status de ETEs |
| 7 | `src/components/AlertItem.tsx` | `AlertItem` | Item de alerta com severidade |
| 8 | `src/components/DboTrendChart.tsx` | `DboTrendChart` | Gráfico de tendência DBO |
| 9 | `src/components/EteMap.tsx` | `EteMap` | Mapa Leaflet com marcadores |

### Detalhamento — Contextos e Hooks (3)

| # | Arquivo | Função | Tipo |
|---|---------|--------|------|
| 1 | `src/contexts/AuthContext.tsx` | `AuthProvider` | Context Provider |
| 2 | `src/contexts/AuthContext.tsx` | `useAuth` | Custom Hook |
| 3 | `src/hooks/use-mobile.tsx` | `useIsMobile` | Custom Hook |

### Detalhamento — Funções Internas de Componentes (16)

| # | Componente | Função | Tipo |
|---|-----------|--------|------|
| 1 | `AdminPanel` | `fetchUsers` | Data fetching |
| 2 | `AdminPanel` | `handleAddRole` | Event handler |
| 3 | `AdminPanel` | `handleRemoveRole` | Event handler |
| 4 | `CadastroManual` | `handleSubmit` | Form handler |
| 5 | `DboTrendChart` | `generateData` | Data generator |
| 6 | `LdapConfig` | `handleTestConnection` | LDAP test |
| 7 | `LdapConfig` | `handleSync` | LDAP sync |
| 8 | `LdapConfig` | `handleImportUser` | User import |
| 9 | `SmtpConfig` | `handleSave` | Form handler |
| 10 | `SmtpConfig` | `handleTest` | E-mail teste |
| 11 | `SeiConfig` | `handleSave` | Form handler |
| 12 | `SeiConfig` | `handleTest` | Conexão SEI teste |
| 13 | `SystemParameters` | `setParams` | State updater |
| 14 | `EteMap` | `FitBounds` | Map helper |
| 15 | `EteMap` | `createIcon` | SVG marker factory |
| 16 | `Login` | `handleAuth` | Auth handler |

### Detalhamento — Funções SQL (3)

| # | Nome | Tipo | Descrição |
|---|------|------|-----------|
| 1 | `has_role(_user_id, _role)` | SQL Function | Verifica role do usuário |
| 2 | `handle_new_user()` | Trigger Function | Cria perfil no signup |
| 3 | `update_updated_at_column()` | Trigger Function | Atualiza timestamp |

### Detalhamento — Edge Functions (1)

| # | Nome | Runtime | Descrição |
|---|------|---------|-----------|
| 1 | `seed-admin` | Deno | Cria superadmin inicial |

### Componentes shadcn/ui (42)

Accordion, AlertDialog, Alert, AspectRatio, Avatar, Badge, Breadcrumb, Calendar, Card, Carousel, Chart, Checkbox, Collapsible, Command, ContextMenu, Dialog, Drawer, DropdownMenu, Form, HoverCard, InputOTP, Input, Label, Menubar, NavigationMenu, Pagination, Popover, Progress, RadioGroup, Resizable, ScrollArea, Select, Separator, Sheet, Sidebar, Skeleton, Slider, Sonner, Switch, Tabs, Textarea, Toast, Toaster, ToggleGroup, Toggle, Tooltip.

---

## PARTE 2 — Visão de Negócio

### O que o sistema faz, em linguagem natural

O HydrosNet é uma plataforma que ajuda o Brasil a monitorar o tratamento de esgoto em todo o país. Veja o que cada parte faz:

#### Acesso e Segurança
- **Tela de Login** — Permite entrar no sistema com e-mail e senha; novos usuários podem se cadastrar.
- **Controle de Acesso** — Cada perfil (Operador, Gestor ANA, Superadmin) vê apenas o que lhe é permitido.
- **Proteção de Páginas** — Páginas sensíveis exigem login; tentativas anônimas são redirecionadas.

#### Para Operadores de Saneamento
- **Painel do Operador** — Resumo de ETEs conectadas, falhas de API, eficiência média e cadastros pendentes.
- **Tabela de Status** — Lista de ETEs com código, município, eficiência DBO e tipo de integração.
- **Alertas de Integração** — Notificações sobre timeouts, certificados vencendo e sensores offline.
- **Cadastro Manual** — Formulário para registrar dados quando não há integração automática.

#### Para Gestores da ANA
- **Centro de Comando** — Visão nacional com totais de ETEs e eficiência média do país.
- **Gráfico de Tendência DBO** — Evolução mensal por bacia hidrográfica.
- **Mapa Interativo** — Brasil georreferenciado com marcadores coloridos por status.
- **Indicadores por Bacia** — Cobertura, número de ETEs e eficiência por região.
- **Alertas Nacionais** — Excesso de carga, baixa cobertura, problemas críticos.

#### Hub de Administração (★ NOVO)
A área de administração agora tem uma **página principal (hub)** que reúne todas as funções de parametrização do sistema em um só lugar:

- **Usuários & Roles** — Gerenciar usuários e atribuir perfis de acesso.
- **Configuração LDAP** — Conectar ao Active Directory da organização para importar usuários corporativos automaticamente, com suporte a TLS/SSL.
- **Configuração SMTP** — Definir o servidor de e-mail que enviará notificações e alertas (com teste de envio).
- **Integração SEI** — Configurar o Sistema Eletrônico de Informações para abrir processos automaticamente quando ocorrerem alertas críticos.
- **Parâmetros Gerais** — Ajustar limites de conformidade DBO, timeouts de API, intervalo de sincronização e retenção de logs.
- **Auditoria & Segurança** — Visualizar a trilha de quem fez o quê e quando, para fins de compliance.

#### Navegação
- **Barra Superior** — Menu horizontal com dropdowns por contexto (Operador B2B, ANA Center, Administração).
- **Responsividade** — Em telas menores vira menu hamburger.

#### Páginas em Desenvolvimento
Algumas rotas (Monitoramento API, Logs, Tendência DBO, Mapa, Alertas, Conformidade) hoje exibem uma **página informativa padronizada** indicando que estão em desenvolvimento — eliminando os antigos erros 404.

#### Infraestrutura
- **Criação Automática de Perfil** — Ao se cadastrar, o perfil é criado automaticamente.
- **Verificação de Permissões** — Função segura no banco evita falhas de segurança.
- **Atualização de Timestamps** — Sistema registra automaticamente cada alteração.
- **Superadmin Padrão** — Conta `admin@ana.gov.br` criada automaticamente para o primeiro acesso.
