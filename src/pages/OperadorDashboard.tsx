import { useEffect, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { EteStatusTable } from "@/components/EteStatusTable";
import { AlertasDboPanel } from "@/components/AlertasDboPanel";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Zap, RefreshCw, Brain } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCortexRun } from "@/hooks/useCortexRun";
import { CortexRunStatus } from "@/components/CortexRunStatus";

interface Stats {
  totalEtes: number;
  ativas: number;
  construcao: number;
  inativas: number;
  falhasApi24h: number;
  eficienciaMedia: number | null;
  medicoes30d: number;
}

const empty: Stats = {
  totalEtes: 0,
  ativas: 0,
  construcao: 0,
  inativas: 0,
  falhasApi24h: 0,
  eficienciaMedia: null,
  medicoes30d: 0,
};

export default function OperadorDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats>(empty);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string>(new Date().toLocaleTimeString("pt-BR"));
  const cortexRun = useCortexRun(`dash_${profile?.concessionaria_id ?? "all"}`);
  const running = cortexRun.state === "running" || cortexRun.state === "queued";

  async function handleRunCortex() {
    const conc = profile?.concessionaria_id as string | undefined;
    await cortexRun.run(
      conc ? { kind: "concessionaria", concessionariaId: conc, limit: 10 } : { kind: "all", limit: 10 },
      30,
    );
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [etesRes, probesRes, medRes] = await Promise.all([
        supabase.from("etes").select("status"),
        supabase
          .from("api_probe_log")
          .select("id", { count: "exact", head: true })
          .neq("state", "up")
          .gte("checked_at", since24h),
        supabase
          .from("dbo_medicoes")
          .select("eficiencia_pct")
          .gte("medido_em", since30d),
      ]);

      if (cancelled) return;

      const etes = etesRes.data ?? [];
      const efs = (medRes.data ?? [])
        .map((r) => Number(r.eficiencia_pct))
        .filter((n) => Number.isFinite(n));

      setStats({
        totalEtes: etes.length,
        ativas: etes.filter((e) => e.status === "ativa").length,
        construcao: etes.filter((e) => e.status === "em_construcao").length,
        inativas: etes.filter((e) => e.status === "inativa").length,
        falhasApi24h: probesRes.count ?? 0,
        eficienciaMedia: efs.length ? efs.reduce((a, b) => a + b, 0) / efs.length : null,
        medicoes30d: efs.length,
      });
      setLastSync(new Date().toLocaleTimeString("pt-BR"));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pctAtivas = stats.totalEtes > 0 ? (stats.ativas / stats.totalEtes) * 100 : 0;
  const efTexto = stats.eficienciaMedia !== null ? `${stats.eficienciaMedia.toFixed(1)}%` : "—";

  return (
    <div>
      <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Visão Operador B2B</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">
            {profile?.organization ?? "Concessionária não vinculada"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" asChild>
            <Link to="/command-center/cortex"><Brain className="size-4 mr-1.5" />Córtex IA</Link>
          </Button>
          <Button size="sm" onClick={handleRunCortex} disabled={running}>
            {running ? <RefreshCw className="size-4 mr-1.5 animate-spin" /> : <Zap className="size-4 mr-1.5" />}
            Executar inferência agora
          </Button>
          <div className="bg-card px-4 py-2 border rounded-sm text-sm font-mono text-muted-foreground">
            Atualizado: {lastSync}
          </div>
        </div>
      </div>
      {(running || progress > 0) && <Progress value={progress} className="h-1.5 mb-4" />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="ETEs Ativas"
          value={loading ? "—" : `${stats.ativas} / ${stats.totalEtes}`}
          subtitle={loading ? "Carregando" : `${pctAtivas.toFixed(1)}% em operação`}
          variant="default"
          progress={pctAtivas}
        />
        <StatCard
          label="Falhas de API (24h)"
          value={loading ? "—" : String(stats.falhasApi24h).padStart(2, "0")}
          subtitle={stats.falhasApi24h === 0 ? "Sem incidentes" : "Verifique o painel de API"}
          variant={stats.falhasApi24h > 0 ? "destructive" : "success"}
        />
        <StatCard
          label="Eficiência DBO Média"
          value={loading ? "—" : efTexto}
          subtitle={
            stats.eficienciaMedia === null
              ? "Sem medições nos últimos 30 dias"
              : `Baseada em ${stats.medicoes30d} medições`
          }
          variant={
            stats.eficienciaMedia !== null && stats.eficienciaMedia >= 60 ? "success" : "warning"
          }
          progress={stats.eficienciaMedia ?? 0}
        />
        <StatCard
          label="Em Construção / Inativas"
          value={loading ? "—" : `${stats.construcao} / ${stats.inativas}`}
          subtitle="Acompanhamento operacional"
          variant="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <ErrorBoundary section="Status das ETEs">
            <EteStatusTable />
          </ErrorBoundary>
        </div>
        <ErrorBoundary section="Alertas DBO">
          <AlertasDboPanel />
        </ErrorBoundary>
      </div>
    </div>
  );
}
