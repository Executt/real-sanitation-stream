import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send } from "lucide-react";

export default function SmtpConfig() {
  const { isSuperAdmin, loading: authLoading, user } = useAuth();
  const { toast } = useToast();
  const [configId, setConfigId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [form, setForm] = useState({
    enabled: false,
    host: "",
    port: 587,
    username: "",
    password: "",
    from_email: "",
    from_name: "HydrosNet",
    use_tls: true,
  });

  useEffect(() => {
    if (!isSuperAdmin) return;
    (async () => {
      const { data, error } = await supabase.from("smtp_config").select("*").limit(1).maybeSingle();
      if (error) toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
      else if (data) {
        setConfigId(data.id);
        setForm({
          enabled: data.enabled,
          host: data.host,
          port: data.port,
          username: data.username,
          password: data.password,
          from_email: data.from_email,
          from_name: data.from_name,
          use_tls: data.use_tls,
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
    const { error } = await supabase.from("smtp_config").update(form).eq("id", configId);
    setSaving(false);
    if (error) toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    else toast({ title: "Configuração SMTP salva" });
  };

  const handleTest = async () => {
    if (!testEmail) return toast({ title: "Informe um e-mail", variant: "destructive" });
    const { data, error } = await supabase.functions.invoke("smtp-send", {
      body: {
        to: testEmail,
        subject: "Teste SMTP — HydrosNet",
        html: `<p>Este é um e-mail de teste enviado pelo HydrosNet via <b>${form.host}:${form.port}</b>.</p>`,
        text: `Teste SMTP HydrosNet via ${form.host}:${form.port}`,
      },
    });
    if (error || (data as any)?.error) {
      toast({ title: "Falha no envio", description: error?.message ?? (data as any)?.error, variant: "destructive" });
    } else {
      toast({ title: "E-mail de teste enviado", description: `Para: ${testEmail}` });
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="size-10 rounded-md bg-primary/10 text-primary flex items-center justify-center"><Mail className="size-5" /></div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Configuração SMTP</h1>
          <p className="text-muted-foreground text-sm mt-1">Servidor de e-mail para notificações e alertas</p>
        </div>
      </div>

      <div className="bg-card border rounded-sm shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
          <div>
            <p className="font-medium text-sm">Habilitar envio de e-mails</p>
            <p className="text-xs text-muted-foreground">Ativa o serviço SMTP</p>
          </div>
          <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Servidor SMTP</Label><Input value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} /></div>
          <div className="space-y-2"><Label>Porta</Label><Input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) || 587 })} /></div>
          <div className="space-y-2"><Label>Usuário</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
          <div className="space-y-2"><Label>Senha</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          <div className="space-y-2"><Label>E-mail remetente</Label><Input value={form.from_email} onChange={(e) => setForm({ ...form, from_email: e.target.value })} /></div>
          <div className="space-y-2"><Label>Nome do remetente</Label><Input value={form.from_name} onChange={(e) => setForm({ ...form, from_name: e.target.value })} /></div>
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <div>
            <p className="font-medium text-sm">Conexão segura (TLS/SSL)</p>
            <p className="text-xs text-muted-foreground">Recomendado</p>
          </div>
          <Switch checked={form.use_tls} onCheckedChange={(v) => setForm({ ...form, use_tls: v })} />
        </div>

        <Button onClick={handleSave} className="mt-6" disabled={saving}>{saving ? "Salvando..." : "Salvar Configurações"}</Button>
      </div>

      <div className="bg-card border rounded-sm shadow-sm p-6">
        <h2 className="font-semibold text-sm mb-1">Testar envio</h2>
        <p className="text-xs text-muted-foreground mb-4">Envia um e-mail de teste (simulado)</p>
        <div className="flex gap-2">
          <Input type="email" placeholder="destinatario@exemplo.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
          <Button onClick={handleTest} variant="outline"><Send className="size-4 mr-2" />Enviar teste</Button>
        </div>
      </div>
    </div>
  );
}
