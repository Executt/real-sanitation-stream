import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send } from "lucide-react";

export default function SmtpConfig() {
  const { isSuperAdmin, loading } = useAuth();
  const { toast } = useToast();
  const [config, setConfig] = useState({
    host: "smtp.gov.br",
    port: "587",
    username: "",
    password: "",
    fromEmail: "noreply@hydrosnet.gov.br",
    fromName: "HydrosNet",
    useTls: true,
    enabled: false,
  });
  const [testEmail, setTestEmail] = useState("");

  if (loading) return null;
  if (!isSuperAdmin) return <Navigate to="/operador" replace />;

  const handleSave = () => {
    toast({ title: "Configuração SMTP salva", description: "As configurações foram atualizadas." });
  };

  const handleTest = () => {
    if (!testEmail) {
      toast({ title: "Informe um e-mail", variant: "destructive" });
      return;
    }
    toast({ title: "E-mail de teste enviado", description: `Mensagem enviada para ${testEmail}` });
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="size-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
          <Mail className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Configuração SMTP</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Servidor de e-mail para envio de notificações e alertas
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-sm shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
          <div>
            <p className="font-medium text-sm">Habilitar envio de e-mails</p>
            <p className="text-xs text-muted-foreground">Ativa o serviço SMTP para notificações automáticas</p>
          </div>
          <Switch checked={config.enabled} onCheckedChange={(v) => setConfig({ ...config, enabled: v })} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Servidor SMTP</Label>
            <Input value={config.host} onChange={(e) => setConfig({ ...config, host: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Porta</Label>
            <Input value={config.port} onChange={(e) => setConfig({ ...config, port: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Usuário</Label>
            <Input value={config.username} onChange={(e) => setConfig({ ...config, username: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Senha</Label>
            <Input type="password" value={config.password} onChange={(e) => setConfig({ ...config, password: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>E-mail remetente</Label>
            <Input value={config.fromEmail} onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Nome do remetente</Label>
            <Input value={config.fromName} onChange={(e) => setConfig({ ...config, fromName: e.target.value })} />
          </div>
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <div>
            <p className="font-medium text-sm">Conexão segura (TLS/SSL)</p>
            <p className="text-xs text-muted-foreground">Recomendado para todos os ambientes</p>
          </div>
          <Switch checked={config.useTls} onCheckedChange={(v) => setConfig({ ...config, useTls: v })} />
        </div>

        <Button onClick={handleSave} className="mt-6">Salvar Configurações</Button>
      </div>

      <div className="bg-card border rounded-sm shadow-sm p-6">
        <h2 className="font-semibold text-sm mb-1">Testar envio</h2>
        <p className="text-xs text-muted-foreground mb-4">Envie um e-mail de teste para validar a configuração</p>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="destinatario@exemplo.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
          />
          <Button onClick={handleTest} variant="outline">
            <Send className="size-4 mr-2" />
            Enviar teste
          </Button>
        </div>
      </div>
    </div>
  );
}
