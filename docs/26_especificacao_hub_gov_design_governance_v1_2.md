# Hub Gov — Especificação de Design Governance v1.2

Estado: **Proposto**. Substitui informalmente a v1.1 (não versionada em repositório).

O Hub Gov é a camada de governança de design que garante que múltiplos módulos, equipes e
possíveis sistemas satélites do HydrosNet mantenham a mesma linguagem, os mesmos componentes e o
mesmo nível de acessibilidade — sem congelar a evolução.

## 1. Escopo

| Dentro | Fora |
|--------|------|
| Tokens, componentes, padrões de página, conteúdo, acessibilidade | Regra de negócio, modelagem de dado |
| Processo de proposta, revisão e depreciação | Escolha de stack |
| Métricas de adoção e conformidade | Roadmap de produto |

## 2. Estrutura em camadas

```
Camada 0 — Fundamentos      cor, tipografia, espaçamento, raio, sombra, grid, movimento
Camada 1 — Primitivos       botão, campo, seleção, tabela, badge, cartão, diálogo
Camada 2 — Padrões          filtro, paginação, estado vazio, erro, formulário, KPI
Camada 3 — Floorplans       overview, list report, object page, wizard, worklist, analytical
Camada 4 — Domínio          mapa de ETE, gráfico de DBO, cartão ISH-U, painel do Córtex
```

Regra de dependência: uma camada só consome as camadas inferiores. Componente de domínio nunca
redefine token; padrão nunca reimplementa primitivo.

## 3. Tokens

### 3.1 Níveis

| Nível | Exemplo | Quem usa |
|-------|---------|----------|
| Primitivo | `--blue-600: 201 96% 32%` | apenas a camada semântica |
| Semântico | `--primary`, `--destructive`, `--muted-foreground` | componentes |
| Componente | `--button-primary-bg` | um componente específico |

Componente **jamais** referencia primitivo diretamente, e nunca usa valor literal
(`text-white`, `bg-[#0369A1]`). Todo token é HSL, declarado no CSS global, com par claro/escuro.

### 3.2 Tokens semânticos obrigatórios

`--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`,
`--accent`, `--destructive`, `--success`, `--warning`, `--info`, `--border`, `--input`, `--ring`,
mais a escala ISH-U (`--ish-1` a `--ish-5`) e os estados de conformidade.

### 3.3 Nomenclatura

`--{categoria}-{papel}-{variação}`, em minúsculas, com hífen. Nome descreve **função**, nunca
aparência: `--destructive`, não `--red`. Renomear token é mudança maior (seção 6).

## 4. Contrato de componente

Todo componente do sistema publica:

1. **Propósito** — uma frase; quando não usar.
2. **API** — props com tipo, padrão e obrigatoriedade; nenhuma prop de estilo livre.
3. **Anatomia** — partes nomeadas e slots.
4. **Estados** — padrão, hover, foco, ativo, desabilitado, carregando, erro, vazio, somente leitura.
5. **Acessibilidade** — papel ARIA, teclado, foco, rótulo, anúncio para leitor de tela.
6. **Conteúdo** — regras de rótulo, limite de caracteres, tom.
7. **Responsividade** — comportamento por faixa.
8. **Exemplos** — uso correto e usos incorretos com o motivo.
9. **Testes** — unitário, de acessibilidade e visual.

Componente sem os nove itens não entra no sistema; fica como "candidato" no módulo que o criou.

## 5. Processo de contribuição

```
Necessidade
  → Busca no catálogo (existe? um padrão resolve?)
  → Se não: proposta (problema, evidência de uso em ≥ 2 telas, alternativas)
  → Revisão do conselho de design (design + frontend + acessibilidade + produto)
  → Protótipo + contrato de componente
  → Implementação + testes + documentação
  → Publicação com versão
  → Adoção monitorada
```

Critério de entrada no sistema: usado ou previsto em **pelo menos duas** telas de módulos
diferentes. Um só uso permanece local.

### 5.1 Conselho de design

