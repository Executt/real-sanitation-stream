# Governança da Sala de Situação e Provisionamento Dinâmico

Estado: **Proposto**.

A Sala de Situação é o modo de operação em que a plataforma passa de monitoramento de rotina para
acompanhamento de evento hídrico (seca, cheia, contaminação, colapso de ETE). Provisionamento
dinâmico é o mecanismo que cria, escala e desmonta o ambiente de trabalho dessa sala — e também
o de novos órgãos — sem intervenção manual de infraestrutura.

## 1. Sala de Situação

### 1.1 Conceito

Um recorte temporário, multi-institucional e auditável, com: escopo geográfico definido,
participantes nomeados, painel próprio, cadência de atualização e registro integral das decisões.
Termina com relatório de encerramento.

### 1.2 Ciclo de vida

```
Proposta → Aprovação → Ativa → Monitoramento reduzido → Encerrada → Arquivada
```

| Estado | Quem decide | Efeito |
|--------|-------------|--------|
| Proposta | AR ou ANA | rascunho com escopo e justificativa |
| Aprovação | ANA (gestor_ana) | valida escopo, participantes e recorte |
| Ativa | automático | painel provisionado, cadência elevada, alertas com limiar reduzido |
| Monitoramento reduzido | coordenador | cadência normal, painel mantido |
| Encerrada | ANA | painel congelado, relatório gerado |
| Arquivada | automático após 90 d | somente leitura, dado preservado para auditoria |

### 1.3 Escopo

Definido por combinação de: bacia, UF, lista de municípios (IBGE), lista de organizações e
lista de ETEs/sistemas. O escopo da sala **não** cria acesso novo a dado que o participante já
não pudesse ver por hierarquia — ele cria um **recorte compartilhado**:

- Participante enxerga, dentro da sala, os indicadores agregados de todo o escopo.
- Dado operacional identificado de um prestador continua restrito a quem tem escopo por RLS.
- Exceção temporária (necessária em emergência) é um ato explícito: registrada, com prazo,
  aprovada por `gestor_ana`, notificada ao prestador e revogada automaticamente no encerramento.

Toda exceção aparece no relatório de encerramento e em `access_audit_log`.

### 1.4 Papéis na sala

| Papel na sala | Quem pode | Pode |
|---------------|-----------|------|
| Coordenador | gestor_ana | alterar escopo, cadência, encerrar, conceder exceção (com aprovação) |
| Analista | gestor_ana, gestor_ar | registrar observação, anexar laudo, propor ação |
| Observador | gestor_ar, operador do escopo | ler painel e histórico |
| Convidado externo | conta nominal com prazo | ler painel agregado, sem dado identificado |

Papel na sala é aditivo e **nunca** ultrapassa o papel global do usuário no RBAC.

### 1.5 Painel da sala

Blocos fixos: mapa do escopo com estado por ETE/manancial · série de DBO e vazão do período ·
conformidade agregada · alertas ativos · predições do Córtex (rotuladas) · linha do tempo de
registros e decisões · lista de ações com responsável e prazo.

Cadência: atualização a cada 5 min em estado Ativa; 30 min em monitoramento reduzido.

### 1.6 Registro e prestação de contas

Tudo na sala é append-only: observação, anexo, mudança de escopo, exceção de acesso, decisão.
Cada item guarda autor, horário UTC, órgão e — quando decisão — a base factual citada.
O relatório de encerramento é gerado automaticamente com: linha do tempo, indicadores no início
e no fim, exceções concedidas e revogadas, ações e seus desfechos, e lições registradas.

### 1.7 Limites

- A sala **não** emite ato regulatório. Outorga, sanção e determinação seguem o rito próprio do
  órgão competente; a sala fornece subsídio.
- Predição do Córtex é sempre subsídio, nunca fundamento único de decisão.
- Rio de domínio estadual: a condução é do órgão gestor estadual; a ANA participa como articuladora.

## 2. Provisionamento dinâmico

### 2.1 O que é provisionado

