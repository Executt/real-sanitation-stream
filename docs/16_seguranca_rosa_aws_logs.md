# Segurança em ROSA/AWS e Pipeline de Logs — HydrosNet

Estado: **Proposto** — arquitetura-alvo para operação do HydrosNet em Red Hat OpenShift Service on AWS
(ROSA) ou OpenShift auto-gerenciado sobre AWS, mantendo o backend gerenciado atual como plano de dados.

## 1. Topologia

```
             Internet
                │
        [ AWS WAF + CloudFront ]
                │  TLS 1.2+ (ACM)
        [ NLB privado / Ingress ]
                │
  ┌─────────────┴──────────────────────────────┐
  │ ROSA — VPC privada, 3 AZs                  │
  │  ns hydrosnet-prod   (frontend, BFF)       │
  │  ns hydrosnet-jobs   (ETL Atlas, Córtex)   │
  │  ns hydrosnet-obs    (logs, métricas)      │
  │  ns hydrosnet-sec    (ACS, scanners)       │
  └─────────────┬──────────────────────────────┘
                │ VPC Endpoints (PrivateLink)
   ┌────────────┴────────────┬──────────────┬─────────────┐
   │ RDS PostgreSQL (Multi-AZ)│ S3 (KMS)     │ Secrets Mgr │
   └──────────────────────────┴──────────────┴─────────────┘
```

Nenhum nó worker recebe IP público. Saída para internet exclusivamente por NAT Gateway com
lista de destinos permitidos (registries, gateway de IA, endpoints ANA/SNIRH).

## 2. Isolamento de rede

| Camada | Controle |
|--------|----------|
| VPC | Subnets privadas para workers e RDS; subnets públicas apenas para NAT e balanceador |
| Security Group | RDS aceita 5432 apenas do SG dos workers; nenhum ingress 0.0.0.0/0 |
| NetworkPolicy | `default-deny-ingress` e `default-deny-egress` em todos os namespaces; libera-se par a par |
| Egress | `EgressFirewall`/`AdminNetworkPolicy` com allowlist de FQDN |
| PrivateLink | S3, Secrets Manager, ECR, CloudWatch via VPC Endpoint — tráfego não sai da VPC |

Exemplo de política padrão por namespace:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: default-deny, namespace: hydrosnet-prod }
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
```

## 3. Postura dos workloads

- `SecurityContextConstraints: restricted-v2` — sem root, sem privilégio, sem `hostPath`,
  `allowPrivilegeEscalation: false`, `readOnlyRootFilesystem: true`, `seccompProfile: RuntimeDefault`.
- Imagens assinadas (Cosign) e verificadas na admissão; apenas registry interno é permitido.
- `resources.requests/limits` obrigatórios; `PodDisruptionBudget` mínimo de 1 réplica.
- Nenhum segredo em variável de ambiente de manifesto: `External Secrets Operator` sincroniza do
  AWS Secrets Manager para `Secret` do cluster, com rotação automática e IRSA por ServiceAccount.
- Red Hat Advanced Cluster Security (ACS) em modo *enforce* para: imagem com CVE crítico fixável,
  container privilegiado, `latest` como tag e segredo em variável de ambiente.

## 4. Criptografia

| Dado | Em trânsito | Em repouso |
|------|-------------|-----------|
| Navegador → borda | TLS 1.2+ (ACM, HSTS 1 ano com preload) | — |
| Borda → pod | TLS interno / mTLS quando houver service mesh | — |
| Pod → RDS | TLS obrigatório (`sslmode=verify-full`) | KMS CMK, rotação anual |
| Objetos | TLS | S3 SSE-KMS com CMK por órgão |
| etcd | — | criptografia de etcd habilitada no cluster |
| Backups | TLS | snapshots RDS com o mesmo CMK |

## 5. Pipeline de logs

```
Pods ─ stdout/stderr ─► Vector (DaemonSet)
                          │  enriquecimento: namespace, pod, org_id, trace_id
                          │  redação: PII, tokens, CPF/CNPJ
                          ├─► Loki (retenção 30 d, consulta operacional)
                          ├─► S3 bucket logs-hydrosnet (Parquet, particionado dt=/org=)
                          └─► OpenSearch / SIEM (correlação e detecção)

