import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Server, Shield, Users, Search, RefreshCw, CheckCircle2, XCircle, UserPlus } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface LdapUser {
  dn: string;
  cn: string;
  mail: string;
  department: string;
  synced: boolean;
}

const mockLdapUsers: LdapUser[] = [
  { dn: "cn=joao.silva,ou=operadores,dc=ana,dc=gov,dc=br", cn: "João Silva", mail: "joao.silva@ana.gov.br", department: "Operações", synced: true },
  { dn: "cn=maria.santos,ou=gestores,dc=ana,dc=gov,dc=br", cn: "Maria Santos", mail: "maria.santos@ana.gov.br", department: "Gestão ANA", synced: true },
  { dn: "cn=carlos.oliveira,ou=operadores,dc=ana,dc=gov,dc=br", cn: "Carlos Oliveira", mail: "carlos.oliveira@ana.gov.br", department: "Operações", synced: false },
  { dn: "cn=ana.costa,ou=gestores,dc=ana,dc=gov,dc=br", cn: "Ana Costa", mail: "ana.costa@ana.gov.br", department: "Regulação", synced: false },
  { dn: "cn=pedro.lima,ou=ti,dc=ana,dc=gov,dc=br", cn: "Pedro Lima", mail: "pedro.lima@ana.gov.br", department: "TI", synced: true },
];

