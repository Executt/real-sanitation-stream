import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { BACIAS, ufToBacia, type BaciaKey } from "@/lib/bacias";

interface BaciaConformidade {
  key: BaciaKey;
  name: string;
  color: string;
  total: number;
  conformes: number;
  pct: number;
}

interface ConformidadeData {
  total: number;
  conformes: number;
  pct: number;
  porBacia: BaciaConformidade[];
}

async function fetchConformidade(): Promise<ConformidadeData> {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data, error } = await supabase
    .from("dbo_medicoes")
    .select("conforme, etes!inner(uf)")
    .gte("medido_em", since.toISOString());

  if (error) throw new Error(`Falha ao carregar conformidade: ${error.message}`);

  const totals: Record<BaciaKey, { total: number; conformes: number }> = {
    tiete: { total: 0, conformes: 0 },
    saoFrancisco: { total: 0, conformes: 0 },
    parana: { total: 0, conformes: 0 },
    amazonas: { total: 0, conformes: 0 },
    paraguai: { total: 0, conformes: 0 },
    atlanticoSE: { total: 0, conformes: 0 },
  };
  let total = 0;
  let conformes = 0;
  for (const row of data ?? []) {
    const uf = (row as any).etes?.uf as string | undefined;
    const bacia = ufToBacia(uf);
    totals[bacia].total += 1;
    total += 1;
    if (row.conforme) {
      totals[bacia].conformes += 1;
      conformes += 1;
    }
  }

  return {
    total,
    conformes,
    pct: total > 0 ? (conformes / total) * 100 : 0,
    porBacia: BACIAS.map((b) => ({
      key: b.key,
      name: b.name,
      color: b.color,
      total: totals[b.key].total,
      conformes: totals[b.key].conformes,
      pct: totals[b.key].total > 0 ? (totals[b.key].conformes / totals[b.key].total) * 100 : 0,
    })),
  };
}

export function ConformidadeCard() {
  const [data, setData] = useState<ConformidadeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchConformidade()
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setErr(e); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (err) throw err;

  return (
    <div className="bg-card border rounded-sm shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            Conformidade DBO Nacional
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            % de medições dentro do limite regulatório — últimos 30 dias
          </p>
        </div>
        {loading || !data ? (
          <Skeleton className="h-10 w-24" />
        ) : (
          <div className="text-right">
            <p className="text-3xl font-semibold font-mono">{data.pct.toFixed(1)}%</p>
            <p className="text-[10px] font-mono text-muted-foreground uppercase">
              {data.conformes}/{data.total} medições
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading || !data
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
          : data.porBacia.map((b) => (
              <div key={b.key} className="border rounded-sm p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                    <span className="text-xs font-medium">{b.name}</span>
                  </div>
                  <span className="text-xs font-mono font-semibold">
                    {b.total > 0 ? `${b.pct.toFixed(0)}%` : "—"}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${b.pct}%`,
                      backgroundColor:
                        b.pct >= 80
                          ? "hsl(var(--success))"
                          : b.pct >= 50
                            ? "hsl(var(--warning))"
                            : "hsl(var(--destructive))",
                    }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground font-mono mt-1.5">
                  {b.conformes}/{b.total}
                </p>
              </div>
            ))}
      </div>
    </div>
  );
}
