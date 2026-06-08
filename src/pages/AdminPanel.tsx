import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Shield, UserPlus, Trash2, Users } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRoles {
  user_id: string;
  full_name: string | null;
  organization: string | null;
  position: string | null;
  concessionaria_id: string | null;
  created_at: string;
  roles: AppRole[];
}

interface ConcessionariaOpt {
  id: string;
  nome: string;
}

const roleLabels: Record<AppRole, string> = {
  operador: "Operador",
  gestor_ana: "Gestor ANA",
  superadmin: "Super Admin",
};

const roleBadgeVariant = (role: AppRole) =>
  role === "superadmin" ? "default" : role === "gestor_ana" ? "secondary" : "outline";

export default function AdminPanel() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [concessionarias, setConcessionarias] = useState<ConcessionariaOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [addRoleUserId, setAddRoleUserId] = useState("");
  const [addRoleValue, setAddRoleValue] = useState<AppRole | "">("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const [profilesRes, rolesRes, concRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, organization, position, concessionaria_id, created_at"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("concessionarias").select("id, nome").order("nome"),
    ]);

    const profiles = profilesRes.data ?? [];
    const roles = rolesRes.data ?? [];

    const userMap: Record<string, UserWithRoles> = {};
    profiles.forEach((p) => {
      userMap[p.user_id] = {
        user_id: p.user_id,
        full_name: p.full_name,
        organization: p.organization,
        position: p.position,
        concessionaria_id: p.concessionaria_id,
        created_at: p.created_at,
        roles: [],
      };
    });
    roles.forEach((r) => {
      if (userMap[r.user_id]) {
        userMap[r.user_id].roles.push(r.role);
      }
    });

    setUsers(Object.values(userMap));
    setConcessionarias(concRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (isSuperAdmin) fetchUsers();
  }, [isSuperAdmin]);

  if (authLoading) return null;
  if (!isSuperAdmin) return <Navigate to="/operador" replace />;

  const handleAddRole = async () => {
    if (!addRoleUserId || !addRoleValue) return;
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: addRoleUserId, role: addRoleValue });

    if (error) {
      toast({ title: "Erro ao adicionar role", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Role adicionada com sucesso" });
      setDialogOpen(false);
      setAddRoleUserId("");
      setAddRoleValue("");
      fetchUsers();
    }
  };

  const handleRemoveRole = async (userId: string, role: AppRole) => {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", role);

    if (error) {
      toast({ title: "Erro ao remover role", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Role removida" });
      fetchUsers();
    }

  const handleSetConcessionaria = async (userId: string, conc: string) => {
    const value = conc === "__none__" ? null : conc;
    const { error } = await supabase
      .from("profiles")
      .update({ concessionaria_id: value })
      .eq("user_id", userId);
    if (error) {
      toast({ title: "Erro ao vincular concessionária", description: error.message, variant: "destructive" });
    } else {
      toast({ title: value ? "Concessionária vinculada" : "Vínculo removido" });
      fetchUsers();
    }
  };


  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Painel de Administração</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerenciamento de usuários e permissões do sistema
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="size-4 mr-2" />
              Atribuir Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Atribuir Role a Usuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Usuário</Label>
                <Select value={addRoleUserId} onValueChange={setAddRoleUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um usuário..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.user_id} value={u.user_id}>
                        {u.full_name || u.user_id.slice(0, 8)} — {u.organization || "Sem org."}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={addRoleValue} onValueChange={(v) => setAddRoleValue(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a role..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operador">Operador</SelectItem>
                    <SelectItem value="gestor_ana">Gestor ANA</SelectItem>
                    <SelectItem value="superadmin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddRole} className="w-full">
                Atribuir
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-card border rounded-sm shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users className="size-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground uppercase">Total de Usuários</p>
          </div>
          <p className="text-3xl font-semibold">{users.length}</p>
        </div>
        <div className="bg-card border rounded-sm shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="size-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground uppercase">Superadmins</p>
          </div>
          <p className="text-3xl font-semibold">
            {users.filter((u) => u.roles.includes("superadmin")).length}
          </p>
        </div>
        <div className="bg-card border rounded-sm shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users className="size-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground uppercase">Gestores ANA</p>
          </div>
          <p className="text-3xl font-semibold">
            {users.filter((u) => u.roles.includes("gestor_ana")).length}
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-sm shadow-sm overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="font-semibold">Usuários Cadastrados</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Lista de todos os usuários com suas respectivas roles
          </p>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Nome</TableHead>
                <TableHead className="text-xs">Organização</TableHead>
                <TableHead className="text-xs">Cargo</TableHead>
                <TableHead className="text-xs">Roles</TableHead>
                <TableHead className="text-xs">Cadastro</TableHead>
                <TableHead className="text-xs">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium text-sm">
                    {u.full_name || "—"}
                  </TableCell>
                  <TableCell className="text-sm">{u.organization || "—"}</TableCell>
                  <TableCell className="text-sm">{u.position || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {u.roles.length === 0 && (
                        <span className="text-xs text-muted-foreground">Sem role</span>
                      )}
                      {u.roles.map((role) => (
                        <Badge
                          key={role}
                          variant={roleBadgeVariant(role)}
                          className="text-[10px] font-mono cursor-pointer group"
                          onClick={() => handleRemoveRole(u.user_id, role)}
                          title="Clique para remover"
                        >
                          {role === "superadmin" && <Shield className="size-3 mr-1" />}
                          {roleLabels[role]}
                          <Trash2 className="size-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAddRoleUserId(u.user_id);
                        setDialogOpen(true);
                      }}
                    >
                      <UserPlus className="size-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
