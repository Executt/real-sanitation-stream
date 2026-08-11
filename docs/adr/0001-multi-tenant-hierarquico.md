# ADR-0001 — Multi-tenant hierárquico por árvore de organizações

- **Data**: 2026-08-03
- **Estado**: Aceito
- **Contexto correlato**: `docs/02_arquitetura.md`, `docs/09_politicas_seguranca.md`, RN-02

## Contexto

O domínio institucional do saneamento é hierárquico e obrigatório: **ANA → Agência Reguladora →
Prestador → ETE/Sistema**. A primeira versão da plataforma modelava vínculos por colunas separadas
(`concessionaria_id`, `agencia_reguladora_id`) em `profiles` e nas tabelas de negócio. Cada novo nível
exigia nova coluna, nova função de escopo e revisão de todas as policies — custo linear e propenso a
esquecimento. Além disso, arranjos reais (consórcios, agências municipais, prestadores multi-estaduais)
não cabem em dois níveis fixos.

## Decisão

Adotar uma única tabela `organizations` com auto-relacionamento `parent_id`, tipada por `org_type`
(`STATE_AGENCY`, `MUNICIPAL_AGENCY`, `CONCESSIONAIRE`), e derivar toda a visibilidade de duas funções
`SECURITY DEFINER`:

- `org_subtree(_root uuid)` — a organização e todos os descendentes;
- `can_access_org(_org uuid)` — verdadeiro se a org do usuário contém a org do registro na subárvore,
  ou se o usuário tem papel de alcance nacional (`gestor_ana`, `superadmin`).

Tabelas de negócio carregam `org_id` e usam `can_access_org(org_id)` em `USING` e `WITH CHECK`.
As colunas legadas permanecem apenas como referência de migração (`legacy_*`).

## Alternativas consideradas

| Alternativa | Por que não |
|-------------|-------------|
| Colunas de vínculo por nível | Não escala; cada nível novo toca todas as policies |
| Schema por tenant | Milhares de prestadores; migrações e conexões inviáveis |
| Filtro apenas na aplicação | Fronteira de segurança fora do banco; qualquer chamada direta ao PostgREST vaza dado |
| `ltree` como caminho materializado | Ganho de leitura real, mas exige manutenção do caminho em cada movimentação de nó |

## Consequências

**Positivas** — um só mecanismo de escopo; novos níveis são dados, não schema; RLS uniforme e auditável;
`OrgContext` no frontend reflete exatamente a fronteira do banco.

**Negativas / trade-offs** — recursão em `org_subtree` custa em árvores profundas (mitigação: índice em
`parent_id` e árvore rasa, ≤ 4 níveis); risco de ciclo em `parent_id` se não houver guarda;
`can_access_org` é chamada por linha, o que exige atenção a consultas amplas.

## Reversibilidade

Média. Reverter exige recriar vínculos por nível e reescrever todas as policies; as colunas `legacy_*`
mantêm o caminho de volta para os dados originais.
