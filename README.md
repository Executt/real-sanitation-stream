# HydrosNet — Plataforma Integrada de Saneamento

> Sistema de monitoramento e gestão de Estações de Tratamento de Esgoto (ETEs) com integração ao SNIRH/Atlas Esgotos da ANA.

## Visão Geral

O HydrosNet é uma plataforma web que conecta operadores de saneamento (B2B) à Agência Nacional de Águas (ANA) por meio de painéis interativos, integração de dados via API e cadastro manual. O sistema oferece controle de acesso baseado em roles, dashboards operacionais, um centro de comando nacional e integração com diretórios LDAP/Active Directory.

## Funcionalidades Principais

- **Painel Operador B2B** — Status das ETEs, cadastro manual de dados, monitoramento de integração API
- **Centro de Comando ANA** — Visão nacional com indicadores por bacia hidrográfica, gráficos de tendência DBO
- **Mapa Interativo** — Visualização geoespacial com Leaflet das ETEs em todo o Brasil, com marcadores por status
- **Autenticação & RBAC** — Login com e-mail/senha, controle de acesso por roles (operador, gestor_ana, superadmin)
- **Painel de Administração** — Gerenciamento de usuários e atribuição de roles (exclusivo superadmin)
- **Integração LDAP** — Configuração de diretório LDAP/Active Directory para importação e sincronização de usuários
- **Gráficos de Tendência** — Evolução da eficiência DBO por bacia com Recharts

## Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18, TypeScript 5, Vite 5 |
| UI | Tailwind CSS v3, shadcn/ui, Lucide Icons |
| Gráficos | Recharts |
| Mapa | Leaflet, React-Leaflet |
| Backend | Lovable Cloud (Supabase) |
| Auth | Supabase Auth com RBAC + LDAP |
| Banco de Dados | PostgreSQL com RLS |

## Estrutura de Roles

| Role | Acesso |
|------|--------|
| `operador` | Painel Operador, Cadastro Manual |
| `gestor_ana` | Centro de Comando ANA |
| `superadmin` | Acesso total + Painel de Administração + Configuração LDAP |

## Navegação

A aplicação utiliza navegação horizontal superior (top navbar) com menus dropdown organizados por contexto:
- **Operador B2B**: Status das ETEs, Cadastro Manual, Monitoramento API, Log de Integração
- **ANA Center**: Command Center, Tendência DBO, Mapa Interativo, Alertas DBO, Conformidade
- **Administração** (superadmin): Usuários & Roles, Configuração LDAP

## Usuário Superadmin Padrão

- **E-mail:** `admin@ana.gov.br`
- **Senha:** `Admin@ANA2026!`

## Design System

- **Cores primárias:** Azul `HSL(220, 72%, 50%)`, navbar dark `HSL(224, 30%, 18%)`
- **Tipografia:** Inter (body), IBM Plex Mono (dados técnicos)
- **Border radius:** 0.5rem (padrão)
- **Layout:** Top navigation bar com dropdowns, cards com shadow suave

## Executando o Projeto

```bash
npm install
npm run dev
```

## Documentação Complementar

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Arquitetura do sistema
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) — Esquema do banco de dados
- [API_ROUTE.md](./API_ROUTE.md) — Rotas e endpoints
- [FUNCTION_CONT.md](./FUNCTION_CONT.md) — Contagem e inventário de funções
- [VISUAL_STANDARDS.md](./VISUAL_STANDARDS.md) — Padronização visual
- [SECURITY_POLICIES.md](./SECURITY_POLICIES.md) — Políticas de segurança
- [BUSINESS_RULES.md](./BUSINESS_RULES.md) — Regras de negócio
- [cloud.md](./cloud.md) — Configuração Lovable Cloud
