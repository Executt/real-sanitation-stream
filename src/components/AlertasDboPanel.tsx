import { useEffect, useState } from "react";
import { AlertItem } from "@/components/AlertItem";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface Limites {
  dboMin: number;
  dboCritico: number;
}

interface AlertaRow {
  id: string;
  ete_nome: string;
  ete_municipio: string;
  ete_uf: string;
  dbo_saida_mg_l: number;
  medido_em: string;
}

interface Alerta {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "warning" | "info";
  time: string;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "agora há pouco";
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  return `há ${days} d`;
}

async function fetchAlertas(): Promise<Alerta[]> {
  // 1) Limites configurados
  const { data: params, error: pErr } = await supabase
    .from("system_parameters")
    .select("dbo_min, dbo_critico")
    .limit(1)
    .maybeSingle();
  if (pErr) throw new Error(`Falha ao carregar parâmetros: ${pErr.message}`);
  const limites: Limites = {
    dboMin: Number(params?.dbo_min ?? 60),
    dboCritico: Number(params?.dbo_critico ?? 40),
  };

  // 2) Últimas medições não conformes
  const { data, error } = await supabase
    .from("dbo_medicoes")
    .select("id, dbo_saida_mg_l, medido_em, etes!inner(nome, municipio, uf)")
    .eq("conforme", false)
    .order("medido_em", { ascending: false })
    .limit(15);
  if (error) throw new Error(`Falha ao carregar alertas DBO: ${error.message}`);

  return (data ?? []).map((r: any): Alerta => {
    const saida = Number(r.dbo_saida_mg_l);
    // dbo_critico é o teto crítico (acima disso = critical); entre dbo_min e dbo_critico = warning.
    // Como dbo_min(60) > dbo_critico(40) na configuração padrão, tratamos:
    //  - critical quando saida >= dbo_min + 40 (muito acima do limite)
    //  - warning caso contrário
    const limiteCritico = limites.dboMin + 40;
    const severity: Alerta["severity"] = saida >= limiteCritico ? "critical" : "warning";
    return {
      id: r.id,
      title: `${r.etes.nome} — ${r.etes.municipio}/${r.etes.uf}`,
      description: `DBO de saída ${saida} mg/L (limite: ${limites.dboMin} mg/L)`,
      severity,
      time: relativeTime(r.medido_em),
    };
  });
}

export function AlertasDboPanel() {
  const [alertas, setAlertas] = useState<Alerta[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAlertas()
      .then((a) => { if (!cancelled) setAlertas(a); })
      .catch((e) => { if (!cancelled) setErr(e); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (err) throw err;

  return (
    <div className="bg-card border rounded-sm shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Alertas DBO</h2>
        {alertas && (
          <span className="text-xs font-mono text-muted-foreground">
            {alertas.length} ativos
          </span>
        )}
      </div>
      {loading || !alertas ? (
        <div className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : alertas.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Nenhuma medição fora de conformidade encontrada.
        </p>
      ) : (
        alertas.map((a) => (
          <AlertItem
            key={a.id}
            title={a.title}
            description={a.description}
            severity={a.severity}
            time={a.time}
          />
        ))
      )}
    </div>
  );
}
