# Padronização Visual — HydrosNet

## Design System

O HydrosNet adota o padrão visual **"CRM Desktop App"** com foco em clareza, alta densidade de dados e navegação horizontal.

---

## Cores

### Tokens Semânticos (HSL)

| Token | HSL | Uso |
|-------|-----|-----|
| `--background` | `220 14% 96%` | Fundo geral da aplicação |
| `--foreground` | `220 20% 14%` | Texto principal |
| `--card` | `0 0% 100%` | Fundo de cards |
| `--primary` | `220 72% 50%` | Ações primárias, links, botões |
| `--primary-foreground` | `0 0% 100%` | Texto sobre elementos primários |
| `--secondary` | `220 14% 92%` | Elementos secundários |
| `--muted` | `220 14% 92%` | Backgrounds atenuados |
| `--muted-foreground` | `220 10% 46%` | Texto secundário, labels |
| `--destructive` | `0 72% 51%` | Erros, alertas críticos |
| `--warning` | `38 92% 50%` | Avisos, atenção |
| `--success` | `152 60% 42%` | Sucesso, ETEs ativas |
| `--border` | `220 14% 90%` | Bordas gerais |
| `--nav-bg` | `224 30% 18%` | Background da navbar |
| `--nav-foreground` | `0 0% 100%` | Texto na navbar |
| `--nav-muted` | `224 20% 60%` | Texto secundário na navbar |
| `--nav-active` | `220 72% 50%` | Item ativo na navbar |

### Uso em Componentes

- **Cards**: `bg-card` com `border` e `shadow-sm`
- **Badges de status**: `bg-success/10 text-success` (ativa), `bg-warning/10 text-warning` (construção), `bg-destructive/10 text-destructive` (inativa)
- **Alertas**: `bg-destructive` (crítico), `bg-warning` (aviso), `bg-primary` (info)

---

## Tipografia

| Contexto | Fonte | Peso |
|----------|-------|------|
| Headings (h1-h3) | Inter | 600-700 |
| Body text | Inter | 400-500 |
| Dados técnicos | IBM Plex Mono | 400-600 |
| Labels | Inter | 500 |
| Badges | IBM Plex Mono | 600 |

### Tamanhos

| Elemento | Classe | Tamanho |
|----------|--------|---------|
| Título de página | `text-2xl font-semibold` | 24px |
| Título de seção | `text-lg font-semibold` | 18px |
| Texto corpo | `text-sm` | 14px |
| Labels/captions | `text-xs` | 12px |
| Badges | `text-[10px]` | 10px |
| Valores numéricos | `text-3xl font-semibold` | 30px |

---

## Espaçamento

| Contexto | Valor |
|----------|-------|
| Padding de página | `p-6 lg:p-8` |
| Gap entre cards | `gap-4` |
| Padding interno de cards | `p-5` ou `p-6` |
| Gap entre seções | `mb-8` |
| Gap entre itens de formulário | `gap-4` |
| Gap entre label e input | `space-y-2` |

---

## Ícones

- **Biblioteca**: Lucide React
- **Tamanho padrão**: `size-4` (16px)
- **Tamanho em stat cards**: `size-5` (20px)
- **Tamanho no logo**: `size-4` (navbar), `size-8` (login)

### Mapeamento de Ícones

| Contexto | Ícone |
|----------|-------|
| Status ETEs | `Activity` |
| Cadastro Manual | `ClipboardEdit` |
| Monitoramento API | `Radio` |
| Command Center | `LayoutDashboard` |
| Tendência DBO | `TrendingUp` |
| Mapa Interativo | `Globe` |
| Alertas | `AlertTriangle` |
| Conformidade | `Shield` |
| Usuários | `Users` |
| Configurações | `Settings` |
| Login | `LogIn` |
| Logout | `LogOut` |
| Servidor LDAP | `Server` |

---

## Componentes UI

### Navegação Superior (TopNavbar)

- Altura: `h-14`
- Background: `hsl(224, 30%, 18%)` (dark)
- Logo à esquerda com ícone `BarChart3`
- Menus dropdown por contexto (Operador, ANA, Admin)
- Perfil do usuário e badges de role à direita
- Menu mobile hamburger em telas < `lg`

### Cards (StatCard)

- Background branco com borda e shadow suave
- Ícone opcional no canto superior direito com fundo colorido suave
- Valor grande (3xl), label pequeno (xs), subtítulo opcional
- Barra de progresso opcional na parte inferior

### Tabelas

- Header com `text-xs` uppercase
- Cells com `text-sm`
- Badges de status inline
- Hover state nas rows

### Formulários

- Labels acima dos inputs
- Grid responsivo `grid-cols-1 md:grid-cols-2`
- Seções agrupadas em cards com título

---

## Border Radius

| Contexto | Valor |
|----------|-------|
| Padrão (--radius) | `0.5rem` (8px) |
| Cards | `rounded-lg` |
| Botões | `rounded-md` |
| Badges | `rounded-sm` |
| Logo icon | `rounded-lg` a `rounded-2xl` |
| Inputs | Herda do tema |
| Barras de progresso | `rounded-full` |

---

## Responsividade

| Breakpoint | Comportamento |
|-----------|---------------|
| < 640px (sm) | Layout empilhado, logo text hidden |
| < 1024px (lg) | Navbar mobile hamburger, grid 1-2 cols |
| ≥ 1024px (lg) | Navbar completa com dropdowns, grid 3-4 cols |
