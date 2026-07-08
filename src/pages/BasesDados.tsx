import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Database, Plus, Pencil, Trash2, KeyRound } from "lucide-react";

const TIPOS = [
  { value: "postgres", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL / MariaDB" },
  { value: "oracle", label: "Oracle" },
  { value: "sqlserver", label: "SQL Server" },
  { value: "mongodb", label: "MongoDB" },
  { value: "snowflake", label: "Snowflake" },
  { value: "bigquery", label: "Google BigQuery" },
  { value: "clickhouse", label: "ClickHouse" },
  { value: "duckdb", label: "DuckDB" },
  { value: "outro", label: "Outro" },
] as const;

type Base = {
  id: string;
  nome: string;
  tipo: string;
  descricao: string | null;
  host: string | null;
  porta: number | null;
  database_name: string | null;
  usuario: string | null;
  ssl_mode: string | null;
  config: Record<string, unknown>;
  secret_ref: string | null;
  ativo: boolean;
  created_at: string;
};

const emptyForm = () => ({
  id: "",
  nome: "",
  tipo: "postgres",
  descricao: "",
  host: "",
  porta: "",
  database_name: "",
  usuario: "",
  ssl_mode: "require",
  config: "{}",
  secret_ref: "",
  ativo: true,
});

export default function BasesDados() {
  const { isSuperAdmin, loading } = useAuth();
  const [items, setItems] = useState<Base[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoadingList(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("bases_dados_externas")
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data as Base[]) ?? []);
    setLoadingList(false);
  }
  useEffect(() => {
    load();
  }, []);

  if (loading) return null;
  if (!isSuperAdmin) return <Navigate to="/operador" replace />;

  function edit(b: Base) {
    setForm({
      id: b.id,
      nome: b.nome,
      tipo: b.tipo,
      descricao: b.descricao ?? "",
      host: b.host ?? "",
      porta: b.porta ? String(b.porta) : "",
      database_name: b.database_name ?? "",
      usuario: b.usuario ?? "",
      ssl_mode: b.ssl_mode ?? "require",
      config: JSON.stringify(b.config ?? {}, null, 2),
      secret_ref: b.secret_ref ?? "",
      ativo: b.ativo,
    });
    setOpen(true);
  }

  function novo() {
    setForm(emptyForm());
    setOpen(true);
  }

  async function salvar() {
    setSaving(true);
    let configParsed: Record<string, unknown> = {};
    try {
      configParsed = JSON.parse(form.config || "{}");
    } catch {
      setSaving(false);
      toast({ title: "JSON inválido em 'config'", variant: "destructive" });
      return;
    }
    const payload = {
      nome: form.nome,
      tipo: form.tipo,
      descricao: form.descricao || null,
      host: form.host || null,
      porta: form.porta ? Number(form.porta) : null,
      database_name: form.database_name || null,
      usuario: form.usuario || null,
      ssl_mode: form.ssl_mode || null,
      config: configParsed,
      secret_ref: form.secret_ref || null,
      ativo: form.ativo,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyClient = supabase as any;
    const { error } = form.id
      ? await anyClient.from("bases_dados_externas").update(payload).eq("id", form.id)
      : await anyClient.from("bases_dados_externas").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Falha ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: form.id ? "Base atualizada" : "Base criada" });
    setOpen(false);
    load();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir esta base de dados?")) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("bases_dados_externas").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Base excluída" });
    load();
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin"><ArrowLeft className="size-4 mr-1" /> Voltar</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Database className="size-6 text-primary" />
            Bases de Dados Externas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cadastre bases relacionais (Postgres, Oracle, MySQL, SQL Server), colunares/lakehouse (Snowflake, BigQuery,
            ClickHouse) e demais fontes que os modelos Córtex podem consultar.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={novo}><Plus className="size-4 mr-2" /> Nova base</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{form.id ? "Editar base" : "Nova base"}</DialogTitle>
            </DialogHeader>

            <Alert className="mb-2">
              <KeyRound className="size-4" />
              <AlertDescription className="text-xs">
                <strong>Senhas nunca são armazenadas nesta tabela.</strong> Cadastre-as como segredo no Lovable Cloud e
                informe apenas o <em>nome</em> do segredo em "Referência de segredo".
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome"><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field>
              <Field label="Tipo">
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Host"><Input value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} /></Field>
              <Field label="Porta"><Input type="number" value={form.porta} onChange={(e) => setForm({ ...form, porta: e.target.value })} /></Field>
              <Field label="Database"><Input value={form.database_name} onChange={(e) => setForm({ ...form, database_name: e.target.value })} /></Field>
              <Field label="Usuário"><Input value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} /></Field>
              <Field label="SSL mode">
                <Select value={form.ssl_mode} onValueChange={(v) => setForm({ ...form, ssl_mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disable">disable</SelectItem>
                    <SelectItem value="require">require</SelectItem>
                    <SelectItem value="verify-ca">verify-ca</SelectItem>
                    <SelectItem value="verify-full">verify-full</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Referência de segredo">
                <Input value={form.secret_ref} onChange={(e) => setForm({ ...form, secret_ref: e.target.value })} placeholder="ex.: WAREHOUSE_ORACLE_PWD" />
              </Field>
              <Field label="Descrição" full>
                <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={2} />
              </Field>
              <Field label="Config adicional (JSON)" full>
                <Textarea value={form.config} onChange={(e) => setForm({ ...form, config: e.target.value })} rows={4} className="font-mono text-xs" />
              </Field>
              <div className="col-span-2 flex items-center gap-2">
                <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
                <span className="text-sm">Ativo</span>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={salvar} disabled={saving || !form.nome}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Bases cadastradas</CardTitle></CardHeader>
        <CardContent>
          {loadingList ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma base cadastrada.</p>
          ) : (
            <div className="space-y-2">
              {items.map((b) => (
                <div key={b.id} className="border rounded-sm p-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Database className="size-4 text-primary" />
                      <span className="font-semibold text-sm">{b.nome}</span>
                      <Badge variant="outline" className="text-[10px]">{TIPOS.find((t) => t.value === b.tipo)?.label ?? b.tipo}</Badge>
                      {!b.ativo && <Badge variant="secondary" className="text-[10px]">inativo</Badge>}
                    </div>
                    <p className="text-xs font-mono text-muted-foreground">
                      {b.host ?? "—"}{b.porta ? `:${b.porta}` : ""}{b.database_name ? ` / ${b.database_name}` : ""}
                      {b.usuario ? ` · ${b.usuario}` : ""}
                      {b.secret_ref ? ` · segredo: ${b.secret_ref}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => edit(b)}><Pencil className="size-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => excluir(b.id)}><Trash2 className="size-3.5 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <Label className="text-xs font-mono uppercase text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
