# Checklist de Segurança e Desempenho

Lista de verificação aplicável a cada release. Item não verificado conta como reprovado.

## Banco de dados

- [ ] Toda tabela nova em `public` tem GRANT explícito na mesma migração
- [ ] RLS habilitada com políticas `USING` e `WITH CHECK` simétricos
- [ ] `anon` sem privilégio em tabelas e views
- [ ] Funções `SECURITY DEFINER` com `SET search_path = public`
- [ ] Papéis apenas em `user_roles`
- [ ] Índices para os filtros usados (org_id, ete_id, datas, IBGE)
- [ ] Nenhuma consulta sem paginação em tabela de crescimento contínuo
- [ ] Auditoria imutável (UPDATE/DELETE negados)

## Aplicação

- [ ] Nenhum segredo em código ou variável exposta ao navegador
- [ ] Validação de entrada em toda edge function antes de chamada externa
- [ ] Erros propagados com causa, sem vazar detalhe interno ao usuário
- [ ] `ErrorBoundary` por painel de domínio
- [ ] Escopo verificado no servidor em todo download de arquivo
- [ ] Rate limit nas funções expostas
- [ ] Links assinados com expiração; tokens de convite de uso único

## Frontend

- [ ] Somente tokens de cor; nenhum literal
- [ ] Estados de carregamento, vazio e erro em cada tela
- [ ] Filtros na URL; paginação e ordenação server-side
- [ ] axe sem violação crítica; navegação completa por teclado
- [ ] Contraste 4,5:1 (texto) e 3:1 (gráfico/foco)
- [ ] Predição rotulada como apoio à decisão

## Desempenho

| Métrica | Alvo |
|---------|------|
| LCP | < 2,5 s |
| INP | < 200 ms |
| CLS | < 0,1 |
| API p95 | < 800 ms |
| Consulta de tabela p95 | < 300 ms |
| Geração de relatório p95 | < 60 s |

- [ ] Divisão de código por rota; mapa e gráfico sob demanda
- [ ] Cache com invalidação explícita
- [ ] Consultas com `count: exact, head: true` para totais
- [ ] Sem N+1 em embeds de FK

## Infraestrutura

- [ ] TLS 1.2+ e cabeçalhos de segurança (HSTS, CSP, nosniff, referrer)
- [ ] Imagens escaneadas e assinadas
- [ ] Backup com restauração testada no trimestre
- [ ] Alarmes P1–P4 com destinatário definido
- [ ] Teto de custo com alerta em 80%
- [ ] Smoke test escopado pós-implantação (leitura cruzada deve falhar)

## Conformidade

- [ ] Dado pessoal minimizado e justificado
- [ ] Retenção aplicada conforme `system_parameters.retention_days`
- [ ] Trilha de acesso registrada em `access_audit_log`
- [ ] Documentação afetada atualizada no mesmo PR
