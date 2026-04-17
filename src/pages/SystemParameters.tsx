import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function SystemParameters() {
  const { isSuperAdmin, loading } = useAuth();
  const { toast } = useToast();
  const [params, setParams] = useState({
    dboMin: "60",
    dboCritico: "40",
    apiTimeout: "30",
    syncInterval: "15",
    retentionDays: "365",
    maxUploadMb: "50",
  });

  if (loading) return null;
  if (!isSuperAdmin) return <Navigate to="/operador" replace />;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="size-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
          <Settings2 className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Parâmetros Gerais</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configurações globais do sistema, limites e thresholds operacionais
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-sm shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-sm mb-4">Limites de Conformidade</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Eficiência DBO mínima (%)</Label>
            <Input value={params.dboMin} onChange={(e) => setParams({ ...params, dboMin: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Eficiência DBO crítica (%)</Label>
            <Input value={params.dboCritico} onChange={(e) => setParams({ ...params, dboCritico: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-sm shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-sm mb-4">Integração & Sincronização</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Timeout de API (segundos)</Label>
            <Input value={params.apiTimeout} onChange={(e) => setParams({ ...params, apiTimeout: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Intervalo de sincronização (min)</Label>
            <Input value={params.syncInterval} onChange={(e) => setParams({ ...params, syncInterval: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-sm shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-sm mb-4">Armazenamento</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Retenção de logs (dias)</Label>
            <Input value={params.retentionDays} onChange={(e) => setParams({ ...params, retentionDays: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Tamanho máximo de upload (MB)</Label>
            <Input value={params.maxUploadMb} onChange={(e) => setParams({ ...params, maxUploadMb: e.target.value })} />
          </div>
        </div>
      </div>

      <Button onClick={() => toast({ title: "Parâmetros salvos" })}>Salvar Parâmetros</Button>
    </div>
  );
}