RDS  ─ pgaudit / logs ───► CloudWatch Logs ──► subscription filter ──► S3 + SIEM
ALB/WAF/CloudTrail/VPC Flow ────────────────► S3 (Object Lock) ─────► Athena / SIEM
```

### 5.1 Fontes obrigatórias

| Fonte | Conteúdo | Retenção |
|-------|----------|----------|
| Aplicação (stdout JSON) | requisição, rota, status, latência, `user_id` hasheado, `org_id` | 30 d quente / 12 m frio |
| `audit_log` / `access_audit_log` (banco) | alterações e consultas de negócio | 5 anos WORM |
| pgaudit | DDL, DML privilegiado, login | 12 meses |
| CloudTrail (org trail) | API AWS, incluindo KMS e IAM | 5 anos WORM |
| VPC Flow Logs | conexões aceitas/rejeitadas | 90 d |
| WAF | requisições bloqueadas, regra acionada | 12 meses |
| ACS | violações de política, exec em pod | 12 meses |
| Kubernetes audit | acesso à API, `exec`, `portforward` | 12 meses |

### 5.2 Formato canônico

Um log de aplicação é sempre JSON de uma linha:

```json
{
  "ts": "2026-08-08T01:11:04.512Z",
  "level": "info",
  "service": "hydrosnet-bff",
  "env": "prod",
  "trace_id": "0af7651916cd43dd8448eb211c80319c",
  "route": "/api/etes",
  "method": "GET",
  "status": 200,
  "duration_ms": 42,
  "org_id": "…",
  "actor": "sha256:…",
  "msg": "listagem de ETEs"
}
```

Proibido em log: token, senha, chave, `service_role`, corpo de requisição não redigido,
e-mail em claro (usar hash com sal por ambiente), coordenada exata de instalação sensível.

### 5.3 Redação

Vector aplica `transforms` de redação antes de qualquer sink:
padrões para JWT (`eyJ[A-Za-z0-9_-]{10,}`), chaves AWS (`AKIA[0-9A-Z]{16}`), CPF, CNPJ,
`Authorization:` e `apikey=`. Falha de redação é tratada como incidente de segurança.

## 6. Detecções mínimas no SIEM

| Detecção | Sinal | Severidade |
|----------|-------|-----------|
| Escalada de papel | INSERT em `user_roles` com `role='superadmin'` | crítica |
| Acesso fora do escopo | erro RLS repetido (>20 em 5 min) pelo mesmo ator | alta |
| Exfiltração | `access_audit_log.registros` > 50.000 em uma consulta | alta |
| Uso de service_role fora de edge function | pgaudit com role de serviço em origem inesperada | crítica |
| `exec` em pod de produção | Kubernetes audit | alta |
| Falha de assinatura de imagem | admissão negada | média |
| Pico 5xx | >2% por 5 min | alta |
| CloudTrail desabilitado / KMS key scheduled deletion | CloudTrail | crítica |

## 7. Backup e recuperação

- RDS: backup automatizado 35 dias + snapshot manual mensal em conta separada (cross-account).
- PITR habilitado; RPO alvo **5 min**, RTO alvo **1 h**.
- Teste de restauração trimestral documentado em `21_guia_sustentacao_operacao.md`.
- Buckets de log e auditoria replicados para região secundária com Object Lock preservado.

## 8. Contas e separação de ambientes

Contas AWS distintas para `prod`, `hml`, `dev`, `security` (SIEM/logs) e `backup`.
Nenhum principal de `dev` tem permissão em `prod`. Acesso humano exclusivamente por SSO federado
com MFA, sessão de no máximo 8 h e *permission set* de leitura por padrão; escrita em produção
exige elevação temporária aprovada e registrada.

## 9. Checklist de conformidade da plataforma

- [ ] Workers sem IP público, RDS sem acesso público
- [ ] `default-deny` de ingress e egress em todos os namespaces
- [ ] SCC `restricted-v2` sem exceções em produção
- [ ] Imagens assinadas e verificadas na admissão
- [ ] Segredos via External Secrets + IRSA, zero segredo em manifesto
- [ ] Todos os sinks de log da seção 5.1 ativos
- [ ] Redação validada por teste automatizado
- [ ] Object Lock nos buckets de auditoria
- [ ] Detecções da seção 6 implantadas com alerta roteado
- [ ] Restauração testada no trimestre corrente
