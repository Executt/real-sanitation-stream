import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Brain, Plus, Pencil, Trash2, ShieldAlert, ExternalLink } from "lucide-react";
import { parseCortexError } from "@/lib/cortex";
import { CortexModeloFontes } from "@/components/CortexModeloFontes";

type Tipo = "trained" | "online" | "paid" | "rag" | "mcp";

type Modelo = {
  id: string;
  nome: string;
  versao: string;
  tipo: string;
  descricao: string | null;
  status: string;
  provider_model: string;
  metricas: Record<string, unknown> | null;
  causal_report_url: string | null;
  falso_afluente_checklist: Record<string, boolean> | null;
  created_at: string;
};

const CHECKLIST_KEYS = [
  "variaveis_fisicas",
  "testado_anos_anomalos",
  "normalizado_maturidade_dados",
  "ablation_confusores",
  "homologado_shadow",
] as const;

const TIPO_LABEL: Record<string, string> = {
  trained: "Treinado internamente",
  online: "Modelo online (gateway)",
  paid: "Modelo pago / premium",
  rag: "RAG (recuperação + LLM)",
  mcp: "MCP (ferramentas externas)",
};

const emptyForm = () => ({
  id: "",
  nome: "",
  versao: "v0.1",
  tipo: "online" as Tipo,
  descricao: "",
  status: "shadow",
  provider_model: "google/gemini-3-flash-preview",
  causal_report_url: "",
  checklist: Object.fromEntries(CHECKLIST_KEYS.map((k) => [k, false])) as Record<string, boolean>,
  anos_anomalos: '{\n  "2014": { "mae": null, "rmse": null },\n  "2021": { "mae": null, "rmse": null }\n}',
  rag_source: "",
  rag_top_k: 5,
  mcp_server_url: "",
  mcp_tools: "",
});

