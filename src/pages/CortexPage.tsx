import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { Brain, ShieldAlert, Zap, RefreshCw, ExternalLink, Settings2 } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Link } from "react-router-dom";
import { useTable } from "@/lib/useTable";
import { TablePagination } from "@/components/TablePagination";
import { parseCortexError, runCortexInference } from "@/lib/cortex";
import { useAuth } from "@/contexts/AuthContext";

type Modelo = {
  id: string;
  nome: string;
  versao: string;
  status: string;
  provider_model: string;
  causal_report_url: string | null;
  falso_afluente_checklist: Record<string, boolean>;
};

type Predicao = {
  id: string;
  ete_id: string | null;
  bacia: string | null;
  classificacao: string | null;
  valor: number | null;
  confianca: number | null;
  explicacao: string | null;
  horizonte_dias: number | null;
  criado_em: string;
  modelo_id: string | null;
};

const classColor: Record<string, string> = {
  critico: "bg-destructive text-destructive-foreground",
  alto: "bg-orange-600 text-white",
  medio: "bg-warning text-warning-foreground",
  baixo: "bg-success text-success-foreground",
  indeterminado: "bg-muted text-muted-foreground",
};

const RISK_SCORE: Record<string, number> = { critico: 4, alto: 3, medio: 2, baixo: 1, indeterminado: 0 };

