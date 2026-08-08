# Especificação de Frontend — Padrão Gov + Princípios Fiori

Estado: **Proposto** como norma de evolução da interface; o sistema de tokens atual já é compatível
(ver `01_padronizacao_visual.md`).

Combina duas referências: o Padrão Digital de Governo (clareza, acessibilidade, previsibilidade e
confiança institucional) e os princípios do SAP Fiori (papel-cêntrico, adaptativo, coerente, simples,
encantador) aplicados a um sistema de gestão pública de dado técnico.

## 1. Princípios

1. **Papel-cêntrico** — a tela inicial é a do papel: operador vê lançamento e pendência;
   gestor de AR vê jurisdição; ANA vê panorama nacional. Ninguém navega por onde não atua.
2. **Uma tarefa por tela** — cada rota tem um objetivo declarado; ações secundárias vão para
   menu de contexto, não para a barra principal.
3. **Dado antes de decoração** — densidade informacional alta, cromatismo baixo. Cor é semântica.
4. **Previsibilidade** — mesmo padrão de tabela, filtro, paginação e detalhe em todos os módulos.
5. **Acessibilidade não é opcional** — WCAG 2.1 AA é critério de aceite, não melhoria futura.
6. **Confiança** — origem do dado, data de atualização e responsável sempre visíveis.

## 2. Tipos de página (floorplans)

| Tipo | Uso no HydrosNet | Estrutura |
|------|------------------|-----------|
| **Overview** | `/command-center`, `/operador`, `/agencia`, `/ish-u` | grade de cartões com KPI + atalho para o detalhe |
| **List Report** | `/etes`, `/investimentos`, `/agua/mananciais`, `/admin/*` | filtros → tabela → paginação → ação em massa |
| **Object Page** | detalhe de concessionária, AR, ETE | cabeçalho com identidade e KPIs + abas de facetas |
| **Analytical** | tendência DBO, ISH-U | filtro persistente + gráfico + tabela sincronizada |
| **Wizard** | importação Atlas, cadastro manual de ETE | passos numerados, validação por passo, resumo final |
| **Worklist** | alertas DBO, execuções do Córtex | fila priorizada com ação direta por item |

### 2.1 Overview

- Máximo 8 cartões acima da dobra; cada cartão declara período e fonte.
- KPI sempre com: valor, unidade, variação em relação ao período anterior e link para a origem.
- Nunca exibir KPI sem dado real; estado vazio explica o porquê e oferece a próxima ação.

### 2.2 List Report

- Filtros no topo, em barra colapsável, com "filtros ativos" em chips removíveis.
- Estado do filtro refletido na URL (`searchParams`) — link compartilhável e recarregável.
- Paginação, ordenação e busca **server-side**, sempre (padrão `useTable`).
- Colunas: identidade primeiro, métrica no meio, estado e ação no fim. Numérico alinhado à direita,
  tabular-nums, unidade no cabeçalho e não em cada célula.
- Seleção múltipla só quando existir ação em massa real.
- Exportação respeita o filtro corrente e registra em `access_audit_log`.

### 2.3 Object Page

- Cabeçalho fixo: nome, hierarquia completa (ANA → AR → Prestador → ETE), estado, 3 a 5 KPIs.
- Abas por faceta: Visão geral · ETEs · Usuários · Conformidade · Integrações · Córtex · Auditoria.
- Aba carrega sob demanda; falha de uma aba não derruba a página (`ErrorBoundary` por painel).

### 2.4 Wizard

- Passos visíveis com estado (concluído, atual, pendente).
- Validação ao sair do passo, com mensagem no campo e resumo no topo.
- Nada é gravado antes do passo de confirmação; a confirmação lista exatamente o que será alterado.

## 3. Layout e navegação

```
┌──────────────────────────────────────────────────────────┐
│ Barra institucional (identidade, órgão ativo, usuário)   │
├──────────────────────────────────────────────────────────┤
│ Navegação por módulo (horizontal) + busca global         │
├──────────┬───────────────────────────────────────────────┤
│ Filtros  │ Conteúdo                                      │
│ (lateral,│  breadcrumb                                   │
│ colapsa) │  título + ação primária                       │
│          │  corpo                                        │
└──────────┴───────────────────────────────────────────────┘
```

- Breadcrumb obrigatório em todo detalhe, refletindo a hierarquia institucional.
- Uma única ação primária por tela, à direita do título.
- Seletor de órgão sempre visível quando o usuário tem escopo maior que um órgão.
- Grade de 12 colunas, largura máxima de conteúdo 1440 px, gutter 24 px.
- Espaçamento em múltiplos de 4 px. Densidade "compacta" disponível para telas de tabela.

## 4. Componentes

