import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface EndpointStatus {
  /** Identificador curto do endpoint, ex.: "SNIRH /estacoes" */
  endpoint: string;
  /** Origem lógica (ex.: ANA, SNIRH, Lovable Cloud) */
  source: string;
  /** Estado da consulta */
  state: "loading" | "success" | "error";
  /** Status HTTP retornado (quando aplicável) */
  httpStatus?: number | null;
  /** Mensagem de erro original */
  errorMessage?: string | null;
  /** Tempo de execução em ms */
  durationMs?: number | null;
  /** Última atualização */
  lastChecked?: Date | null;
}

interface EndpointFailuresPanelProps {
  endpoints: EndpointStatus[];
}

function statusBadge(state: EndpointStatus["state"], httpStatus?: number | null) {
  if (state === "loading") {
    return (
      <Badge variant="outline" className="border-warning/30 text-warning gap-1">
        <Loader2 className="size-3 animate-spin" /> Consultando
      </Badge>
    );
  }
  if (state === "success") {
    return (
      <Badge variant="outline" className="border-success/30 text-success gap-1">
        <CheckCircle2 className="size-3" /> {httpStatus ?? 200} OK
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-destructive/30 text-destructive gap-1">
      <AlertCircle className="size-3" /> {httpStatus ?? "ERR"}
    </Badge>
  );
}

export function EndpointFailuresPanel({ endpoints }: EndpointFailuresPanelProps) {
  const failures = endpoints.filter((e) => e.state === "error");
  const total = endpoints.length;

  return (
    <div className="bg-card border rounded-sm shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b">
        <div>
          <h2 className="font-semibold">Falhas de Consulta por Endpoint</h2>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            {failures.length} falha(s) de {total} endpoint(s) monitorado(s)
          </p>
        </div>
        <Badge
          variant="outline"
          className={
            failures.length === 0
              ? "border-success/30 text-success"
              : "border-destructive/30 text-destructive"
          }
        >
          {failures.length === 0 ? "Saudável" : "Atenção requerida"}
        </Badge>
      </div>

      <div className="divide-y">
        {endpoints.map((ep) => (
          <div key={`${ep.source}-${ep.endpoint}`} className="p-4 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono uppercase text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm">
                  {ep.source}
                </span>
                <p className="font-mono text-sm truncate">{ep.endpoint}</p>
              </div>
              {ep.state === "error" && ep.errorMessage && (
                <p className="mt-1.5 text-xs text-destructive font-mono break-words">
                  {ep.errorMessage}
                </p>
              )}
              {ep.state === "success" && (
                <p className="mt-1.5 text-xs text-muted-foreground font-mono">
                  Resposta em {ep.durationMs ? `${Math.round(ep.durationMs)} ms` : "—"}
                  {ep.lastChecked && ` · ${ep.lastChecked.toLocaleTimeString("pt-BR")}`}
                </p>
              )}
              {ep.state === "loading" && (
                <p className="mt-1.5 text-xs text-muted-foreground font-mono">Aguardando resposta…</p>
              )}
            </div>
            <div className="shrink-0">{statusBadge(ep.state, ep.httpStatus)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
