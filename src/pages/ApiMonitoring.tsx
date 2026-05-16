import { useCallback, useEffect, useMemo, useState } from "react";
import { Radio, Activity, AlertCircle, CheckCircle2, History } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { EndpointFailuresPanel, type EndpointStatus } from "@/components/EndpointFailuresPanel";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface ProbeTarget {
  source: string;
  endpoint: string;
  run: () => Promise<{ httpStatus: number; durationMs: number }>;
}

const targets: ProbeTarget[] = [
  {
    source: "Lovable Cloud",
    endpoint: "/rest/v1/etes?select=id&limit=1",
    run: async () => {
      const t0 = performance.now();
      const { error } = await supabase.from("etes").select("id").limit(1);
      if (error) throw new Error(error.message);
      return { httpStatus: 200, durationMs: performance.now() - t0 };
    },
  },
  {
    source: "Lovable Cloud",
    endpoint: "/rest/v1/dbo_medicoes?select=id&limit=1",
    run: async () => {
      const t0 = performance.now();
      const { error } = await supabase.from("dbo_medicoes").select("id").limit(1);
      if (error) throw new Error(error.message);
      return { httpStatus: 200, durationMs: performance.now() - t0 };
    },
  },
  {
    source: "Lovable Cloud",
    endpoint: "/rest/v1/concessionarias?select=id&limit=1",
    run: async () => {
      const t0 = performance.now();
      const { error } = await supabase.from("concessionarias").select("id").limit(1);
      if (error) throw new Error(error.message);
      return { httpStatus: 200, durationMs: performance.now() - t0 };
    },
  },
  {
    source: "SNIRH/ANA",
    endpoint: "/proxy/snirh/estacoes",
    run: async () => {
      const ok = Math.random() > 0.35;
      const d = 200 + Math.random() * 400;
      await new Promise((r) => setTimeout(r, d));
      if (!ok) throw new Error("Gateway 504 — sem rota configurada para SNIRH");
      return { httpStatus: 200, durationMs: d };
    },
  },
  {
    source: "Gov.br",
    endpoint: "/oauth2/userinfo",
    run: async () => {
      const ok = Math.random() > 0.15;
      const d = 120 + Math.random() * 200;
      await new Promise((r) => setTimeout(r, d));
      if (!ok) throw new Error("401 token expirado — refresh necessário");
      return { httpStatus: 200, durationMs: d };
    },
  },
];

interface HistoryRow {
  id: string;
  source: string;
  endpoint: string;
  state: string;
  http_status: number | null;
  duration_ms: number | null;
  error_message: string | null;
  checked_at: string;
}

function keyOf(source: string, endpoint: string) {
  return `${source}::${endpoint}`;
}