export default function LdapConfig() {
  const { isSuperAdmin, loading: authLoading, user } = useAuth();
  const { toast } = useToast();
  const [configId, setConfigId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);

  const [form, setForm] = useState({
    enabled: false,
    host: "",
    port: 389,
    use_tls: true,
    base_dn: "",
    bind_dn: "",
    bind_password: "",
    user_filter: "(objectClass=person)",
    attr_email: "mail",
    attr_name: "cn",
    attr_org: "o",
    default_role: "operador" as AppRole,
  });

  useEffect(() => {
    if (!isSuperAdmin) return;
    (async () => {
      const { data, error } = await supabase.from("ldap_config").select("*").limit(1).maybeSingle();
      if (error) {
        toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
      } else if (data) {
        setConfigId(data.id);
        setForm({
          enabled: data.enabled,
          host: data.host,
          port: data.port,
          use_tls: data.use_tls,
          base_dn: data.base_dn,
          bind_dn: data.bind_dn,
          bind_password: data.bind_password,
          user_filter: data.user_filter,
          attr_email: data.attr_email,
          attr_name: data.attr_name,
          attr_org: data.attr_org,
          default_role: data.default_role,
        });
      }
      setLoading(false);
    })();
  }, [isSuperAdmin, toast]);

  if (authLoading || loading) return <div className="p-8 text-muted-foreground">Carregando...</div>;
  if (!isSuperAdmin) return <Navigate to="/operador" replace />;

  const logAudit = async (action: string, target?: string) => {
    await supabase.from("audit_log").insert({
      user_id: user?.id ?? null,
      user_email: user?.email ?? null,
      action,
      target: target ?? null,
      severity: "info",
    });
  };

  const handleSaveConfig = async () => {
    if (!configId) return;
    setSaving(true);
    const { error } = await supabase.from("ldap_config").update(form).eq("id", configId);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Configuração LDAP salva" });
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    await new Promise((r) => setTimeout(r, 1500));
    setTesting(false);
    toast({ title: "Conexão LDAP simulada", description: `${form.host}:${form.port}` });
  };

  const handleSync = async () => {
    setSyncing(true);
    const { data, error } = await supabase.functions.invoke("ldap-sync", { body: {} });
    setSyncing(false);
    if (error || (data as any)?.error) {
      toast({
        title: "Falha na sincronização",
        description: error?.message ?? (data as any)?.error,
        variant: "destructive",
      });
    } else {
      const r = data as { total: number; created: number; updated: number; errors: unknown[] };
      toast({
        title: "Sincronização concluída",
        description: `${r.total} encontrados • ${r.created} criados • ${r.updated} atualizados${r.errors.length ? ` • ${r.errors.length} erros` : ""}`,
      });
    }
  };

  const handleImportUser = (u: LdapUser) => {
    toast({ title: "Usuário importado", description: `${u.cn} com role ${form.default_role}` });
    logAudit("LDAP_USER_IMPORTED", u.mail);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuração LDAP</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Integração com diretório LDAP/Active Directory para cadastro e sincronização de usuários
        </p>
      </div>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="mapping">Mapeamento</TabsTrigger>
          <TabsTrigger value="users">Usuários LDAP</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Server className="size-5" />Servidor LDAP</CardTitle>
                  <CardDescription>Configurações de conexão com o diretório</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="ldap-enabled" className="text-sm">Ativar LDAP</Label>
                  <Switch id="ldap-enabled" checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Host</Label><Input value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="ldap.exemplo.gov.br" /></div>
                <div className="space-y-2"><Label>Porta</Label><Input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) || 389 })} /></div>
                <div className="space-y-2"><Label>Base DN</Label><Input value={form.base_dn} onChange={(e) => setForm({ ...form, base_dn: e.target.value })} placeholder="dc=exemplo,dc=com" /></div>
                <div className="space-y-2"><Label>Bind DN</Label><Input value={form.bind_dn} onChange={(e) => setForm({ ...form, bind_dn: e.target.value })} placeholder="cn=admin,dc=exemplo,dc=com" /></div>
                <div className="space-y-2"><Label>Bind Password</Label><Input type="password" value={form.bind_password} onChange={(e) => setForm({ ...form, bind_password: e.target.value })} /></div>
                <div className="space-y-2"><Label>Filtro de Usuários</Label><Input value={form.user_filter} onChange={(e) => setForm({ ...form, user_filter: e.target.value })} className="font-mono text-sm" /></div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Switch id="use-ssl" checked={form.use_tls} onCheckedChange={(v) => setForm({ ...form, use_tls: v })} />
                <Label htmlFor="use-ssl">Usar SSL/TLS (LDAPS)</Label>
              </div>
              <div className="space-y-2">
                <Label>Role Padrão</Label>
                <Select value={form.default_role} onValueChange={(v) => setForm({ ...form, default_role: v as AppRole })}>
                  <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operador">Operador</SelectItem>
                    <SelectItem value="gestor_ana">Gestor ANA</SelectItem>
                    <SelectItem value="superadmin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 pt-4">
                <Button onClick={handleSaveConfig} disabled={saving}>{saving ? "Salvando..." : "Salvar Configuração"}</Button>
                <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
                  {testing ? <RefreshCw className="size-4 mr-2 animate-spin" /> : <Search className="size-4 mr-2" />}
                  {testing ? "Testando..." : "Testar Conexão"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mapping" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="size-5" />Mapeamento de Atributos</CardTitle>
              <CardDescription>Atributos LDAP → campos do perfil HydrosNet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Atributo de E-mail</Label><Input value={form.attr_email} onChange={(e) => setForm({ ...form, attr_email: e.target.value })} className="font-mono text-sm" /></div>
                <div className="space-y-2"><Label>Atributo de Nome Completo</Label><Input value={form.attr_name} onChange={(e) => setForm({ ...form, attr_name: e.target.value })} className="font-mono text-sm" /></div>
                <div className="space-y-2"><Label>Atributo de Organização</Label><Input value={form.attr_org} onChange={(e) => setForm({ ...form, attr_org: e.target.value })} className="font-mono text-sm" /></div>
              </div>
              <Button onClick={handleSaveConfig} className="mt-4" disabled={saving}>Salvar Mapeamento</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Users className="size-5" />Diretório de Usuários LDAP</CardTitle>
                  <CardDescription>Visualize e importe usuários do diretório</CardDescription>
                </div>
                <Button onClick={handleSync} disabled={syncing}>
                  <RefreshCw className={"size-4 mr-2 " + (syncing ? "animate-spin" : "")} />
                  {syncing ? "Sincronizando..." : "Sincronizar"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Nome</TableHead>
                    <TableHead className="text-xs">E-mail</TableHead>
                    <TableHead className="text-xs">Departamento</TableHead>
                    <TableHead className="text-xs">DN</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockLdapUsers.map((u) => (
                    <TableRow key={u.dn}>
                      <TableCell className="font-medium text-sm">{u.cn}</TableCell>
                      <TableCell className="text-sm">{u.mail}</TableCell>
                      <TableCell className="text-sm">{u.department}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground max-w-[200px] truncate">{u.dn}</TableCell>
                      <TableCell>
                        {u.synced ? (
                          <Badge variant="outline" className="bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/30">
                            <CheckCircle2 className="size-3 mr-1" />Sincronizado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground"><XCircle className="size-3 mr-1" />Pendente</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!u.synced && (
                          <Button variant="ghost" size="sm" onClick={() => handleImportUser(u)}>
                            <UserPlus className="size-3 mr-1" />Importar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
