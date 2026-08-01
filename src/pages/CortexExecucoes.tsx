import { useEffect, useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, RefreshCw, ChevronDown, ChevronRight, ArrowLeft } from "lucide-react";
import { TablePagination } from "@/components/TablePagination";
import { useTable } from "@/lib/useTable";
import { parseCortexError } from "@/lib/cortex";

type Meta = {
  run_id?: string;
  cancelado?: boolean;
  parametros?: { ete_ids?: string[] | null; horizonte_dias?: number; limit?: number; modelo_id?: string | null };
  modelo?: { id: string; nome: string; versao: string; status: string; tipo: string; provider_model: string };
  bacias?: string[];
  fontes?: { nome: string; tipo: string; papel: string; tipo_fonte?: string; ativo?: boolean }[];
  mcp?: { server_url: string | null; declared?: string[]; discovered?: string[]; used?: string[]; tools?: string[] } | null;
  contagem?: { etes: number; predicoes: number; erros: number };
  erros?: { ete_id: string; error: string }[];
  duracao_ms?: number;
};

type Execucao = {
  id: string;
  created_at: string;
  user_email: string | null;
  severity: string;
  metadata: Meta | null;
};

export default function CortexExecucoes() {
  const { isSuperAdmin, isGestorAna, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<Execucao[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("todos");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("audit_log")
      .select("id, created_at, user_email, severity, metadata")
      .eq("action", "CORTEX_INFER_RUN")
      .order("created_at", { ascending: false })
      .limit(300);
    setRows((data as unknown as Execucao[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (isSuperAdmin || isGestorAna) load();
    const ch = supabase
      .channel("cortex_execucoes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_log" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, isGestorAna]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      const m = r.metadata ?? {};
      const errs = m.contagem?.erros ?? 0;
      if (status === "ok" && (errs > 0 || m.cancelado)) return false;
      if (status === "erro" && errs === 0) return false;
      if (status === "cancelado" && !m.cancelado) return false;
      if (!term) return true;
      return JSON.stringify({ e: r.user_email, m }).toLowerCase().includes(term);
    });
  }, [rows, q, status]);

  const table = useTable<Execucao>(filtered, { pageSize: 10 });

  if (authLoading) return null;
  if (!isSuperAdmin && !isGestorAna) return <Navigate to="/operador" replace />;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Brain className="size-6 text-primary" />
            Auditoria de execuções do Córtex
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">
            PARÂMETROS · MODELO · FONTES · MCP · DURAÇÃO · ERROS
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/command-center/cortex"><ArrowLeft className="size-4 mr-2" />Córtex IA</Link>
          </Button>
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`size-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por modelo, bacia, fonte, ferramenta MCP, usuário…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-[360px] max-w-full"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os resultados</SelectItem>
            <SelectItem value="ok">Somente sucesso</SelectItem>
            <SelectItem value="erro">Com erros</SelectItem>
            <SelectItem value="cancelado">Canceladas</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline" className="ml-auto font-mono text-[10px]">{filtered.length} execuções</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Execuções recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma execução registrada para este filtro.</p>
          ) : (
            <>
              <div className="space-y-2">
                {table.rows.map((r) => {
                  const m = r.metadata ?? {};
                  const errs = m.erros ?? [];
                  const isOpen = !!open[r.id];
                  const mcpUsed = m.mcp?.used ?? m.mcp?.tools ?? [];
                  return (
                    <div key={r.id} className="border rounded-sm bg-card">
                      <button
                        type="button"
                        onClick={() => setOpen((s) => ({ ...s, [r.id]: !s[r.id] }))}
                        className="w-full text-left p-3 flex items-start justify-between gap-3 hover:bg-muted/40"
                      >
                        <div className="flex items-start gap-2 flex-wrap">
                          {isOpen ? <ChevronDown className="size-4 mt-0.5" /> : <ChevronRight className="size-4 mt-0.5" />}
                          <Badge
                            className={
                              m.cancelado
                                ? "bg-muted text-foreground border text-[10px]"
                                : (m.contagem?.erros ?? 0) > 0
                                ? "bg-warning text-warning-foreground text-[10px]"
                                : "bg-success text-success-foreground text-[10px]"
                            }
                          >
                            {m.cancelado ? "CANCELADA" : (m.contagem?.erros ?? 0) > 0 ? "COM ERROS" : "OK"}
                          </Badge>
                          <span className="font-mono text-xs text-muted-foreground">
                            {m.contagem?.predicoes ?? 0}/{m.contagem?.etes ?? 0} predições
                            {m.duracao_ms ? ` · ${(m.duracao_ms / 1000).toFixed(1)}s` : ""}
                            {m.parametros?.horizonte_dias ? ` · ${m.parametros.horizonte_dias}d` : ""}
                          </span>
                          {m.modelo && (
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {m.modelo.nome} {m.modelo.versao} · {m.modelo.tipo}/{m.modelo.status}
                            </Badge>
                          )}
                          {(m.bacias ?? []).slice(0, 3).map((b) => (
                            <Badge key={b} variant="secondary" className="text-[10px] font-mono">{b}</Badge>
                          ))}
                          {mcpUsed.slice(0, 3).map((t) => (
                            <Badge key={t} className="bg-primary/10 text-primary text-[10px] font-mono">MCP: {t}</Badge>
                          ))}
                        </div>
                        <span className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString("pt-BR")}
                        </span>
                      </button>

                      {isOpen && (
                        <div className="border-t p-3 space-y-3 text-xs">
                          <div className="grid gap-2 md:grid-cols-2">
                            <div>
                              <p className="font-mono uppercase text-[10px] text-muted-foreground mb-1">Parâmetros</p>
                              <p className="font-mono">
                                run {m.run_id?.slice(0, 8) ?? "—"} · limite {m.parametros?.limit ?? "—"} ·{" "}
                                {m.parametros?.ete_ids?.length ?? 0} ETEs no escopo
                              </p>
                              <p className="text-muted-foreground">Usuário: {r.user_email ?? "—"}</p>
                            </div>
                            <div>
                              <p className="font-mono uppercase text-[10px] text-muted-foreground mb-1">Modelo</p>
                              <p className="font-mono">{m.modelo?.provider_model ?? "—"}</p>
                            </div>
                          </div>

                          <div>
                            <p className="font-mono uppercase text-[10px] text-muted-foreground mb-1">Fontes utilizadas</p>
                            {(m.fontes ?? []).length === 0 ? (
                              <p className="text-muted-foreground">Nenhuma fonte vinculada.</p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {(m.fontes ?? []).map((f, i) => (
                                  <Badge key={`${f.nome}-${i}`} variant="outline" className="text-[10px] font-mono">
                                    {f.nome} ({f.tipo}/{f.papel}){f.ativo === false ? " · inativa" : ""}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          <div>
                            <p className="font-mono uppercase text-[10px] text-muted-foreground mb-1">MCP</p>
                            {!m.mcp ? (
                              <p className="text-muted-foreground">Modelo não é do tipo MCP.</p>
                            ) : (
                              <div className="space-y-1 font-mono">
                                <p className="break-all">server: {m.mcp.server_url ?? "—"}</p>
                                <p>declaradas: {(m.mcp.declared ?? []).join(", ") || "—"}</p>
                                <p>descobertas (tools/list): {(m.mcp.discovered ?? []).join(", ") || "—"}</p>
                                <p>utilizadas: {mcpUsed.join(", ") || "nenhuma"}</p>
                              </div>
                            )}
                          </div>

                          <div>
                            <p className="font-mono uppercase text-[10px] text-muted-foreground mb-1">Erros</p>
                            {errs.length === 0 ? (
                              <p className="text-muted-foreground">Sem erros nesta execução.</p>
                            ) : (
                              <ul className="space-y-1">
                                {errs.map((e, i) => (
                                  <li key={i} className="text-destructive font-mono">
                                    ETE {e.ete_id.slice(0, 8)} — {parseCortexError(e.error)}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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
        </CardContent>
      </Card>
    </div>
  );
}
