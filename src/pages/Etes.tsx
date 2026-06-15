import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Activity, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

type Status = "ativa" | "em_construcao" | "inativa" | "manutencao";

interface Concessionaria {
  id: string;
  nome: string;
  sigla: string | null;
  uf: string;
  agencia_reguladora_id: string | null;
}

interface AgenciaOption {
  id: string;
  nome: string;
  sigla: string | null;
}

interface Ete {
  id: string;
  concessionaria_id: string | null;
  nome: string;
  codigo: string | null;
  municipio: string;
  uf: string;
  latitude: number | null;
  longitude: number | null;
  status: Status;
  tipo_tratamento: string | null;
  vazao_projeto_lps: number | null;
  vazao_atual_lps: number | null;
  populacao_atendida: number | null;
  data_inicio_operacao: string | null;
  observacoes: string | null;
}

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const STATUS_LABELS: Record<Status, string> = {
  ativa: "Ativa",
  em_construcao: "Em construção",
  inativa: "Inativa",
  manutencao: "Manutenção",
};

const STATUS_VARIANTS: Record<Status, string> = {
  ativa: "bg-success/10 text-success border-success/30",
  em_construcao: "bg-warning/10 text-warning border-warning/30",
  inativa: "bg-destructive/10 text-destructive border-destructive/30",
  manutencao: "bg-muted text-muted-foreground border-muted-foreground/30",
};

const eteSchema = z.object({
  nome: z.string().trim().min(1, "Nome obrigatório").max(200),
  codigo: z.string().trim().max(50).optional().or(z.literal("")),
  municipio: z.string().trim().min(1, "Município obrigatório").max(120),
  uf: z.string().length(2),
  status: z.enum(["ativa", "em_construcao", "inativa", "manutencao"]),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  vazao_projeto_lps: z.number().min(0).nullable(),
  vazao_atual_lps: z.number().min(0).nullable(),
  populacao_atendida: z.number().int().min(0).nullable(),
  tipo_tratamento: z.string().max(100).nullable(),
  observacoes: z.string().max(2000).nullable(),
});

const empty: Omit<Ete, "id"> = {
  concessionaria_id: null,
  nome: "",
  codigo: "",
  municipio: "",
  uf: "SP",
  latitude: null,
  longitude: null,
  status: "ativa",
  tipo_tratamento: "",
  vazao_projeto_lps: null,
  vazao_atual_lps: null,
  populacao_atendida: null,
  data_inicio_operacao: null,
  observacoes: "",
};

