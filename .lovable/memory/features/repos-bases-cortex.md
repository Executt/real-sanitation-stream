---
name: Repositórios & Bases externas para Córtex
description: Cadastro N de repositórios (S3, OCI, GCP, Azure, OneDrive, Drive, SharePoint, FTP/SFTP, filesystem) e bases (Postgres, Oracle, MySQL, SQL Server, Snowflake, BigQuery, etc). Vinculados aos modelos Córtex via cortex_modelos_fontes.
type: feature
---
Rotas admin (superadmin): `/admin/repositorios`, `/admin/bases-dados`. Módulo "Modelos Córtex IA" fica em `/admin/cortex-modelos` sob a seção de Configuração do AdminHub.

Tabelas: `repositorios_artefatos`, `bases_dados_externas`, `cortex_modelos_fontes` (XOR entre repo/base + papel: treino|contexto_rag|inferencia|validacao). Todas auditadas. RLS: read auth, write superadmin.

**Segurança:** credenciais **nunca** vão para colunas. Apenas `secret_ref` (nome da secret do Lovable Cloud). UI reforça isso no diálogo.

Escopo atual: cadastro + vínculo. Drivers de leitura efetiva pelas edge functions (`cortex-infer` etc.) ficam para próxima entrega, por tipo de fonte.