| Componente | Regra |
|-----------|-------|
| Botão | Primário sólido (um por tela), secundário contornado, terciário texto. Rótulo em verbo no infinitivo |
| Campo | Rótulo sempre visível acima (nunca só placeholder), texto de ajuda, erro abaixo com ícone e texto |
| Tabela | Cabeçalho fixo, zebra desligada, linha de foco visível, ação por linha em menu |
| Estado vazio | Ilustração leve + causa + ação sugerida |
| Carregamento | Skeleton com a forma do conteúdo; nunca spinner em tela cheia após a primeira carga |
| Erro | Mensagem em linguagem simples + o que fazer + código curto para suporte |
| Toast | Somente confirmação de ação; erro persistente vai para banner, não para toast |
| Mapa | Legenda clicável, popup com identidade + KPIs + link para o detalhe |
| Gráfico | Eixo com unidade, tooltip com valor e data, série descrita em texto alternativo |

## 5. Cor e tipografia

Herdados de `01_padronizacao_visual.md`; nenhum valor literal em componente — apenas tokens HSL.

Semântica fixa:

| Significado | Token | Uso |
|-------------|-------|-----|
| Conforme / satisfatório | `--success` | eficiência dentro do parâmetro |
| Atenção / requer adequação | `--warning` | próximo do limite, dado desatualizado |
| Não conforme / crítico | `--destructive` | abaixo de `dbo_critico`, vulnerabilidade CRITICAL |
| Informação / predição | `--info` | bloco do Córtex, sempre com rótulo textual |
| Neutro / sem dado | `--muted` | ausência de dado, nunca confundida com zero |

Nenhuma informação depende apenas de cor: sempre acompanha ícone e texto.
Tipografia: fonte de interface para navegação e rótulo; fonte monoespaçada para número, código IBGE,
identificador e série temporal.

## 6. Conteúdo e linguagem

- Português claro, voz ativa, sem jargão desnecessário; sigla explicada no primeiro uso da tela.
- Números: separador de milhar, duas casas para percentual e eficiência, unidade sempre presente.
- Datas em formato brasileiro com hora local e indicação do fuso quando relevante.
- Termos setoriais padronizados: ETE, DBO, vazão, manancial, outorga, prestador, AR, EPPO.
- Mensagem de erro nunca culpa o usuário nem expõe detalhe técnico.
- Toda saída do Córtex acompanha a frase "apoio à decisão — não constitui ato regulatório".

## 7. Acessibilidade (critério de aceite)

- Navegação completa por teclado, com ordem lógica e foco sempre visível.
- Contraste mínimo 4,5:1 (texto) e 3:1 (elemento gráfico e estado de foco).
- Landmarks semânticos (`header`, `nav`, `main`, `aside`, `footer`), um `h1` por página.
- Tabela com `caption`, `th` com `scope`, e resumo textual em gráfico.
- Formulário com `label` associado, `aria-describedby` para ajuda e erro, e `aria-invalid`.
- Modal com foco preso, retorno de foco ao fechar e fechamento por `Esc`.
- Respeitar `prefers-reduced-motion`; nenhuma animação essencial ao entendimento.
- Zoom até 200% sem perda de conteúdo ou funcionalidade.
- Verificação automatizada (axe) em CI + verificação manual por teclado a cada release.

## 8. Responsividade

| Faixa | Comportamento |
|-------|---------------|
| ≥ 1280 px | layout completo, filtros laterais abertos |
| 1024–1279 px | filtros colapsados, tabela com rolagem horizontal controlada |
| 768–1023 px | navegação em menu, cartões em 2 colunas |
| < 768 px | tabela vira lista de cartões com os 4 campos essenciais; ações em menu inferior |

O uso real de campo (inspeção em ETE) exige que lançamento de medição e consulta de alerta
funcionem bem em telefone; telas administrativas podem ser desktop-first.

## 9. Desempenho percebido

| Métrica | Alvo |
|---------|------|
| LCP | < 2,5 s |
| INP | < 200 ms |
| CLS | < 0,1 |
| Primeira tabela útil | < 1,5 s com skeleton imediato |

Práticas: divisão de código por rota, carregamento sob demanda de mapa e gráfico,
consulta paginada, cache por TanStack Query com invalidação explícita, imagem responsiva.

## 10. Checklist de aceite de tela

- [ ] Pertence a um dos tipos de página da seção 2
- [ ] Ação primária única e clara
- [ ] Filtro na URL, paginação e ordenação server-side
- [ ] Estados de carregamento, vazio e erro implementados
- [ ] Hierarquia institucional visível no breadcrumb
- [ ] Unidades e fonte do dado declaradas
- [ ] Somente tokens de cor; semântica respeitada
- [ ] Navegação por teclado e axe sem violação crítica
- [ ] Comportamento verificado nas quatro faixas de largura
- [ ] Predição rotulada como apoio à decisão
