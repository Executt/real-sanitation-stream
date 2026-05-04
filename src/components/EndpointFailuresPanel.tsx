import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  onRetry?: (endpoint: EndpointStatus) => void;
  onRetryAll?: () => void;
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

export function EndpointFailuresPanel({ endpoints, onRetry, onRetryAll }: EndpointFailuresPanelProps) {
  const failures = endpoints.filter((e) => e.state === "error");
  const total = endpoints.length;
  const hasFailures = failures.length > 0;
  const anyLoading = endpoints.some((e) => e.state === "loading");

  return (
    <div className="bg-card border rounded-sm shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold">Falhas de Consulta por Endpoint</h2>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            {failures.length} falha(s) de {total} endpoint(s) monitorado(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasFailures && onRetryAll && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetryAll}
              disabled={anyLoading}
              className="gap-1.5 h-8"
            >
              {anyLoading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              {anyLoading ? "Checando…" : "Re-tentar falhas"}
            </Button>
          )}
          <Badge
            variant="outline"
            className={
              !hasFailures
                ? "border-success/30 text-success"
                : "border-destructive/30 text-destructive"
            }
          >
            {!hasFailures ? "Saudável" : "Atenção requerida"}
          </Badge>
        </div>
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
            <div className="shrink-0 flex items-center gap-2">
              {statusBadge(ep.state, ep.httpStatus)}
              {ep.state === "loading" && (
                <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin" /> checando…
                </span>
              )}
              {(ep.state === "error" || ep.state === "loading") && onRetry && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRetry(ep)}
                  disabled={ep.state === "loading"}
                  className="gap-1.5 h-8 text-xs"
                  aria-label={`Re-tentar ${ep.endpoint}`}
                >
                  <RefreshCw className="size-3.5" />
                  Re-tentar
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
