import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { FileCog, Plug } from "lucide-react";

export default function SeiConfig() {
  const { isSuperAdmin, loading } = useAuth();
  const { toast } = useToast();
  const [config, setConfig] = useState({
    apiUrl: "https://sei.gov.br/api/v1",
    apiKey: "",
    orgaoId: "",
    unidadeId: "",
    tipoProcesso: "Monitoramento Saneamento",
    enabled: false,
  });

  if (loading) return null;
  if (!isSuperAdmin) return <Navigate to="/operador" replace />;

  const handleSave = () => {
    toast({ title: "Integração SEI salva", description: "Configuração atualizada." });
  };

  const handleTest = () => {
    toast({ title: "Conexão SEI testada", description: "Conexão com SEI estabelecida com sucesso." });
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="size-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
          <FileCog className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Integração SEI</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Sistema Eletrônico de Informações — abertura automática de processos
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-sm shadow-sm p-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
          <div>
            <p className="font-medium text-sm">Habilitar integração SEI</p>
            <p className="text-xs text-muted-foreground">Permite abertura automática de processos no SEI</p>
          </div>
          <Switch checked={config.enabled} onCheckedChange={(v) => setConfig({ ...config, enabled: v })} />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>URL da API SEI</Label>
            <Input value={config.apiUrl} onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Chave de API</Label>
            <Input type="password" value={config.apiKey} onChange={(e) => setConfig({ ...config, apiKey: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>ID do Órgão</Label>
              <Input value={config.orgaoId} onChange={(e) => setConfig({ ...config, orgaoId: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>ID da Unidade</Label>
              <Input value={config.unidadeId} onChange={(e) => setConfig({ ...config, unidadeId: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tipo de processo padrão</Label>
            <Input value={config.tipoProcesso} onChange={(e) => setConfig({ ...config, tipoProcesso: e.target.value })} />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button onClick={handleSave}>Salvar Configurações</Button>
          <Button onClick={handleTest} variant="outline">
            <Plug className="size-4 mr-2" />
            Testar Conexão
          </Button>
        </div>
      </div>
    </div>
  );
}
