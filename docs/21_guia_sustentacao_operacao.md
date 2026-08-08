# Guia de Sustentação e Operação — HydrosNet

Estado: **Vigente** para os procedimentos que dependem apenas do que já existe; itens marcados
com (P) dependem de entregas propostas nos documentos 15 a 20.

## 1. Serviço e responsabilidades

| Papel | Responsabilidade | Acionamento |
|-------|------------------|-------------|
| N1 — Suporte | Triagem, comunicação, runbooks de reinício e reprocesso | Horário comercial |
| N2 — Sustentação | Diagnóstico técnico, correção de dado, ajuste de configuração | Comercial + plantão |
| N3 — Engenharia | Correção de código, migração, mudança de arquitetura | Plantão para P1 |
| Segurança | Incidente de segurança, vazamento, escalada de privilégio | 24×7 para P1 |
| Dono do produto | Decisão de negócio, priorização, comunicação institucional | Comercial |

## 2. Níveis de serviço

| Classe | Tempo de resposta | Tempo de contorno | Tempo de solução |
|--------|-------------------|-------------------|------------------|
| P1 | 15 min | 2 h | 24 h |
| P2 | 1 h | 8 h | 5 dias úteis |
| P3 | 1 dia útil | 5 dias úteis | 20 dias úteis |
| P4 | 3 dias úteis | — | backlog priorizado |

Disponibilidade alvo: **99,5%** mensal (janela de manutenção declarada não conta).
Janela padrão: domingos, 02:00–05:00 UTC, comunicada com 5 dias de antecedência.

## 3. Rotinas

### Diárias
1. Revisar o painel de disponibilidade e latência das integrações (`/admin` → Monitoramento API).
2. Conferir execuções do Córtex nas últimas 24 h e erros em `CortexExecucoes`.
3. Conferir lotes de importação Atlas com `status='erro'`.
4. Revisar alertas P1/P2 abertos e sem dono.
5. (P) Conferir o resultado das jornadas sintéticas (doc. 19).

### Semanais
1. Revisar `audit_log` com `severity='critical'` e todo INSERT em `user_roles`.
2. Revisar consumo de storage × cota por órgão.
3. Revisar dependências com CVE nova (scan de dependências).
4. Revisar alertas ruidosos (mais de 20 disparos sem ação) e reclassificar.

### Mensais
1. Revisão de acessos: usuários inativos há 90 dias são desativados.
2. Conferência de contas de serviço e segredos próximos do prazo de rotação.
3. Fechamento de indicadores de SLA e publicação do relatório de sustentação.
4. (P) Teste de restauração em ambiente efêmero.

### Trimestrais
1. Revisão da matriz de papéis × permissões contra `09_politicas_seguranca.md`.
2. Revisão das políticas de retenção contra o prazo legal aplicável.
3. Exercício de mesa de resposta a incidentes.
4. Revisão de capacidade: crescimento de série, custo de inferência, projeção de 12 meses.

## 4. Runbooks

### RB-01 — Integração externa indisponível
1. Confirmar em `api_probe_log` a duração e o `http_status` predominante.
2. Verificar se o endpoint responde fora da plataforma (curl da rede do cluster).
3. Se for indisponibilidade da origem: registrar, comunicar os órgãos afetados, manter os probes.
4. Se for do nosso lado: verificar egress/allowlist de FQDN e certificado.
5. Não reprocessar em massa antes da origem estabilizar — o retry agrava.

### RB-02 — Job do Córtex falhando
1. Abrir `CortexExecucoes` e ler a mensagem de erro do último run.
2. Erro do gateway de IA (429/5xx): aguardar, verificar cota, reagendar. Não trocar de modelo sem aprovação.
3. Erro de fonte (repositório/base): validar o `secret_ref` e a conectividade da fonte.
4. Erro de dado (feature vazia): verificar lacuna na série da ETE; tratar como problema de ingestão.
5. Nunca promover modelo a `prod` para "resolver" — a trigger de Falso Afluente existe por segurança.

### RB-03 — Importação Atlas rejeitada
1. Abrir o lote e ler o array de erros.
2. Divergência de dicionário → confirmar a versão da planilha na fonte oficial e atualizar
   `src/lib/atlasDictionary.ts` por release, nunca por ajuste manual em produção.
3. Mais de 5% de linhas rejeitadas → devolver ao fornecedor do dado.
4. Reimportar é seguro: a carga é idempotente por `external_key`.

