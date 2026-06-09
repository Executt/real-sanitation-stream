import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
import { Gavel, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Esfera = "federal" | "estadual" | "distrital" | "municipal";

interface Agencia {
  id: string;
  nome: string;
  sigla: string | null;
  esfera: Esfera;
  uf: string | null;
  municipio: string | null;
  cnpj: string | null;
  email_contato: string | null;
  site: string | null;
  telefone: string | null;
  endereco: string | null;
  observacoes: string | null;
  ativa: boolean;
}

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI",
  "RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const empty: Omit<Agencia, "id"> = {
  nome: "",
  sigla: "",
  esfera: "estadual",
  uf: "SP",
  municipio: "",
  cnpj: "",
  email_contato: "",
  site: "",
  telefone: "",
  endereco: "",
  observacoes: "",
  ativa: true,
};

export default function AgenciasReguladoras() {
  const { isSuperAdmin, isGestorAna, loading } = useAuth();
  const canManage = isSuperAdmin || isGestorAna;

  const [items, setItems] = useState<Agencia[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEsfera, setFilterEsfera] = useState<"all" | Esfera>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Agencia | null>(null);
  const [form, setForm] = useState<Omit<Agencia, "id">>(empty);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoadingData(true);
    const { data, error } = await supabase
      .from("agencias_reguladoras")
      .select("*")
      .order("nome", { ascending: true });
    if (error) {
      toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    } else {
      setItems((data ?? []) as Agencia[]);
    }
    setLoadingData(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (filterEsfera !== "all" && it.esfera !== filterEsfera) return false;
      if (!q) return true;
      return (
        it.nome.toLowerCase().includes(q) ||
        (it.sigla ?? "").toLowerCase().includes(q) ||
        (it.cnpj ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, search, filterEsfera]);

  const stats = useMemo(() => ({
    total: items.length,
    estaduais: items.filter((i) => i.esfera === "estadual").length,
    municipais: items.filter((i) => i.esfera === "municipal").length,
    ativas: items.filter((i) => i.ativa).length,
  }), [items]);

  const openCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (it: Agencia) => {
    setEditing(it);
    const { id: _id, ...rest } = it;
    setForm(rest);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome || !form.esfera) {
      toast({ title: "Campos obrigatórios", description: "Nome e Esfera são obrigatórios.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      sigla: form.sigla || null,
      cnpj: form.cnpj || null,
      uf: form.uf || null,
      municipio: form.municipio || null,
      email_contato: form.email_contato || null,
      site: form.site || null,
      telefone: form.telefone || null,
      endereco: form.endereco || null,
      observacoes: form.observacoes || null,
    };
    const { error } = editing
      ? await supabase.from("agencias_reguladoras").update(payload).eq("id", editing.id)
      : await supabase.from("agencias_reguladoras").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Atualizada" : "Cadastrada", description: form.nome });
    setOpen(false);
    fetchData();
  };

  const handleDelete = async (it: Agencia) => {
    if (!confirm(`Excluir "${it.nome}"?`)) return;
    const { error } = await supabase.from("agencias_reguladoras").delete().eq("id", it.id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Excluída", description: it.nome });
    fetchData();
  };

  if (loading) return null;
  if (!canManage) return <Navigate to="/operador" replace />;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Gavel className="size-6 text-primary" />
            Agências Reguladoras
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cadastro das ARs que supervisionam as concessionárias de saneamento
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4 mr-2" /> Nova agência
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-card border rounded-sm p-4">
          <p className="text-xs text-muted-foreground uppercase">Total</p>
          <p className="text-2xl font-semibold">{stats.total}</p>
        </div>
        <div className="bg-card border rounded-sm p-4">
          <p className="text-xs text-muted-foreground uppercase">Estaduais</p>
          <p className="text-2xl font-semibold text-primary">{stats.estaduais}</p>
        </div>
        <div className="bg-card border rounded-sm p-4">
          <p className="text-xs text-muted-foreground uppercase">Municipais</p>
          <p className="text-2xl font-semibold">{stats.municipais}</p>
        </div>
        <div className="bg-card border rounded-sm p-4">
          <p className="text-xs text-muted-foreground uppercase">Ativas</p>
          <p className="text-2xl font-semibold text-success">{stats.ativas}</p>
        </div>
      </div>

      <div className="bg-card border rounded-sm p-4 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, sigla ou CNPJ"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterEsfera} onValueChange={(v) => setFilterEsfera(v as typeof filterEsfera)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as esferas</SelectItem>
            <SelectItem value="federal">Federal</SelectItem>
            <SelectItem value="estadual">Estadual</SelectItem>
            <SelectItem value="distrital">Distrital</SelectItem>
            <SelectItem value="municipal">Municipal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border rounded-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sigla</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Esfera</TableHead>
              <TableHead>UF</TableHead>
              <TableHead>Município</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingData ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma agência cadastrada</TableCell></TableRow>
            ) : filtered.map((it) => (
              <TableRow key={it.id}>
                <TableCell className="font-mono text-xs">{it.sigla ?? "—"}</TableCell>
                <TableCell className="font-medium">{it.nome}</TableCell>
                <TableCell className="text-xs capitalize">{it.esfera}</TableCell>
                <TableCell className="font-mono text-xs">{it.uf ?? "—"}</TableCell>
                <TableCell className="text-xs">{it.municipio ?? "—"}</TableCell>
                <TableCell>
                  {it.ativa
                    ? <Badge className="bg-success/10 text-success border-success/30 text-[10px]">Ativa</Badge>
                    : <Badge variant="outline" className="text-[10px]">Inativa</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(it)}><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(it)}><Trash2 className="size-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar agência" : "Nova agência reguladora"}</DialogTitle>
            <DialogDescription>Preencha os dados da agência reguladora.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
            <div className="md:col-span-2">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div>
              <Label>Sigla</Label>
              <Input value={form.sigla ?? ""} onChange={(e) => setForm({ ...form, sigla: e.target.value })} placeholder="ARSESP, ADASA…" />
            </div>
            <div>
              <Label>Esfera *</Label>
              <Select value={form.esfera} onValueChange={(v) => setForm({ ...form, esfera: v as Esfera })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="federal">Federal</SelectItem>
                  <SelectItem value="estadual">Estadual</SelectItem>
                  <SelectItem value="distrital">Distrital</SelectItem>
                  <SelectItem value="municipal">Municipal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>UF</Label>
              <Select value={form.uf ?? ""} onValueChange={(v) => setForm({ ...form, uf: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {ESTADOS_BR.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Município</Label>
              <Input value={form.municipio ?? ""} onChange={(e) => setForm({ ...form, municipio: e.target.value })} />
            </div>
            <div>
              <Label>CNPJ</Label>
              <Input value={form.cnpj ?? ""} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
            </div>
            <div>
              <Label>E-mail de contato</Label>
              <Input value={form.email_contato ?? ""} onChange={(e) => setForm({ ...form, email_contato: e.target.value })} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Site</Label>
              <Input value={form.site ?? ""} onChange={(e) => setForm({ ...form, site: e.target.value })} placeholder="https://" />
            </div>
            <div className="md:col-span-2">
              <Label>Endereço</Label>
              <Input value={form.endereco ?? ""} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Observações</Label>
              <Textarea rows={3} value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="ativa-ar"
                checked={form.ativa}
                onChange={(e) => setForm({ ...form, ativa: e.target.checked })}
              />
              <Label htmlFor="ativa-ar" className="!mb-0">Agência ativa</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando…" : editing ? "Atualizar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