export default function CortexModelos() {
  const { isSuperAdmin, loading } = useAuth();
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoadingList(true);
    const { data } = await supabase.from("cortex_modelos").select("*").order("created_at", { ascending: false });
    setModelos((data as Modelo[]) ?? []);
    setLoadingList(false);
  }
  useEffect(() => {
    load();
  }, []);

  if (loading) return null;
  if (!isSuperAdmin) return <Navigate to="/operador" replace />;

  function edit(m: Modelo) {
    const anos = (m.metricas as Record<string, unknown> | null)?.anos_anomalos ?? {};
    const rag = ((m.metricas as Record<string, unknown> | null)?.rag ?? {}) as Record<string, unknown>;
    const mcp = ((m.metricas as Record<string, unknown> | null)?.mcp ?? {}) as Record<string, unknown>;
    setForm({
      id: m.id,
      nome: m.nome,
      versao: m.versao,
      tipo: (m.tipo as Tipo) ?? "online",
      descricao: m.descricao ?? "",
      status: m.status,
      provider_model: m.provider_model,
      causal_report_url: m.causal_report_url ?? "",
      checklist: {
        ...Object.fromEntries(CHECKLIST_KEYS.map((k) => [k, false])),
        ...(m.falso_afluente_checklist ?? {}),
      },
      anos_anomalos: JSON.stringify(anos, null, 2),
      rag_source: String(rag.source ?? ""),
      rag_top_k: Number(rag.top_k ?? 5),
      mcp_server_url: String(mcp.server_url ?? ""),
      mcp_tools: String(mcp.tools ?? ""),
    });
    setOpen(true);
  }

  function novo() {
    setForm(emptyForm());
    setOpen(true);
  }

  async function salvar() {
    setSaving(true);
    let anosParsed: Record<string, unknown> = {};
    try {
      anosParsed = JSON.parse(form.anos_anomalos || "{}");
    } catch {
      setSaving(false);
      toast({
        title: "JSON inválido em 'anos anômalos'",
        description: "Corrija o JSON antes de salvar.",
        variant: "destructive",
      });
      return;
    }

    const metricas: Record<string, unknown> = { anos_anomalos: anosParsed };
    if (form.tipo === "rag") {
      metricas.rag = { source: form.rag_source, top_k: form.rag_top_k };
    }
    if (form.tipo === "mcp") {
      metricas.mcp = {
        server_url: form.mcp_server_url,
        tools: form.mcp_tools.split(",").map((s) => s.trim()).filter(Boolean),
      };
    }

    const payload = {
      nome: form.nome,
      versao: form.versao,
      tipo: form.tipo,
      descricao: form.descricao || null,
      status: form.status,
      provider_model: form.provider_model,
      causal_report_url: form.causal_report_url || null,
      falso_afluente_checklist: form.checklist as unknown as Record<string, boolean>,
      metricas: metricas as Record<string, unknown>,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyClient = supabase as any;
    const { error } = form.id
      ? await anyClient.from("cortex_modelos").update(payload).eq("id", form.id)
      : await anyClient.from("cortex_modelos").insert(payload);

    setSaving(false);
    if (error) {
      toast({
        title: "Falha ao salvar modelo",
        description: parseCortexError(error.message),
        variant: "destructive",
      });
      return;
    }
    toast({ title: form.id ? "Modelo atualizado" : "Modelo criado" });
    setOpen(false);
    load();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este modelo?")) return;
    const { error } = await supabase.from("cortex_modelos").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Modelo excluído" });
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
            <Brain className="size-6 text-primary" />
            Modelos Córtex IA
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Catálogo de modelos: treinados internamente, online via gateway, pagos/premium e RAG.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={novo}><Plus className="size-4 mr-2" /> Novo modelo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{form.id ? "Editar modelo" : "Novo modelo"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nome"><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field>
                <Field label="Versão"><Input value={form.versao} onChange={(e) => setForm({ ...form, versao: e.target.value })} /></Field>
                <Field label="Tipo">
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as Tipo })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIPO_LABEL).map(([k, l]) => (
                        <SelectItem key={k} value={k}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Status">
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shadow">shadow</SelectItem>
                      <SelectItem value="prod">prod</SelectItem>
                      <SelectItem value="deprecated">deprecated</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Provider / modelo" full>
                  <Input
                    value={form.provider_model}
                    onChange={(e) => setForm({ ...form, provider_model: e.target.value })}
                    placeholder="ex.: google/gemini-3-flash-preview, openai/gpt-5-mini, interno/xgb-dbo-v2"
                  />
                </Field>
                <Field label="Descrição" full>
                  <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={2} />
                </Field>
              </div>

              {form.tipo === "rag" && (
                <div className="grid grid-cols-3 gap-3 border rounded-sm p-3 bg-muted/30">
                  <Field label="RAG: fonte / índice" full>
                    <Input
                      value={form.rag_source}
                      onChange={(e) => setForm({ ...form, rag_source: e.target.value })}
                      placeholder="ex.: atlas_indicadores + relatorios_ana"
                    />
                  </Field>
                  <Field label="RAG: top-K">
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={form.rag_top_k}
                      onChange={(e) => setForm({ ...form, rag_top_k: Number(e.target.value) })}
                    />
                  </Field>
                </div>
              )}

              <div className="border rounded-sm p-3 space-y-2">
                <p className="text-xs font-mono uppercase text-muted-foreground">Regra do Falso Afluente — checklist</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  {CHECKLIST_KEYS.map((k) => (
                    <label key={k} className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={!!form.checklist[k]}
                        onCheckedChange={(c) => setForm({ ...form, checklist: { ...form.checklist, [k]: !!c } })}
                      />
                      {k.replace(/_/g, " ")}
                    </label>
                  ))}
                </div>
              </div>

              <Field label="Relatório causal (URL)" full>
                <Input
                  value={form.causal_report_url}
                  onChange={(e) => setForm({ ...form, causal_report_url: e.target.value })}
                  placeholder="https://…/relatorio-causal.pdf"
                />
              </Field>

              <Field label="Métricas em anos anômalos (JSON)" full>
                <Textarea
                  value={form.anos_anomalos}
                  onChange={(e) => setForm({ ...form, anos_anomalos: e.target.value })}
                  rows={6}
                  className="font-mono text-xs"
                />
              </Field>

              <Alert>
                <ShieldAlert className="size-4" />
                <AlertTitle className="text-sm">Promoção a produção</AlertTitle>
                <AlertDescription className="text-xs">
                  Para <strong>status = prod</strong>: relatório causal + checklist 100% + métricas em anos anômalos são obrigatórios.
                </AlertDescription>
              </Alert>

              {form.id && <CortexModeloFontes modeloId={form.id} />}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={salvar} disabled={saving || !form.nome}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Catálogo</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : modelos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum modelo cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {modelos.map((m) => (
                <div key={m.id} className="border rounded-sm p-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{m.nome}</span>
                      <Badge variant="outline" className="text-[10px]">{m.versao}</Badge>
                      <Badge className={m.status === "prod" ? "bg-success" : "bg-warning text-warning-foreground"}>
                        {m.status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{TIPO_LABEL[m.tipo] ?? m.tipo}</Badge>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground">{m.provider_model}</p>
                    {m.causal_report_url && (
                      <a href={m.causal_report_url} target="_blank" rel="noreferrer" className="text-primary text-xs inline-flex items-center gap-1 underline">
                        Relatório causal <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => edit(m)}><Pencil className="size-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => excluir(m.id)}><Trash2 className="size-3.5 text-destructive" /></Button>
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