### RB-04 — Usuário sem acesso
1. Confirmar o papel em `user_roles` (nunca em `profiles`).
2. Confirmar `profiles.org_id` e a posição do órgão na árvore.
3. Testar `can_access_org()` para o registro reclamado.
4. Corrigir vínculo em `/admin/usuarios`; concessão de papel só por `superadmin`, com justificativa.
5. Registrar a alteração — a trigger já o faz; conferir a linha em `audit_log`.

### RB-05 — Usuário vendo dado que não deveria
Tratar como **P1 de segurança**.
1. Congelar: desativar o usuário e preservar a evidência.
2. Levantar em `access_audit_log` o que foi consultado, quando e quantos registros.
3. Identificar a policy defeituosa; corrigir por migração com teste de regressão.
4. Comunicar os órgãos cujos dados foram expostos.
5. Registrar em `13_seguranca_hardening.md` a causa e a correção.

### RB-06 — Latência alta
1. Distinguir frontend (bundle, render) de banco (consulta) pelo trace.
2. Consultar as consultas lentas do banco; buscar varredura sequencial em tabela de série.
3. Verificar se a tela está paginando server-side — tabela sem `range()` é a causa mais comum.
4. Adicionar índice por migração; nunca em produção fora do processo.

### RB-07 — Fila de expurgo travada (P)
1. Verificar o último sucesso do job `retention-sweep`.
2. Rodar manualmente em lote reduzido e observar bloqueios.
3. Se houver partição, preferir `DETACH` a `DELETE`.

### RB-08 — Suspeita de arquivo malicioso (P)
Seguir `18_inspecao_antimalware_bloqueio_extensoes.md`, seção 5. Não abrir o arquivo em
estação de trabalho, em nenhuma hipótese.

### RB-09 — Rotação de segredo
1. Criar o novo segredo no cofre, mantendo o antigo ativo.
2. Atualizar o consumidor e validar em homologação.
3. Publicar, observar 24 h, então revogar o antigo.
4. Segredo comprometido pula a etapa 3: revogação imediata.

### RB-10 — Restauração de banco
1. Declarar incidente e congelar escritas.
2. Restaurar por PITR para o instante imediatamente anterior ao evento.
3. Validar contagens por tabela contra o último relatório diário.
4. Reexecutar as jornadas sintéticas antes de liberar o acesso.
5. Registrar RPO e RTO efetivos.

## 5. Gestão de mudança

| Tipo | Aprovação | Janela |
|------|-----------|--------|
| Correção emergencial (P1) | Dono do produto + engenharia | imediata, com registro posterior |
| Padrão (feature, ajuste) | Revisão de código + CI verde | qualquer dia útil |
| Migração de banco | Revisão de DBA + plano de rollback | janela de manutenção |
| Mudança de RLS/papel | Revisão de segurança obrigatória | janela de manutenção |
| Promoção de modelo Córtex | Laudo causal + checklist do Falso Afluente completo | comitê técnico |

Toda migração precisa de: script de ida, script de volta, estimativa de duração, impacto de lock e
verificação pós-aplicação. Migração que cria tabela sem GRANT + RLS é rejeitada na revisão.

## 6. Gestão de capacidade

| Indicador | Limiar de atenção | Ação |
|-----------|-------------------|------|
| Linhas em `dbo_medicoes` | 10 M | particionar (doc. 15) |
| Tamanho do banco | 70% do provisionado | ampliar |
| Latência p95 de consulta | 800 ms | revisar índices e agregados |
| Custo mensal de inferência | 80% do orçado | revisar frequência do job e escopo |
| Storage por órgão | 80% da cota | notificar e negociar ampliação |

## 7. Comunicação

- Incidente P1: comunicação inicial em 30 min, atualização a cada 1 h, relatório final em 5 dias úteis.
- Página de estado com histórico de incidentes, acessível aos órgãos.
- Comunicação a órgão sempre pela hierarquia: ANA e AR são informadas junto com o prestador afetado.
- Nunca divulgar detalhe técnico explorável durante incidente de segurança em andamento.

## 8. Encerramento de incidente

Todo P1 e P2 gera post-mortem sem culpado, com: linha do tempo, causa raiz, impacto por órgão,
o que detectou (e o que deveria ter detectado antes), ações corretivas com dono e prazo, e
atualização do documento correspondente nesta pasta.
