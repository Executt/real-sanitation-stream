# Guia de Implantação — OpenShift / OKD

Estado: **Proposto**. Complementa `16_seguranca_rosa_aws_logs.md`.

## Organização de projetos

| Namespace | Conteúdo |
|-----------|----------|
| `hydrosnet-prod` | frontend, API, workers do Córtex |
| `hydrosnet-data` | operadores de banco, jobs de migração |
| `hydrosnet-obs` | logging, métricas, alertas |
| `hydrosnet-sec` | scanners, políticas, ACS |

ResourceQuota e LimitRange por namespace; NetworkPolicy padrão negando tudo, liberando
apenas os fluxos declarados.

## Entrega

- GitOps com ArgoCD: repositório de manifests é a fonte da verdade; nada aplicado à mão.
- Imagens assinadas (Cosign) e verificação de assinatura na admissão.
- SecurityContextConstraints restritivo: sem root, sem privilégio, filesystem somente leitura,
  `seccomp: RuntimeDefault`, capabilities dropadas.
- Deployment com `readinessProbe`, `livenessProbe`, `PodDisruptionBudget` e rolling update.
- HPA por CPU e por fila de inferência, com mínimo 2 e máximo definido por serviço.

## Passos

1. Criar namespaces, quotas, NetworkPolicies e SCCs.
2. Configurar ArgoCD com projeto restrito e sincronização automática com auto-heal.
3. Publicar segredos via operador de cofre externo — nunca `Secret` em Git.
4. Rodar job de migração como etapa pré-sincronização, idempotente e com rollback.
5. Expor via Route com TLS terminado no edge e certificado gerenciado.
6. Instalar coleta de logs e métricas; enviar para o pipeline do doc. 16.
7. Executar smoke test escopado antes de liberar tráfego.

## Operação

- Atualização de cluster em janela aprovada, com drenagem controlada.
- Runbooks RB-01 a RB-10 (doc. 21) referenciados nos alertas.
- Revisão trimestral de RBAC do cluster e de políticas de admissão.
