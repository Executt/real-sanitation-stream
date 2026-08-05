import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";
import { useTable } from "@/lib/useTable";
import { TablePagination } from "@/components/TablePagination";
import { HierarchyFilters } from "@/components/HierarchyFilters";
import { useHierarchyFilter } from "@/lib/useHierarchyFilter";
import { useAccessLog } from "@/hooks/useAccessLog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Droplets, Plus } from "lucide-react";
import {
  VULNERABILITY_LABEL, WATER_SOURCE_LABEL,
  type VulnerabilityLevel, type WaterSourceType,
} from "@/types/governance";

interface Row {
  id: string;
  org_id: string;
  nome: string;
  type: WaterSourceType;
  vulnerability_level: VulnerabilityLevel;
  gad_metric: number | null;
  vazao_outorgada_lps: number | null;
  vazao_disponivel_lps: number | null;
  uf: string | null;
  municipio: string | null;
}

const vulnColor: Record<VulnerabilityLevel, string> = {
  LOW: "bg-[hsl(var(--success))] text-white",
  MEDIUM: "bg-[hsl(var(--warning))] text-foreground",
  HIGH: "bg-orange-500 text-white",
  CRITICAL: "bg-destructive text-destructive-foreground",
};

export default function Mananciais() {
  const { currentOrg, orgs } = useOrg();
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const filter = useHierarchyFilter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nome: "", type: "SURFACE" as WaterSourceType, vulnerability_level: "MEDIUM" as VulnerabilityLevel,
    gad_metric: "", vazao_outorgada_lps: "", vazao_disponivel_lps: "", uf: "", municipio: "",
  });

  const load = async () => {
    setLoading(true);
    let q = supabase.from("water_sources").select("id, org_id, nome, type, vulnerability_level, gad_metric, vazao_outorgada_lps, vazao_disponivel_lps, uf, municipio").order("nome");
    q = filter.applyTo(q);
    const { data, error } = await q;
    if (error) toast({ title: "Erro ao carregar mananciais", description: error.message, variant: "destructive" });
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.key]);

  useAccessLog({ modulo: "Mananciais", orgId: filter.value.orgId === "all" ? null : filter.value.orgId, registros: rows.length, filtros: filter.auditFilters, key: filter.key, enabled: !loading });

  const table = useTable(rows, { pageSize: 20 });
  const orgName = (id: string) => orgs.find((o) => o.id === id)?.sigla || orgs.find((o) => o.id === id)?.name || "—";

  const save = async () => {
    if (!currentOrg) {
      toast({ title: "Sem organização vinculada", description: "Seu usuário precisa estar vinculado a uma organização para cadastrar mananciais.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("water_sources").insert({
      org_id: currentOrg.id,
      nome: form.nome,
      type: form.type,
      vulnerability_level: form.vulnerability_level,
      gad_metric: form.gad_metric ? Number(form.gad_metric) : null,
      vazao_outorgada_lps: form.vazao_outorgada_lps ? Number(form.vazao_outorgada_lps) : null,
      vazao_disponivel_lps: form.vazao_disponivel_lps ? Number(form.vazao_disponivel_lps) : null,
      uf: form.uf || null,
      municipio: form.municipio || null,
    });
    if (error) {
      toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Manancial cadastrado" });
    setOpen(false);
    setForm({ nome: "", type: "SURFACE", vulnerability_level: "MEDIUM", gad_metric: "", vazao_outorgada_lps: "", vazao_disponivel_lps: "", uf: "", municipio: "" });
    void load();
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Droplets className="size-5 text-primary" /> Mananciais
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">
            Fontes de captação, vulnerabilidade e grau de atendimento à demanda (GAD).
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="size-4 mr-1.5" /> Novo manancial</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar manancial</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as WaterSourceType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(WATER_SOURCE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Vulnerabilidade</Label>
                  <Select value={form.vulnerability_level} onValueChange={(v) => setForm({ ...form, vulnerability_level: v as VulnerabilityLevel })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(VULNERABILITY_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>GAD (%)</Label><Input type="number" value={form.gad_metric} onChange={(e) => setForm({ ...form, gad_metric: e.target.value })} /></div>
                <div><Label>Outorga (L/s)</Label><Input type="number" value={form.vazao_outorgada_lps} onChange={(e) => setForm({ ...form, vazao_outorgada_lps: e.target.value })} /></div>
                <div><Label>Disponível (L/s)</Label><Input type="number" value={form.vazao_disponivel_lps} onChange={(e) => setForm({ ...form, vazao_disponivel_lps: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>UF</Label><Input maxLength={2} value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} /></div>
                <div className="col-span-2"><Label>Município</Label><Input value={form.municipio} onChange={(e) => setForm({ ...form, municipio: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save} disabled={!form.nome}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <HierarchyFilters filter={filter} />

      <div className="bg-card border rounded-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Manancial</TableHead>
              <TableHead>Organização</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Vulnerabilidade</TableHead>
              <TableHead className="text-right">GAD</TableHead>
              <TableHead className="text-right">Outorga (L/s)</TableHead>
              <TableHead>Local</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
              ))
            ) : table.rows.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Nenhum manancial encontrado.</TableCell></TableRow>
            ) : (
              table.rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nome}</TableCell>
                  <TableCell className="text-xs font-mono">{orgName(r.org_id)}</TableCell>
                  <TableCell>{WATER_SOURCE_LABEL[r.type]}</TableCell>
                  <TableCell><Badge className={vulnColor[r.vulnerability_level]}>{VULNERABILITY_LABEL[r.vulnerability_level]}</Badge></TableCell>
                  <TableCell className="text-right font-mono">{r.gad_metric ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono">{r.vazao_outorgada_lps ?? "—"}</TableCell>
                  <TableCell className="text-xs">{[r.municipio, r.uf].filter(Boolean).join(" / ") || "—"}</TableCell>
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
