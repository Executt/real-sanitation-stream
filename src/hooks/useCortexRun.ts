import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { parseCortexError, runCortexInference, type InferenceScope } from "@/lib/cortex";

export type RunState = "idle" | "queued" | "running" | "done" | "cancelado" | "error";

export type RunResult = {
  runId: string | null;
  predicoesGeradas: number;
  erros: { ete_id: string; error: string }[];
  duracaoMs: number | null;
  modelo?: { nome: string; status: string; tipo: string } | null;
  fontes?: { nome: string; tipo: string; papel: string }[] | null;
  bacias?: string[] | null;
  mcp?: { server_url: string | null; declared: string[]; discovered: string[]; used: string[] } | null;
  mcpTools?: string[] | null;
  cancelado?: boolean;
};

const STATE_LABEL: Record<RunState, string> = {
  idle: "Pronto",
  queued: "Enfileirado",
  running: "Em execução",
  done: "Concluído",
  cancelado: "Cancelado",
  error: "Erro",
};

/**
 * Encapsula o ciclo de execução do cortex-infer:
 * enfileirado → em execução (com progresso via Realtime) → concluído / cancelado / erro.
 * Compartilhado por CortexTab, OperadorDashboard e CortexPage.
 */
export function useCortexRun(channelKey = "global") {
  const [state, setState] = useState<RunState>("idle");
  const [progress, setProgress] = useState(0);
  const [info, setInfo] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const expectedRef = useRef<number>(0);
  const doneRef = useRef<number>(0);
  const abortRef = useRef<AbortController | null>(null);
  const stateRef = useRef<RunState>("idle");
  stateRef.current = state;

  useEffect(() => {
    const ch = supabase
      .channel(`cortex_run_${channelKey}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "cortex_predicoes" },
        () => {
          if (stateRef.current !== "running") return;
          doneRef.current += 1;
          if (expectedRef.current > 0) {
            const pct = Math.min(95, Math.round((doneRef.current / expectedRef.current) * 90) + 5);
            setProgress(pct);
            setInfo(`Processadas ${doneRef.current}/${expectedRef.current} ETEs…`);
          } else {
            setProgress((p) => Math.min(90, p + 8));
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [channelKey]);

  const reset = useCallback(() => {
    setState("idle");
    setProgress(0);
    setInfo(null);
    setResult(null);
    setError(null);
    setRunId(null);
    expectedRef.current = 0;
    doneRef.current = 0;
  }, []);

  const cancel = useCallback(() => {
    if (!abortRef.current) return;
    abortRef.current.abort();
    abortRef.current = null;
  }, []);

  const run = useCallback(
    async (scope: InferenceScope, horizonte = 30) => {
      const id = crypto.randomUUID();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setRunId(id);
      setState("queued");
      setError(null);
      setResult(null);
      setProgress(3);
      setInfo("Selecionando ETEs elegíveis…");
      doneRef.current = 0;
      expectedRef.current = 0;

      const res = await runCortexInference(scope, horizonte, { signal: ctrl.signal, runId: id });

      if ((res as { aborted?: boolean }).aborted) {
        abortRef.current = null;
        setState("cancelado");
        setProgress(0);
        setInfo(`Execução cancelada — ${doneRef.current} predições já gravadas foram mantidas.`);
        toast({ title: "Inferência cancelada", description: "A execução foi interrompida pelo usuário." });
        return { ok: false as const, error: "cancelado" };
      }

      if (res.error) {
        abortRef.current = null;
        const msg = parseCortexError(res.error.message);
        setState("error");
        setError(msg);
        setProgress(0);
        setInfo(null);
        toast({ title: "Falha no Córtex", description: msg, variant: "destructive" });
        return { ok: false as const, error: msg };
      }
      if (!res.count) {
        abortRef.current = null;
        setState("error");
        setError("Nenhuma ETE ativa neste escopo.");
        setProgress(0);
        setInfo(null);
        toast({ title: "Sem ETEs elegíveis", description: "Nenhuma ETE ativa neste escopo." });
        return { ok: false as const, error: "sem_etes" };
      }

      expectedRef.current = res.count;
      setState("running");
      setInfo(`Inferindo ${res.count} ETE(s)…`);

      const data = res.data as {
        run_id?: string;
        predicoes?: unknown[];
        erros?: { ete_id: string; error: string }[];
        duracao_ms?: number;
        bacias?: string[];
        cancelado?: boolean;
        modelo?: { nome: string; status: string; tipo: string };
        fontes?: { nome: string; tipo: string; papel: string }[];
        mcp?: { server_url: string | null; declared: string[]; discovered: string[]; used: string[] } | null;
        mcp_tools?: string[];
      } | null;

      abortRef.current = null;
      const predCount = data?.predicoes?.length ?? 0;
      const errs = data?.erros ?? [];

      if (predCount === 0 && errs.length) {
        const first = parseCortexError(errs[0]?.error ?? "Falha desconhecida");
        setState("error");
        setError(first);
        setProgress(0);
        setInfo(null);
        toast({ title: "Inferência falhou", description: first, variant: "destructive" });
        return { ok: false as const, error: first };
      }

      const runResult: RunResult = {
        runId: data?.run_id ?? id,
        predicoesGeradas: predCount,
        erros: errs,
        duracaoMs: data?.duracao_ms ?? null,
        modelo: data?.modelo ?? null,
        fontes: data?.fontes ?? null,
        bacias: data?.bacias ?? null,
        mcp: data?.mcp ?? null,
        mcpTools: data?.mcp_tools ?? null,
        cancelado: data?.cancelado ?? false,
      };
      setResult(runResult);
      setState(runResult.cancelado ? "cancelado" : "done");
      setProgress(100);
      setInfo(
        `${predCount} predições geradas${errs.length ? ` · ${errs.length} com erro` : ""}` +
          (data?.duracao_ms ? ` · ${(data.duracao_ms / 1000).toFixed(1)}s` : ""),
      );
      toast({
        title: errs.length ? "Inferência concluída com avisos" : "Inferência concluída",
        description: `${predCount} predições · modelo ${data?.modelo?.nome ?? "?"} (${data?.modelo?.status ?? "?"})`,
      });

      return { ok: true as const, result: runResult };
    },
    [],
  );

  return { state, stateLabel: STATE_LABEL[state], progress, info, result, error, runId, run, cancel, reset };
}