| Objeto | Origem | Automação |
|--------|--------|-----------|
| Organização (novo órgão) | formulário validado | linha em `organizations` + storage + cota + painel + convite |
| Sala de Situação | aprovação | recorte, painel, canal de tempo real, agenda de relatório, participantes |
| Capacidade de processamento | métrica de carga | escala horizontal dos workers |
| Cota de inferência | porte e evento | ampliação temporária durante sala ativa |
| Credencial de integração | cadastro de fonte | `secret_ref` no cofre, nunca em tabela |

### 2.2 Fluxo

```
Pedido (formulário) 
  → validação de entrada (CNPJ, IBGE, UF, parent coerente, nome único)
  → validação de política (cota disponível, nomenclatura, aprovação necessária?)
  → aplicação declarativa (GitOps para infra; migração/DML para dado)
  → verificação pós-provisionamento (smoke test escopado)
  → notificação ao solicitante e ao gestor responsável
  → registro completo em audit_log
```

Idempotência obrigatória: reexecutar o pedido não duplica recurso. Falha em qualquer etapa
faz rollback das anteriores; estado parcial é proibido.

### 2.3 Guardas

- Nenhum provisionamento cria acesso a dado de terceiro. Novo órgão nasce com escopo vazio.
- `parent_id` precisa respeitar a hierarquia: prestador só sob AR; AR só sob ANA. Ciclo é rejeitado.
- Cota nova acima do porte exige aprovação de dois responsáveis.
- Ampliação temporária de cota expira automaticamente no encerramento da sala.
- Nome de órgão duplicado ou IBGE inexistente bloqueia o pedido.

### 2.4 Escala

| Sinal | Ação | Limite |
|-------|------|--------|
| Fila de inferência > 50 itens por 10 min | +1 worker do Córtex | máx. 6 |
| Latência p95 de API > 1,5 s por 10 min | +2 réplicas do serviço | máx. 12 |
| Sala ativa criada | pré-aquece réplicas e eleva a cadência de probe no escopo | — |
| Ociosidade > 30 min | reduz para a linha de base | mín. 2 réplicas |

Escala é reativa e limitada por teto de custo; estouro de teto gera alerta P2 em vez de escalar.

### 2.5 Desprovisionamento

Sempre em duas fases: **desativação lógica** (`ativa = false`, acesso cortado, dado preservado)
e, após o prazo de retenção e aprovação de dois responsáveis, **purga física** com registro do
que foi apagado, quando e por quem. Auditoria e dado sob obrigação legal nunca são purgados
antes do prazo aplicável.

### 2.6 Verificação pós-provisionamento

Smoke test obrigatório: autenticar como o usuário criado, gravar e ler um registro no escopo novo,
tentar ler um registro de outro órgão (deve retornar zero), verificar a cota aplicada e a presença
do órgão no catálogo. Falha em qualquer asserção reverte o provisionamento e alerta P2.

## 3. Métricas de governança

| Métrica | Alvo |
|---------|------|
| Tempo de provisionamento de órgão | < 10 min ponta a ponta |
| Provisionamentos com rollback | < 5% |
| Salas encerradas com relatório completo | 100% |
| Exceções de acesso revogadas no prazo | 100% |
| Salas ativas há mais de 90 dias sem revisão | 0 |
| Falha de smoke test pós-provisionamento | 0 |

## 4. Checklist

- [ ] Ciclo de vida da sala implementado com estados e transições auditadas
- [ ] Escopo compartilhado sem ampliar acesso identificado por padrão
- [ ] Exceção de acesso com prazo, aprovação, notificação e revogação automática
- [ ] Registro append-only de observações e decisões
- [ ] Relatório de encerramento automático
- [ ] Provisionamento idempotente com rollback e smoke test escopado
- [ ] Validação de hierarquia e de cota antes da aplicação
- [ ] Escala com teto de custo e retorno à linha de base
- [ ] Desprovisionamento em duas fases com dupla aprovação
