import { useEffect, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { StatCardSkeleton } from "@/components/StatCardSkeleton";
import { AlertasDboPanel } from "@/components/AlertasDboPanel";
import { ConformidadeCard } from "@/components/ConformidadeCard";
import { DboTrendChart } from "@/components/DboTrendChart";
import { EteMap } from "@/components/EteMap";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { EndpointFailuresPanel, type EndpointStatus } from "@/components/EndpointFailuresPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDown, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const bacias = [
  { nome: "Bacia do Tietê", etes: 342, cobertura: 78.3, eficiencia: 89.1, trend: "up" as const },
  { nome: "Bacia do São Francisco", etes: 187, cobertura: 52.1, eficiencia: 72.4, trend: "down" as const },
  { nome: "Bacia do Paraná", etes: 456, cobertura: 84.7, eficiencia: 91.3, trend: "up" as const },
  { nome: "Bacia do Amazonas", etes: 89, cobertura: 23.8, eficiencia: 58.9, trend: "down" as const },
  { nome: "Bacia do Paraguai", etes: 124, cobertura: 61.2, eficiencia: 79.6, trend: "up" as const },
  { nome: "Bacia Atlântico Sudeste", etes: 298, cobertura: 71.9, eficiencia: 85.2, trend: "up" as const },
];

interface Stats {
  total: number;
  ativas: number;
  construcao: number;
  inativas: number;
}

