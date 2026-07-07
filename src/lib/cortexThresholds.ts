export type Threshold = {
  id: string;
  bacia: string | null;
  modelo_id: string | null;
  alto_min: number;
  critico_min: number;
};

export type RiskClass = "critico" | "alto" | "medio" | "baixo" | "indeterminado";

const DEFAULTS = { alto_min: 0.5, critico_min: 0.75 };

/**
 * Resolve o threshold aplicável para a combinação bacia/modelo.
 * Prioridade: (bacia + modelo) > (modelo) > (bacia) > global > default.
 */
export function resolveThreshold(
  thresholds: Threshold[],
  bacia: string | null | undefined,
  modeloId: string | null | undefined,
): { alto_min: number; critico_min: number } {
  const b = (bacia ?? "").trim().toLowerCase();
  const candidates: Threshold[] = [];
  for (const t of thresholds) {
    const tb = (t.bacia ?? "").trim().toLowerCase();
    const matchB = !t.bacia || tb === b;
    const matchM = !t.modelo_id || t.modelo_id === modeloId;
    if (matchB && matchM) candidates.push(t);
  }
  if (!candidates.length) return DEFAULTS;
  // Mais específico ganha (bacia+modelo > modelo > bacia > global)
  candidates.sort((a, b) => {
    const sa = (a.bacia ? 2 : 0) + (a.modelo_id ? 1 : 0);
    const sb = (b.bacia ? 2 : 0) + (b.modelo_id ? 1 : 0);
    return sb - sa;
  });
  const t = candidates[0];
  return { alto_min: Number(t.alto_min), critico_min: Number(t.critico_min) };
}

/**
 * Reclassifica uma predição com base nos thresholds configurados.
 * Preserva 'indeterminado' vindo do modelo (baixa maturidade / sem features).
 */
export function classifyByThreshold(
  valor: number | null | undefined,
  original: string | null | undefined,
  th: { alto_min: number; critico_min: number },
): RiskClass {
  if (original === "indeterminado") return "indeterminado";
  const v = Number(valor);
  if (!Number.isFinite(v)) return (original as RiskClass) ?? "indeterminado";
  if (v >= th.critico_min) return "critico";
  if (v >= th.alto_min) return "alto";
  if (v >= th.alto_min / 2) return "medio";
  return "baixo";
}
