import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
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
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [ldapEnabled, setLdapEnabled] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);

  // LDAP Config state
  const [ldapHost, setLdapHost] = useState("ldap://ldap.ana.gov.br");
  const [ldapPort, setLdapPort] = useState("389");
  const [ldapBaseDn, setLdapBaseDn] = useState("dc=ana,dc=gov,dc=br");
  const [ldapBindDn, setLdapBindDn] = useState("cn=admin,dc=ana,dc=gov,dc=br");
  const [ldapBindPassword, setLdapBindPassword] = useState("");
  const [ldapUserFilter, setLdapUserFilter] = useState("(objectClass=inetOrgPerson)");
  const [ldapUseSsl, setLdapUseSsl] = useState(false);
  const [ldapDefaultRole, setLdapDefaultRole] = useState<AppRole>("operador");

  // Mapping
  const [mapEmail, setMapEmail] = useState("mail");
  const [mapName, setMapName] = useState("cn");
  const [mapOrg, setMapOrg] = useState("o");
  const [mapDept, setMapDept] = useState("departmentNumber");

  if (authLoading) return null;
  if (!isSuperAdmin) return <Navigate to="/operador" replace />;

  const handleTestConnection = async () => {
    setTesting(true);
    await new Promise((r) => setTimeout(r, 2000));
    setTesting(false);
    toast({ title: "Conexão LDAP bem-sucedida", description: `Conectado a ${ldapHost}:${ldapPort}` });
  };

  const handleSync = async () => {
    setSyncing(true);
    await new Promise((r) => setTimeout(r, 3000));
    setSyncing(false);
    toast({ title: "Sincronização concluída", description: "3 novos usuários importados do diretório LDAP." });
  };

  const handleSaveConfig = () => {
    toast({ title: "Configuração salva", description: "As configurações LDAP foram salvas com sucesso." });
  };

  const handleImportUser = (user: LdapUser) => {
    toast({ title: "Usuário importado", description: `${user.cn} (${user.mail}) foi importado com role ${ldapDefaultRole}.` });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuração LDAP</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure a integração com o diretório LDAP/Active Directory para cadastro e sincronização de usuários
        </p>
      </div>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="mapping">Mapeamento</TabsTrigger>
          <TabsTrigger value="users">Usuários LDAP</TabsTrigger>
        </TabsList>

        {/* Configuração */}
        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="size-5" />
                    Servidor LDAP
                  </CardTitle>
                  <CardDescription>Configurações de conexão com o diretório</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="ldap-enabled" className="text-sm">Ativar LDAP</Label>
                  <Switch id="ldap-enabled" checked={ldapEnabled} onCheckedChange={setLdapEnabled} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Host do Servidor</Label>
                  <Input value={ldapHost} onChange={(e) => setLdapHost(e.target.value)} placeholder="ldap://servidor.dominio.com" />
                </div>
                <div className="space-y-2">
                  <Label>Porta</Label>
                  <Input value={ldapPort} onChange={(e) => setLdapPort(e.target.value)} placeholder="389" />
                </div>
                <div className="space-y-2">
                  <Label>Base DN</Label>
                  <Input value={ldapBaseDn} onChange={(e) => setLdapBaseDn(e.target.value)} placeholder="dc=exemplo,dc=com" />
                </div>
                <div className="space-y-2">
                  <Label>Bind DN</Label>
                  <Input value={ldapBindDn} onChange={(e) => setLdapBindDn(e.target.value)} placeholder="cn=admin,dc=exemplo,dc=com" />
                </div>
                <div className="space-y-2">
                  <Label>Bind Password</Label>
                  <Input type="password" value={ldapBindPassword} onChange={(e) => setLdapBindPassword(e.target.value)} placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                  <Label>Filtro de Usuários</Label>
                  <Input value={ldapUserFilter} onChange={(e) => setLdapUserFilter(e.target.value)} placeholder="(objectClass=inetOrgPerson)" className="font-mono text-sm" />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <Switch id="use-ssl" checked={ldapUseSsl} onCheckedChange={setLdapUseSsl} />
                  <Label htmlFor="use-ssl">Usar SSL/TLS (LDAPS)</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Role Padrão para Novos Usuários</Label>
                <Select value={ldapDefaultRole} onValueChange={(v) => setLdapDefaultRole(v as AppRole)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operador">Operador</SelectItem>
                    <SelectItem value="gestor_ana">Gestor ANA</SelectItem>
                    <SelectItem value="superadmin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleSaveConfig}>Salvar Configuração</Button>
                <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
                  {testing ? <RefreshCw className="size-4 mr-2 animate-spin" /> : <Search className="size-4 mr-2" />}
                  {testing ? "Testando..." : "Testar Conexão"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mapeamento */}
        <TabsContent value="mapping" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="size-5" />
                Mapeamento de Atributos
              </CardTitle>
              <CardDescription>
                Configure como os atributos LDAP são mapeados para os campos do perfil do HydrosNet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Atributo de E-mail</Label>
                  <Input value={mapEmail} onChange={(e) => setMapEmail(e.target.value)} className="font-mono text-sm" />
                  <p className="text-xs text-muted-foreground">Campo LDAP → E-mail de login</p>
                </div>
                <div className="space-y-2">
                  <Label>Atributo de Nome Completo</Label>
                  <Input value={mapName} onChange={(e) => setMapName(e.target.value)} className="font-mono text-sm" />
                  <p className="text-xs text-muted-foreground">Campo LDAP → Nome no perfil</p>
                </div>
                <div className="space-y-2">
                  <Label>Atributo de Organização</Label>
                  <Input value={mapOrg} onChange={(e) => setMapOrg(e.target.value)} className="font-mono text-sm" />
                  <p className="text-xs text-muted-foreground">Campo LDAP → Organização no perfil</p>
                </div>
                <div className="space-y-2">
                  <Label>Atributo de Departamento</Label>
                  <Input value={mapDept} onChange={(e) => setMapDept(e.target.value)} className="font-mono text-sm" />
                  <p className="text-xs text-muted-foreground">Campo LDAP → Cargo/posição no perfil</p>
                </div>
              </div>
              <Button onClick={handleSaveConfig} className="mt-4">Salvar Mapeamento</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usuários LDAP */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="size-5" />
                    Diretório de Usuários LDAP
                  </CardTitle>
                  <CardDescription>
                    Visualize e importe usuários do diretório LDAP para o HydrosNet
                  </CardDescription>
                </div>
                <Button onClick={handleSync} disabled={syncing}>
                  {syncing ? <RefreshCw className="size-4 mr-2 animate-spin" /> : <RefreshCw className="size-4 mr-2" />}
                  {syncing ? "Sincronizando..." : "Sincronizar Diretório"}
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
                          <Badge className="bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/30" variant="outline">
                            <CheckCircle2 className="size-3 mr-1" />
                            Sincronizado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            <XCircle className="size-3 mr-1" />
                            Pendente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!u.synced && (
                          <Button variant="ghost" size="sm" onClick={() => handleImportUser(u)}>
                            <UserPlus className="size-3 mr-1" />
                            Importar
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