export default function CommandCenter() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [endpoints, setEndpoints] = useState<EndpointStatus[]>([
    { endpoint: "etes?select=status (stats)", source: "Lovable Cloud", state: "loading" },
    { endpoint: "GET /api/v1/snirh/estacoes", source: "SNIRH", state: "loading" },
    { endpoint: "GET /metadados/ana/bacias", source: "ANA", state: "loading" },
  ]);

  const checkEtesStats = async () => {
    setEndpoints((prev) =>
      prev.map((ep) =>
        ep.endpoint === "etes?select=status (stats)" ? { ...ep, state: "loading" } : ep,
      ),
    );
    const startedAt = performance.now();
    const { data, error, status } = await supabase.from("etes").select("status");
    const durationMs = performance.now() - startedAt;

    setEndpoints((prev) =>
      prev.map((ep) =>
        ep.endpoint === "etes?select=status (stats)"
          ? {
              ...ep,
              state: error ? "error" : "success",
              httpStatus: status ?? (error ? 500 : 200),
              errorMessage: error?.message ?? null,
              durationMs,
              lastChecked: new Date(),
            }
          : ep,
      ),
    );

    if (!error && data) {
      const ativas = data.filter((e) => e.status === "ativa").length;
      const construcao = data.filter((e) => e.status === "em_construcao").length;
      const inativas = data.filter((e) => e.status === "inativa").length;
      setStats({ total: data.length, ativas, construcao, inativas });
    }
    setLoadingStats(false);
  };

  const checkSnirh = async () => {
    setEndpoints((prev) =>
      prev.map((ep) => (ep.source === "SNIRH" ? { ...ep, state: "loading" } : ep)),
    );
    await new Promise((r) => setTimeout(r, 600));
    setEndpoints((prev) =>
      prev.map((ep) =>
        ep.source === "SNIRH"
          ? {
              ...ep,
              state: "error",
              httpStatus: 503,
              errorMessage: "Integração SNIRH não configurada (Service Unavailable)",
              durationMs: null,
              lastChecked: new Date(),
            }
          : ep,
      ),
    );
  };

  const checkAna = async () => {
    setEndpoints((prev) =>
      prev.map((ep) => (ep.source === "ANA" ? { ...ep, state: "loading" } : ep)),
    );
    await new Promise((r) => setTimeout(r, 600));
    setEndpoints((prev) =>
      prev.map((ep) =>
        ep.source === "ANA"
          ? {
              ...ep,
              state: "error",
              httpStatus: 401,
              errorMessage: "Token de acesso aos metadados ANA ausente (Unauthorized)",
              durationMs: null,
              lastChecked: new Date(),
            }
          : ep,
      ),
    );
  };

  const retryEndpoint = (ep: EndpointStatus) => {
    if (ep.source === "SNIRH") return checkSnirh();
    if (ep.source === "ANA") return checkAna();
    if (ep.endpoint === "etes?select=status (stats)") return checkEtesStats();
  };

  const retryAllFailures = () => {
    endpoints.filter((e) => e.state === "error").forEach(retryEndpoint);
  };

  useEffect(() => {
    checkEtesStats();
    checkSnirh();
    checkAna();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = (n: number) => (stats && stats.total > 0 ? (n / stats.total) * 100 : 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Centro de Comando ANA</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">
            VISÃO NACIONAL | {loadingStats ? "…" : stats?.total ?? 0} ETEs MONITORADAS
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="size-2 rounded-full bg-success animate-pulse" />
          <span className="bg-card px-4 py-2 border rounded-sm text-sm font-mono text-muted-foreground">
            Tempo Real — {new Date().toLocaleTimeString("pt-BR")}
          </span>
        </div>
      </div>

      <ErrorBoundary
        section="KPIs Nacionais"
        title="Indicadores indisponíveis"
        description="Não foi possível renderizar os cartões de KPIs. As demais seções continuam disponíveis."
      >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loadingStats ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label="ETEs Ativas"
              value={stats?.ativas ?? 0}
              subtitle={`${pct(stats?.ativas ?? 0).toFixed(1)}% do total cadastrado`}
              variant="success"
              progress={pct(stats?.ativas ?? 0)}
            />
            <StatCard label="ETEs em Construção" value={stats?.construcao ?? 0} variant="warning" />
            <StatCard
              label="ETEs Inativas"
              value={stats?.inativas ?? 0}
              subtitle="Requer atenção regulatória"
              variant="destructive"
            />
            <StatCard label="Eficiência DBO Nacional" value="82.1%" subtitle="+1.3% vs trimestre anterior" variant="default" progress={82.1} />
          </>
        )}
      </div>
      </ErrorBoundary>

      <div className="mb-8">
        <ErrorBoundary
          section="Conformidade DBO"
          title="Conformidade indisponível"
          description="Não foi possível calcular o percentual de conformidade DBO. As demais seções continuam disponíveis."
        >
          <ConformidadeCard />
        </ErrorBoundary>
      </div>

      <div className="mb-8">
        <ErrorBoundary
          section="Tendência DBO"
          title="Gráfico indisponível"
          description="Não foi possível renderizar a evolução de DBO por bacia."
        >
          <DboTrendChart />
        </ErrorBoundary>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <ErrorBoundary
            section="Mapa Geoespacial"
            title="Mapa indisponível no momento"
            description="Não foi possível renderizar o mapa geoespacial das ETEs."
          >
            <EteMap />
          </ErrorBoundary>
        </div>

        <ErrorBoundary
          section="Alertas DBO"
          title="Alertas indisponíveis"
          description="Não foi possível carregar os alertas de medições DBO fora de conformidade."
        >
          <AlertasDboPanel />
        </ErrorBoundary>
      </div>

      <div className="mb-8">
        <ErrorBoundary
          section="Falhas de Endpoint"
          title="Painel de falhas indisponível"
          description="Não foi possível renderizar o painel de falhas de endpoints."
        >
          <EndpointFailuresPanel
            endpoints={endpoints}
            onRetry={retryEndpoint}
            onRetryAll={retryAllFailures}
          />
        </ErrorBoundary>
      </div>

      <ErrorBoundary
        section="Indicadores por Bacia"
        title="Indicadores por bacia indisponíveis"
        description="Não foi possível renderizar os indicadores por bacia hidrográfica."
      >
        <div className="bg-card border rounded-sm shadow-sm overflow-hidden">
          <div className="p-5 border-b">
            <h2 className="font-semibold">Indicadores por Bacia Hidrográfica</h2>
            <p className="text-xs text-muted-foreground mt-1">Cobertura de esgotamento e eficiência de tratamento</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {bacias.map((bacia) => (
              <div key={bacia.nome} className="p-5 border-b border-r last:border-r-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-sm">{bacia.nome}</h3>
                  {bacia.trend === "up" ? (
                    <TrendingUp className="size-4 text-success" />
                  ) : (
                    <TrendingDown className="size-4 text-destructive" />
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xl font-semibold">{bacia.etes}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">ETEs</p>
                  </div>
                  <div>
                    <p className="text-xl font-semibold">{bacia.cobertura}%</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Cobertura</p>
                  </div>
                  <div>
                    <p className="text-xl font-semibold">{bacia.eficiencia}%</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Efic. DBO</p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${bacia.cobertura}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </ErrorBoundary>
    </div>
  );
}