Composição mínima: 1 designer, 1 engenheiro de frontend, 1 especialista em acessibilidade,
1 representante de produto. Cadência quinzenal. Decisão registrada com justificativa —
inclusive as rejeições, para não reabrir a mesma discussão.

## 6. Versionamento

Semântico, aplicado ao sistema como um todo:

| Mudança | Tipo | Exemplo |
|---------|------|---------|
| Maior | quebra | remover componente, renomear token, mudar padrão de prop |
| Menor | adição | novo componente, nova variante, novo token |
| Correção | ajuste | correção de contraste, bug de foco, ajuste de espaçamento |

Mudança maior exige: aviso com 1 ciclo de antecedência, codemod ou guia de migração passo a passo,
e período de convivência de no mínimo 2 releases.

### 6.1 Depreciação

Estados: `ativo` → `desencorajado` (documentado, sem novos usos) → `depreciado` (aviso em
desenvolvimento) → `removido`. Nunca se remove sem passar por todos os estados.
Cada componente depreciado aponta explicitamente para o substituto.

### 6.2 Novidades da v1.2

- Camada 4 (domínio) formalizada, com os componentes de saneamento sob o mesmo contrato.
- Tokens de estado ISH-U e de conformidade DBO promovidos a semânticos.
- Acessibilidade passa de recomendação a **portão bloqueante** em CI.
- Contrato de componente ampliado de 6 para 9 itens (conteúdo, responsividade e testes).
- Métricas de adoção e de dívida de design definidas (seção 8).
- Regra explícita: rótulo de "apoio à decisão" é parte do componente de predição, não do consumidor.

## 7. Conformidade

| Verificação | Como | Portão |
|-------------|------|--------|
| Cor literal em componente | lint de classes proibidas (`text-white`, `bg-[#...]`) | bloqueia PR |
| Token inexistente | build do CSS | bloqueia build |
| Componente fora do sistema replicando primitivo | revisão de código | bloqueia PR |
| Acessibilidade | axe em CI + verificação manual por teclado | bloqueia release |
| Contraste | teste automatizado dos pares de token | bloqueia PR |
| Regressão visual | snapshot por componente e por floorplan | bloqueia PR |
| Densidade e espaçamento | lint de múltiplos de 4 px | aviso |

## 8. Métricas

| Métrica | Definição | Alvo |
|---------|-----------|------|
| Adoção | % de telas usando apenas componentes do sistema | ≥ 90% |
| Dívida de design | número de componentes locais duplicando o sistema | tendência decrescente |
| Cobertura de contrato | % de componentes com os 9 itens | 100% |
| Violações de acessibilidade | críticas em produção | 0 |
| Tempo de proposta até publicação | mediana | < 3 semanas |
| Uso de componente depreciado | ocorrências no código | 0 ao fim do período de convivência |

## 9. Papéis e responsabilidades

| Papel | Responsável por |
|-------|-----------------|
| Curador do sistema | catálogo, versão, release notes, saúde das métricas |
| Conselho de design | decisão sobre propostas e depreciações |
| Time de módulo | conformidade das próprias telas, proposta de novos padrões |
| Acessibilidade | auditoria periódica e critérios de aceite |
| Curador de conteúdo | glossário, tom de voz, padronização de rótulos e mensagens |

## 10. Documentação viva

O catálogo é publicado com exemplo interativo, código, contrato e estado de cada componente.
Toda alteração no sistema exige atualização do catálogo no mesmo PR — documentação atrasada
é tratada como falha de release, e não como pendência.

## 11. Checklist de release do sistema

- [ ] Versão semântica definida e release notes publicadas
- [ ] Contrato de 9 itens completo para todo componente novo ou alterado
- [ ] Guia de migração para toda mudança maior
- [ ] Testes unitário, de acessibilidade e visual verdes
- [ ] Contraste verificado em ambos os temas
- [ ] Catálogo atualizado no mesmo PR
- [ ] Métricas da seção 8 recalculadas e publicadas
- [ ] Depreciações comunicadas com prazo e substituto
