# Regras de Negócio — HydrosNet

## 1. Autenticação e Acesso

| Regra | Descrição |
|-------|-----------|
| RN-001 | Todo acesso ao sistema requer autenticação via e-mail/senha ou LDAP |
| RN-002 | Novos usuários cadastrados via formulário recebem role `operador` por padrão (se atribuída manualmente) |
| RN-003 | Usuários importados via LDAP recebem a role padrão configurada pelo administrador |
| RN-004 | Superadmin pode atribuir e remover qualquer role de qualquer usuário |
| RN-005 | Um usuário pode possuir múltiplas roles simultaneamente |
| RN-006 | O superadmin padrão (`admin@ana.gov.br`) é criado via edge function `seed-admin` |

## 2. Operador B2B

| Regra | Descrição |
|-------|-----------|
| RN-010 | Operadores podem visualizar apenas as ETEs vinculadas à sua organização |
| RN-011 | O cadastro manual é um fallback para operadores sem integração API |
| RN-012 | Dados cadastrados manualmente passam por pré-validação antes do envio |
| RN-013 | Campos obrigatórios no cadastro: código ETE, nome, município, bacia, tipologia, status, coordenadas, vazão, DBO entrada/saída, eficiência, população, período de referência, nome/CNPJ do operador, responsável técnico, e-mail |
| RN-014 | O status da ETE pode ser: ativa, em construção ou inativa |
| RN-015 | O tipo de integração pode ser: automático (API), manual (formulário) ou falha (API com erro) |

## 3. Centro de Comando ANA

| Regra | Descrição |
|-------|-----------|
| RN-020 | O Centro de Comando apresenta visão nacional consolidada |
| RN-021 | ETEs são categorizadas como: ativas, em construção ou inativas |
| RN-022 | Eficiência DBO é calculada como: `(DBO_entrada - DBO_saída) / DBO_entrada * 100` |
| RN-023 | Indicadores por bacia incluem: total de ETEs, cobertura percentual, eficiência DBO média |
| RN-024 | Alertas são classificados como: crítico, aviso ou informativo |
| RN-025 | O mapa interativo exibe marcadores coloridos por status: verde (ativa), amarelo (construção), vermelho (inativa) |

## 4. Administração

| Regra | Descrição |
|-------|-----------|
| RN-030 | Apenas superadmins podem acessar o painel de administração |
| RN-031 | Apenas superadmins podem gerenciar (criar/remover) roles de usuários |
| RN-032 | O sistema exibe contadores de: total de usuários, superadmins e gestores ANA |
| RN-033 | Remoção de role é feita por clique na badge com confirmação visual |

## 5. LDAP

| Regra | Descrição |
|-------|-----------|
| RN-040 | A configuração LDAP é acessível apenas por superadmins |
| RN-041 | A conexão LDAP pode ser habilitada/desabilitada via toggle |
| RN-042 | O mapeamento de atributos LDAP → perfil HydrosNet é configurável |
| RN-043 | Usuários importados do LDAP recebem automaticamente a role padrão configurada |
| RN-044 | A sincronização com o diretório LDAP pode ser executada manualmente |
| RN-045 | Conexão LDAP suporta SSL/TLS (LDAPS) |

## 6. Dados e Validação

| Regra | Descrição |
|-------|-----------|
| RN-050 | Coordenadas devem estar no formato decimal (latitude: -90 a 90, longitude: -180 a 180) |
| RN-051 | DBO de entrada deve ser maior que DBO de saída |
| RN-052 | Eficiência de remoção DBO deve ser entre 0% e 100% |
| RN-053 | Vazão média em litros por segundo (L/s) |
| RN-054 | CNPJ no formato XX.XXX.XXX/XXXX-XX |
| RN-055 | Período de referência no formato mês/ano |
