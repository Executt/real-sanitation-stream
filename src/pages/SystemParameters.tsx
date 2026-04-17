import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SystemParameters() {
  const { isSuperAdmin, loading: authLoading, user } = useAuth();
  const { toast } = useToast();
  const [configId, setConfigId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    dbo_min: 60,
    dbo_critico: 40,
    api_timeout_seconds: 30,
    sync_interval_minutes: 15,
    retention_days: 365,
    max_upload_mb: 50,
  });

  useEffect(() => {
    if (!isSuperAdmin) return;
    (async () => {
      const { data, error } = await supabase.from("system_parameters").select("*").limit(1).maybeSingle();
      if (error) toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
      else if (data) {
        setConfigId(data.id);
        setForm({
          dbo_min: Number(data.dbo_min),
          dbo_critico: Number(data.dbo_critico),
          api_timeout_seconds: data.api_timeout_seconds,
          sync_interval_minutes: data.sync_interval_minutes,
          retention_days: data.retention_days,
          max_upload_mb: data.max_upload_mb,
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
    const { error } = await supabase.from("system_parameters").update(form).eq("id", configId);
    setSaving(false);
    if (error) toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Parâmetros salvos" });
      await supabase.from("audit_log").insert({
        user_id: user?.id ?? null, user_email: user?.email ?? null,
        action: "SYSTEM_PARAMETERS_UPDATED", severity: "info",
      });
    }
  };

  const num = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: parseFloat(e.target.value) || 0 });

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="size-10 rounded-md bg-primary/10 text-primary flex items-center justify-center"><Settings2 className="size-5" /></div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Parâmetros Gerais</h1>
          <p className="text-muted-foreground text-sm mt-1">Configurações globais do sistema, limites e thresholds operacionais</p>
        </div>
      </div>

      <div className="bg-card border rounded-sm shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-sm mb-4">Limites de Conformidade</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Eficiência DBO mínima (%)</Label><Input type="number" value={form.dbo_min} onChange={num("dbo_min")} /></div>
          <div className="space-y-2"><Label>Eficiência DBO crítica (%)</Label><Input type="number" value={form.dbo_critico} onChange={num("dbo_critico")} /></div>
        </div>
      </div>

      <div className="bg-card border rounded-sm shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-sm mb-4">Integração & Sincronização</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Timeout de API (segundos)</Label><Input type="number" value={form.api_timeout_seconds} onChange={num("api_timeout_seconds")} /></div>
          <div className="space-y-2"><Label>Intervalo de sincronização (min)</Label><Input type="number" value={form.sync_interval_minutes} onChange={num("sync_interval_minutes")} /></div>
        </div>
      </div>

      <div className="bg-card border rounded-sm shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-sm mb-4">Armazenamento</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Retenção de logs (dias)</Label><Input type="number" value={form.retention_days} onChange={num("retention_days")} /></div>
          <div className="space-y-2"><Label>Tamanho máximo de upload (MB)</Label><Input type="number" value={form.max_upload_mb} onChange={num("max_upload_mb")} /></div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar Parâmetros"}</Button>
    </div>
  );
}
