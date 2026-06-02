# HydrosNet — Plataforma Integrada de Saneamento

> Sistema nacional de monitoramento e gestão de Estações de Tratamento de Esgoto (ETEs) com integração ao SNIRH/Atlas Esgotos da ANA.

## Visão Geral

O HydrosNet conecta operadores de saneamento (B2B) à Agência Nacional de Águas (ANA) por meio de painéis interativos, integração de dados via API, cadastro manual e diretórios corporativos (LDAP/AD). Oferece controle de acesso baseado em roles, dashboards operacionais, centro de comando nacional e administração centralizada de parâmetros.

## Funcionalidades Principais

- **Painel Operador B2B** — KPIs reais de ETEs, falhas de integração nas últimas 24 h, eficiência DBO média e tabela de status.
- **Cadastro de ETEs** (`/operador/etes`) — CRUD completo com vínculo à concessionária, filtros e validação Zod.
- **Cadastro Manual** (`/operador/cadastro`) — Entrada manual de medições quando a integração API está indisponível.
- **Monitoramento de API** (`/operador/api`) — Probes ativos com persistência em `api_probe_log` e histórico por endpoint.
- **Log de Integração** (`/operador/logs`) — Histórico detalhado dos eventos das integrações automáticas.
- **Centro de Comando ANA** (`/command-center`) — KPIs nacionais consolidados de `etes` + `dbo_medicoes`.
- **Tendência DBO** (`/command-center/tendencia`) — Série temporal nacional via Recharts.
- **Mapa Interativo** (`/command-center/mapa`) — Geolocalização das ETEs em Leaflet.
- **Alertas DBO** (`/command-center/alertas`) — Medições fora de conformidade em tempo real.
- **Conformidade Nacional** (`/command-center/conformidade`) — % de conformidade por bacia hidrográfica.
- **Hub de Administração** (`/admin`) — Central única de parametrização do sistema.
- **Gestão de Concessionárias** (`/admin/concessionarias`) — CRUD das prestadoras de saneamento.
- **Autenticação & RBAC** — Login com e-mail/senha + Google, controle de acesso por roles.
- **Integração LDAP/AD** — Importação e sincronização automática (cron) de usuários corporativos.
- **Configuração SMTP** — Servidor de e-mail para notificações automáticas.
- **Integração SEI** — Abertura automática de processos no Sistema Eletrônico de Informações.
- **Parâmetros Gerais** — Limites de conformidade DBO, timeouts, retenção e intervalo de sincronização.
- **Auditoria** — Trilha imutável de ações críticas, populada por triggers em tabelas sensíveis.

## Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18, TypeScript 5, Vite 5 |
| UI | Tailwind CSS v3, shadcn/ui, Lucide Icons |
| Gráficos | Recharts |
| Mapa | Leaflet, React-Leaflet |
| Backend | Lovable Cloud (Supabase) |
| Auth | Supabase Auth com RBAC + LDAP |
| Banco de Dados | PostgreSQL com RLS + `pg_cron` + `pg_net` |
| Edge Functions | Deno (ldap-sync, sei-create-process, smtp-send, seed-admin) |

## Estrutura de Roles

| Role | Acesso |
|------|--------|
| `operador` | Painel Operador, ETEs, Cadastro Manual, Monitoramento API, Logs |
| `gestor_ana` | Centro de Comando ANA, Tendência, Mapa, Alertas, Conformidade |
| `superadmin` | Acesso total + Hub de Administração + gestão de roles e concessionárias |

## Navegação

A aplicação utiliza navegação horizontal superior (top navbar) com dropdowns:
- **Operador B2B**: Visão geral, ETEs, Cadastro Manual, Monitoramento API, Log de Integração.
- **ANA Center**: Command Center, Tendência DBO, Mapa Interativo, Alertas DBO, Conformidade.
- **Administração** (superadmin): Hub, Usuários & Roles, Concessionárias, LDAP, SMTP, SEI, Parâmetros, Auditoria.

## Usuário Superadmin Padrão

- **E-mail:** `admin@ana.gov.br`
- **Senha:** `Admin@ANA2026!`

> Criado via edge function `seed-admin`. Recomenda-se trocar a senha após o primeiro login.

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
