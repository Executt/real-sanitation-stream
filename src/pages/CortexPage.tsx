import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { Brain, ShieldAlert, Zap, RefreshCw } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

type Modelo = {
  id: string;
  nome: string;
  versao: string;
  status: string;
  provider_model: string;
  causal_report_url: string | null;
  falso_afluente_checklist: Record<string, boolean>;
};

type Predicao = {
  id: string;
  ete_id: string | null;
  classificacao: string | null;
  valor: number | null;
  confianca: number | null;
  explicacao: string | null;
  criado_em: string;
};

const classColor: Record<string, string> = {
  critico: "bg-destructive text-destructive-foreground",
  alto: "bg-orange-600 text-white",
  medio: "bg-warning text-warning-foreground",
  baixo: "bg-success text-success-foreground",
  indeterminado: "bg-muted text-muted-foreground",
};

export default function CortexPage() {
  const [modelo, setModelo] = useState<Modelo | null>(null);
  const [predicoes, setPredicoes] = useState<Predicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: modelos }, { data: preds }] = await Promise.all([
      supabase.from("cortex_modelos").select("*").order("created_at", { ascending: false }).limit(1),
      supabase.from("cortex_predicoes").select("*").order("criado_em", { ascending: false }).limit(20),
    ]);
    setModelo((modelos?.[0] as Modelo) ?? null);
    setPredicoes((preds as Predicao[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("cortex_pred")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "cortex_predicoes" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  async function runInference() {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke("cortex-infer", {
      body: { limit: 5, horizonte_dias: 30 },
    });
    setRunning(false);
    if (error) {
      toast({ title: "Falha no Córtex", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Inferência concluída",
      description: `${(data?.predicoes ?? []).length} predições geradas em modo ${data?.modelo?.status}.`,
    });
    load();
  }

  const checklistItems = modelo?.falso_afluente_checklist ?? {};

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Brain className="size-6 text-primary" />
            Córtex IA
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">
            ANÁLISE PREDITIVA COM REGRA DO FALSO AFLUENTE
          </p>
        </div>
        <Button onClick={runInference} disabled={running || !modelo}>
          {running ? <RefreshCw className="size-4 mr-2 animate-spin" /> : <Zap className="size-4 mr-2" />}
          Executar inferência
        </Button>
      </div>

      <Alert>
        <ShieldAlert className="size-4" />
        <AlertTitle>Governança Falso Afluente</AlertTitle>
        <AlertDescription className="text-xs">
          Predições em modo <strong>shadow</strong> são registradas apenas para auditoria e não substituem decisão
          humana. Promoção a produção exige checklist completo e relatório causal.
        </AlertDescription>
      </Alert>

      <ErrorBoundary section="Modelo Córtex">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Modelo ativo</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {loading ? (
              "Carregando…"
            ) : !modelo ? (
              <span className="text-muted-foreground">Nenhum modelo configurado.</span>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{modelo.nome}</span>
                  <Badge variant="outline">{modelo.versao}</Badge>
                  <Badge className={modelo.status === "prod" ? "bg-success" : "bg-warning text-warning-foreground"}>
                    {modelo.status}
                  </Badge>
                  <span className="font-mono text-xs text-muted-foreground">{modelo.provider_model}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                  {Object.entries(checklistItems).map(([k, v]) => (
                    <div
                      key={k}
                      className={`p-2 border rounded-sm ${v ? "border-success/30 bg-success/5" : "border-muted"}`}
                    >
                      <div className="font-mono uppercase text-[10px] text-muted-foreground">{k.replace(/_/g, " ")}</div>
                      <div className={v ? "text-success font-semibold" : "text-muted-foreground"}>
                        {v ? "✓ OK" : "pendente"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </ErrorBoundary>

      <ErrorBoundary section="Predições recentes">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimas predições (tempo real)</CardTitle>
          </CardHeader>
          <CardContent>
            {predicoes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma predição ainda. Clique em <strong>Executar inferência</strong> para gerar.
              </p>
            ) : (
              <div className="space-y-2">
                {predicoes.map((p) => (
                  <div key={p.id} className="border rounded-sm p-3 text-sm">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <Badge className={classColor[p.classificacao ?? "indeterminado"]}>
                          {p.classificacao ?? "—"}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">
                          risco {(Number(p.valor) * 100 || 0).toFixed(0)}% · conf{" "}
                          {(Number(p.confianca) * 100 || 0).toFixed(0)}%
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {new Date(p.criado_em).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    {p.explicacao && (
                      <p className="text-xs text-muted-foreground leading-relaxed">{p.explicacao}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </ErrorBoundary>
    </div>
  );
}
