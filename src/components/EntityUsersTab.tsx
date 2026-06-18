import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useTable } from "@/lib/useTable";
import { SortHeader } from "@/components/SortHeader";
import { TablePagination } from "@/components/TablePagination";
import { toast } from "@/hooks/use-toast";
import { UserPlus, Shield, Trash2, Search } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserRow {
  user_id: string;
  full_name: string | null;
  organization: string | null;
  position: string | null;
  roles: AppRole[];
}

interface Props {
  scope: "concessionaria" | "agencia";
  entityId: string;
  entityName: string;
}

const ROLE_OPTIONS: AppRole[] = ["operador", "gestor_ar", "gestor_ana", "superadmin"];

type USortKey = "full_name" | "organization" | "position";

export function EntityUsersTab({ scope, entityId, entityName }: Props) {
  const { isSuperAdmin, isGestorAna } = useAuth();
  const canManage = isSuperAdmin || isGestorAna;
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invEmail, setInvEmail] = useState("");
  const [invName, setInvName] = useState("");
  const [invRole, setInvRole] = useState<AppRole>(scope === "concessionaria" ? "operador" : "gestor_ar");
  const [inviting, setInviting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const col = scope === "concessionaria" ? "concessionaria_id" : "agencia_reguladora_id";
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, full_name, organization, position")
      .eq(col, entityId);
    const ids = (profs ?? []).map((p) => p.user_id);
    let rolesMap = new Map<string, AppRole[]>();
    if (ids.length) {
      const { data: r } = await supabase.from("user_roles").select("user_id, role").in("user_id", ids);
      (r ?? []).forEach((x) => {
        const arr = rolesMap.get(x.user_id) ?? [];
        arr.push(x.role);
        rolesMap.set(x.user_id, arr);
      });
    }
    setUsers((profs ?? []).map((p) => ({ ...p, roles: rolesMap.get(p.user_id) ?? [] })));
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, [entityId, scope]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      (u.full_name ?? "").toLowerCase().includes(q) ||
      (u.organization ?? "").toLowerCase().includes(q) ||
      (u.position ?? "").toLowerCase().includes(q),
    );
  }, [users, search]);

  const t = useTable(filtered, { initialSort: { key: "full_name", dir: "asc" }, pageSize: 10 });

  const sendInvite = async () => {
    if (!invEmail) return;
    setInviting(true);
    const body: Record<string, unknown> = {
      email: invEmail,
      full_name: invName || null,
      role: invRole,
    };
    if (scope === "concessionaria") body.concessionaria_id = entityId;
    else body.agencia_reguladora_id = entityId;
    const { data, error } = await supabase.functions.invoke("invite-user", { body });
    setInviting(false);
    if (error || (data as { error?: string })?.error) {
      toast({ title: "Erro ao convidar", description: error?.message ?? (data as { error?: string })?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Convite enviado", description: `${invEmail} agora está vinculado a ${entityName}` });
    setInviteOpen(false);
    setInvEmail(""); setInvName("");
    fetchUsers();
  };

  const toggleRole = async (userId: string, role: AppRole, has: boolean) => {
    if (!canManage) return;
    if (has) {
      const { error } = await supabase.from("user_roles").delete()
        .eq("user_id", userId).eq("role", role);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    }
    fetchUsers();
  };

  const unlink = async (userId: string) => {
    if (!canManage) return;
    if (!confirm("Desvincular este usuário?")) return;
    const col = scope === "concessionaria" ? "concessionaria_id" : "agencia_reguladora_id";
    const { error } = await supabase.from("profiles").update({ [col]: null }).eq("user_id", userId);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Vínculo removido" });
    fetchUsers();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar usuário" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        {canManage && (
          <Button onClick={() => setInviteOpen(true)} size="sm">
            <UserPlus className="size-4 mr-2" /> Convidar usuário
          </Button>
        )}
      </div>

      <div className="bg-card border rounded-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader<USortKey> label="Nome" sortKey="full_name" currentKey={(t.sort?.key as USortKey) ?? null} dir={t.sort?.dir ?? null} onClick={(k) => t.toggleSort(k as keyof UserRow)} />
              <SortHeader<USortKey> label="Cargo" sortKey="position" currentKey={(t.sort?.key as USortKey) ?? null} dir={t.sort?.dir ?? null} onClick={(k) => t.toggleSort(k as keyof UserRow)} />
              <SortHeader<USortKey> label="Organização" sortKey="organization" currentKey={(t.sort?.key as USortKey) ?? null} dir={t.sort?.dir ?? null} onClick={(k) => t.toggleSort(k as keyof UserRow)} />
              <TableHead>Roles</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
            ) : t.rows.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum usuário vinculado</TableCell></TableRow>
            ) : t.rows.map((u) => (
              <TableRow key={u.user_id}>
                <TableCell className="font-medium">{u.full_name ?? "—"}</TableCell>
                <TableCell className="text-xs">{u.position ?? "—"}</TableCell>
                <TableCell className="text-xs">{u.organization ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {ROLE_OPTIONS.map((r) => {
                      const has = u.roles.includes(r);
                      return (
                        <button
                          key={r}
                          type="button"
                          disabled={!canManage}
                          onClick={() => toggleRole(u.user_id, r, has)}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-sm border transition-colors ${
                            has ? "bg-primary/10 text-primary border-primary/30"
                                : "bg-transparent text-muted-foreground border-border hover:border-primary/30"
                          } ${!canManage ? "cursor-default" : "cursor-pointer"}`}
                          title={canManage ? (has ? "Remover" : "Atribuir") : ""}
                        >
                          {r}
                        </button>
                      );
                    })}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {canManage && (
                    <Button variant="ghost" size="icon" onClick={() => unlink(u.user_id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination page={t.page} pageCount={t.pageCount} pageSize={t.pageSize} total={t.total} onPageChange={t.setPage} onPageSizeChange={t.setPageSize} />
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar usuário</DialogTitle>
            <DialogDescription>
              Vincular a <span className="font-medium">{entityName}</span>. Um e-mail de ativação será enviado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>E-mail *</Label>
              <Input type="email" value={invEmail} onChange={(e) => setInvEmail(e.target.value)} placeholder="usuario@exemplo.gov.br" />
            </div>
            <div>
              <Label>Nome completo</Label>
              <Input value={invName} onChange={(e) => setInvName(e.target.value)} />
            </div>
            <div>
              <Label>Role *</Label>
              <Select value={invRole} onValueChange={(v) => setInvRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.filter((r) => isSuperAdmin || r !== "superadmin").map((r) => (
                    <SelectItem key={r} value={r}>
                      <Shield className="inline size-3 mr-1.5 opacity-60" />{r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button onClick={sendInvite} disabled={inviting || !invEmail}>
              {inviting ? "Enviando…" : "Enviar convite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function getUserRoleBadgeColor(role: AppRole): string {
  if (role === "superadmin") return "destructive";
  if (role === "gestor_ana") return "default";
  return "outline";
}
