# GeoIP, Threat Intel e Ingestão em Lote Segura — HydrosNet

Estado: **Proposto**.

Três assuntos que compartilham o mesmo princípio: enriquecer e ingerir dado externo sem transformar
a fonte externa em vetor de ataque nem em pretexto para decisão errada.

## 1. GeoIP

### 1.1 Uso legítimo

| Uso | Permitido | Observação |
|-----|-----------|-----------|
| Detecção de acesso anômalo (viagem impossível) | Sim | sinal para o SIEM, nunca bloqueio automático de gestor |
| Contexto em investigação de incidente | Sim | registrado no relatório |
| Restrição de país no WAF | Sim, com allowlist BR + exceções aprovadas | falso positivo tratado por exceção nominal |
| **Autorização** de acesso a dado | **Não** | autorização é RBAC + RLS, jamais geolocalização |
| Precificação, ranking ou avaliação de órgão | Não | fora de propósito |

### 1.2 Implementação

- Base MaxMind GeoLite2 (ou equivalente) atualizada semanalmente, servida por um sidecar local.
  **Nenhuma consulta a serviço de GeoIP em tempo real na borda** — latência e dependência externa.
- Resolução feita no pipeline de log (Vector), não na aplicação.
- Campos derivados: `geo.country`, `geo.region`, `geo.asn`, `geo.asn_org`. **Não** persistir cidade
  nem coordenada do usuário.
- O IP bruto é considerado dado pessoal: armazenado com truncamento (`/24` IPv4, `/48` IPv6) nos
  logs operacionais e em claro apenas na trilha de segurança, com retenção de 12 meses.
- Precisão declarada: GeoIP erra em VPN, rede móvel e órgão com saída centralizada. Toda regra que
  use GeoIP precisa de caminho de exceção documentado.

### 1.3 Detecções

| Detecção | Regra | Classe |
|----------|-------|--------|
| Viagem impossível | dois logins do mesmo usuário com distância/tempo > 900 km/h | alta |
| País fora da allowlist | login originado fora de BR sem exceção registrada | alta |
| ASN de hosting/VPN | login vindo de ASN de datacenter conhecido | média |
| Rotação de ASN | > 5 ASNs distintos para o mesmo usuário em 24 h | média |

Ação padrão: exigir reautenticação com MFA e notificar o gestor do órgão. Bloqueio automático
só para `superadmin` — o papel de maior impacto.

## 2. Threat Intelligence

### 2.1 Fontes

| Feed | Tipo de indicador | Frequência | Confiança |
|------|-------------------|-----------|-----------|
| CTI governamental (CTIR Gov) | IP, domínio, hash | diária | alta |
| Abuse.ch (URLhaus, MalwareBazaar) | URL, hash | horária | alta |
| Feeds abertos de IP malicioso | IP | horária | média |
| Interno (incidentes do HydrosNet) | IP, hash, ator | evento | alta |
| OpenCTI (correlação) | STIX 2.1 | contínua | ver `22_arquitetura_analytics_downstream_opencti_devsecops.md` |

### 2.2 Modelo de indicador

Normalização para STIX 2.1 na ingestão. Campos mínimos: `type`, `value`, `first_seen`, `last_seen`,
`confidence` (0–100), `source`, `tlp`, `expires_at`, `kill_chain_phase`.

Regras:

- Indicador **expira**. Sem `expires_at`, aplica-se padrão de 90 dias para IP e 365 para hash.
- Confiança < 50 nunca gera bloqueio automático — só enriquece o alerta.
- TLP:RED e TLP:AMBER+STRICT não saem do domínio de segurança e não aparecem em painel de órgão.
- Todo bloqueio derivado de feed registra o indicador e a fonte, permitindo contestação e remoção.

### 2.3 Aplicação

| Ponto | Uso |
|-------|-----|
| WAF | IP reputacional com confiança ≥ 80 → bloqueio; 50–79 → desafio |
| Upload | hash do arquivo contra MalwareBazaar (doc. 18) |
| Egress | domínio de destino de edge function contra feed de C2 |
| SIEM | enriquecimento de todo evento com IP e hash |

Falso positivo: procedimento de allowlist nominal com prazo, dono e revisão em 90 dias.
Allowlist permanente sem revisão é proibida.

## 3. Ingestão em lote segura