export default function Etes() {
  const { roles } = useAuth();
  const canWrite = roles.includes("operador") || roles.includes("superadmin");
  const canDelete = roles.includes("superadmin");

  const [etes, setEtes] = useState<Ete[]>([]);
  const [concessionarias, setConcessionarias] = useState<Concessionaria[]>([]);
  const [agencias, setAgencias] = useState<AgenciaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterConcessionaria, setFilterConcessionaria] = useState<string>("all");
  const [filterAgencia, setFilterAgencia] = useState<string>("all");
  const [filterUf, setFilterUf] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Ete | null>(null);
  const [form, setForm] = useState<Omit<Ete, "id">>(empty);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [etesRes, concRes, agRes] = await Promise.all([
      supabase.from("etes").select("*").order("nome"),
      supabase.from("concessionarias").select("id, nome, sigla, uf, agencia_reguladora_id").order("nome"),
      supabase.from("agencias_reguladoras").select("id, nome, sigla").order("nome"),
    ]);
    if (etesRes.error) toast({ title: "Erro ao carregar ETEs", description: etesRes.error.message, variant: "destructive" });
    if (concRes.error) toast({ title: "Erro ao carregar concessionárias", description: concRes.error.message, variant: "destructive" });
    setEtes((etesRes.data ?? []) as Ete[]);
    setConcessionarias((concRes.data ?? []) as Concessionaria[]);
    setAgencias((agRes.data ?? []) as AgenciaOption[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const concessionariaMap = useMemo(() => {
    const m = new Map<string, Concessionaria>();
    concessionarias.forEach((c) => m.set(c.id, c));
    return m;
  }, [concessionarias]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return etes.filter((e) => {
      if (filterConcessionaria !== "all" && e.concessionaria_id !== filterConcessionaria) return false;
      if (filterAgencia !== "all") {
        const conc = e.concessionaria_id ? concessionariaMap.get(e.concessionaria_id) : null;
        const arId = conc?.agencia_reguladora_id ?? null;
        if (filterAgencia === "none" ? arId !== null : arId !== filterAgencia) return false;
      }
      if (filterUf !== "all" && e.uf !== filterUf) return false;
      if (filterStatus !== "all" && e.status !== filterStatus) return false;
      if (!q) return true;
      return (
        e.nome.toLowerCase().includes(q) ||
        (e.codigo ?? "").toLowerCase().includes(q) ||
        e.municipio.toLowerCase().includes(q)
      );
    });
  }, [etes, search, filterConcessionaria, filterAgencia, filterUf, filterStatus, concessionariaMap]);

  const stats = useMemo(() => ({
    total: etes.length,
    ativas: etes.filter((e) => e.status === "ativa").length,
    construcao: etes.filter((e) => e.status === "em_construcao").length,
    inativas: etes.filter((e) => e.status === "inativa").length,
  }), [etes]);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (e: Ete) => {
    setEditing(e);
    const { id: _id, ...rest } = e;
    setForm({ ...rest, codigo: rest.codigo ?? "", tipo_tratamento: rest.tipo_tratamento ?? "", observacoes: rest.observacoes ?? "" });
    setOpen(true);
  };

  const handleSave = async () => {
    const parsed = eteSchema.safeParse({
      nome: form.nome,
      codigo: form.codigo ?? "",
      municipio: form.municipio,
      uf: form.uf,
      status: form.status,
      latitude: form.latitude,
      longitude: form.longitude,
      vazao_projeto_lps: form.vazao_projeto_lps,
      vazao_atual_lps: form.vazao_atual_lps,
      populacao_atendida: form.populacao_atendida,
      tipo_tratamento: form.tipo_tratamento || null,
      observacoes: form.observacoes || null,
    });
    if (!parsed.success) {
      toast({ title: "Dados inválidos", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload = {
      ...form,
      codigo: form.codigo || null,
      tipo_tratamento: form.tipo_tratamento || null,
      observacoes: form.observacoes || null,
      data_inicio_operacao: form.data_inicio_operacao || null,
      concessionaria_id: form.concessionaria_id || null,
    };

    const { error } = editing
      ? await supabase.from("etes").update(payload).eq("id", editing.id)
      : await supabase.from("etes").insert(payload);

    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "ETE atualizada" : "ETE cadastrada", description: form.nome });
    setOpen(false);
    fetchAll();
  };

  const handleDelete = async (e: Ete) => {
    if (!confirm(`Excluir ETE "${e.nome}"?`)) return;
    const { error } = await supabase.from("etes").delete().eq("id", e.id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "ETE excluída", description: e.nome });
    fetchAll();
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Activity className="size-6 text-primary" />
            Estações de Tratamento de Esgoto
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cadastro e monitoramento das ETEs vinculadas à sua concessionária
          </p>
        </div>
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="size-4 mr-2" /> Nova ETE
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-card border rounded-sm p-4">
          <p className="text-xs text-muted-foreground uppercase">Total</p>
          <p className="text-2xl font-semibold">{stats.total}</p>
        </div>
        <div className="bg-card border rounded-sm p-4">
          <p className="text-xs text-muted-foreground uppercase">Ativas</p>
          <p className="text-2xl font-semibold text-success">{stats.ativas}</p>
        </div>
        <div className="bg-card border rounded-sm p-4">
          <p className="text-xs text-muted-foreground uppercase">Em construção</p>
          <p className="text-2xl font-semibold text-warning">{stats.construcao}</p>
        </div>
        <div className="bg-card border rounded-sm p-4">
          <p className="text-xs text-muted-foreground uppercase">Inativas</p>
          <p className="text-2xl font-semibold text-destructive">{stats.inativas}</p>
        </div>
      </div>

      <div className="bg-card border rounded-sm p-4 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nome, código ou município" value={search}
            onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterConcessionaria} onValueChange={setFilterConcessionaria}>
          <SelectTrigger className="w-[240px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas concessionárias</SelectItem>
            {concessionarias.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.sigla ? `${c.sigla} — ${c.uf}` : `${c.nome} (${c.uf})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterUf} onValueChange={setFilterUf}>
          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas UF</SelectItem>
            {ESTADOS_BR.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border rounded-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Município/UF</TableHead>
              <TableHead>Concessionária</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Vazão (L/s)</TableHead>
              {canWrite && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma ETE encontrada</TableCell></TableRow>
            ) : filtered.map((e) => {
              const conc = e.concessionaria_id ? concessionariaMap.get(e.concessionaria_id) : null;
              return (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.codigo ?? "—"}</TableCell>
                  <TableCell className="font-medium">{e.nome}</TableCell>
                  <TableCell className="text-xs">{e.municipio}/{e.uf}</TableCell>
                  <TableCell className="text-xs">
                    {conc ? (conc.sigla ?? conc.nome) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${STATUS_VARIANTS[e.status]}`}>
                      {STATUS_LABELS[e.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {e.vazao_atual_lps ?? "—"} / {e.vazao_projeto_lps ?? "—"}
                  </TableCell>
                  {canWrite && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(e)}>
                        <Pencil className="size-4" />
                      </Button>
                      {canDelete && (
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(e)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar ETE" : "Nova ETE"}</DialogTitle>
            <DialogDescription>
              Vincule a estação à concessionária responsável e preencha os dados operacionais.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
            <div className="md:col-span-2">
              <Label>Concessionária responsável</Label>
              <Select
                value={form.concessionaria_id ?? "none"}
                onValueChange={(v) => setForm({ ...form, concessionaria_id: v === "none" ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sem vínculo —</SelectItem>
                  {concessionarias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.sigla ? `${c.sigla} (${c.uf}) — ${c.nome}` : `${c.nome} (${c.uf})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Nome *</Label>
              <Input value={form.nome} maxLength={200} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div>
              <Label>Código</Label>
              <Input value={form.codigo ?? ""} maxLength={50} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
            </div>
            <div>
              <Label>Status *</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Status })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Município *</Label>
              <Input value={form.municipio} maxLength={120} onChange={(e) => setForm({ ...form, municipio: e.target.value })} />
            </div>
            <div>
              <Label>UF *</Label>
              <Select value={form.uf} onValueChange={(v) => setForm({ ...form, uf: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ESTADOS_BR.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Latitude</Label>
              <Input type="number" step="0.0000001" value={form.latitude ?? ""}
                onChange={(e) => setForm({ ...form, latitude: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div>
              <Label>Longitude</Label>
              <Input type="number" step="0.0000001" value={form.longitude ?? ""}
                onChange={(e) => setForm({ ...form, longitude: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div className="md:col-span-2">
              <Label>Tipo de tratamento</Label>
              <Select value={form.tipo_tratamento ?? ""} onValueChange={(v) => setForm({ ...form, tipo_tratamento: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="preliminar">Preliminar</SelectItem>
                  <SelectItem value="primario">Primário</SelectItem>
                  <SelectItem value="secundario">Secundário</SelectItem>
                  <SelectItem value="terciario">Terciário</SelectItem>
                  <SelectItem value="lodos_ativados">Lodos Ativados</SelectItem>
                  <SelectItem value="UASB">UASB (Reator Anaeróbio)</SelectItem>
                  <SelectItem value="lagoa_estabilizacao">Lagoa de Estabilização</SelectItem>
                  <SelectItem value="filtro_biologico">Filtro Biológico</SelectItem>
                  <SelectItem value="MBR">MBR (Membranas)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vazão de projeto (L/s)</Label>
              <Input type="number" step="0.01" value={form.vazao_projeto_lps ?? ""}
                onChange={(e) => setForm({ ...form, vazao_projeto_lps: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div>
              <Label>Vazão atual (L/s)</Label>
              <Input type="number" step="0.01" value={form.vazao_atual_lps ?? ""}
                onChange={(e) => setForm({ ...form, vazao_atual_lps: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div>
              <Label>População atendida</Label>
              <Input type="number" value={form.populacao_atendida ?? ""}
                onChange={(e) => setForm({ ...form, populacao_atendida: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div>
              <Label>Início de operação</Label>
              <Input type="date" value={form.data_inicio_operacao ?? ""}
                onChange={(e) => setForm({ ...form, data_inicio_operacao: e.target.value || null })} />
            </div>
            <div className="md:col-span-2">
              <Label>Observações</Label>
              <Textarea rows={3} maxLength={2000} value={form.observacoes ?? ""}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !canWrite}>
              {saving ? "Salvando…" : editing ? "Atualizar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