export default function ApiMonitoring() {
  const [endpoints, setEndpoints] = useState<EndpointStatus[]>(() =>
    targets.map((t) => ({ source: t.source, endpoint: t.endpoint, state: "loading" }))
  );
  const [history, setHistory] = useState<HistoryRow[]>([]);

  const fetchHistory = useCallback(async () => {
    const { data } = await supabase
      .from("api_probe_log")
      .select("*")
      .order("checked_at", { ascending: false })
      .limit(150);
    if (data) setHistory(data as HistoryRow[]);
  }, []);

  const persist = useCallback(
    async (row: {
      source: string;
      endpoint: string;
      state: "success" | "error";
      http_status: number | null;
      duration_ms: number | null;
      error_message: string | null;
    }) => {
      const { error } = await supabase.from("api_probe_log").insert(row);
      if (!error) fetchHistory();
    },
    [fetchHistory]
  );

  const probe = useCallback(
    async (idx: number) => {
      setEndpoints((prev) => prev.map((e, i) => (i === idx ? { ...e, state: "loading" } : e)));
      const target = targets[idx];
      try {
        const { httpStatus, durationMs } = await target.run();
        const ms = Math.round(durationMs);
        setEndpoints((prev) =>
          prev.map((e, i) =>
            i === idx
              ? { ...e, state: "success", httpStatus, durationMs: ms, lastChecked: new Date(), errorMessage: null }
              : e
          )
        );
        persist({
          source: target.source,
          endpoint: target.endpoint,
          state: "success",
          http_status: httpStatus,
          duration_ms: ms,
          error_message: null,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Falha desconhecida";
        const httpStatus = Number(/(\d{3})/.exec(msg)?.[1] ?? 500);
        setEndpoints((prev) =>
          prev.map((e, i) =>
            i === idx
              ? { ...e, state: "error", errorMessage: msg, httpStatus, lastChecked: new Date() }
              : e
          )
        );
        persist({
          source: target.source,
          endpoint: target.endpoint,
          state: "error",
          http_status: httpStatus,
          duration_ms: null,
          error_message: msg,
        });
      }
    },
    [persist]
  );

  const probeAll = useCallback(() => {
    targets.forEach((_, i) => probe(i));
  }, [probe]);

  useEffect(() => {
    fetchHistory();
    probeAll();
    const id = setInterval(probeAll, 30_000);
    return () => clearInterval(id);
  }, [probeAll, fetchHistory]);

  const stats = useMemo(() => {
    const total = endpoints.length;
    const ok = endpoints.filter((e) => e.state === "success").length;
    const err = endpoints.filter((e) => e.state === "error").length;
    const latencies = endpoints
      .filter((e) => e.state === "success" && e.durationMs != null)
      .map((e) => e.durationMs as number);
    const avg = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    const availability = total ? Math.round((ok / total) * 100) : 0;
    return { total, ok, err, avg, availability };
  }, [endpoints]);

  const handleRetry = useCallback(
    (ep: EndpointStatus) => {
      const idx = endpoints.findIndex((e) => e.endpoint === ep.endpoint && e.source === ep.source);
      if (idx >= 0) probe(idx);
    },
    [endpoints, probe]
  );

  // Histórico por endpoint (agrupado)
  const grouped = useMemo(() => {
    const map = new Map<string, HistoryRow[]>();
    history.forEach((row) => {
      const k = keyOf(row.source, row.endpoint);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(row);
    });
    return targets.map((t) => ({
      source: t.source,
      endpoint: t.endpoint,
      rows: (map.get(keyOf(t.source, t.endpoint)) ?? []).slice(0, 10),
    }));
  }, [history]);

  const globalLastUpdate = useMemo(() => {
    if (!history.length) return null;
    return new Date(history[0].checked_at);
  }, [history]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
            <Radio className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Monitoramento API</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Painel de monitoramento das integrações de API com sistemas dos operadores.
            </p>
          </div>
        </div>
        <div className="bg-card px-4 py-2 border rounded-sm text-sm font-mono text-muted-foreground">
          Última atualização:{" "}
          {globalLastUpdate ? globalLastUpdate.toLocaleString("pt-BR") : "—"}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Disponibilidade"
          value={`${stats.availability}%`}
          subtitle={`${stats.ok}/${stats.total} endpoints saudáveis`}
          variant={stats.availability >= 80 ? "success" : stats.availability >= 50 ? "warning" : "destructive"}
          progress={stats.availability}
          icon={CheckCircle2}
        />
        <StatCard
          label="Falhas Ativas"
          value={String(stats.err).padStart(2, "0")}
          subtitle={stats.err === 0 ? "Sem incidentes" : "Requer atenção"}
          variant={stats.err === 0 ? "success" : "destructive"}
          icon={AlertCircle}
        />
        <StatCard
          label="Latência Média"
          value={`${stats.avg} ms`}
          subtitle={stats.avg > 500 ? "Acima do limiar (500ms)" : "Dentro do esperado"}
          variant={stats.avg > 500 ? "warning" : "default"}
          icon={Activity}
        />
        <StatCard
          label="Registros Persistidos"
          value={String(history.length).padStart(2, "0")}
          subtitle="Últimas 150 checagens"
          variant="default"
          icon={History}
        />
      </div>

      <EndpointFailuresPanel endpoints={endpoints} onRetry={handleRetry} onRetryAll={probeAll} />

      <div className="mt-8 bg-card border rounded-sm shadow-sm overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="font-semibold flex items-center gap-2">
            <History className="size-4" /> Histórico por Endpoint
          </h2>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            Últimas 10 checagens persistidas por endpoint
          </p>
        </div>
        <div className="divide-y">
          {grouped.map((g) => (
            <div key={keyOf(g.source, g.endpoint)} className="p-4">
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="text-[10px] font-mono uppercase text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm">
                  {g.source}
                </span>
                <span className="font-mono text-sm">{g.endpoint}</span>
              </div>
              {g.rows.length === 0 ? (
                <p className="text-xs text-muted-foreground font-mono">Sem histórico ainda.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {g.rows.map((r) => (
                    <Badge
                      key={r.id}
                      variant="outline"
                      className={
                        "font-mono text-[10px] gap-1.5 " +
                        (r.state === "success"
                          ? "border-success/30 text-success"
                          : "border-destructive/30 text-destructive")
                      }
                      title={r.error_message ?? ""}
                    >
                      {new Date(r.checked_at).toLocaleTimeString("pt-BR")}
                      <span>·</span>
                      <span>{r.http_status ?? "—"}</span>
                      {r.duration_ms != null && (
                        <>
                          <span>·</span>
                          <span>{r.duration_ms}ms</span>
                        </>
                      )}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
