# HydrosNet — Plataforma Integrada de Saneamento

> Sistema nacional de monitoramento e gestão de Estações de Tratamento de Esgoto (ETEs) com integração ao SNIRH/Atlas Esgotos da ANA.

## Visão Geral

O HydrosNet conecta operadores de saneamento (B2B) à Agência Nacional de Águas (ANA) por meio de painéis interativos, integração de dados via API, cadastro manual e diretórios corporativos (LDAP/AD). Oferece controle de acesso baseado em roles, dashboards operacionais, centro de comando nacional e administração centralizada de parâmetros.

## Funcionalidades Principais

- **Painel Operador B2B** — Status das ETEs, cadastro manual, monitoramento de integração API.
- **Centro de Comando ANA** — Visão nacional, indicadores por bacia, gráficos de tendência DBO.
- **Mapa Interativo** — Visualização geoespacial com Leaflet das ETEs no Brasil.
- **Autenticação & RBAC** — Login com e-mail/senha, controle de acesso por roles.
- **Hub de Administração** — Central única de parametrização do sistema.
- **Integração LDAP/AD** — Importação e sincronização de usuários corporativos.
- **Configuração SMTP** — Servidor de e-mail para notificações automáticas.
- **Integração SEI** — Abertura automática de processos no Sistema Eletrônico de Informações.
- **Parâmetros Gerais** — Limites de conformidade, timeouts e retenção configuráveis.
- **Auditoria & Segurança** — Trilhas de auditoria de ações críticas.

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
| `superadmin` | Acesso total + Hub de Administração |

## Navegação

A aplicação utiliza navegação horizontal superior (top navbar) com dropdowns:
- **Operador B2B**: Status das ETEs, Cadastro Manual, Monitoramento API, Log de Integração.
- **ANA Center**: Command Center, Tendência DBO, Mapa Interativo, Alertas DBO, Conformidade.
- **Administração** (superadmin): Hub, Usuários & Roles, LDAP, SMTP, SEI, Parâmetros, Auditoria.

## Usuário Superadmin Padrão

- **E-mail:** `admin@ana.gov.br`
- **Senha:** `Admin@ANA2026!`

## Executando o Projeto

```bash
npm install
npm run dev
```

## Documentação Complementar

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Arquitetura da aplicação
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) — Esquema do banco
- [API_ROUTE.md](./API_ROUTE.md) — Rotas e endpoints
- [FUNCTION_CONT.md](./FUNCTION_CONT.md) — Inventário e contagem de funções
- [VISUAL_STANDARDS.md](./VISUAL_STANDARDS.md) — Padronização visual
- [SECURITY_POLICIES.md](./SECURITY_POLICIES.md) — Políticas de segurança (RLS)
- [SECURITY.md](./SECURITY.md) — Segurança geral
- [BUSINESS_RULES.md](./BUSINESS_RULES.md) — Regras de negócio
- [cloud.md](./cloud.md) — Configuração Lovable Cloud
