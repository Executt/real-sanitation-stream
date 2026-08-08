# Padronização Visual — HydrosNet

## Filosofia

Estilo **"Precision Industrial / CRM Desktop"**: densidade de dados, hierarquia clara e legibilidade técnica.
Nada de gradientes decorativos ou tipografia genérica — a tela é instrumento de trabalho, não vitrine.

## Regra inegociável

**Nunca** usar cor literal em componente (`text-white`, `bg-black`, `bg-[#0369A1]`).
Toda cor sai de token HSL definido em `src/index.css` e exposto em `tailwind.config.ts`.

## Tokens de cor

### Base

| Token | HSL | Uso |
|-------|-----|-----|
| `--background` | `220 14% 96%` | Fundo da aplicação |
| `--foreground` | `220 20% 14%` | Texto principal |
| `--card` / `--card-foreground` | `0 0% 100%` / `220 20% 14%` | Cards e painéis |
| `--popover` / `--popover-foreground` | `0 0% 100%` / `220 20% 14%` | Dropdowns, comboboxes |
| `--primary` / `--primary-foreground` | `220 72% 50%` / `0 0% 100%` | Ações, links, item ativo |
| `--secondary` | `220 14% 92%` | Superfície secundária |
| `--muted` / `--muted-foreground` | `220 14% 92%` / `220 10% 46%` | Fundos neutros e texto auxiliar |
| `--accent` | `220 72% 50%` | Realce pontual |
| `--border` / `--input` / `--ring` | `220 14% 90%` / `220 14% 90%` / `220 72% 50%` | Bordas, campos, foco |

### Semântica de estado

| Token | HSL | Uso |
|-------|-----|-----|
| `--success` | `152 60% 42%` | Conforme, integração ok |
| `--warning` | `38 92% 50%` | Atenção, eficiência entre limiares |
| `--destructive` | `0 72% 51%` | Não conforme, falha de endpoint |

### Escala ISH-U

| Token | HSL | Classe |
|-------|-----|--------|
| `--ish-minima` | `0 72% 51%` | Segurança mínima |
| `--ish-baixa` | `24 90% 52%` | Baixa |
| `--ish-media` | `45 95% 55%` | Média |
| `--ish-alta` | `152 60% 42%` | Alta |
| `--ish-maxima` | `205 90% 38%` | Máxima |

Uso exclusivo no módulo ISH-U (mapa, badges e legenda). Município não classificado usa `--muted`.

### Navegação (barra escura)

| Token | HSL |
|-------|-----|
| `--nav-bg` | `224 30% 18%` |
| `--nav-foreground` | `0 0% 100%` |
| `--nav-muted` | `224 20% 60%` |
| `--nav-active` | `220 72% 50%` |

### Sidebar

`--sidebar-background`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-accent`,
`--sidebar-border`, `--sidebar-ring` — variantes claras alinhadas à base.

## Tipografia

| Família | Uso |
|---------|-----|
| **Inter** (400/500/600/700) | UI, títulos, parágrafos |
| **IBM Plex Mono** (400/600) | Dados técnicos, códigos de ETE, timestamps, badges numéricos, coordenadas |

Números com significado de medida (vazão, DBO, %, R$) sempre em `font-mono` — alinhamento tabular
facilita comparação em coluna.

| Classe | Px | Uso |
|--------|----|-----|
| `text-xs` | 12 | Labels, metadados, badges |
| `text-sm` | 14 | Texto padrão de tabela e formulário |
| `text-base` | 16 | Corpo |
| `text-lg` | 18 | Título de card |
| `text-2xl` | 24 | Título de página |
| `text-3xl` | 30 | Indicador numérico de KPI |

## Espaçamento

Escala de 4 px (padrão Tailwind).

| Token | Px | Uso |
|-------|----|-----|
| `p-3` | 12 | Botões, células densas |
| `p-5` | 20 | Card padrão |
| `p-6` | 24 | Seções e formulários |
| `gap-4` | 16 | Grid de cards |
| `mb-8` | 32 | Separação entre seções |

## Raio de borda

`--radius: 0.5rem`. `rounded-sm` em cards e painéis (estética industrial), `rounded-md` em botões e inputs,
`rounded-lg` em containers de ícone, `rounded-full` em status dots e avatares.

## Ícones

Biblioteca exclusiva: **Lucide React**. Tamanhos: `size-3` (badge), `size-3.5` (chevron), `size-4` (botão),
`size-5` (header), `size-8` (avatar/placeholder). Ícone sem texto exige `aria-label`.

## Sombras

`shadow-sm` em card padrão, `shadow-md` em hover de card interativo, `shadow-lg` em modal e dropdown.

## Padrões de componente

| Padrão | Componente |
|--------|-----------|
| KPI numérico | `StatCard` + `StatCardSkeleton` no carregamento |
| Tabela de dados | `useTable` + `SortHeader` + `TablePagination` |
| Filtro de módulo | `ModuleFilters` / `HierarchyFilters` |
| Carregamento | `Skeleton` com a forma do conteúdo final — nunca spinner solto dentro de card |
| Vazio | Mensagem curta + ação primária; nunca tabela vazia sem explicação |
| Erro | `ErrorBoundary` por painel, com botão "Tentar novamente" |

## Responsividade

Breakpoints padrão do Tailwind. Abaixo de `lg`, a navegação vira menu hamburger e tabelas ganham
rolagem horizontal preservando a primeira coluna como identificador.

## Acessibilidade

Contraste mínimo WCAG AA; `aria-label` em controles icônicos; anel de foco visível via `--ring`;
estado nunca comunicado só por cor — sempre acompanhado de rótulo ou ícone.

## Tema escuro

Estrutura de tokens preparada (`darkMode: ["class"]`), mas o bloco `.dark` ainda não foi definido em
`src/index.css`. Ao implementar, redefinir todos os tokens acima no seletor `.dark` — nenhum componente deve mudar.