Vale para planilhas do Atlas, cargas do SNIS/SNIRH, feeds de threat intel e qualquer arquivo
processado fora do fluxo interativo.

### 3.1 Cadeia

```
Origem ──► verificação de origem (TLS + certificado + assinatura/hash publicado)
       ──► download em área isolada (sem egress adicional, cota de disco)
       ──► inspeção de segurança (doc. 18)
       ──► validação sintática (esquema/dicionário)
       ──► validação semântica (regras de domínio)
       ──► staging (tabela temporária, transação)
       ──► reconciliação e upsert idempotente
       ──► publicação + relatório do lote
```

Cada etapa pode falhar sem efeito parcial: o commit é único, ao final da reconciliação.

### 3.2 Verificação de origem

- HTTPS obrigatório com validação de cadeia; `sslmode=verify-full` para origens de banco.
- Quando a fonte publica hash ou assinatura, a verificação é obrigatória e bloqueante.
- Quando não publica, o lote é marcado `origem_nao_verificada` e a publicação exige aprovação humana.
- Origens permitidas em allowlist de FQDN no egress; nova origem passa por revisão de segurança.

### 3.3 Validação semântica (domínio saneamento)

| Regra | Ação em violação |
|-------|------------------|
| `ibge_code` com 7 dígitos e existente na tabela de municípios | rejeita a linha |
| UF válida e coerente com o IBGE | rejeita a linha |
| Vazão em L/s ou m³/s conforme a coluna, sem mistura | rejeita o lote |
| DBO em mg/L, não negativa, ≤ 5.000 | rejeita a linha |
| Percentuais em 0–100 | rejeita a linha |
| `ano_referencia` entre 2000 e ano corrente + 1 | rejeita a linha |
| Valor financeiro positivo, moeda declarada, ano-base informado | rejeita a linha |
| Variação > 300% em relação ao ano anterior no mesmo município | aceita e marca para revisão |

Limiar de aborto: mais de 5% de linhas rejeitadas cancela o lote inteiro — planilha com muitos
erros indica versão de layout diferente, não erro pontual.

### 3.4 Idempotência e reconciliação

- Chave natural obrigatória por dataset (`external_key`), formada por fonte + IBGE + ano + item.
- `INSERT ... ON CONFLICT (external_key) DO UPDATE` apenas quando o `row_hash` mudar.
- Reimportar o mesmo arquivo produz zero alteração e é registrado como no-op.
- Registro do lote em `atlas_import_batches` com linhas lidas, gravadas, ignoradas e o array de erros.
- Rollback lógico: cada linha guarda o `import_batch_id`, permitindo reverter um lote específico.

### 3.5 Isolamento de execução

O worker de ingestão roda com: sem root, FS somente leitura exceto `tmpfs`, sem `service_role`
persistido em disco, egress limitado à origem declarada, limite de CPU/memória e timeout global.
Parser de XML/planilha sempre com entidades externas e DTD desabilitados.

### 3.6 Auditoria do lote

Registrar em `audit_log`: quem disparou, origem, hash do arquivo, versão do dicionário,
contagens, duração, decisão (publicado, rejeitado, pendente de aprovação) e o motivo.
O arquivo original é preservado em storage por 24 meses para reprodutibilidade.

## 4. Privacidade

- GeoIP e IP são dados pessoais: finalidade declarada (segurança), retenção limitada,
  acesso restrito ao time de segurança, e nunca usados para avaliar pessoas ou órgãos.
- Dado do Atlas e do SNIS é público agregado — não requer o mesmo tratamento, mas mantém
  rastreabilidade de fonte e ano.
- Nenhum indicador de threat intel com atribuição a pessoa física é ingerido.

## 5. Checklist

- [ ] Base GeoIP local com atualização semanal e sidecar sem chamada externa em runtime
- [ ] IP truncado no log operacional; IP completo só na trilha de segurança
- [ ] Detecções da seção 1.3 no SIEM, com caminho de exceção
- [ ] Feeds normalizados em STIX 2.1 com expiração e confiança
- [ ] Bloqueio automático apenas com confiança ≥ 80
- [ ] Allowlist de falso positivo com dono e prazo
- [ ] Verificação de origem obrigatória com hash/assinatura quando disponível
- [ ] Validações sintática e semântica com limiar de aborto de 5%
- [ ] Upsert idempotente por `external_key` e rollback por `import_batch_id`
- [ ] Worker de ingestão isolado e sem egress livre
