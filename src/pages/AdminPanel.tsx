import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { Shield, UserPlus, Trash2, Users, Search, Check, ChevronsUpDown } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRoles {
  user_id: string;
  full_name: string | null;
  organization: string | null;
  position: string | null;
  concessionaria_id: string | null;
  concessionaria_nome: string | null;
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

const PAGE_SIZE = 20;

function ConcessionariaCell({
  userId,
  currentConcId,
  currentConcNome,
  onChange,
}: {
  userId: string;
  currentConcId: string | null;
  currentConcNome: string | null;
  onChange: (userId: string, value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [options, setOptions] = useState<ConcessionariaOpt[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Debounce input
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(query.trim());
      setPage(0);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  // Fetch when open / query / page changes
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let q = supabase
        .from("concessionarias")
        .select("id, nome", { count: "exact" })
        .order("nome")
        .range(from, to);

      if (debounced) {
        // Search by nome (case-insensitive) OR exact id prefix
        const isUuidLike = /^[0-9a-fA-F-]{4,}$/.test(debounced);
        if (isUuidLike) {
          q = q.or(`nome.ilike.%${debounced}%,id::text.ilike.${debounced}%`);
        } else {
          q = q.ilike("nome", `%${debounced}%`);
        }
      }

      const { data, count, error } = await q;
      if (cancelled) return;
      if (error) {
        setOptions([]);
        setHasMore(false);
      } else {
        const rows = data ?? [];
        setOptions((prev) => (page === 0 ? rows : [...prev, ...rows]));
        setHasMore((count ?? 0) > to + 1);
      }
      setLoading(false);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [open, debounced, page]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-8 justify-between text-xs w-full font-normal"
        >
          <span className="truncate">
            {currentConcId
              ? `${currentConcNome ?? "(sem nome)"} (${currentConcId.slice(0, 8)}…)`
              : "— Sem vínculo —"}
          </span>
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar por nome ou ID…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading && options.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">Buscando…</div>
            ) : (
              <CommandEmpty>Nenhuma concessionária encontrada.</CommandEmpty>
            )}
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onChange(userId, "__none__");
                  setOpen(false);
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", !currentConcId ? "opacity-100" : "opacity-0")} />
                — Sem vínculo —
              </CommandItem>
              {options.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.id}
                  onSelect={() => {
                    onChange(userId, c.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      currentConcId === c.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex flex-col">
                    <span className="text-xs">{c.nome}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{c.id}</span>
                  </span>
                </CommandItem>
              ))}
              {hasMore && (
                <div className="p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-xs"
                    disabled={loading}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    {loading ? "Carregando…" : "Carregar mais"}
                  </Button>
                </div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function AdminPanel() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [concessionarias, setConcessionarias] = useState<ConcessionariaOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [addRoleUserId, setAddRoleUserId] = useState("");
  const [addRoleValue, setAddRoleValue] = useState<AppRole | "">("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterConc, setFilterConc] = useState<string>("__all__");
  const [filterRole, setFilterRole] = useState<string>("__all__");

  const fetchUsers = async () => {
    setLoading(true);
    const [profilesRes, rolesRes, concRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, organization, position, concessionaria_id, created_at"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("concessionarias").select("id, nome").order("nome").limit(200),
    ]);

    const profiles = profilesRes.data ?? [];
    const roles = rolesRes.data ?? [];

    // Fetch names for any linked concessionarias that didn't come in the top-200 filter list
    const linkedIds = Array.from(
      new Set(profiles.map((p) => p.concessionaria_id).filter((x): x is string => !!x))
    );
    const knownIds = new Set((concRes.data ?? []).map((c) => c.id));
    const missingIds = linkedIds.filter((id) => !knownIds.has(id));
    let extraConc: ConcessionariaOpt[] = [];
    if (missingIds.length > 0) {
      const { data } = await supabase
        .from("concessionarias")
        .select("id, nome")
        .in("id", missingIds);
      extraConc = data ?? [];
    }
    const nameById = new Map<string, string>(
      [...(concRes.data ?? []), ...extraConc].map((c) => [c.id, c.nome])
    );

    const userMap: Record<string, UserWithRoles> = {};
    profiles.forEach((p) => {
      userMap[p.user_id] = {
        user_id: p.user_id,
        full_name: p.full_name,
        organization: p.organization,
        position: p.position,
        concessionaria_id: p.concessionaria_id,
        concessionaria_nome: p.concessionaria_id ? nameById.get(p.concessionaria_id) ?? null : null,
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
  };

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


  const q = search.trim().toLowerCase();
  const filteredUsers = users.filter((u) => {
    if (filterConc === "__none__" && u.concessionaria_id) return false;
    if (filterConc !== "__all__" && filterConc !== "__none__" && u.concessionaria_id !== filterConc) return false;
    if (filterRole === "__norole__" && u.roles.length > 0) return false;
    if (filterRole !== "__all__" && filterRole !== "__norole__" && !u.roles.includes(filterRole as AppRole)) return false;
    if (!q) return true;
    return (
      (u.full_name ?? "").toLowerCase().includes(q) ||
      (u.organization ?? "").toLowerCase().includes(q) ||
      (u.position ?? "").toLowerCase().includes(q) ||
      u.user_id.toLowerCase().includes(q)
    );
  });

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
        <div className="p-5 border-b space-y-3">
          <div>
            <h2 className="font-semibold">Usuários Cadastrados</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Lista de todos os usuários com suas respectivas roles
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, organização, cargo ou ID do operador..."
                className="h-9 pl-8 text-sm"
              />
            </div>
            <Select value={filterConc} onValueChange={setFilterConc}>
              <SelectTrigger className="h-9 text-xs md:w-[260px]">
                <SelectValue placeholder="Concessionária" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as concessionárias</SelectItem>
                <SelectItem value="__none__">— Sem vínculo —</SelectItem>
                {concessionarias.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="h-9 text-xs md:w-[160px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as roles</SelectItem>
                <SelectItem value="__norole__">Sem role</SelectItem>
                <SelectItem value="operador">Operador</SelectItem>
                <SelectItem value="gestor_ana">Gestor ANA</SelectItem>
                <SelectItem value="superadmin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
                <TableHead className="text-xs">Concessionária</TableHead>
                <TableHead className="text-xs">Roles</TableHead>
                <TableHead className="text-xs">Cadastro</TableHead>
                <TableHead className="text-xs">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">
                    Nenhum usuário corresponde aos filtros aplicados.
                  </TableCell>
                </TableRow>
              )}
              {filteredUsers.map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium text-sm">
                    <div>{u.full_name || "—"}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{u.user_id.slice(0, 8)}</div>
                  </TableCell>
                  <TableCell className="text-sm">{u.organization || "—"}</TableCell>
                  <TableCell className="text-sm">{u.position || "—"}</TableCell>
                  <TableCell className="text-sm min-w-[260px]">
                    <ConcessionariaCell
                      userId={u.user_id}
                      currentConcId={u.concessionaria_id}
                      currentConcNome={u.concessionaria_nome}
                      onChange={handleSetConcessionaria}
                    />
                  </TableCell>
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
