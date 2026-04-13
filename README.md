# HydrosNet — Plataforma Integrada de Saneamento

> Sistema de monitoramento e gestão de Estações de Tratamento de Esgoto (ETEs) com integração ao SNIRH/Atlas Esgotos da ANA.

## Visão Geral

O HydrosNet é uma plataforma web que conecta operadores de saneamento (B2B) à Agência Nacional de Águas (ANA) por meio de painéis interativos, integração de dados via API e cadastro manual. O sistema oferece controle de acesso baseado em roles, dashboards operacionais e um centro de comando nacional.

## Funcionalidades Principais

- **Painel Operador B2B** — Status das ETEs, cadastro manual de dados, monitoramento de integração API
- **Centro de Comando ANA** — Visão nacional com indicadores por bacia hidrográfica, gráficos de tendência DBO
- **Autenticação & RBAC** — Login com e-mail/senha, controle de acesso por roles (operador, gestor_ana, superadmin)
- **Painel de Administração** — Gerenciamento de usuários e atribuição de roles (exclusivo superadmin)
- **Gráficos de Tendência** — Evolução da eficiência DBO por bacia com Recharts

## Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18, TypeScript 5, Vite 5 |
| UI | Tailwind CSS v3, shadcn/ui, Lucide Icons |
| Gráficos | Recharts |
| Backend | Lovable Cloud (Supabase) |
| Auth | Supabase Auth com RBAC |
| Banco de Dados | PostgreSQL com RLS |

## Estrutura de Roles

| Role | Acesso |
|------|--------|
| `operador` | Painel Operador, Cadastro Manual |
| `gestor_ana` | Centro de Comando ANA |
| `superadmin` | Acesso total + Painel de Administração |

## Usuário Superadmin Padrão

- **E-mail:** `admin@ana.gov.br`
- **Senha:** `Admin@ANA2026!`

## Executando o Projeto

```bash
npm install
npm run dev
```

## Documentação Complementar

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Arquitetura do sistema
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) — Esquema do banco de dados
- [FUNCTION_CONT.md](./FUNCTION_CONT.md) — Contagem e inventário de funções
- [API_ROUTE.md](./API_ROUTE.md) — Rotas e endpoints
- [cloud.md](./cloud.md) — Configuração Lovable Cloud
