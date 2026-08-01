import { supabase } from "@/integrations/supabase/client";

export function parseCortexError(msg?: string | null): string {
  if (!msg) return "Erro desconhecido.";
  const m = msg.match(/FALSO_AFLUENTE:\s*(.+)/i);
  if (m) return `Regra do Falso Afluente — ${m[1].trim()}`;
  if (/rate_limit|429/i.test(msg)) return "Limite de requisições do gateway de IA atingido. Tente novamente em instantes.";
  if (/no_credits|402/i.test(msg)) return "Créditos de IA esgotados. Adicione créditos no workspace.";
  if (/no_model/i.test(msg)) return "Nenhum modelo Córtex configurado. Cadastre um em Administração → Modelos Córtex IA.";
  if (/unauth|401/i.test(msg)) return "Sessão expirada — faça login novamente.";
  return msg;
}

export type InferenceScope =
  | { kind: "all"; limit?: number }
  | { kind: "concessionaria"; concessionariaId: string; limit?: number }
  | { kind: "agencia"; concessionariaIds: string[]; limit?: number };

export type CortexRunResponse = {
  run_id?: string;
  modelo?: { id: string; nome: string; status: string; tipo: string; provider_model: string };
  predicoes?: unknown[];
  erros?: { ete_id: string; error: string }[];
  duracao_ms?: number;
  bacias?: string[];
  fontes?: { nome: string; tipo: string; papel: string; tipo_fonte?: string; ativo?: boolean }[];
  mcp?: { server_url: string | null; declared: string[]; discovered: string[]; used: string[] } | null;
  mcp_tools?: string[];
  cancelado?: boolean;
  error?: string;
  code?: string;
};

/**
 * Executa o cortex-infer via fetch direto para permitir cancelamento (AbortSignal),
 * já que supabase.functions.invoke não expõe o sinal de abortar.
 */
export async function runCortexInference(
  scope: InferenceScope,
  horizonte = 30,
  opts: { signal?: AbortSignal; runId?: string } = {},
) {
  let etesQ = supabase.from("etes").select("id").eq("status", "ativa");
  if (scope.kind === "concessionaria") etesQ = etesQ.eq("concessionaria_id", scope.concessionariaId);
  else if (scope.kind === "agencia") {
    if (!scope.concessionariaIds.length) return { count: 0, ete_ids: [], data: null, error: null };
    etesQ = etesQ.in("concessionaria_id", scope.concessionariaIds);
  }
  etesQ = etesQ.limit(scope.limit ?? 15);

  const { data: etes, error: eErr } = await etesQ;
  if (eErr) return { count: 0, ete_ids: [], data: null, error: eErr };
  const ete_ids = (etes ?? []).map((e) => e.id);
  if (!ete_ids.length) return { count: 0, ete_ids, data: null, error: null };

  const { data: sessionRes } = await supabase.auth.getSession();
  const token = sessionRes.session?.access_token;
  if (!token) {
    return { count: ete_ids.length, ete_ids, data: null, error: { message: "unauth" } };
  }

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cortex-infer`;
  try {
    const resp = await fetch(url, {
      method: "POST",
      signal: opts.signal,
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ete_ids, horizonte_dias: horizonte, run_id: opts.runId }),
    });
    const data = (await resp.json().catch(() => null)) as CortexRunResponse | null;
    if (!resp.ok) {
      return {
        count: ete_ids.length,
        ete_ids,
        data,
        error: { message: data?.error ?? `HTTP ${resp.status}` },
      };
    }
    return { count: ete_ids.length, ete_ids, data, error: null };
  } catch (e) {
    const err = e as Error;
    if (err.name === "AbortError") {
      return { count: ete_ids.length, ete_ids, data: null, error: null, aborted: true as const };
    }
    return { count: ete_ids.length, ete_ids, data: null, error: { message: err.message } };
  }
}
