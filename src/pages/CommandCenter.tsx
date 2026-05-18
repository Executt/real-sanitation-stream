import { useEffect, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { StatCardSkeleton } from "@/components/StatCardSkeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  total: number;
  ativas: number;
  construcao: number;
  inativas: number;
}

export default function CommandCenter() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("etes").select("status");
      if (error) {
        setErr(error.message);
      } else if (data) {
        setStats({
          total: data.length,
          ativas: data.filter((e) => e.status === "ativa").length,
          construcao: data.filter((e) => e.status === "em_construcao").length,
          inativas: data.filter((e) => e.status === "inativa").length,
        });
      }
      setLoading(false);
    })();
  }, []);

  const pct = (n: number) => (stats && stats.total > 0 ? (n / stats.total) * 100 : 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Centro de Comando ANA</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">
            VISÃO NACIONAL | {loading ? "…" : stats?.total ?? 0} ETEs MONITORADAS
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
        description="Não foi possível renderizar os cartões de KPIs."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {loading ? (
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
              <StatCard
                label="ETEs em Construção"
                value={stats?.construcao ?? 0}
                variant="warning"
              />
              <StatCard
                label="ETEs Inativas"
                value={stats?.inativas ?? 0}
                subtitle="Requer atenção regulatória"
                variant="destructive"
              />
              <StatCard
                label="Total Cadastrado"
                value={stats?.total ?? 0}
                subtitle="Base nacional de ETEs"
                variant="default"
              />
            </>
          )}
        </div>
      </ErrorBoundary>

      {err && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm p-4 rounded-sm">
          Falha ao carregar estatísticas: {err}
        </div>
      )}

      <div className="bg-card border rounded-sm shadow-sm p-5 text-sm text-muted-foreground">
        Acesse os módulos no menu lateral: <strong>Tendência DBO</strong>,{" "}
        <strong>Mapa Interativo</strong>, <strong>Alertas DBO</strong> e{" "}
        <strong>Conformidade DBO</strong>.
      </div>
    </div>
  );
}
