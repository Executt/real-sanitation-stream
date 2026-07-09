import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import type { RunState } from "@/hooks/useCortexRun";

const CONFIG: Record<RunState, { label: string; className: string; Icon: typeof Clock }> = {
  idle: { label: "Pronto", className: "bg-muted text-muted-foreground", Icon: Clock },
  queued: { label: "Enfileirado", className: "bg-warning text-warning-foreground", Icon: Clock },
  running: { label: "Em execução", className: "bg-primary text-primary-foreground", Icon: Loader2 },
  done: { label: "Concluído", className: "bg-success text-success-foreground", Icon: CheckCircle2 },
  error: { label: "Erro", className: "bg-destructive text-destructive-foreground", Icon: AlertTriangle },
};

interface Props {
  state: RunState;
  progress: number;
  info: string | null;
  error: string | null;
  compact?: boolean;
}

export function CortexRunStatus({ state, progress, info, error, compact }: Props) {
  if (state === "idle") return null;
  const { label, className, Icon } = CONFIG[state];
  const spinning = state === "running" || state === "queued";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={`${className} text-[10px] uppercase font-mono inline-flex items-center gap-1`}>
          <Icon className={`size-3 ${spinning ? "animate-spin" : ""}`} />
          {label}
        </Badge>
        {info && !compact && <span className="text-[11px] font-mono text-muted-foreground">{info}</span>}
        {error && <span className="text-[11px] font-mono text-destructive">{error}</span>}
      </div>
      {(state === "running" || state === "queued" || state === "done") && (
        <Progress value={progress} className="h-1.5" />
      )}
      {info && compact && <p className="text-[11px] font-mono text-muted-foreground">{info}</p>}
    </div>
  );
}
