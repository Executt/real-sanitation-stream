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
import { ArrowLeft, Database, Plus, Pencil, Trash2, KeyRound, HardDrive } from "lucide-react";

const TIPOS = [
  { value: "aws_s3", label: "AWS S3" },
  { value: "oci", label: "Oracle Cloud (OCI Object Storage)" },
  { value: "gcp_gcs", label: "Google Cloud Storage" },
  { value: "azure_blob", label: "Azure Blob Storage" },
  { value: "filesystem", label: "Filesystem local / NAS" },
  { value: "onedrive", label: "OneDrive" },
  { value: "google_drive", label: "Google Drive" },
  { value: "sharepoint", label: "SharePoint" },
  { value: "ftp", label: "FTP" },
  { value: "sftp", label: "SFTP" },
  { value: "outro", label: "Outro" },
] as const;

type Repo = {
  id: string;
  nome: string;
  tipo: string;
  descricao: string | null;
  bucket_ou_path: string | null;
  endpoint: string | null;
  regiao: string | null;
  config: Record<string, unknown>;
  secret_ref: string | null;
  ativo: boolean;
  created_at: string;
};

const emptyForm = () => ({
  id: "",
  nome: "",
  tipo: "aws_s3",
  descricao: "",
  bucket_ou_path: "",
  endpoint: "",
  regiao: "",
  config: "{}",
  secret_ref: "",
  ativo: true,
});

export default function RepositoriosArtefatos() {
  const { isSuperAdmin, loading } = useAuth();
  const [items, setItems] = useState<Repo[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoadingList(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("repositorios_artefatos")
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data as Repo[]) ?? []);
    setLoadingList(false);
  }
  useEffect(() => {
    load();
  }, []);

  if (loading) return null;
  if (!isSuperAdmin) return <Navigate to="/operador" replace />;

  function edit(r: Repo) {
    setForm({
      id: r.id,
      nome: r.nome,
      tipo: r.tipo,
      descricao: r.descricao ?? "",
      bucket_ou_path: r.bucket_ou_path ?? "",
      endpoint: r.endpoint ?? "",
      regiao: r.regiao ?? "",
      config: JSON.stringify(r.config ?? {}, null, 2),
      secret_ref: r.secret_ref ?? "",
      ativo: r.ativo,
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
      bucket_ou_path: form.bucket_ou_path || null,
      endpoint: form.endpoint || null,
      regiao: form.regiao || null,
      config: configParsed,
      secret_ref: form.secret_ref || null,
      ativo: form.ativo,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyClient = supabase as any;
    const { error } = form.id
      ? await anyClient.from("repositorios_artefatos").update(payload).eq("id", form.id)
      : await anyClient.from("repositorios_artefatos").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Falha ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: form.id ? "Repositório atualizado" : "Repositório criado" });
    setOpen(false);
    load();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este repositório?")) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("repositorios_artefatos").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Repositório excluído" });
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
            <HardDrive className="size-6 text-primary" />
            Repositórios de Artefatos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cadastre múltiplos repositórios (PDFs, imagens, planilhas, arquivos geoespaciais) em nuvem, on-premises ou colaborativos.
            Modelos Córtex podem lê-los como fonte de treino, RAG, inferência ou validação.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={novo}><Plus className="size-4 mr-2" /> Novo repositório</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{form.id ? "Editar repositório" : "Novo repositório"}</DialogTitle>
            </DialogHeader>

            <Alert className="mb-2">
              <KeyRound className="size-4" />
              <AlertDescription className="text-xs">
                <strong>Credenciais nunca são armazenadas nesta tabela.</strong> Cadastre a senha/token como um segredo no
                Lovable Cloud e informe apenas o <em>nome</em> do segredo em "Referência de segredo".
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
              <Field label="Bucket / caminho">
                <Input value={form.bucket_ou_path} onChange={(e) => setForm({ ...form, bucket_ou_path: e.target.value })} placeholder="ex.: meu-bucket, /mnt/dados, /Documentos" />
              </Field>
              <Field label="Endpoint">
                <Input value={form.endpoint} onChange={(e) => setForm({ ...form, endpoint: e.target.value })} placeholder="opcional (ex.: https://…)" />
              </Field>
              <Field label="Região">
                <Input value={form.regiao} onChange={(e) => setForm({ ...form, regiao: e.target.value })} placeholder="ex.: us-east-1" />
              </Field>
              <Field label="Referência de segredo">
                <Input value={form.secret_ref} onChange={(e) => setForm({ ...form, secret_ref: e.target.value })} placeholder="ex.: AWS_S3_API_KEY" />
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
        <CardHeader><CardTitle className="text-base">Repositórios cadastrados</CardTitle></CardHeader>
        <CardContent>
          {loadingList ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum repositório cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {items.map((r) => (
                <div key={r.id} className="border rounded-sm p-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Database className="size-4 text-primary" />
                      <span className="font-semibold text-sm">{r.nome}</span>
                      <Badge variant="outline" className="text-[10px]">{TIPOS.find((t) => t.value === r.tipo)?.label ?? r.tipo}</Badge>
                      {!r.ativo && <Badge variant="secondary" className="text-[10px]">inativo</Badge>}
                    </div>
                    <p className="text-xs font-mono text-muted-foreground">
                      {r.bucket_ou_path || "—"}{r.regiao ? ` · ${r.regiao}` : ""}{r.secret_ref ? ` · segredo: ${r.secret_ref}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => edit(r)}><Pencil className="size-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => excluir(r.id)}><Trash2 className="size-3.5 text-destructive" /></Button>
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
