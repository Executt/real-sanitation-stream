# Sistema de Relatórios e Notificações por E-mail — HydrosNet

Estado: **Parcialmente vigente** — o envio transacional existe (`smtp_config` + edge function
`smtp-send`, usada por convites). Relatórios agendados e digests são o desenho-alvo.

## 1. Taxonomia de comunicação

| Classe | Gatilho | Exemplo | Cancelável pelo usuário |
|--------|---------|---------|------------------------|
| Transacional | ação do usuário | convite, redefinição de senha, confirmação de importação | Não |
| Operacional | evento do sistema | ETE sem medição há 7 dias, lote com erro | Sim (por tipo) |
| Alerta | limiar cruzado | DBO não conforme, risco preditivo crítico | Parcial — crítico não é cancelável |
| Relatório | agenda | boletim semanal de conformidade, mensal de investimentos | Sim |
| Institucional | manual | comunicado da ANA, aviso de manutenção | Não |

## 2. Relatórios

### 2.1 Catálogo

| Código | Relatório | Escopo | Periodicidade padrão | Formatos |
|--------|-----------|--------|----------------------|----------|
| R-01 | Conformidade DBO | ETE / prestador / AR / nacional | semanal | PDF, XLSX |
| R-02 | Alertas do período | prestador / AR | diário | PDF |
| R-03 | Série histórica de medições | ETE | sob demanda | XLSX, CSV |
| R-04 | Disponibilidade de integrações | prestador / AR | mensal | PDF |
| R-05 | ISH-U por município | AR / nacional | mensal | PDF, XLSX |
| R-06 | Perdas e distribuição | prestador | mensal | XLSX |
| R-07 | Carteira de investimentos EPPO | órgão / nacional | mensal | XLSX, PDF |
| R-08 | Predições do Córtex | AR / nacional | semanal | PDF |
| R-09 | Auditoria de acesso | órgão (gestor) / nacional (superadmin) | mensal | CSV |
| R-10 | Lotes de importação Atlas | nacional | mensal | XLSX |

Todo relatório traz, obrigatoriamente, no cabeçalho: nome, escopo com a hierarquia completa,
período, data/hora de geração em UTC e horário de Brasília, versão do sistema, e o aviso
"Documento gerado automaticamente — apoio à decisão" quando contiver saída do Córtex.

### 2.2 Regras de conteúdo

- Vazão rotulada com a unidade (L/s ou m³/s), sem mistura na mesma coluna.
- DBO em mg/L; eficiência em %; conformidade avaliada contra `system_parameters`
  (`dbo_min`, `dbo_critico`) — nunca contra valor fixo no relatório.
- Município sempre com código IBGE ao lado do nome.
- Célula sem dado é "—" e nunca zero; zero é um valor medido.
- Predição sempre em bloco separado, rotulada e com o modelo e a versão declarados.
- Rodapé com a fonte de cada bloco (medição validada, Atlas ANA, SNIS, predição).

### 2.3 Arquitetura de geração

```
Agenda (pg_cron) ou pedido do usuário
     │  cria linha em report_jobs (status=queued, escopo, formato, destinatários)
     ▼
Edge function `report-run`
     │ 1. resolve o escopo com o MESMO can_access_org do solicitante
     │ 2. consulta agregados materializados (não a série bruta)
     │ 3. renderiza (HTML→PDF headless; XLSX via biblioteca)
     │ 4. grava em storage privado {org_id}/reports/{job_id}.{ext}
     │ 5. calcula sha256 e registra no job
     ▼
Edge function `notify-send` → e-mail com link assinado (expira em 7 dias)
```

Decisões:

- O anexo pesado **não** vai no e-mail: envia-se link assinado, autenticado, com escopo verificado
  no download. Anexo direto apenas para PDF abaixo de 5 MB, quando o órgão exigir.
- Geração é sempre assíncrona; a UI mostra o progresso e o histórico de relatórios do órgão.
- Relatório expira em 30 dias no storage (doc. 17, ciclo de vida).
- O escopo é resolvido no banco: se o solicitante perder acesso antes do download, o link falha.

### 2.4 Agendamento

Tabela de assinatura por usuário: relatório, escopo, periodicidade (diária, semanal com dia,
mensal com dia), horário local, formato e destinatários adicionais dentro do mesmo órgão.
Destinatário fora da hierarquia do assinante é proibido — bloqueio no banco, não só na UI.

## 3. Notificações por e-mail

### 3.1 Entrega

