import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, HardDrive, Database as DbIcon } from "lucide-react";

type Fonte = {
  id: string;
  modelo_id: string;
  repositorio_id: string | null;
  base_dados_id: string | null;
  papel: string;
  repositorios_artefatos?: { nome: string; tipo: string } | null;
  bases_dados_externas?: { nome: string; tipo: string } | null;
};

type Opt = { id: string; nome: string; tipo: string };

const PAPEIS = [
  { value: "treino", label: "Treino" },
  { value: "contexto_rag", label: "Contexto (RAG)" },
  { value: "inferencia", label: "Inferência" },
  { value: "validacao", label: "Validação" },
];

export function CortexModeloFontes({ modeloId }: { modeloId: string }) {
  const [fontes, setFontes] = useState<Fonte[]>([]);
  const [repos, setRepos] = useState<Opt[]>([]);
  const [bases, setBases] = useState<Opt[]>([]);
  const [tipo, setTipo] = useState<"repo" | "base">("repo");
  const [selId, setSelId] = useState("");
  const [papel, setPapel] = useState("contexto_rag");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyClient = supabase as any;
    const [fRes, rRes, bRes] = await Promise.all([
      anyClient
        .from("cortex_modelos_fontes")
        .select("*, repositorios_artefatos(nome, tipo), bases_dados_externas(nome, tipo)")
        .eq("modelo_id", modeloId)
        .order("created_at", { ascending: false }),
      anyClient.from("repositorios_artefatos").select("id, nome, tipo").eq("ativo", true).order("nome"),
      anyClient.from("bases_dados_externas").select("id, nome, tipo").eq("ativo", true).order("nome"),
    ]);
    setFontes((fRes.data as Fonte[]) ?? []);
    setRepos((rRes.data as Opt[]) ?? []);
    setBases((bRes.data as Opt[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (modeloId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeloId]);

  async function adicionar() {
    if (!selId) {
      toast({ title: "Selecione uma fonte", variant: "destructive" });
      return;
    }
    const payload =
      tipo === "repo"
        ? { modelo_id: modeloId, repositorio_id: selId, base_dados_id: null, papel }
        : { modelo_id: modeloId, base_dados_id: selId, repositorio_id: null, papel };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("cortex_modelos_fontes").insert(payload);
    if (error) {
      toast({ title: "Falha ao vincular", description: error.message, variant: "destructive" });
      return;
    }
    setSelId("");
    load();
  }

  async function remover(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("cortex_modelos_fontes").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    load();
  }

  const options = tipo === "repo" ? repos : bases;

  return (
    <div className="border rounded-sm p-3 space-y-3">
      <p className="text-xs font-mono uppercase text-muted-foreground">Fontes vinculadas ao modelo</p>

      {loading ? (
        <p className="text-xs text-muted-foreground">Carregando…</p>
      ) : fontes.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma fonte vinculada.</p>
      ) : (
        <div className="space-y-1.5">
          {fontes.map((f) => {
            const nome = f.repositorios_artefatos?.nome ?? f.bases_dados_externas?.nome ?? "—";
            const isRepo = !!f.repositorio_id;
            return (
              <div key={f.id} className="flex items-center justify-between gap-2 bg-muted/40 rounded-sm px-2 py-1.5">
                <div className="flex items-center gap-2 text-xs min-w-0">
                  {isRepo ? <HardDrive className="size-3.5 shrink-0" /> : <DbIcon className="size-3.5 shrink-0" />}
                  <span className="font-medium truncate">{nome}</span>
                  <Badge variant="outline" className="text-[10px]">{f.papel}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{isRepo ? "repositório" : "base"}</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={() => remover(f.id)}>
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-12 gap-2 pt-2 border-t">
        <div className="col-span-3">
          <Label className="text-[10px] font-mono uppercase text-muted-foreground">Tipo</Label>
          <Select value={tipo} onValueChange={(v) => { setTipo(v as "repo" | "base"); setSelId(""); }}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="repo">Repositório</SelectItem>
              <SelectItem value="base">Base de dados</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-5">
          <Label className="text-[10px] font-mono uppercase text-muted-foreground">Fonte</Label>
          <Select value={selId} onValueChange={setSelId}>
            <SelectTrigger className="h-8"><SelectValue placeholder={options.length === 0 ? "Nenhuma cadastrada" : "Selecionar…"} /></SelectTrigger>
            <SelectContent>
              {options.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome} · {o.tipo}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-3">
          <Label className="text-[10px] font-mono uppercase text-muted-foreground">Papel</Label>
          <Select value={papel} onValueChange={setPapel}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAPEIS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-1 flex items-end">
          <Button size="sm" onClick={adicionar} className="h-8 w-full px-0"><Plus className="size-4" /></Button>
        </div>
      </div>
    </div>
  );
}
