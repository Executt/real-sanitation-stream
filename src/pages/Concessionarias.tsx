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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Tipo = "concessionaria" | "agencia_reguladora";

interface Concessionaria {
  id: string;
  nome: string;
  sigla: string | null;
  tipo: Tipo;
  natureza: string | null;
  cnpj: string | null;
  uf: string;
  abrangencia: string | null;
  municipios_atendidos: number | null;
  populacao_atendida: number | null;
  site: string | null;
  email_contato: string | null;
  telefone: string | null;
  endereco: string | null;
  ativa: boolean;
  observacoes: string | null;
  agencia_reguladora_id: string | null;
}

interface AgenciaOption {
  id: string;
  nome: string;
  sigla: string | null;
  uf: string | null;
}

const ESTADOS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const empty: Omit<Concessionaria, "id"> = {
  nome: "",
  sigla: "",
  tipo: "concessionaria",
  natureza: "",
  cnpj: "",
  uf: "SP",
  abrangencia: "estadual",
  municipios_atendidos: null,
  populacao_atendida: null,
  site: "",
  email_contato: "",
  telefone: "",
  endereco: "",
  ativa: true,
  observacoes: "",
  agencia_reguladora_id: null,
};

export default function Concessionarias() {
  const { isSuperAdmin, loading } = useAuth();
  const [items, setItems] = useState<Concessionaria[]>([]);
  const [agencias, setAgencias] = useState<AgenciaOption[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState<"all" | Tipo>("all");
  const [filterUf, setFilterUf] = useState<string>("all");
  const [filterAgencia, setFilterAgencia] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Concessionaria | null>(null);
  const [form, setForm] = useState<Omit<Concessionaria, "id">>(empty);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoadingData(true);
    const [{ data, error }, agRes] = await Promise.all([
      supabase.from("concessionarias").select("*").order("nome", { ascending: true }),
      supabase.from("agencias_reguladoras").select("id, nome, sigla, uf").order("nome"),
    ]);
    if (error) {
      toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    } else {
      setItems((data ?? []) as Concessionaria[]);
    }
    setAgencias((agRes.data ?? []) as AgenciaOption[]);
    setLoadingData(false);
  };

  useEffect(() => {
    if (isSuperAdmin) fetchData();
  }, [isSuperAdmin]);

  const agenciaMap = useMemo(() => {
    const m = new Map<string, AgenciaOption>();
    agencias.forEach((a) => m.set(a.id, a));
    return m;
  }, [agencias]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (filterTipo !== "all" && it.tipo !== filterTipo) return false;
      if (filterUf !== "all" && it.uf !== filterUf) return false;
      if (filterAgencia !== "all") {
        if (filterAgencia === "none" ? it.agencia_reguladora_id : it.agencia_reguladora_id !== filterAgencia) return false;
      }
      if (!q) return true;
      return (
        it.nome.toLowerCase().includes(q) ||
        (it.sigla ?? "").toLowerCase().includes(q) ||
        (it.cnpj ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, search, filterTipo, filterUf, filterAgencia]);


  const stats = useMemo(() => ({
    total: items.length,
    concessionarias: items.filter((i) => i.tipo === "concessionaria").length,
    agencias: items.filter((i) => i.tipo === "agencia_reguladora").length,
    ativas: items.filter((i) => i.ativa).length,
  }), [items]);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (it: Concessionaria) => {
    setEditing(it);
    const { id: _id, ...rest } = it;
    setForm(rest);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome || !form.uf || !form.tipo) {
      toast({ title: "Campos obrigatórios", description: "Nome, UF e Tipo são obrigatórios.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      sigla: form.sigla || null,
      cnpj: form.cnpj || null,
      natureza: form.natureza || null,
      abrangencia: form.abrangencia || null,
      site: form.site || null,
      email_contato: form.email_contato || null,
      telefone: form.telefone || null,
      endereco: form.endereco || null,
      observacoes: form.observacoes || null,
      municipios_atendidos: form.municipios_atendidos || null,
      populacao_atendida: form.populacao_atendida || null,
      agencia_reguladora_id: form.agencia_reguladora_id || null,
    };

    const { error } = editing
      ? await supabase.from("concessionarias").update(payload).eq("id", editing.id)
      : await supabase.from("concessionarias").insert(payload);

    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Atualizado" : "Cadastrado", description: form.nome });
    setOpen(false);
    fetchData();
  };

  const handleDelete = async (it: Concessionaria) => {
    if (!confirm(`Excluir "${it.nome}"?`)) return;
    const { error } = await supabase.from("concessionarias").delete().eq("id", it.id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Excluído", description: it.nome });
    fetchData();
  };

  if (loading) return null;
  if (!isSuperAdmin) return <Navigate to="/operador" replace />;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Building2 className="size-6 text-primary" />
            Concessionárias & Agências Reguladoras
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cadastro nacional de operadores de saneamento e órgãos reguladores
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4 mr-2" /> Nova entidade
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-card border rounded-sm p-4">
          <p className="text-xs text-muted-foreground uppercase">Total</p>
          <p className="text-2xl font-semibold">{stats.total}</p>
        </div>
        <div className="bg-card border rounded-sm p-4">
          <p className="text-xs text-muted-foreground uppercase">Concessionárias</p>
          <p className="text-2xl font-semibold text-primary">{stats.concessionarias}</p>
        </div>
        <div className="bg-card border rounded-sm p-4">
          <p className="text-xs text-muted-foreground uppercase">Agências</p>
          <p className="text-2xl font-semibold">{stats.agencias}</p>
        </div>
        <div className="bg-card border rounded-sm p-4">
          <p className="text-xs text-muted-foreground uppercase">Ativas</p>
          <p className="text-2xl font-semibold text-success">{stats.ativas}</p>
        </div>
      </div>

      {/* Filtros */}
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
        <Select value={filterTipo} onValueChange={(v) => setFilterTipo(v as typeof filterTipo)}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="concessionaria">Concessionária</SelectItem>
            <SelectItem value="agencia_reguladora">Agência Reguladora</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterUf} onValueChange={setFilterUf}>
          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas UF</SelectItem>
            {ESTADOS_BR.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <div className="bg-card border rounded-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sigla</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>UF</TableHead>
              <TableHead>Abrangência</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingData ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum registro encontrado</TableCell></TableRow>
            ) : filtered.map((it) => (
              <TableRow key={it.id}>
                <TableCell className="font-mono text-xs">{it.sigla ?? "—"}</TableCell>
                <TableCell className="font-medium">{it.nome}</TableCell>
                <TableCell>
                  <Badge variant={it.tipo === "agencia_reguladora" ? "secondary" : "default"} className="text-[10px]">
                    {it.tipo === "agencia_reguladora" ? "Agência" : "Concessionária"}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{it.uf}</TableCell>
                <TableCell className="text-xs capitalize">{it.abrangencia ?? "—"}</TableCell>
                <TableCell>
                  {it.ativa ? (
                    <Badge className="bg-success/10 text-success border-success/30 text-[10px]">Ativa</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Inativa</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(it)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(it)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog Form */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar entidade" : "Nova entidade"}</DialogTitle>
            <DialogDescription>
              Preencha os dados da concessionária ou agência reguladora.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
            <div className="md:col-span-2">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div>
              <Label>Sigla</Label>
              <Input value={form.sigla ?? ""} onChange={(e) => setForm({ ...form, sigla: e.target.value })} />
            </div>
            <div>
              <Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as Tipo })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="concessionaria">Concessionária</SelectItem>
                  <SelectItem value="agencia_reguladora">Agência Reguladora</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Natureza</Label>
              <Select value={form.natureza ?? ""} onValueChange={(v) => setForm({ ...form, natureza: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="estatal">Estatal</SelectItem>
                  <SelectItem value="mista">Sociedade de Economia Mista</SelectItem>
                  <SelectItem value="privada">Privada</SelectItem>
                  <SelectItem value="autarquia">Autarquia</SelectItem>
                  <SelectItem value="autarquia_estadual">Autarquia Estadual</SelectItem>
                  <SelectItem value="autarquia_federal">Autarquia Federal</SelectItem>
                  <SelectItem value="autarquia_municipal">Autarquia Municipal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>CNPJ</Label>
              <Input value={form.cnpj ?? ""} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
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
              <Label>Abrangência</Label>
              <Select value={form.abrangencia ?? ""} onValueChange={(v) => setForm({ ...form, abrangencia: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="federal">Federal</SelectItem>
                  <SelectItem value="estadual">Estadual</SelectItem>
                  <SelectItem value="distrital">Distrital</SelectItem>
                  <SelectItem value="regional">Regional</SelectItem>
                  <SelectItem value="municipal">Municipal</SelectItem>
                  <SelectItem value="multiestadual">Multiestadual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Municípios atendidos</Label>
              <Input
                type="number"
                value={form.municipios_atendidos ?? ""}
                onChange={(e) => setForm({ ...form, municipios_atendidos: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
            <div>
              <Label>População atendida</Label>
              <Input
                type="number"
                value={form.populacao_atendida ?? ""}
                onChange={(e) => setForm({ ...form, populacao_atendida: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Site</Label>
              <Input value={form.site ?? ""} onChange={(e) => setForm({ ...form, site: e.target.value })} placeholder="https://" />
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
              <Label>Endereço</Label>
              <Input value={form.endereco ?? ""} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Observações</Label>
              <Textarea
                rows={3}
                value={form.observacoes ?? ""}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="ativa"
                checked={form.ativa}
                onChange={(e) => setForm({ ...form, ativa: e.target.checked })}
              />
              <Label htmlFor="ativa" className="!mb-0">Entidade ativa</Label>
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
