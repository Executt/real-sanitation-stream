import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";
import { useTable } from "@/lib/useTable";
import { TablePagination } from "@/components/TablePagination";
import { ModuleFilters } from "@/components/ModuleFilters";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, Droplets, Waves } from "lucide-react";
import { ISH_CLASS_LABEL, ISH_CLASS_TOKEN, type IshClass } from "@/types/governance";

interface Row {
  org_id: string | null;
  uf: string | null;
  municipio: string | null;
  ibge_code: string | null;
  production_score: number | null;
  distribution_score: number | null;
  ish_score: number | null;
  ish_class: IshClass | null;
}

const CLASSES: IshClass[] = ["MINIMA", "BAIXA", "MEDIA", "ALTA", "MAXIMA"];

export default function IshDashboard() {
  const { orgs } = useOrg();
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState("all");
  const [uf, setUf] = useState("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    let q = supabase.from("ish_urban_index").select("*");
    if (orgId !== "all") q = q.eq("org_id", orgId);
    if (uf !== "all") q = q.eq("uf", uf);
    if (search.trim()) q = q.ilike("municipio", `%${search.trim()}%`);
    const { data, error } = await q;
    if (error) toast({ title: "Erro ao calcular o ISH-U", description: error.message, variant: "destructive" });
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, uf, search]);

  const table = useTable(rows, { pageSize: 20 });
  const orgName = (id: string | null) =>
    (id && (orgs.find((o) => o.id === id)?.sigla || orgs.find((o) => o.id === id)?.name)) || "—";

  const stats = useMemo(() => {
    const dist = CLASSES.map((c) => ({ c, n: rows.filter((r) => r.ish_class === c).length }));
    const avg = (f: (r: Row) => number | null) => {
      const v = rows.map(f).filter((x): x is number => x != null);
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
    };
    return {
      dist,
      ish: avg((r) => r.ish_score),
      prod: avg((r) => r.production_score),
      distScore: avg((r) => r.distribution_score),
      criticos: rows.filter((r) => r.ish_class === "MINIMA" || r.ish_class === "BAIXA").length,
    };
  }, [rows]);

  const maxN = Math.max(1, ...stats.dist.map((d) => d.n));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" /> Segurança Hídrica Urbana (ISH-U)
        </h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">
          Índice composto por eficiência de produção (mananciais e sistemas) e de distribuição (cobertura, IVI, TMA, PMS).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="ISH-U médio" value={stats.ish != null ? stats.ish.toFixed(1) : "—"} icon={ShieldCheck} />
        <StatCard label="Eficiência de produção" value={stats.prod != null ? stats.prod.toFixed(1) : "—"} icon={Droplets} />
        <StatCard label="Eficiência de distribuição" value={stats.distScore != null ? stats.distScore.toFixed(1) : "—"} icon={Waves} />
        <StatCard label="Municípios em risco" value={String(stats.criticos)} variant={stats.criticos > 0 ? "destructive" : "default"} icon={ShieldCheck} />
      </div>

      <div className="bg-card border rounded-sm p-5 mb-6">
        <h2 className="text-sm font-semibold mb-4">Distribuição por classe de segurança hídrica</h2>
        <div className="space-y-2">
          {stats.dist.map(({ c, n }) => (
            <div key={c} className="flex items-center gap-3">
              <span className="w-20 text-xs font-mono text-muted-foreground">{ISH_CLASS_LABEL[c]}</span>
              <div className="flex-1 h-4 bg-muted rounded-sm overflow-hidden">
                <div className={ISH_CLASS_TOKEN[c] + " h-full"} style={{ width: `${(n / maxN) * 100}%` }} />
              </div>
              <span className="w-10 text-right text-xs font-mono">{n}</span>
            </div>
          ))}
        </div>
      </div>

      <ModuleFilters orgId={orgId} onOrgId={setOrgId} uf={uf} onUf={setUf} search={search} onSearch={setSearch} />

      <div className="bg-card border rounded-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Município</TableHead>
              <TableHead>Organização</TableHead>
              <TableHead className="text-right">Produção</TableHead>
              <TableHead className="text-right">Distribuição</TableHead>
              <TableHead className="text-right">ISH-U</TableHead>
              <TableHead>Classe</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
              ))
            ) : table.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                  Sem dados suficientes — cadastre sistemas produtores e indicadores de distribuição.
                </TableCell>
              </TableRow>
            ) : (
              table.rows.map((r, i) => (
                <TableRow key={`${r.org_id}-${r.ibge_code ?? r.municipio ?? i}`}>
                  <TableCell className="font-medium">{[r.municipio, r.uf].filter(Boolean).join(" / ") || "—"}</TableCell>
                  <TableCell className="text-xs font-mono">{orgName(r.org_id)}</TableCell>
                  <TableCell className="text-right font-mono">{r.production_score ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono">{r.distribution_score ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{r.ish_score ?? "—"}</TableCell>
                  <TableCell>
                    {r.ish_class && <Badge className={ISH_CLASS_TOKEN[r.ish_class]}>{ISH_CLASS_LABEL[r.ish_class]}</Badge>}
                  </TableCell>
                </TableRow>
              ))
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
