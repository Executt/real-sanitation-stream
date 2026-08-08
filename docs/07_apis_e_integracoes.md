# APIs e Integrações — HydrosNet

## Edge Functions (Deno)

| Função | Auth | Entrada | Efeito |
|--------|------|---------|--------|
| `seed-admin` | service_role | — | Cria/atualiza o superadmin inicial |
| `ldap-sync` | service_role (job `pg_cron`) | — | Lê `ldap_config`, consulta o diretório e sincroniza `profiles` + `user_roles` |
| `smtp-send` | JWT | `{ to, subject, html }` | Envia e-mail usando `smtp_config` |
| `sei-create-process` | JWT | `{ tipo, interessado, documentos }` | Abre processo no SEI usando `sei_config` |
| `invite-user` | JWT (superadmin) | `{ email, role, org_id }` | Convida usuário e vincula papel/organização |
| `cortex-ingest-atlas` | JWT / job | `{ modo: "seed" \| "payload", registros[] }` | Upsert incremental em `atlas_indicadores` |
| `cortex-infer` | JWT / job (`cortex-infer-daily`) | `{ escopo, ete_id?, concessionaria_id?, agencia_id?, bacia?, modelo_id? }` | Inferência via Lovable AI Gateway, resolve fontes vinculadas e ferramentas MCP, grava em `cortex_predicoes` |

Chamada padrão no frontend:

```ts
const { data, error } = await supabase.functions.invoke("cortex-infer", { body });
```

Falhas retornam "non-2xx"; o detalhe deve ser lido em `error.context.text()` (padrão já usado em `useCortexRun`).

## PostgREST (Data API)

- Cliente único: `import { supabase } from "@/integrations/supabase/client"` (arquivo autogerado, não editar).
- Toda leitura/escrita passa por RLS — não existe endpoint anônimo: `anon` não possui GRANT em `public`.
- Padrões de consulta usados: `select` com embed de FK (`etes(nome, municipio)`), `range()` para paginação,
  `ilike` para busca textual, `order` para ordenação server-side (`useTable`).
- Contagem: `{ count: "exact", head: true }` para paginação sem trafegar linhas.

## Realtime

| Canal | Tabela | Consumidor |
|-------|--------|-----------|
| medições | `dbo_medicoes` | `AlertasDboPanel`, `ConformidadeCard` |
| probes | `api_probe_log` | `ApiMonitoring` |
| predições | `cortex_predicoes` | `CortexPage`, `CortexTab`, `CortexRunStatus` |

## Integrações externas

| Integração | Direção | Config | Observação |
|-----------|---------|--------|-----------|
| Atlas Esgotos / Atlas Águas (ANA) | entrada | `cortex-ingest-atlas`, `AtlasImport` | Planilhas XLSX validadas por `atlasDictionary.ts` |
| SNIRH | entrada | aba Integrações nos detalhes | Status de disponibilidade por prestador |
| LDAP / Active Directory | entrada | `ldap_config` | Ver `docs/LDAP.md` |
| SMTP | saída | `smtp_config` | E-mail transacional e convites |
| SEI | saída | `sei_config` | Abertura de processo administrativo |
| Lovable AI Gateway | saída | `LOVABLE_API_KEY` | Modelo `google/gemini-3-flash-preview` no Córtex |
| Servidores MCP | saída | `cortex_modelos` (tipo MCP) | `tools/list` e chamadas registradas na execução |
| Repositórios de artefatos / bases externas | entrada | `repositorios_artefatos`, `bases_dados_externas` | Resolvidos por `secret_ref` em runtime |

## Monitoramento de integrações

`ApiMonitoring` executa probes a cada 30 s e persiste cada checagem em `api_probe_log`
(disponibilidade, latência p50/p95, último status por endpoint). `IntegrationLog` lê `audit_log`
com filtro por severidade e busca textual.

## Segredos

Nenhuma credencial de terceiro fica no banco ou no código. As tabelas de fonte guardam apenas `secret_ref`;
o valor vive no cofre de segredos do backend e só é lido dentro de Edge Functions via `Deno.env.get()`.
`SUPABASE_SERVICE_ROLE_KEY` é exclusivo do runtime das functions e nunca é exposto ao navegador.

Segredos em uso: `LOVABLE_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
além dos `secret_ref` cadastrados por repositório/base.
