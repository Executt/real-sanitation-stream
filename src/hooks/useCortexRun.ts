import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { parseCortexError, runCortexInference, type InferenceScope } from "@/lib/cortex";

export type RunState = "idle" | "queued" | "running" | "done" | "error";

export type RunResult = {
  predicoesGeradas: number;
  erros: { ete_id: string; error: string }[];
  duracaoMs: number | null;
  modelo?: { nome: string; status: string; tipo: string } | null;
  fontes?: { nome: string; tipo: string; papel: string }[] | null;
  mcpTools?: string[] | null;
};

const STATE_LABEL: Record<RunState, string> = {
  idle: "Pronto",
  queued: "Enfileirado",
  running: "Em execução",
  done: "Concluído",
  error: "Erro",
};

/**
 * Encapsula o ciclo de execução do cortex-infer:
 * enfileirado → em execução (com progresso via Realtime) → concluído / erro.
 * Compartilhado por CortexTab, OperadorDashboard e CortexPage.
 */
export function useCortexRun(channelKey = "global") {
  const [state, setState] = useState<RunState>("idle");
  const [progress, setProgress] = useState(0);
  const [info, setInfo] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const expectedRef = useRef<number>(0);
  const doneRef = useRef<number>(0);

  useEffect(() => {
    const ch = supabase
      .channel(`cortex_run_${channelKey}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "cortex_predicoes" },
        () => {
          if (state !== "running") return;
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
  }, [channelKey, state]);

  const reset = useCallback(() => {
    setState("idle");
    setProgress(0);
    setInfo(null);
    setResult(null);
    setError(null);
    expectedRef.current = 0;
    doneRef.current = 0;
  }, []);

  const run = useCallback(
    async (scope: InferenceScope, horizonte = 30) => {
      setState("queued");
      setError(null);
      setResult(null);
      setProgress(3);
      setInfo("Selecionando ETEs elegíveis…");
      doneRef.current = 0;
      expectedRef.current = 0;

      const res = await runCortexInference(scope, horizonte);

      if (res.error) {
        const msg = parseCortexError(res.error.message);
        setState("error");
        setError(msg);
        setProgress(0);
        setInfo(null);
        toast({ title: "Falha no Córtex", description: msg, variant: "destructive" });
        return { ok: false as const, error: msg };
      }
      if (!res.count) {
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
        predicoes?: unknown[];
        erros?: { ete_id: string; error: string }[];
        duracao_ms?: number;
        modelo?: { nome: string; status: string; tipo: string };
        fontes?: { nome: string; tipo: string; papel: string }[];
        mcp_tools?: string[];
      } | null;

      const predCount = data?.predicoes?.length ?? 0;
      const errs = data?.erros ?? [];

      if (predCount === 0 && errs.length) {
        const first = errs[0]?.error ?? "Falha desconhecida";
        setState("error");
        setError(first);
        setProgress(0);
        setInfo(null);
        toast({ title: "Inferência falhou", description: first, variant: "destructive" });
        return { ok: false as const, error: first };
      }

      const runResult: RunResult = {
        predicoesGeradas: predCount,
        erros: errs,
        duracaoMs: data?.duracao_ms ?? null,
        modelo: data?.modelo ?? null,
        fontes: data?.fontes ?? null,
        mcpTools: data?.mcp_tools ?? null,
      };
      setResult(runResult);
      setState("done");
      setProgress(100);
      setInfo(
        `${predCount} predições geradas${errs.length ? ` · ${errs.length} com erro` : ""}` +
          (data?.duracao_ms ? ` · ${(data.duracao_ms / 1000).toFixed(1)}s` : ""),
      );
      toast({
        title: errs.length ? "Inferência concluída com avisos" : "Inferência concluída",
        description: `${predCount} predições · modelo ${data?.modelo?.nome ?? "?"} (${data?.modelo?.status ?? "?"})`,
      });

      // Reset visual após alguns segundos
      setTimeout(() => {
        setState("idle");
        setProgress(0);
        setInfo(null);
      }, 6000);
      return { ok: true as const, result: runResult };
    },
    [],
  );

  return { state, stateLabel: STATE_LABEL[state], progress, info, result, error, run, reset };
}