export default function CortexPage() {
  const { isSuperAdmin } = useAuth();
  const [modelo, setModelo] = useState<Modelo | null>(null);
  const [modelosMap, setModelosMap] = useState<Record<string, Modelo>>({});
  const [predicoes, setPredicoes] = useState<Predicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [filterClass, setFilterClass] = useState<string>("todas");
  const [filterBacia, setFilterBacia] = useState<string>("");

  async function load() {
    setLoading(true);
    const [{ data: modelos }, { data: preds }] = await Promise.all([
      supabase.from("cortex_modelos").select("*").order("created_at", { ascending: false }),
      supabase
        .from("cortex_predicoes")
        .select("id, ete_id, bacia, classificacao, valor, confianca, explicacao, horizonte_dias, criado_em, modelo_id")
        .order("criado_em", { ascending: false })
        .limit(500),
    ]);
    const list = (modelos ?? []) as Modelo[];
    setModelo(list[0] ?? null);
    setModelosMap(Object.fromEntries(list.map((m) => [m.id, m])));
    setPredicoes((preds as Predicao[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("cortex_pred_all")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "cortex_predicoes" }, () => {
        setProgress((p) => Math.min(100, p + 6));
        load();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  // KPIs por bacia
  const kpisPorBacia = useMemo(() => {
    const buckets = new Map<string, { total: number; critico: number; alto: number; riscoMed: number }>();
    for (const p of predicoes) {
      const b = p.bacia?.trim() || "Sem bacia";
      const cur = buckets.get(b) ?? { total: 0, critico: 0, alto: 0, riscoMed: 0 };
      cur.total += 1;
      if (p.classificacao === "critico") cur.critico += 1;
      if (p.classificacao === "alto") cur.alto += 1;
      cur.riscoMed += Number(p.valor) || 0;
      buckets.set(b, cur);
    }
    return Array.from(buckets.entries())
      .map(([bacia, v]) => ({ bacia, ...v, riscoMed: v.total ? v.riscoMed / v.total : 0 }))
      .sort((a, b) => b.critico + b.alto - (a.critico + a.alto) || b.total - a.total)
      .slice(0, 8);
  }, [predicoes]);

  const filtered = useMemo(() => {
    return predicoes.filter((p) => {
      if (filterClass !== "todas" && p.classificacao !== filterClass) return false;
      if (filterBacia && !(p.bacia ?? "").toLowerCase().includes(filterBacia.toLowerCase())) return false;
      return true;
    });
  }, [predicoes, filterClass, filterBacia]);

  const alerts = useMemo(
    () => filtered.filter((p) => (RISK_SCORE[p.classificacao ?? "indeterminado"] ?? 0) >= 3),
    [filtered],
  );

  const alertTable = useTable<Predicao>(alerts, { pageSize: 10 });
  const allTable = useTable<Predicao>(filtered, { pageSize: 15 });

  async function runInference() {
    setRunning(true);
    setProgress(5);
    const res = await runCortexInference({ kind: "all", limit: 10 }, 30);
    setRunning(false);
    if (res.error) {
      setProgress(0);
      toast({ title: "Falha no Córtex", description: parseCortexError(res.error.message), variant: "destructive" });
      return;
    }
    setProgress(100);
    toast({
      title: "Inferência concluída",
      description: `${(res.data?.predicoes ?? []).length} predições geradas (${res.data?.modelo?.status ?? "?"}).`,
    });
    setTimeout(() => setProgress(0), 4000);
    load();
  }

  const checklistItems = modelo?.falso_afluente_checklist ?? {};

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Brain className="size-6 text-primary" />
            Córtex IA
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">
            RISCO PREDITIVO POR BACIA · REGRA DO FALSO AFLUENTE
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <Button variant="outline" asChild>
              <Link to="/admin/cortex-modelos"><Settings2 className="size-4 mr-2" />Gerenciar modelos</Link>
            </Button>
          )}
          <Button onClick={runInference} disabled={running || !modelo}>
            {running ? <RefreshCw className="size-4 mr-2 animate-spin" /> : <Zap className="size-4 mr-2" />}
            Executar inferência agora
          </Button>
        </div>
      </div>

      {(running || progress > 0) && <Progress value={progress} className="h-1.5" />}

      <Alert>
        <ShieldAlert className="size-4" />
        <AlertTitle>Governança Falso Afluente</AlertTitle>
        <AlertDescription className="text-xs">
          Predições em modo <strong>shadow</strong> são registradas apenas para auditoria e não substituem decisão
          humana. Promoção a produção exige checklist completo, relatório causal e métricas em anos anômalos.
        </AlertDescription>
      </Alert>

      {/* KPIs por bacia */}
      <ErrorBoundary section="KPIs por bacia">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risco por bacia</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : kpisPorBacia.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem predições agregáveis por bacia.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {kpisPorBacia.map((k) => (
                  <div key={k.bacia} className="border rounded-sm p-3">
                    <p className="text-xs font-mono uppercase text-muted-foreground truncate" title={k.bacia}>{k.bacia}</p>
                    <p className="text-2xl font-semibold">{Math.round(k.riscoMed * 100)}%</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px] font-mono">{k.total} preds</Badge>
                      {k.critico > 0 && <Badge className="bg-destructive text-destructive-foreground text-[10px]">{k.critico} crít</Badge>}
                      {k.alto > 0 && <Badge className="bg-orange-600 text-white text-[10px]">{k.alto} alto</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </ErrorBoundary>

      {/* Modelo ativo */}
      <ErrorBoundary section="Modelo Córtex">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Modelo ativo</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {loading ? (
              "Carregando…"
            ) : !modelo ? (
              <span className="text-muted-foreground">Nenhum modelo configurado.</span>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{modelo.nome}</span>
                  <Badge variant="outline">{modelo.versao}</Badge>
                  <Badge className={modelo.status === "prod" ? "bg-success" : "bg-warning text-warning-foreground"}>
                    {modelo.status}
                  </Badge>
                  <span className="font-mono text-xs text-muted-foreground">{modelo.provider_model}</span>
                  {modelo.causal_report_url && (
                    <a href={modelo.causal_report_url} target="_blank" rel="noreferrer" className="text-primary text-xs inline-flex items-center gap-1 underline">
                      Relatório causal <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                  {Object.entries(checklistItems).map(([k, v]) => (
                    <div
                      key={k}
                      className={`p-2 border rounded-sm ${v ? "border-success/30 bg-success/5" : "border-muted"}`}
                    >
                      <div className="font-mono uppercase text-[10px] text-muted-foreground">{k.replace(/_/g, " ")}</div>
                      <div className={v ? "text-success font-semibold" : "text-muted-foreground"}>
                        {v ? "✓ OK" : "pendente"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </ErrorBoundary>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Classificação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as classificações</SelectItem>
            <SelectItem value="critico">Crítico</SelectItem>
            <SelectItem value="alto">Alto</SelectItem>
            <SelectItem value="medio">Médio</SelectItem>
            <SelectItem value="baixo">Baixo</SelectItem>
            <SelectItem value="indeterminado">Indeterminado</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Filtrar por bacia…"
          value={filterBacia}
          onChange={(e) => setFilterBacia(e.target.value)}
          className="w-[240px]"
        />
        <Badge variant="outline" className="ml-auto font-mono text-[10px]">
          {filtered.length} predições · {alerts.length} em alerta
        </Badge>
      </div>

      {/* ETEs em alerta preditivo */}
      <ErrorBoundary section="Alertas preditivos">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              ETEs em alerta preditivo
              <Badge className="bg-destructive text-destructive-foreground text-[10px]">{alerts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem ETEs em alerta preditivo alto/crítico neste filtro.</p>
            ) : (
              <>
                <div className="space-y-2">
                  {alertTable.rows.map((p) => {
                    const m = p.modelo_id ? modelosMap[p.modelo_id] : null;
                    return (
                      <div key={p.id} className="border rounded-sm p-3 text-sm">
                        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={classColor[p.classificacao ?? "indeterminado"]}>{p.classificacao}</Badge>
                            <span className="font-mono text-xs text-muted-foreground">
                              risco {(Number(p.valor) * 100 || 0).toFixed(0)}% · conf {(Number(p.confianca) * 100 || 0).toFixed(0)}% · {p.horizonte_dias ?? 30}d
                            </span>
                            {p.bacia && <Badge variant="outline" className="text-[10px]">{p.bacia}</Badge>}
                            {m?.causal_report_url && (
                              <a
                                href={m.causal_report_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary text-xs inline-flex items-center gap-1 underline"
                              >
                                Relatório causal <ExternalLink className="size-3" />
                              </a>
                            )}
                          </div>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {new Date(p.criado_em).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        {p.explicacao && <p className="text-xs text-muted-foreground leading-relaxed">{p.explicacao}</p>}
                      </div>
                    );
                  })}
                </div>
                <TablePagination
                  page={alertTable.page}
                  pageCount={alertTable.pageCount}
                  pageSize={alertTable.pageSize}
                  total={alertTable.total}
                  onPageChange={alertTable.setPage}
                  onPageSizeChange={(s) => alertTable.setPageSize(s)}
                />
              </>
            )}
          </CardContent>
        </Card>
      </ErrorBoundary>

      {/* Predições recentes (todas) */}
      <ErrorBoundary section="Predições recentes">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Predições recentes (tempo real)</CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma predição para este filtro. Clique em <strong>Executar inferência agora</strong>.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  {allTable.rows.map((p) => (
                    <div key={p.id} className="border rounded-sm p-3 text-sm">
                      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Badge className={classColor[p.classificacao ?? "indeterminado"]}>
                            {p.classificacao ?? "—"}
                          </Badge>
                          <span className="font-mono text-xs text-muted-foreground">
                            risco {(Number(p.valor) * 100 || 0).toFixed(0)}% · conf {(Number(p.confianca) * 100 || 0).toFixed(0)}%
                          </span>
                          {p.bacia && <Badge variant="outline" className="text-[10px]">{p.bacia}</Badge>}
                        </div>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {new Date(p.criado_em).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      {p.explicacao && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{p.explicacao}</p>
                      )}
                    </div>
                  ))}
                </div>
                <TablePagination
                  page={allTable.page}
                  pageCount={allTable.pageCount}
                  pageSize={allTable.pageSize}
                  total={allTable.total}
                  onPageChange={allTable.setPage}
                  onPageSizeChange={(s) => allTable.setPageSize(s)}
                />
              </>
            )}
          </CardContent>
        </Card>
      </ErrorBoundary>
    </div>
  );
}