- SMTP configurado em `smtp_config` (host, porta, TLS, credencial em cofre).
- Remetente institucional com SPF, DKIM e DMARC (`p=quarantine` no mínimo) configurados no domínio.
- `Reply-To` para a caixa do órgão quando aplicável; nunca `no-reply` sem alternativa de contato.
- Fila com retry exponencial (1 min, 5 min, 30 min, 2 h, 6 h) e no máximo 5 tentativas.
- Bounce e reclamação tratados: hard bounce desativa o envio para o endereço e notifica o gestor.
- Limite de taxa por órgão para não estourar a reputação do domínio.

### 3.2 Antifadiga

- Agrupamento: alertas do mesmo tipo e órgão em janela de 15 min viram um e-mail com lista.
- Digest: eventos P3/P4 não geram e-mail individual; entram no digest diário das 08:00 local.
- Silêncio noturno (22:00–06:00 local) para tudo exceto P1.
- Deduplicação por chave de evento — o mesmo alerta não reenvia enquanto não for resolvido.
- Preferências por usuário e por tipo, com padrão sensato por papel.

### 3.3 Conteúdo e segurança

Um e-mail do HydrosNet **nunca** contém: dado pessoal de terceiro, credencial, token em texto,
link para host fora do domínio oficial, nem dado de órgão diferente do destinatário.

Estrutura padrão:

```
Assunto: [HydrosNet] {tipo} — {escopo curto} — {data}
Cabeçalho: identidade institucional
Corpo: 1 frase de contexto · dado essencial em tabela curta · 1 ação primária (botão/link)
Rodapé: por que você recebeu · como ajustar preferências · contato do órgão
```

Regras de assunto: prefixo fixo `[HydrosNet]`, sem emoji, sem maiúsculas gritadas, sem
alarmismo. Alerta crítico usa a palavra "crítico" e nada além disso.

- Links são assinados e de uso único quando derem acesso a arquivo.
- Convite de usuário: token de uso único, expiração de 72 h, invalidado no primeiro uso.
- Versão texto puro sempre presente ao lado do HTML.
- Templates versionados no repositório, com teste de renderização em CI.

### 3.4 Modelos principais

| Modelo | Assunto | Ação primária |
|--------|---------|---------------|
| Convite | `[HydrosNet] Convite de acesso — {órgão}` | Ativar acesso |
| Redefinição de senha | `[HydrosNet] Redefinição de senha` | Definir nova senha |
| DBO não conforme | `[HydrosNet] Não conformidade de DBO — {ETE}` | Ver medição |
| DBO crítico | `[HydrosNet] Alerta crítico de DBO — {ETE}` | Ver painel |
| Sem medição | `[HydrosNet] ETE sem lançamento há 7 dias — {ETE}` | Lançar medição |
| Importação concluída | `[HydrosNet] Importação Atlas concluída — {lote}` | Ver lote |
| Importação com erro | `[HydrosNet] Importação Atlas rejeitada — {lote}` | Ver erros |
| Relatório pronto | `[HydrosNet] {relatório} disponível — {período}` | Baixar |
| Digest diário | `[HydrosNet] Resumo diário — {órgão}` | Abrir painel |
| Risco preditivo | `[HydrosNet] Risco preditivo {nível} — {bacia}` | Ver predição |

## 4. Auditoria e métricas

Todo envio registra em `audit_log`: modelo, destinatário (hash), `org_id`, `job_id`,
resultado (`sent`, `bounced`, `failed`), tentativa e provedor. Corpo do e-mail não é armazenado;
armazena-se a versão do template e as variáveis não sensíveis.

| Métrica | Alvo |
|---------|------|
| Taxa de entrega | ≥ 98% |
| Hard bounce | < 1% |
| Tempo de geração de relatório p95 | < 60 s |
| Tempo até o e-mail após o evento p95 | < 2 min |
| Reclamação de spam | < 0,1% |

## 5. Acessibilidade e apresentação

- HTML de e-mail em tabela simples, largura 600 px, sem dependência de imagem para o significado.
- Contraste mínimo 4,5:1; texto alternativo em toda imagem; nenhuma informação só por cor.
- PDF gerado com estrutura de texto pesquisável (não imagem), com sumário quando maior que 10 páginas.
- Nomes de arquivo padronizados: `hydrosnet_{codigo}_{escopo}_{periodo}.{ext}`.

## 6. Checklist

- [ ] SPF, DKIM e DMARC configurados e validados
- [ ] Fila com retry, tratamento de bounce e desativação automática
- [ ] Escopo do relatório resolvido no banco, com verificação no download
- [ ] Link assinado com expiração; sem anexo pesado
- [ ] Agrupamento, digest e silêncio noturno implantados
- [ ] Preferências por usuário e tipo
- [ ] Templates versionados com teste de renderização e versão texto puro
- [ ] Registro de envio em `audit_log` sem conteúdo sensível
- [ ] Rótulo "apoio à decisão" em todo bloco de predição
