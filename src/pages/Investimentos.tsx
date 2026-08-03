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
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Coins, Plus } from "lucide-react";
import {
  EPPO_LABEL, INVESTMENT_CATEGORY_LABEL, INVESTMENT_STATUS_LABEL,
  type EppoType, type InvestmentCategory, type InvestmentStatus,
} from "@/types/governance";

interface Row {
  id: string;
  org_id: string;
  titulo: string;
  category: InvestmentCategory;
  eppo: EppoType;
  estimated_value: number;
  status: InvestmentStatus;
  horizonte_ano: number | null;
  uf: string | null;
  municipio: string | null;
}

const statusColor: Record<InvestmentStatus, string> = {
  PLANEJADO: "bg-muted text-muted-foreground",
  EM_ANDAMENTO: "bg-[hsl(var(--warning))] text-foreground",
  CONCLUIDO: "bg-[hsl(var(--success))] text-white",
  CANCELADO: "bg-destructive text-destructive-foreground",
};

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function Investimentos() {
  const { currentOrg, orgs } = useOrg();
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState("all");
  const [uf, setUf] = useState("all");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    titulo: "", category: "PRODUCTION" as InvestmentCategory, eppo: "OBRA" as EppoType,
    estimated_value: "", status: "PLANEJADO" as InvestmentStatus, horizonte_ano: "",
    uf: "", municipio: "", descricao: "",
  });

  const load = async () => {
    setLoading(true);
    let q = supabase.from("investments_planning")
      .select("id, org_id, titulo, category, eppo, estimated_value, status, horizonte_ano, uf, municipio")
      .order("estimated_value", { ascending: false });
    if (orgId !== "all") q = q.eq("org_id", orgId);
    if (uf !== "all") q = q.eq("uf", uf);
    if (category !== "all") q = q.eq("category", category as InvestmentCategory);
    if (search.trim()) q = q.ilike("municipio", `%${search.trim()}%`);
    const { data, error } = await q;
    if (error) toast({ title: "Erro ao carregar investimentos", description: error.message, variant: "destructive" });
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, uf, search, category]);

  const table = useTable(rows, { pageSize: 20 });
  const orgName = (id: string) => orgs.find((o) => o.id === id)?.sigla || orgs.find((o) => o.id === id)?.name || "—";

  const chartData = useMemo(
    () =>
      (Object.keys(INVESTMENT_CATEGORY_LABEL) as InvestmentCategory[]).map((c) => ({
        categoria: INVESTMENT_CATEGORY_LABEL[c],
        valor: rows.filter((r) => r.category === c).reduce((a, r) => a + Number(r.estimated_value || 0), 0),
      })),
    [rows],
  );

  const total = rows.reduce((a, r) => a + Number(r.estimated_value || 0), 0);
  const emAndamento = rows.filter((r) => r.status === "EM_ANDAMENTO").length;

  const save = async () => {
    if (!currentOrg) {
      toast({ title: "Sem organização vinculada", description: "Vincule seu usuário a uma organização para registrar EPPOs.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("investments_planning").insert({
      org_id: currentOrg.id,
      titulo: form.titulo,
      category: form.category,
      eppo: form.eppo,
      estimated_value: form.estimated_value ? Number(form.estimated_value) : 0,
      status: form.status,
      horizonte_ano: form.horizonte_ano ? Number(form.horizonte_ano) : null,
      uf: form.uf || null,
      municipio: form.municipio || null,
      descricao: form.descricao || null,
    });
    if (error) {
      toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Investimento registrado" });
    setOpen(false);
    void load();
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Coins className="size-5 text-primary" /> Planejamento de Investimentos
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">
            Estudos, planos, projetos e obras (EPPOs) por categoria e horizonte de execução.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="size-4 mr-1.5" /> Novo EPPO</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar investimento</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Título</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Categoria</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as InvestmentCategory })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(INVESTMENT_CATEGORY_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>EPPO</Label>
                  <Select value={form.eppo} onValueChange={(v) => setForm({ ...form, eppo: v as EppoType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(EPPO_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Situação</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as InvestmentStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(INVESTMENT_STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Valor (R$)</Label><Input type="number" value={form.estimated_value} onChange={(e) => setForm({ ...form, estimated_value: e.target.value })} /></div>
                <div><Label>Horizonte</Label><Input type="number" value={form.horizonte_ano} onChange={(e) => setForm({ ...form, horizonte_ano: e.target.value })} /></div>
                <div><Label>UF</Label><Input maxLength={2} value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} /></div>
              </div>
              <div><Label>Município</Label><Input value={form.municipio} onChange={(e) => setForm({ ...form, municipio: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save} disabled={!form.titulo}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Investimento total" value={brl(total)} icon={Coins} />
        <StatCard label="EPPOs cadastrados" value={String(rows.length)} icon={Coins} />
        <StatCard label="Em andamento" value={String(emAndamento)} variant="warning" icon={Coins} />
      </div>

      <div className="bg-card border rounded-sm p-5 mb-6">
        <h2 className="text-sm font-semibold mb-4">Investimento por categoria</h2>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="categoria" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} />
              <Tooltip formatter={(v: number) => brl(v)} />
              <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <ModuleFilters orgId={orgId} onOrgId={setOrgId} uf={uf} onUf={setUf} search={search} onSearch={setSearch}>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-9 w-[200px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {Object.entries(INVESTMENT_CATEGORY_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </ModuleFilters>

      <div className="bg-card border rounded-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Organização</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>EPPO</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Horizonte</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
              ))
            ) : table.rows.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Nenhum investimento registrado.</TableCell></TableRow>
            ) : (
              table.rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.titulo}</TableCell>
                  <TableCell className="text-xs font-mono">{orgName(r.org_id)}</TableCell>
                  <TableCell>{INVESTMENT_CATEGORY_LABEL[r.category]}</TableCell>
                  <TableCell>{EPPO_LABEL[r.eppo]}</TableCell>
                  <TableCell className="text-right font-mono">{brl(Number(r.estimated_value))}</TableCell>
                  <TableCell className="text-right font-mono">{r.horizonte_ano ?? "—"}</TableCell>
                  <TableCell><Badge className={statusColor[r.status]}>{INVESTMENT_STATUS_LABEL[r.status]}</Badge></TableCell>
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
