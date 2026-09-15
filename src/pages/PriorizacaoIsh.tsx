import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTable } from "@/lib/useTable";
import { TablePagination } from "@/components/TablePagination";
import { HierarchyFilters } from "@/components/HierarchyFilters";
import { useHierarchyFilter } from "@/lib/useHierarchyFilter";
import { useAccessLog } from "@/hooks/useAccessLog";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Target, TrendingDown, Wallet } from "lucide-react";

interface Row {
  ibge_code: string | null;
  municipio: string | null;
  uf: string | null;
  intervencoes: number | null;
  total_previsto: number | null;
  deficit: number | null;
  producao: number | null;
  distribuicao: number | null;
  reposicao: number | null;
  esgotamento: number | null;
  ish_u: string | null;
  cobertura: number | null;
  perdas: string | null;
  populacao_urbana: number | null;
  ano_ish: number | null;
}

/** Quanto menor a segurança hídrica oficial, maior o peso de risco (0–100). */
const ISH_RISCO: Record<string, number> = {
  minima: 100, baixa: 80, media: 55, mediana: 55, alta: 25, maxima: 5, normal: 25,
};

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

const brl = (v: number | null) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

interface Ranked extends Row {
  risco: number | null;
  deficitPerCapita: number | null;
  score: number;
}

export default function PriorizacaoIsh() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const filter = useHierarchyFilter();

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("prioridade_investimento")
      .select("*")
      .order("deficit", { ascending: false, nullsFirst: false })
      .limit(1000);
    q = filter.applyTo(q, { orgColumn: null });
    const { data, error } = await q;
    if (error) toast({ title: "Erro ao carregar a priorização", description: error.message, variant: "destructive" });
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.key]);

  useAccessLog({
    modulo: "Priorização ISH-U × Déficit", orgId: null, registros: rows.length,
    filtros: filter.auditFilters, key: filter.key, enabled: !loading,
  });

  const ranked = useMemo<Ranked[]>(() => {
    const maxDef = Math.max(1, ...rows.map((r) => Number(r.deficit ?? 0)));
    return rows
      .map((r) => {
        const risco = r.ish_u ? ISH_RISCO[norm(r.ish_u)] ?? null : null;
        const def = Number(r.deficit ?? 0);
        const pesoDeficit = (def / maxDef) * 100;
        const pop = r.populacao_urbana && r.populacao_urbana > 0 ? r.populacao_urbana : null;
        return {
          ...r,
          risco,
          deficitPerCapita: pop ? def / pop : null,
          score: risco == null ? pesoDeficit : pesoDeficit * 0.6 + risco * 0.4,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [rows]);

  const comIsh = ranked.filter((r) => r.risco != null).length;
  const totalDeficit = ranked.reduce((a, r) => a + Number(r.deficit ?? 0), 0);
  const criticos = ranked.filter((r) => (r.risco ?? 0) >= 80).length;

  const table = useTable(ranked, { pageSize: 20 });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Target className="size-5 text-primary" /> Priorização: ISH-U × Déficit de Investimento
        </h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">
          Cruzamento do índice oficial de segurança hídrica urbana com o investimento ainda não executado por município.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Municípios avaliados" value={String(ranked.length)} icon={Target} />
        <StatCard label="Déficit acumulado" value={brl(totalDeficit)} icon={Wallet} />
        <StatCard label="Com ISH-U oficial" value={String(comIsh)} icon={TrendingDown}
          variant={comIsh ? undefined : "warning"} />
        <StatCard label="Segurança hídrica crítica" value={String(criticos)} icon={AlertTriangle}
          variant={criticos ? "destructive" : undefined} />
      </div>

      {!loading && comIsh === 0 && (
        <Alert className="mb-6">
          <AlertTriangle className="size-4" />
          <AlertTitle>Ranking baseado apenas no déficit financeiro</AlertTitle>
          <AlertDescription className="text-sm">
            Nenhum indicador oficial de segurança hídrica foi importado ainda. Importe a planilha de Segurança Hídrica
            em <strong>Atlas Águas → Importação</strong> para o ranking considerar também o ISH-U.
          </AlertDescription>
        </Alert>
      )}

      <HierarchyFilters filter={filter} />

      <div className="bg-card border rounded-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Município</TableHead>
              <TableHead>ISH-U oficial</TableHead>
              <TableHead className="text-right">Cobertura</TableHead>
              <TableHead className="text-right">Perdas</TableHead>
              <TableHead className="text-right">Déficit</TableHead>
              <TableHead className="text-right">Déficit / hab.</TableHead>
              <TableHead className="text-right">Intervenções</TableHead>
              <TableHead className="text-right">Prioridade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
              ))
            ) : table.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                  Nenhum município encontrado para este filtro.
                </TableCell>
              </TableRow>
            ) : (
              table.rows.map((r, i) => {
                const pos = (table.page - 1) * table.pageSize + i + 1;
                return (
                  <TableRow key={r.ibge_code ?? pos}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{pos}</TableCell>
                    <TableCell className="font-medium">
                      {[r.municipio, r.uf].filter(Boolean).join(" / ") || "—"}
                    </TableCell>
                    <TableCell>
                      {r.ish_u
                        ? <Badge variant={(r.risco ?? 0) >= 80 ? "destructive" : "outline"}>{r.ish_u}</Badge>
                        : <span className="text-xs text-muted-foreground">sem dado</span>}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {r.cobertura != null ? `${Number(r.cobertura).toFixed(1)}%` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">{r.perdas ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono">{brl(Number(r.deficit ?? 0))}</TableCell>
                    <TableCell className="text-right font-mono">
                      {r.deficitPerCapita != null ? brl(r.deficitPerCapita) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">{r.intervencoes ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-2 w-20 bg-muted rounded-sm overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${Math.min(100, r.score)}%` }} />
                        </div>
                        <span className="font-mono text-xs w-8">{r.score.toFixed(0)}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <TablePagination
          page={table.page} pageCount={table.pageCount} pageSize={table.pageSize}
          total={table.total} onPageChange={table.setPage} onPageSizeChange={table.setPageSize}
        />
      </div>
    </div>
  );
}
