import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, History as HistoryIcon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProbeRow {
  id: string;
  source: string;
  endpoint: string;
  state: string;
  http_status: number | null;
  duration_ms: number | null;
  error_message: string | null;
  checked_at: string;
}

interface Props {
  /** filtra por source LIKE este valor; default "SNIRH%" */
  sourceFilter?: string;
}

export function IntegrationsSnirhTab({ sourceFilter = "SNIRH" }: Props) {
  const [rows, setRows] = useState<ProbeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("api_probe_log")
      .select("*")
      .ilike("source", `%${sourceFilter}%`)
      .order("checked_at", { ascending: false })
      .limit(50);
    setRows((data ?? []) as ProbeRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [sourceFilter]);

  const grouped = new Map<string, ProbeRow[]>();
  rows.forEach((r) => {
    const k = `${r.source}::${r.endpoint}`;
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k)!.push(r);
  });

  const ok = rows.filter((r) => r.state === "success").length;
  const err = rows.filter((r) => r.state === "error").length;
  const avg = (() => {
    const ds = rows.filter((r) => r.duration_ms != null).map((r) => r.duration_ms!);
    return ds.length ? Math.round(ds.reduce((a, b) => a + b, 0) / ds.length) : 0;
  })();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border rounded-sm p-4">
          <p className="text-xs text-muted-foreground uppercase flex items-center gap-1">
            <CheckCircle2 className="size-3 text-success" /> Sucessos
          </p>
          <p className="text-2xl font-semibold text-success">{ok}</p>
        </div>
        <div className="bg-card border rounded-sm p-4">
          <p className="text-xs text-muted-foreground uppercase flex items-center gap-1">
            <AlertCircle className="size-3 text-destructive" /> Falhas
          </p>
          <p className="text-2xl font-semibold text-destructive">{err}</p>
        </div>
        <div className="bg-card border rounded-sm p-4">
          <p className="text-xs text-muted-foreground uppercase">Latência média</p>
          <p className="text-2xl font-semibold font-mono">{avg}ms</p>
        </div>
        <div className="bg-card border rounded-sm p-4">
          <p className="text-xs text-muted-foreground uppercase">Disponibilidade</p>
          <p className="text-2xl font-semibold">
            {rows.length ? Math.round((ok / rows.length) * 100) : 0}%
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-sm overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <HistoryIcon className="size-4" /> Histórico SNIRH (últimas 50)
          </h3>
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="size-3 mr-1" /> Atualizar</Button>
        </div>
        <div className="divide-y">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground text-center">Carregando…</p>
          ) : grouped.size === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">Nenhum registro SNIRH encontrado.</p>
          ) : Array.from(grouped.entries()).map(([k, list]) => (
            <div key={k} className="p-4">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="text-[10px] font-mono uppercase bg-muted px-1.5 py-0.5 rounded-sm">
                  {list[0].source}
                </span>
                <span className="font-mono text-xs">{list[0].endpoint}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {list.slice(0, 12).map((r) => (
                  <Badge
                    key={r.id}
                    variant="outline"
                    title={r.error_message ?? ""}
                    className={
                      "font-mono text-[10px] gap-1.5 " +
                      (r.state === "success" ? "border-success/30 text-success" : "border-destructive/30 text-destructive")
                    }
                  >
                    {new Date(r.checked_at).toLocaleTimeString("pt-BR")}
                    <span>·</span><span>{r.http_status ?? "—"}</span>
                    {r.duration_ms != null && <><span>·</span><span>{r.duration_ms}ms</span></>}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
