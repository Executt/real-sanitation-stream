# Guia de Implantação — AWS

Estado: **Proposto** (o ambiente vigente roda em Lovable Cloud).

## Topologia

VPC com 3 AZs: subnets públicas (ALB, NAT), privadas de aplicação (containers), privadas de dados
(RDS PostgreSQL, ElastiCache). Nenhum recurso de dado com IP público.

| Serviço | Uso |
|---------|-----|
| ALB + WAF | entrada HTTPS, regras OWASP, rate limit por IP |
| ECS Fargate ou EKS | frontend estático (via CloudFront/S3) e serviços de API |
| RDS PostgreSQL Multi-AZ | banco principal, backup PITR 35 dias |
| S3 | artefatos, relatórios e uploads, segregados por prefixo `{org_id}/` |
| KMS | chaves por finalidade, rotação anual, contexto de criptografia com `org_id` |
| Secrets Manager | credenciais externas resolvidas por `secret_ref` |
| CloudWatch + OpenSearch | logs, métricas e alarmes |
| CloudTrail + GuardDuty + Security Hub | trilha, detecção e postura |

## Passos

1. Provisionar rede, KMS e Secrets Manager por Terraform (estado remoto com lock).
2. Criar RDS com criptografia, TLS obrigatório, `pgaudit`, janela de manutenção fora do pico.
3. Aplicar migrações versionadas; validar GRANT + RLS de cada tabela nova.
4. Publicar imagens assinadas em ECR com scan habilitado.
5. Implantar serviços com health check, autoscaling e limites de CPU/memória.
6. Configurar CloudFront com OAC para o bucket do frontend e cabeçalhos de segurança.
7. Executar smoke test escopado (autenticação, escrita, leitura cruzada negada).
8. Habilitar alarmes P1–P4 e rotas de notificação.

## Segurança obrigatória

- TLS 1.2+ ponta a ponta; HSTS, CSP, `X-Content-Type-Options`, `Referrer-Policy`.
- IAM com privilégio mínimo por serviço; sem chave estática de longa duração.
- Bucket com Block Public Access, versionamento, ciclo de vida e política de negação de TLS ausente.
- Backup testado por restauração trimestral documentada.

## Custos e limites

Teto de custo por ambiente com alarme em 80%; escala automática com máximo definido
(doc. 25, seção 2.4). Ambientes efêmeros de revisão expiram em 7 dias.
