import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { BACIAS, ufToBacia, type BaciaKey } from "@/lib/bacias";

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

interface Row {
  mes: string;
  [k: string]: string | number | null;
}

async function fetchTrend(): Promise<Row[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - 11);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("dbo_medicoes")
    .select("medido_em, eficiencia_pct, etes!inner(uf)")
    .gte("medido_em", since.toISOString());

  if (error) throw new Error(`Falha ao carregar tendência DBO: ${error.message}`);

  // Bucket: ano-mês -> bacia -> [valores]
  const buckets = new Map<string, Record<BaciaKey, number[]>>();
  for (const row of data ?? []) {
    const d = new Date(row.medido_em as string);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!buckets.has(key)) {
      buckets.set(key, {
        tiete: [], saoFrancisco: [], parana: [], amazonas: [], paraguai: [], atlanticoSE: [],
      });
    }
    const uf = (row as any).etes?.uf as string | undefined;
    const bacia = ufToBacia(uf);
    const eff = Number(row.eficiencia_pct);
    if (Number.isFinite(eff)) buckets.get(key)![bacia].push(eff);
  }

  // Construir 12 meses na ordem
  const result: Row[] = [];
  const cursor = new Date(since);
  for (let i = 0; i < 12; i++) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    const month = buckets.get(key);
    const row: Row = { mes: MONTH_LABELS[cursor.getMonth()] };
    for (const b of BACIAS) {
      const arr = month?.[b.key] ?? [];
      row[b.key] = arr.length ? +(arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1) : null;
    }
    result.push(row);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return result;
}

export function DboTrendChart() {
  const [data, setData] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTrend()
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setErr(e); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (err) throw err;

  const isEmpty = useMemo(
    () => !!data && data.every((r) => BACIAS.every((b) => r[b.key] == null)),
    [data],
  );

  return (
    <div className="bg-card border rounded-sm shadow-sm p-6">
      <div className="mb-6">
        <h2 className="font-semibold text-lg">Evolução da Eficiência DBO por Bacia</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Percentual médio de remoção de DBO — últimos 12 meses
        </p>
      </div>
      {loading || !data ? (
        <Skeleton className="h-[400px] w-full" />
      ) : isEmpty ? (
        <div className="h-[400px] flex items-center justify-center text-sm text-muted-foreground">
          Nenhuma medição DBO disponível no período.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              stroke="hsl(215, 16%, 47%)"
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(214, 32%, 91%)",
                borderRadius: "4px",
                fontSize: 12,
              }}
              formatter={(value: number) => [value == null ? "—" : `${value}%`, undefined]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {BACIAS.map((b) => (
              <Line
                key={b.key}
                type="monotone"
                dataKey={b.key}
                name={b.name}
                stroke={b.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
