import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { FileCog, Plug } from "lucide-react";

export default function SeiConfig() {
  const { isSuperAdmin, loading: authLoading, user } = useAuth();
  const { toast } = useToast();
  const [configId, setConfigId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    enabled: false,
    api_url: "",
    api_key: "",
    orgao_id: "",
    unidade_id: "",
    tipo_processo: "Monitoramento Saneamento",
  });

  useEffect(() => {
    if (!isSuperAdmin) return;
    (async () => {
      const { data, error } = await supabase.from("sei_config").select("*").limit(1).maybeSingle();
      if (error) toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
      else if (data) {
        setConfigId(data.id);
        setForm({
          enabled: data.enabled,
          api_url: data.api_url,
          api_key: data.api_key,
          orgao_id: data.orgao_id,
          unidade_id: data.unidade_id,
          tipo_processo: data.tipo_processo,
        });
      }
      setLoading(false);
    })();
  }, [isSuperAdmin, toast]);

  if (authLoading || loading) return <div className="p-8 text-muted-foreground">Carregando...</div>;
  if (!isSuperAdmin) return <Navigate to="/operador" replace />;

  const handleSave = async () => {
    if (!configId) return;
    setSaving(true);
    const { error } = await supabase.from("sei_config").update(form).eq("id", configId);
    setSaving(false);
    if (error) toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    else toast({ title: "Integração SEI salva" });
  };

  const handleTest = () => {
    toast({ title: "Conexão SEI testada (simulado)", description: "OK" });
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="size-10 rounded-md bg-primary/10 text-primary flex items-center justify-center"><FileCog className="size-5" /></div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Integração SEI</h1>
          <p className="text-muted-foreground text-sm mt-1">Sistema Eletrônico de Informações — abertura automática de processos</p>
        </div>
      </div>

      <div className="bg-card border rounded-sm shadow-sm p-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
          <div>
            <p className="font-medium text-sm">Habilitar integração SEI</p>
            <p className="text-xs text-muted-foreground">Permite abertura automática de processos</p>
          </div>
          <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
        </div>

        <div className="space-y-4">
          <div className="space-y-2"><Label>URL da API SEI</Label><Input value={form.api_url} onChange={(e) => setForm({ ...form, api_url: e.target.value })} /></div>
          <div className="space-y-2"><Label>Chave de API</Label><Input type="password" value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>ID do Órgão</Label><Input value={form.orgao_id} onChange={(e) => setForm({ ...form, orgao_id: e.target.value })} /></div>
            <div className="space-y-2"><Label>ID da Unidade</Label><Input value={form.unidade_id} onChange={(e) => setForm({ ...form, unidade_id: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Tipo de processo padrão</Label><Input value={form.tipo_processo} onChange={(e) => setForm({ ...form, tipo_processo: e.target.value })} /></div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar Configurações"}</Button>
          <Button onClick={handleTest} variant="outline"><Plug className="size-4 mr-2" />Testar Conexão</Button>
        </div>
      </div>
    </div>
  );
}
