# Regras de Negócio — HydrosNet

## 1. Autenticação e Acesso

| Regra | Descrição |
|-------|-----------|
| RN-001 | Todo acesso ao sistema requer autenticação via e-mail/senha ou LDAP |
| RN-002 | Novos usuários cadastrados via formulário ficam sem role até atribuição manual |
| RN-003 | Usuários importados via LDAP recebem a role padrão configurada pelo administrador |
| RN-004 | Superadmin pode atribuir e remover qualquer role de qualquer usuário |
| RN-005 | Um usuário pode possuir múltiplas roles simultaneamente |
| RN-006 | O superadmin padrão (`admin@ana.gov.br`) é criado via edge function `seed-admin` |

## 2. Operador B2B

| Regra | Descrição |
|-------|-----------|
| RN-010 | Operadores podem visualizar apenas as ETEs vinculadas à sua organização |
| RN-011 | O cadastro manual é fallback para operadores sem integração API |
| RN-012 | Dados manuais passam por pré-validação antes do envio |
| RN-013 | Campos obrigatórios: código ETE, nome, município, bacia, tipologia, status, coordenadas, vazão, DBO entrada/saída, eficiência, população, período, CNPJ, responsável técnico, e-mail |
| RN-014 | Status da ETE: `ativa`, `em construção` ou `inativa` |
| RN-015 | Tipo de integração: `automático` (API), `manual` ou `falha` |

## 3. Centro de Comando ANA

| Regra | Descrição |
|-------|-----------|
| RN-020 | Apresenta visão nacional consolidada de 3.668 ETEs |
| RN-021 | ETEs categorizadas em ativas, em construção ou inativas |
| RN-022 | Eficiência DBO = `(DBO_entrada - DBO_saída) / DBO_entrada * 100` |
| RN-023 | Indicadores por bacia: total ETEs, cobertura %, eficiência média |
| RN-024 | Alertas: `crítico`, `aviso` ou `informativo` |
| RN-025 | Mapa: verde (ativa), amarelo (construção), vermelho (inativa) |

## 4. Administração

| Regra | Descrição |
|-------|-----------|
| RN-030 | Apenas superadmins acessam `/admin/*` |
| RN-031 | Apenas superadmins gerenciam roles |
| RN-032 | Hub de Administração agrega: Usuários, LDAP, SMTP, SEI, Parâmetros, Auditoria |
| RN-033 | Remoção de role por clique na badge com confirmação visual |

## 5. LDAP

| Regra | Descrição |
|-------|-----------|
| RN-040 | Configuração LDAP acessível apenas por superadmins |
| RN-041 | Conexão LDAP habilitada/desabilitada via toggle |
| RN-042 | Mapeamento LDAP → perfil HydrosNet é configurável |
| RN-043 | Usuários importados recebem role padrão automaticamente |
| RN-044 | Sincronização manual ou agendada |
| RN-045 | Suporte a SSL/TLS (LDAPS) |

## 6. SMTP

| Regra | Descrição |
|-------|-----------|
| RN-050 | Configuração SMTP acessível apenas por superadmins |
| RN-051 | Conexão TLS/STARTTLS é fortemente recomendada |
| RN-052 | Disponível e-mail de teste para validar a configuração |
| RN-053 | Notificações automáticas: alertas DBO, conformidade, importação LDAP |

## 7. SEI

| Regra | Descrição |
|-------|-----------|
| RN-060 | Integração SEI acessível apenas por superadmins |
| RN-061 | Abertura automática de processos para alertas críticos quando habilitado |
| RN-062 | Processos vinculados ao órgão e unidade configurados |
| RN-063 | Conexão deve ser testada antes da ativação |

## 8. Parâmetros Gerais

| Regra | Descrição |
|-------|-----------|
| RN-070 | Threshold mínimo de eficiência DBO configurável (padrão 60%) |
| RN-071 | Threshold crítico de eficiência DBO configurável (padrão 40%) |
| RN-072 | Timeout de API configurável (padrão 30s) |
| RN-073 | Intervalo de sincronização configurável (padrão 15min) |
| RN-074 | Retenção de logs configurável (padrão 365 dias) |

## 9. Auditoria

| Regra | Descrição |
|-------|-----------|
| RN-080 | Toda ação crítica é registrada em `audit_log` |
| RN-081 | Logs são imutáveis (apenas inserção) |
| RN-082 | Visualização restrita a superadmins |
| RN-083 | Exportação de auditoria em CSV/PDF |

## 10. Validação de Dados

| Regra | Descrição |
|-------|-----------|
| RN-090 | Coordenadas: latitude -90 a 90, longitude -180 a 180 |
| RN-091 | DBO entrada > DBO saída |
| RN-092 | Eficiência DBO entre 0% e 100% |
| RN-093 | Vazão em L/s |
| RN-094 | CNPJ no formato XX.XXX.XXX/XXXX-XX |
| RN-095 | Período no formato MM/AAAA |
