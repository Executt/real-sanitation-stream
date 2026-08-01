import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle2, Clock, Loader2, Ban, XCircle } from "lucide-react";
import type { RunState, RunResult } from "@/hooks/useCortexRun";

const CONFIG: Record<RunState, { label: string; className: string; Icon: typeof Clock }> = {
  idle: { label: "Pronto", className: "bg-muted text-muted-foreground", Icon: Clock },
  queued: { label: "Enfileirado", className: "bg-warning text-warning-foreground", Icon: Clock },
  running: { label: "Em execução", className: "bg-primary text-primary-foreground", Icon: Loader2 },
  done: { label: "Concluído", className: "bg-success text-success-foreground", Icon: CheckCircle2 },
  cancelado: { label: "Cancelado", className: "bg-muted text-foreground border", Icon: XCircle },
  error: { label: "Erro", className: "bg-destructive text-destructive-foreground", Icon: AlertTriangle },
};

interface Props {
  state: RunState;
  progress: number;
  info: string | null;
  error: string | null;
  compact?: boolean;
  runId?: string | null;
  result?: RunResult | null;
  onCancel?: () => void;
}

export function CortexRunStatus({ state, progress, info, error, compact, runId, result, onCancel }: Props) {
  if (state === "idle") return null;
  const { label, className, Icon } = CONFIG[state];
  const spinning = state === "running" || state === "queued";
  const mcpUsed = result?.mcp?.used ?? result?.mcpTools ?? [];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={`${className} text-[10px] uppercase font-mono inline-flex items-center gap-1`}>
          <Icon className={`size-3 ${spinning ? "animate-spin" : ""}`} />
          {label}
        </Badge>
        {info && !compact && <span className="text-[11px] font-mono text-muted-foreground">{info}</span>}
        {error && <span className="text-[11px] font-mono text-destructive">{error}</span>}
        {spinning && onCancel && (
          <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={onCancel}>
            <Ban className="size-3 mr-1" />
            Cancelar
          </Button>
        )}
        {runId && (
          <span className="text-[10px] font-mono text-muted-foreground" title="Identificador da execução">
            run {runId.slice(0, 8)}
          </span>
        )}
      </div>
      {(state === "running" || state === "queued" || state === "done") && (
        <Progress value={progress} className="h-1.5" />
      )}
      {info && compact && <p className="text-[11px] font-mono text-muted-foreground">{info}</p>}

      {result && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {result.modelo && (
            <Badge variant="outline" className="text-[10px] font-mono">
              modelo: {result.modelo.nome} · {result.modelo.tipo}/{result.modelo.status}
            </Badge>
          )}
          {(result.bacias ?? []).map((b) => (
            <Badge key={b} variant="secondary" className="text-[10px] font-mono">bacia: {b}</Badge>
          ))}
          {(result.fontes ?? []).map((f, i) => (
            <Badge key={`${f.nome}-${i}`} variant="outline" className="text-[10px] font-mono">
              fonte: {f.nome} ({f.tipo}/{f.papel})
            </Badge>
          ))}
          {mcpUsed.length > 0 ? (
            mcpUsed.map((t) => (
              <Badge key={t} className="bg-primary/10 text-primary text-[10px] font-mono">MCP: {t}</Badge>
            ))
          ) : result.mcp ? (
            <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
              MCP: nenhuma ferramenta utilizada
            </Badge>
          ) : null}
          {result.erros.length > 0 && (
            <Badge className="bg-destructive text-destructive-foreground text-[10px] font-mono">
              {result.erros.length} erro(s): {result.erros[0].error.slice(0, 80)}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
