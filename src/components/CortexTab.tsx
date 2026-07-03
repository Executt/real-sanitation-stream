import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { Brain, Zap, RefreshCw, ShieldAlert, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

type Predicao = {
  id: string;
  ete_id: string | null;
  classificacao: string | null;
  valor: number | null;
  confianca: number | null;
  explicacao: string | null;
  horizonte_dias: number | null;
  criado_em: string;
};

const classColor: Record<string, string> = {
  critico: "bg-destructive text-destructive-foreground",
  alto: "bg-orange-600 text-white",
  medio: "bg-warning text-warning-foreground",
  baixo: "bg-success text-success-foreground",
  indeterminado: "bg-muted text-muted-foreground",
};

interface Props {
  scope: "concessionaria" | "agencia";
  entityId: string;
  concessionariaIds?: string[]; // para escopo AR
}

export function CortexTab({ scope, entityId, concessionariaIds }: Props) {
  const [predicoes, setPredicoes] = useState<Predicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  async function load() {
    setLoading(true);
    let q = supabase
      .from("cortex_predicoes")
      .select("id, ete_id, classificacao, valor, confianca, explicacao, horizonte_dias, criado_em")
      .order("criado_em", { ascending: false })
      .limit(30);

    if (scope === "concessionaria") {
      q = q.eq("concessionaria_id", entityId);
    } else if (concessionariaIds?.length) {
      q = q.in("concessionaria_id", concessionariaIds);
    } else {
      setPredicoes([]);
      setLoading(false);
      return;
    }
    const { data } = await q;
    setPredicoes((data as Predicao[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`cortex_pred_${scope}_${entityId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "cortex_predicoes" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, entityId, (concessionariaIds ?? []).join(",")]);

  async function runInference() {
    setRunning(true);
    // Buscar ETEs elegíveis do escopo (RLS já aplica; aqui só listamos IDs)
    let etesQ = supabase.from("etes").select("id").eq("status", "ativa").limit(10);
    if (scope === "concessionaria") etesQ = etesQ.eq("concessionaria_id", entityId);
    else if (concessionariaIds?.length) etesQ = etesQ.in("concessionaria_id", concessionariaIds);

    const { data: etes, error: eErr } = await etesQ;
    if (eErr || !etes?.length) {
      setRunning(false);
      toast({
        title: "Sem ETEs elegíveis",
        description: eErr?.message ?? "Nenhuma ETE ativa no escopo para inferência.",
        variant: eErr ? "destructive" : "default",
      });
      return;
    }

    const { data, error } = await supabase.functions.invoke("cortex-infer", {
      body: { ete_ids: etes.map((e) => e.id), horizonte_dias: 30 },
    });
    setRunning(false);
    if (error) {
      toast({ title: "Falha no Córtex", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Inferência concluída",
      description: `${(data?.predicoes ?? []).length} predições geradas (modo ${data?.modelo?.status ?? "?"}).`,
    });
    load();
  }

  return (
    <div className="space-y-4">
      <Alert>
        <ShieldAlert className="size-4" />
        <AlertTitle className="text-sm">Governança Falso Afluente</AlertTitle>
        <AlertDescription className="text-xs">
          Predições em <strong>shadow</strong> são auditadas e não substituem decisão humana. Contexto Atlas Esgotos +
          histórico DBO + maturidade de dados. <Link to="/command-center/cortex" className="text-primary underline">Abrir Córtex central</Link>.
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Brain className="size-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase font-mono">Predições escopadas</h3>
          <Badge variant="outline" className="text-[10px]">{predicoes.length}</Badge>
        </div>
        <Button size="sm" onClick={runInference} disabled={running}>
          {running ? <RefreshCw className="size-3 mr-1.5 animate-spin" /> : <Zap className="size-3 mr-1.5" />}
          Executar inferência
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : predicoes.length === 0 ? (
        <div className="bg-card border rounded-sm p-5 text-sm text-muted-foreground">
          Nenhuma predição registrada para este escopo. Execute uma inferência ou aguarde o job diário do Córtex.
        </div>
      ) : (
        <div className="space-y-2">
          {predicoes.map((p) => (
            <div key={p.id} className="border rounded-sm p-3 text-sm bg-card">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <Badge className={classColor[p.classificacao ?? "indeterminado"]}>{p.classificacao ?? "—"}</Badge>
                  <span className="font-mono text-xs text-muted-foreground">
                    risco {(Number(p.valor) * 100 || 0).toFixed(0)}% · conf {(Number(p.confianca) * 100 || 0).toFixed(0)}% · {p.horizonte_dias ?? 30}d
                  </span>
                  {p.ete_id && (
                    <Link to={`/operador/etes`} className="text-primary text-xs inline-flex items-center gap-1 hover:underline">
                      ETE <ExternalLink className="size-3" />
                    </Link>
                  )}
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {new Date(p.criado_em).toLocaleString("pt-BR")}
                </span>
              </div>
              {p.explicacao && <p className="text-xs text-muted-foreground leading-relaxed">{p.explicacao}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
