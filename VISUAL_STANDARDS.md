# Padronização Visual — HydrosNet

## Filosofia

Estilo **"Precision Industrial / CRM Desktop"**: estética inspirada em CRMs corporativos modernos (Linear, Notion, dashboards executivos), com foco em densidade de dados, hierarquia clara e legibilidade técnica.

## Cores (HSL)

Todas as cores são definidas como tokens HSL em `src/index.css` e expostas em `tailwind.config.ts`. **Nunca usar cores literais em componentes.**

### Tokens Principais

| Token | Light | Uso |
|-------|-------|-----|
| `--background` | `0 0% 100%` | Fundo geral |
| `--foreground` | `224 30% 14%` | Texto principal |
| `--primary` | `220 72% 50%` | Botões, links, ativos |
| `--primary-foreground` | `0 0% 100%` | Texto sobre primary |
| `--card` | `0 0% 100%` | Cards |
| `--muted` | `220 14% 96%` | Fundos secundários |
| `--muted-foreground` | `220 10% 45%` | Texto auxiliar |
| `--border` | `220 13% 91%` | Bordas |
| `--success` | `142 76% 45%` | Status positivo |
| `--warning` | `38 92% 55%` | Atenção |
| `--destructive` | `0 84% 60%` | Erros |

### Navbar (escura)

| Token | HSL |
|-------|-----|
| `--nav-bg` | `224 30% 18%` |
| `--nav-active` | `220 72% 50%` |
| `--nav-muted` | `220 10% 70%` |

## Tipografia

| Família | Uso |
|---------|-----|
| **Inter** | UI geral, headings, parágrafos |
| **IBM Plex Mono** | Dados técnicos, badges, timestamps |

### Escala

| Classe | Px | Uso |
|--------|----|-----|
| `text-xs` | 12 | Labels, metadata |
| `text-sm` | 14 | Texto padrão |
| `text-base` | 16 | Corpo |
| `text-lg` | 18 | Títulos de cards |
| `text-2xl` | 24 | Títulos de página |
| `text-3xl` | 30 | Indicadores numéricos |

### Pesos
- `font-normal` (400) — corpo
- `font-medium` (500) — labels
- `font-semibold` (600) — títulos

## Espaçamento

Escala 4px (Tailwind default). Padrões recorrentes:

| Token | Px | Uso |
|-------|----|-----|
| `p-3` | 12 | Botões |
| `p-5` | 20 | Cards padrão |
| `p-6` | 24 | Seções, formulários |
| `gap-4` | 16 | Grids de cards |
| `mb-8` | 32 | Espaçamento entre seções |

## Border Radius

| Token | Uso |
|-------|-----|
| `rounded-sm` (0.25rem) | Cards, painéis (estética industrial) |
| `rounded-md` (0.375rem) | Botões, inputs |
| `rounded-lg` (0.5rem) | Logos, ícones containers |
| `rounded-full` | Status dots, avatares |

## Ícones

- **Biblioteca exclusiva:** [Lucide React](https://lucide.dev).
- **Tamanhos padronizados:** `size-3` (badges), `size-3.5` (chevrons), `size-4` (botões), `size-5` (headers), `size-8` (avatares/placeholders).
- Sempre acompanhar de label de texto para acessibilidade.

## Sombras

| Token | Uso |
|-------|-----|
| `shadow-sm` | Cards padrão |
| `shadow-md` | Hover de cards interativos |
| `shadow-lg` | Modais, dropdowns |

## Responsividade

Breakpoints Tailwind padrão. Em `<lg`, navbar usa hamburger.

## Acessibilidade

- Contraste mínimo WCAG AA.
- `aria-label` em ícones sem texto.
- Focus rings via token `--ring`.
- Tema dark preparado.
