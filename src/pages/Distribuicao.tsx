import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";
import { useTable } from "@/lib/useTable";
import { TablePagination } from "@/components/TablePagination";
import { ModuleFilters } from "@/components/ModuleFilters";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Gauge, Plus, Waves } from "lucide-react";

interface Row {
  id: string;
  org_id: string;
  uf: string | null;
  municipio: string | null;
  ano_referencia: number;
  coverage_percentage: number | null;
  ivi_loss_index: number | null;
  tma_hours: number | null;
  pms_pressure: number | null;
}

/** Classificação técnica do IVI (Índice de Vazamentos da Infraestrutura). */
export function iviClass(ivi: number | null): { label: string; cls: string } {
  if (ivi == null) return { label: "—", cls: "bg-muted text-muted-foreground" };
  if (ivi < 2) return { label: "A — Excelente", cls: "bg-[hsl(var(--success))] text-white" };
  if (ivi < 4) return { label: "B — Bom", cls: "bg-[hsl(var(--ish-alta))] text-white" };
  if (ivi < 8) return { label: "C — Ruim", cls: "bg-[hsl(var(--warning))] text-foreground" };
  return { label: "D — Crítico", cls: "bg-destructive text-destructive-foreground" };
}

export default function Distribuicao() {
  const { currentOrg, orgs } = useOrg();
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState("all");
  const [uf, setUf] = useState("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    uf: "", municipio: "", ano_referencia: String(new Date().getFullYear()),
    coverage_percentage: "", ivi_loss_index: "", tma_hours: "", pms_pressure: "",
  });

  const load = async () => {
    setLoading(true);
    let q = supabase.from("distribution_metrics")
      .select("id, org_id, uf, municipio, ano_referencia, coverage_percentage, ivi_loss_index, tma_hours, pms_pressure")
      .order("ano_referencia", { ascending: false });
    if (orgId !== "all") q = q.eq("org_id", orgId);
    if (uf !== "all") q = q.eq("uf", uf);
    if (search.trim()) q = q.ilike("municipio", `%${search.trim()}%`);
    const { data, error } = await q;
    if (error) toast({ title: "Erro ao carregar indicadores", description: error.message, variant: "destructive" });
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, uf, search]);

  const table = useTable(rows, { pageSize: 20 });
  const orgName = (id: string) => orgs.find((o) => o.id === id)?.sigla || orgs.find((o) => o.id === id)?.name || "—";

  const kpis = useMemo(() => {
    const avg = (f: (r: Row) => number | null) => {
      const vals = rows.map(f).filter((v): v is number => v != null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    return {
      cobertura: avg((r) => r.coverage_percentage),
      ivi: avg((r) => r.ivi_loss_index),
      tma: avg((r) => r.tma_hours),
      criticos: rows.filter((r) => (r.ivi_loss_index ?? 0) >= 8).length,
    };
  }, [rows]);

  const save = async () => {
    if (!currentOrg) {
      toast({ title: "Sem organização vinculada", description: "Vincule seu usuário a uma organização para lançar indicadores.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("distribution_metrics").insert({
      org_id: currentOrg.id,
      uf: form.uf || null,
      municipio: form.municipio || null,
      ano_referencia: Number(form.ano_referencia),
      coverage_percentage: form.coverage_percentage ? Number(form.coverage_percentage) : null,
      ivi_loss_index: form.ivi_loss_index ? Number(form.ivi_loss_index) : null,
      tma_hours: form.tma_hours ? Number(form.tma_hours) : null,
      pms_pressure: form.pms_pressure ? Number(form.pms_pressure) : null,
    });
    if (error) {
      toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Indicador registrado" });
    setOpen(false);
    void load();
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Waves className="size-5 text-primary" /> Distribuição e Perdas
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">
            Cobertura, IVI (vazamentos), tempo médio de abastecimento (TMA) e pressão média (PMS).
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="size-4 mr-1.5" /> Novo lançamento</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar indicadores de distribuição</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-3 gap-3">
                <div><Label>UF</Label><Input maxLength={2} value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} /></div>
                <div className="col-span-2"><Label>Município</Label><Input value={form.municipio} onChange={(e) => setForm({ ...form, municipio: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Ano de referência</Label><Input type="number" value={form.ano_referencia} onChange={(e) => setForm({ ...form, ano_referencia: e.target.value })} /></div>
                <div><Label>Cobertura (%)</Label><Input type="number" value={form.coverage_percentage} onChange={(e) => setForm({ ...form, coverage_percentage: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>IVI</Label><Input type="number" step="0.1" value={form.ivi_loss_index} onChange={(e) => setForm({ ...form, ivi_loss_index: e.target.value })} /></div>
                <div><Label>TMA (h/dia)</Label><Input type="number" step="0.1" value={form.tma_hours} onChange={(e) => setForm({ ...form, tma_hours: e.target.value })} /></div>
                <div><Label>PMS (mca)</Label><Input type="number" step="0.1" value={form.pms_pressure} onChange={(e) => setForm({ ...form, pms_pressure: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Cobertura média" value={kpis.cobertura != null ? `${kpis.cobertura.toFixed(1)}%` : "—"} icon={Gauge} />
        <StatCard title="IVI médio" value={kpis.ivi != null ? kpis.ivi.toFixed(1) : "—"} icon={Waves} />
        <StatCard title="TMA médio" value={kpis.tma != null ? `${kpis.tma.toFixed(1)} h` : "—"} icon={Gauge} />
        <StatCard title="Municípios críticos" value={String(kpis.criticos)} icon={Waves} />
      </div>

      <ModuleFilters orgId={orgId} onOrgId={setOrgId} uf={uf} onUf={setUf} search={search} onSearch={setSearch} />

      <div className="bg-card border rounded-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Município</TableHead>
              <TableHead>Organização</TableHead>
              <TableHead className="text-right">Ano</TableHead>
              <TableHead className="text-right">Cobertura</TableHead>
              <TableHead className="text-right">IVI</TableHead>
              <TableHead>Classe IVI</TableHead>
              <TableHead className="text-right">TMA</TableHead>
              <TableHead className="text-right">PMS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
              ))
            ) : table.rows.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">Nenhum indicador lançado.</TableCell></TableRow>
            ) : (
              table.rows.map((r) => {
                const c = iviClass(r.ivi_loss_index);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{[r.municipio, r.uf].filter(Boolean).join(" / ") || "—"}</TableCell>
                    <TableCell className="text-xs font-mono">{orgName(r.org_id)}</TableCell>
                    <TableCell className="text-right font-mono">{r.ano_referencia}</TableCell>
                    <TableCell className="text-right font-mono">{r.coverage_percentage ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono">{r.ivi_loss_index ?? "—"}</TableCell>
                    <TableCell><Badge className={c.cls}>{c.label}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{r.tma_hours ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono">{r.pms_pressure ?? "—"}</TableCell>
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
