# Inventário e Contagem de Funções — HydrosNet

---

## PARTE 1 — Visão Técnica

### Resumo Quantitativo

| Categoria | Quantidade |
|-----------|-----------|
| **Componentes React (páginas)** | 7 |
| **Componentes React (UI/layout)** | 8 |
| **Componentes shadcn/ui** | 42 |
| **Context Providers** | 1 |
| **Custom Hooks** | 2 |
| **Funções Utilitárias** | 1 |
| **Funções SQL (banco)** | 3 |
| **Edge Functions** | 1 |
| **Total de funções/componentes da aplicação** | **65** |

### Detalhamento — Páginas (7)

| # | Arquivo | Função | Tipo |
|---|---------|--------|------|
| 1 | `src/pages/Login.tsx` | `Login` | Page Component |
| 2 | `src/pages/OperadorDashboard.tsx` | `OperadorDashboard` | Page Component |
| 3 | `src/pages/CommandCenter.tsx` | `CommandCenter` | Page Component |
| 4 | `src/pages/CadastroManual.tsx` | `CadastroManual` | Page Component |
| 5 | `src/pages/AdminPanel.tsx` | `AdminPanel` | Page Component |
| 6 | `src/pages/NotFound.tsx` | `NotFound` | Page Component |
| 7 | `src/pages/Index.tsx` | `Index` | Page Component (redirect) |

### Detalhamento — Componentes de Aplicação (8)

| # | Arquivo | Função | Responsabilidade |
|---|---------|--------|-----------------|
| 1 | `src/components/AppSidebar.tsx` | `AppSidebar` | Navegação lateral com menus por role |
| 2 | `src/components/DashboardLayout.tsx` | `DashboardLayout` | Layout principal com header e sidebar |
| 3 | `src/components/ProtectedRoute.tsx` | `ProtectedRoute` | Guarda de rota com verificação de sessão/role |
| 4 | `src/components/NavLink.tsx` | `NavLink` | Link de navegação com estado ativo |
| 5 | `src/components/StatCard.tsx` | `StatCard` | Card de indicador numérico |
| 6 | `src/components/EteStatusTable.tsx` | `EteStatusTable` | Tabela de status de ETEs |
| 7 | `src/components/AlertItem.tsx` | `AlertItem` | Item de alerta com severidade |
| 8 | `src/components/DboTrendChart.tsx` | `DboTrendChart` | Gráfico de tendência DBO por bacia |

### Detalhamento — Contextos e Hooks (3)

| # | Arquivo | Função | Tipo |
|---|---------|--------|------|
| 1 | `src/contexts/AuthContext.tsx` | `AuthProvider` | Context Provider |
| 2 | `src/contexts/AuthContext.tsx` | `useAuth` | Custom Hook |
| 3 | `src/hooks/use-mobile.tsx` | `useIsMobile` | Custom Hook |

### Detalhamento — Utilitários (1)

| # | Arquivo | Função | Tipo |
|---|---------|--------|------|
| 1 | `src/lib/utils.ts` | `cn` | Utility (class merge) |

### Detalhamento — Funções Internas de Componentes (5)

| # | Componente | Função | Tipo |
|---|-----------|--------|------|
| 1 | `AdminPanel` | `fetchUsers` | Data fetching |
| 2 | `AdminPanel` | `handleAddRole` | Event handler |
| 3 | `AdminPanel` | `handleRemoveRole` | Event handler |
| 4 | `CadastroManual` | `handleSubmit` | Form handler |
| 5 | `DboTrendChart` | `generateData` | Data generator |

### Detalhamento — Funções SQL no Banco de Dados (3)

| # | Nome | Tipo | Descrição |
|---|------|------|-----------|
| 1 | `has_role(_user_id, _role)` | SQL Function | Verifica se usuário possui role |
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
- **Tela de Login** — Permite que operadores e gestores entrem no sistema com e-mail e senha. Novos usuários podem se cadastrar informando nome, organização e e-mail.
- **Controle de Acesso** — O sistema verifica quem é cada usuário e mostra apenas as funcionalidades adequadas ao seu perfil. Existem três perfis: Operador, Gestor da ANA e Administrador do Sistema.
- **Proteção de Páginas** — Nenhuma página sensível é acessível sem autenticação. Se alguém tentar acessar sem estar logado, é redirecionado para a tela de login.

#### Para Operadores de Saneamento
- **Painel do Operador** — Mostra um resumo da situação: quantas ETEs estão conectadas, falhas de API nas últimas 24 horas, eficiência média de tratamento e cadastros manuais pendentes.
- **Tabela de Status** — Lista todas as ETEs com código, nome, município, tipologia, status operacional, eficiência DBO e tipo de integração (automática, manual ou com falha).
- **Alertas de Integração** — Mostra problemas como timeouts de API, certificados SSL prestes a vencer e sensores desconectados.
- **Cadastro Manual** — Formulário completo para operadores que não possuem integração automática. Permite registrar dados da ETE como vazão, DBO de entrada/saída, localização e dados do responsável técnico.

#### Para Gestores da ANA
- **Centro de Comando** — Visão nacional mostrando o total de ETEs ativas, em construção e inativas, além da eficiência DBO média do país.
- **Gráfico de Tendência DBO** — Mostra a evolução mensal da eficiência de remoção de DBO por bacia hidrográfica ao longo de 12 meses.
- **Indicadores por Bacia** — Apresenta dados de cada grande bacia hidrográfica brasileira (Tietê, São Francisco, Paraná, Amazonas, Paraguai, Atlântico Sudeste) com número de ETEs, cobertura e eficiência.
- **Alertas Nacionais** — Notificações sobre problemas críticos como excesso de carga orgânica, bacias com cobertura abaixo do mínimo e problemas de infraestrutura.

#### Administração do Sistema
- **Painel de Administração** — Exclusivo para administradores. Permite ver todos os usuários cadastrados, atribuir ou remover perfis de acesso, e visualizar estatísticas como total de usuários, administradores e gestores.
- **Criação Automática do Admin** — O sistema vem com um administrador pré-configurado (`admin@ana.gov.br`) que pode gerenciar todos os usuários.

#### Navegação
- **Menu Lateral** — Organizado em seções (Operador B2B, ANA Center, Administração). Pode ser minimizado para ícones. A seção de Administração aparece apenas para administradores.
- **Barra Superior** — Mostra o status do sistema, os perfis de acesso do usuário logado e um menu com opção de sair.

#### Infraestrutura
- **Criação Automática de Perfil** — Ao se cadastrar, o perfil do usuário é criado automaticamente no banco de dados.
- **Verificação de Permissões** — Uma função segura no banco verifica se o usuário tem a permissão necessária, sem risco de falhas de segurança.
- **Atualização de Timestamps** — O sistema registra automaticamente quando cada dado foi atualizado pela última vez.
