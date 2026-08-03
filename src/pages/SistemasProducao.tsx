import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";
import { useTable } from "@/lib/useTable";
import { TablePagination } from "@/components/TablePagination";
import { ModuleFilters } from "@/components/ModuleFilters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Factory, Plus } from "lucide-react";
import {
  PRODUCTION_STATUS_LABEL, PRODUCTION_TYPE_LABEL,
  type ProductionSystemStatus, type ProductionSystemType,
} from "@/types/governance";

interface Row {
  id: string;
  org_id: string;
  nome: string;
  type: ProductionSystemType;
  status: ProductionSystemStatus;
  capacidade_instalada_lps: number | null;
  demanda_2035_lps: number | null;
  gad_metric: number | null;
  uf: string | null;
  municipio: string | null;
}

const statusColor: Record<ProductionSystemStatus, string> = {
  SATISFACTORY: "bg-[hsl(var(--success))] text-white",
  NEEDS_ADEQUATION: "bg-[hsl(var(--warning))] text-foreground",
  NEEDS_AMPLIFICATION: "bg-destructive text-destructive-foreground",
};

export default function SistemasProducao() {
  const { currentOrg, orgs } = useOrg();
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState("all");
  const [uf, setUf] = useState("all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nome: "", type: "ISOLATED" as ProductionSystemType, status: "SATISFACTORY" as ProductionSystemStatus,
    capacidade_instalada_lps: "", demanda_2035_lps: "", gad_metric: "", uf: "", municipio: "",
  });

  const load = async () => {
    setLoading(true);
    let q = supabase.from("production_systems").select("id, org_id, nome, type, status, capacidade_instalada_lps, demanda_2035_lps, gad_metric, uf, municipio").order("nome");
    if (orgId !== "all") q = q.eq("org_id", orgId);
    if (uf !== "all") q = q.eq("uf", uf);
    if (status !== "all") q = q.eq("status", status as ProductionSystemStatus);
    if (search.trim()) q = q.ilike("municipio", `%${search.trim()}%`);
    const { data, error } = await q;
    if (error) toast({ title: "Erro ao carregar sistemas", description: error.message, variant: "destructive" });
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, uf, search, status]);

  const table = useTable(rows, { pageSize: 20 });
  const orgName = (id: string) => orgs.find((o) => o.id === id)?.sigla || orgs.find((o) => o.id === id)?.name || "—";

  const save = async () => {
    if (!currentOrg) {
      toast({ title: "Sem organização vinculada", description: "Vincule seu usuário a uma organização para cadastrar sistemas produtores.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("production_systems").insert({
      org_id: currentOrg.id,
      nome: form.nome,
      type: form.type,
      status: form.status,
      capacidade_instalada_lps: form.capacidade_instalada_lps ? Number(form.capacidade_instalada_lps) : null,
      demanda_2035_lps: form.demanda_2035_lps ? Number(form.demanda_2035_lps) : null,
      gad_metric: form.gad_metric ? Number(form.gad_metric) : null,
      uf: form.uf || null,
      municipio: form.municipio || null,
    });
    if (error) {
      toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Sistema produtor cadastrado" });
    setOpen(false);
    void load();
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Factory className="size-5 text-primary" /> Sistemas Produtores
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">
            Sistemas isolados e integrados: capacidade instalada versus demanda projetada.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="size-4 mr-1.5" /> Novo sistema</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar sistema produtor</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as ProductionSystemType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(PRODUCTION_TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Situação</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ProductionSystemStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(PRODUCTION_STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Capacidade (L/s)</Label><Input type="number" value={form.capacidade_instalada_lps} onChange={(e) => setForm({ ...form, capacidade_instalada_lps: e.target.value })} /></div>
                <div><Label>Demanda 2035</Label><Input type="number" value={form.demanda_2035_lps} onChange={(e) => setForm({ ...form, demanda_2035_lps: e.target.value })} /></div>
                <div><Label>GAD (%)</Label><Input type="number" value={form.gad_metric} onChange={(e) => setForm({ ...form, gad_metric: e.target.value })} /></div>
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

      <ModuleFilters orgId={orgId} onOrgId={setOrgId} uf={uf} onUf={setUf} search={search} onSearch={setSearch}>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-[200px]"><SelectValue placeholder="Situação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as situações</SelectItem>
            {Object.entries(PRODUCTION_STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </ModuleFilters>

      <div className="bg-card border rounded-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sistema</TableHead>
              <TableHead>Organização</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right">Capacidade</TableHead>
              <TableHead className="text-right">Demanda 2035</TableHead>
              <TableHead>Local</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
              ))
            ) : table.rows.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Nenhum sistema encontrado.</TableCell></TableRow>
            ) : (
              table.rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nome}</TableCell>
                  <TableCell className="text-xs font-mono">{orgName(r.org_id)}</TableCell>
                  <TableCell>{PRODUCTION_TYPE_LABEL[r.type]}</TableCell>
                  <TableCell><Badge className={statusColor[r.status]}>{PRODUCTION_STATUS_LABEL[r.status]}</Badge></TableCell>
                  <TableCell className="text-right font-mono">{r.capacidade_instalada_lps ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono">{r.demanda_2035_lps ?? "—"}</TableCell>
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
