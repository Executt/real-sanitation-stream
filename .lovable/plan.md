# Gestão de ETEs por Concessionárias & Agências Reguladoras

## Contexto

Hoje a hierarquia é: **ANA (nacional) → Concessionárias → ETEs**. Faltam as **Agências Reguladoras** (ARs estaduais/municipais como ARSESP, AGEPAR, ADASA, AGENERSA etc.), que fiscalizam concessionárias dentro do seu território. Esta evolução introduz a AR como nível intermediário e dá a ela um painel de gestão equivalente ao da ANA, porém escopado.

## Hierarquia final

```text
ANA (gestor_ana / superadmin)
 └── Agência Reguladora (gestor_ar)         ← NOVO nível
      └── Concessionária (operador)
           └── ETE
```

## Mudanças no banco

1. **Nova tabela `agencias_reguladoras`**
   - `nome`, `sigla`, `esfera` ('estadual' | 'municipal' | 'distrital'), `uf`, `municipio`, `cnpj`, `contato_email`, `site`, `ativo`.
2. **`concessionarias`** ganha `agencia_reguladora_id` (FK opcional → `agencias_reguladoras`).
3. **`profiles`** ganha `agencia_reguladora_id` (FK opcional) para vincular gestores de AR.
4. **Enum `app_role`** ganha valor `gestor_ar`.
5. **Função SECURITY DEFINER** `current_user_agencia()` análoga a `current_user_concessionaria()`.
6. **Políticas RLS** atualizadas:
   - `etes`, `dbo_medicoes`, `concessionarias`: `gestor_ar` lê tudo cuja `concessionaria.agencia_reguladora_id = current_user_agencia()`.
   - `agencias_reguladoras`: leitura por `gestor_ana`/`superadmin` (full) e pelo próprio `gestor_ar` (linha própria); escrita só `superadmin`/`gestor_ana`.

## Mudanças na aplicação

### Páginas novas
- **`/admin/agencias`** (superadmin / gestor_ana) — CRUD de Agências Reguladoras (lista, busca, criar, editar, ativar/inativar).
- **`/agencia`** (gestor_ar) — Dashboard escopado da agência: KPIs (nº de concessionárias, ETEs, conformidade DBO, alertas críticos), tabela de concessionárias supervisionadas, mapa filtrado, tendência DBO agregada.
- **`/agencia/concessionarias`** — Lista de concessionárias da AR com drill-down para ver ETEs de cada uma.

### Páginas alteradas
- **`/admin/usuarios`** (`AdminPanel.tsx`):
  - Nova role `gestor_ar` no `Select` de roles e nos filtros.
  - Nova coluna **Agência Reguladora** com combobox server-side (mesma UX do combobox de concessionária recém-implementado).
- **`/admin/concessionarias`** (`Concessionarias.tsx`):
  - Coluna + filtro **Agência Reguladora**.
  - Form de cadastro/edição com seletor de AR (combobox com busca).
- **`AppSidebar`/`TopNavbar`**: novo item "Agência Reguladora" visível só para `gestor_ar`; item "Agências" no hub admin.
- **`AuthContext`**: expor `isGestorAR` e `agenciaReguladoraId`.
- **`ProtectedRoute`**: aceitar `gestor_ar` nas rotas de `/agencia/*`.

### Reuso
- Componentes existentes (`EteMap`, `EteStatusTable`, `DboTrendChart`, `AlertasDboPanel`, `ConformidadeCard`) ganham prop opcional `concessionariaIds?: string[]` ou já operam por RLS (preferido). Como o RLS escopa automaticamente o `gestor_ar`, basta reaproveitar — sem filtros extras no front.

## Documentação
Atualizar cumulativamente:
- `DATABASE_SCHEMA.md` — nova tabela, novas FKs, nova role, nova função.
- `ARCHITECTURE.md` — diagrama da hierarquia ANA → AR → Concessionária → ETE.
- `SECURITY_POLICIES.md` — políticas RLS para `gestor_ar`.
- `BUSINESS_RULES.md` — regras de supervisão regulatória.
- `README.md` — menção ao novo perfil.
- Memória do projeto: novo arquivo `mem://features/agencias-reguladoras`.

## Entrega faseada

**Fase 1 — Modelo & RBAC**
- Migração: tabela `agencias_reguladoras`, FKs em `concessionarias` e `profiles`, enum `gestor_ar`, função `current_user_agencia()`, RLS.

**Fase 2 — Administração**
- Página `/admin/agencias` (CRUD).
- AdminPanel: role `gestor_ar` + combobox de AR para profiles.
- Concessionarias: vincular AR (combobox + filtro).

**Fase 3 — Portal AR**
- `/agencia` dashboard + `/agencia/concessionarias`.
- Sidebar/navbar + ProtectedRoute + AuthContext.

**Fase 4 — Docs & Memória**
- Atualizar todos os MDs e salvar memória.

Aprovando, sigo direto pela Fase 1 (migração).
