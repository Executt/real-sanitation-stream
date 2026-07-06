import { supabase } from "@/integrations/supabase/client";

export function parseCortexError(msg?: string | null): string {
  if (!msg) return "Erro desconhecido.";
  const m = msg.match(/FALSO_AFLUENTE:\s*(.+)/i);
  if (m) return `Regra do Falso Afluente — ${m[1].trim()}`;
  return msg;
}

export type InferenceScope =
  | { kind: "all"; limit?: number }
  | { kind: "concessionaria"; concessionariaId: string; limit?: number }
  | { kind: "agencia"; concessionariaIds: string[]; limit?: number };

export async function runCortexInference(scope: InferenceScope, horizonte = 30) {
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

  const { data, error } = await supabase.functions.invoke("cortex-infer", {
    body: { ete_ids, horizonte_dias: horizonte },
  });
  return { count: ete_ids.length, ete_ids, data, error };
}
