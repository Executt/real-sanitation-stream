import { useCallback, useEffect, useMemo, useState } from "react";
import { Radio, Activity, AlertCircle, CheckCircle2 } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { EndpointFailuresPanel, type EndpointStatus } from "@/components/EndpointFailuresPanel";
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
      // Sem integração ativa: simula latência/erro intermitente
      const ok = Math.random() > 0.35;
      await new Promise((r) => setTimeout(r, 200 + Math.random() * 400));
      if (!ok) throw new Error("Gateway 504 — sem rota configurada para SNIRH");
      return { httpStatus: 200, durationMs: 200 + Math.random() * 400 };
    },
  },
  {
    source: "Gov.br",
    endpoint: "/oauth2/userinfo",
    run: async () => {
      const ok = Math.random() > 0.15;
      await new Promise((r) => setTimeout(r, 120 + Math.random() * 200));
      if (!ok) throw new Error("401 token expirado — refresh necessário");
      return { httpStatus: 200, durationMs: 120 + Math.random() * 200 };
    },
  },
];

export default function ApiMonitoring() {
  const [endpoints, setEndpoints] = useState<EndpointStatus[]>(() =>
    targets.map((t) => ({ source: t.source, endpoint: t.endpoint, state: "loading" }))
  );

  const probe = useCallback(async (idx: number) => {
    setEndpoints((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, state: "loading" } : e))
    );
    try {
      const { httpStatus, durationMs } = await targets[idx].run();
      setEndpoints((prev) =>
        prev.map((e, i) =>
          i === idx
            ? { ...e, state: "success", httpStatus, durationMs, lastChecked: new Date(), errorMessage: null }
            : e
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha desconhecida";
      const httpStatus = /(\d{3})/.exec(msg)?.[1];
      setEndpoints((prev) =>
        prev.map((e, i) =>
          i === idx
            ? {
                ...e,
                state: "error",
                errorMessage: msg,
                httpStatus: httpStatus ? Number(httpStatus) : 500,
                lastChecked: new Date(),
              }
            : e
        )
      );
    }
  }, []);

  const probeAll = useCallback(() => {
    targets.forEach((_, i) => probe(i));
  }, [probe]);

  useEffect(() => {
    probeAll();
    const id = setInterval(probeAll, 30_000);
    return () => clearInterval(id);
  }, [probeAll]);

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
          Probes a cada 30s
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
          label="Endpoints Monitorados"
          value={String(stats.total).padStart(2, "0")}
          subtitle="Cloud + SNIRH + Gov.br"
          variant="default"
          icon={Radio}
        />
      </div>

      <EndpointFailuresPanel endpoints={endpoints} onRetry={handleRetry} onRetryAll={probeAll} />
    </div>
  );
}
