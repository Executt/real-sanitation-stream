import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Brain, Zap, RefreshCw, ShieldAlert, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { TablePagination } from "@/components/TablePagination";
import { useTable } from "@/lib/useTable";
import { useCortexRun } from "@/hooks/useCortexRun";
import { CortexRunStatus } from "@/components/CortexRunStatus";

type Predicao = {
  id: string;
  ete_id: string | null;
  classificacao: string | null;
  valor: number | null;
  confianca: number | null;
  explicacao: string | null;
  horizonte_dias: number | null;
  criado_em: string;
};

const classColor: Record<string, string> = {
  critico: "bg-destructive text-destructive-foreground",
  alto: "bg-orange-600 text-white",
  medio: "bg-warning text-warning-foreground",
  baixo: "bg-success text-success-foreground",
  indeterminado: "bg-muted text-muted-foreground",
};

interface Props {
  scope: "concessionaria" | "agencia";
  entityId: string;
  concessionariaIds?: string[];
}

export function CortexTab({ scope, entityId, concessionariaIds }: Props) {
  const [predicoes, setPredicoes] = useState<Predicao[]>([]);
  const [loading, setLoading] = useState(true);
  const cortexRun = useCortexRun(`${scope}_${entityId}`);
  const running = cortexRun.state === "running" || cortexRun.state === "queued";

  const table = useTable<Predicao>(predicoes, {
    initialSort: { key: "criado_em", dir: "desc" },
    pageSize: 10,
  });

  async function load() {
    setLoading(true);
    let q = supabase
      .from("cortex_predicoes")
      .select("id, ete_id, classificacao, valor, confianca, explicacao, horizonte_dias, criado_em")
      .order("criado_em", { ascending: false })
      .limit(200);

    if (scope === "concessionaria") {
      q = q.eq("concessionaria_id", entityId);
    } else if (concessionariaIds?.length) {
      q = q.in("concessionaria_id", concessionariaIds);
    } else {
      setPredicoes([]);
      setLoading(false);
      return;
    }
    const { data } = await q;
    setPredicoes((data as Predicao[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`cortex_pred_${scope}_${entityId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "cortex_predicoes" }, () => {
        load();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, entityId, (concessionariaIds ?? []).join(",")]);

  async function handleRun() {
    const r = await cortexRun.run(
      scope === "concessionaria"
        ? { kind: "concessionaria", concessionariaId: entityId, limit: 12 }
        : { kind: "agencia", concessionariaIds: concessionariaIds ?? [], limit: 12 },
      30,
    );
    if (r.ok) load();
  }

  return (
    <div className="space-y-4">
      <Alert>
        <ShieldAlert className="size-4" />
        <AlertTitle className="text-sm">Governança Falso Afluente</AlertTitle>
        <AlertDescription className="text-xs">
          Predições em <strong>shadow</strong> são auditadas e não substituem decisão humana.{" "}
          <Link to="/command-center/cortex" className="text-primary underline">Abrir Córtex central</Link>.
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Brain className="size-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase font-mono">Predições escopadas</h3>
          <Badge variant="outline" className="text-[10px]">{predicoes.length}</Badge>
        </div>
        <Button size="sm" onClick={handleRun} disabled={running}>
          {running ? <RefreshCw className="size-3 mr-1.5 animate-spin" /> : <Zap className="size-3 mr-1.5" />}
          Executar inferência agora
        </Button>
      </div>

      <CortexRunStatus
        state={cortexRun.state}
        progress={cortexRun.progress}
        info={cortexRun.info}
        error={cortexRun.error}
        compact
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : predicoes.length === 0 ? (
        <div className="bg-card border rounded-sm p-5 text-sm text-muted-foreground">
          Nenhuma predição registrada para este escopo.
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {table.rows.map((p) => (
              <div key={p.id} className="border rounded-sm p-3 text-sm bg-card">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <Badge className={classColor[p.classificacao ?? "indeterminado"]}>{p.classificacao ?? "—"}</Badge>
                    <span className="font-mono text-xs text-muted-foreground">
                      risco {(Number(p.valor) * 100 || 0).toFixed(0)}% · conf {(Number(p.confianca) * 100 || 0).toFixed(0)}% · {p.horizonte_dias ?? 30}d
                    </span>
                    {p.ete_id && (
                      <Link to={`/operador/etes`} className="text-primary text-xs inline-flex items-center gap-1 hover:underline">
                        ETE <ExternalLink className="size-3" />
                      </Link>
                    )}
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {new Date(p.criado_em).toLocaleString("pt-BR")}
                  </span>
                </div>
                {p.explicacao && <p className="text-xs text-muted-foreground leading-relaxed">{p.explicacao}</p>}
              </div>
            ))}
          </div>
          <TablePagination
            page={table.page}
            pageCount={table.pageCount}
            pageSize={table.pageSize}
            total={table.total}
            onPageChange={table.setPage}
            onPageSizeChange={(s) => table.setPageSize(s)}
          />

        </>
      )}
    </div>
  );
}
