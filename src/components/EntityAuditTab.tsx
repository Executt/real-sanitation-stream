import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useTable } from "@/lib/useTable";
import { TablePagination } from "@/components/TablePagination";

interface AuditRow {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  target: string;
  severity: string | null;
  metadata: any;
  created_at: string;
}

interface Props {
  /** ids dos usuários vinculados — usado para filtrar mudanças em profiles/user_roles */
  userIds: string[];
  /** id da entidade (concessionaria ou AR) para filtrar mudanças na própria entidade */
  entityId: string;
  entityTable: "concessionarias" | "agencias_reguladoras";
}

export function EntityAuditTab({ userIds, entityId, entityTable }: Props) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Pull a recent window and filter client-side (RLS already scopes if user is gestor_ar).
      const { data } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      const all = (data ?? []) as AuditRow[];
      const idSet = new Set(userIds);
      const filtered = all.filter((r) => {
        // Mudanças na própria entidade
        if (r.target === entityTable) {
          const oldId = r.metadata?.old?.id;
          const newId = r.metadata?.new?.id;
          if (oldId === entityId || newId === entityId) return true;
        }
        // Mudanças em profile/user_roles de um usuário vinculado
        if (r.target === "profiles" || r.target === "user_roles") {
          const uid = r.metadata?.new?.user_id ?? r.metadata?.old?.user_id ?? r.metadata?.invited_user_id;
          if (uid && idSet.has(uid)) return true;
          // Convite recém-criado
          if (r.action === "USER_INVITED") {
            const meta = r.metadata ?? {};
            if (entityTable === "concessionarias" && meta.concessionaria_id === entityId) return true;
            if (entityTable === "agencias_reguladoras" && meta.agencia_reguladora_id === entityId) return true;
          }
        }
        return false;
      });
      setRows(filtered);
      setLoading(false);
    })();
  }, [userIds.join(","), entityId, entityTable]);

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      r.action.toLowerCase().includes(s) ||
      (r.user_email ?? "").toLowerCase().includes(s) ||
      (r.target ?? "").toLowerCase().includes(s),
    );
  }, [rows, q]);

  const t = useTable(visible, { initialSort: { key: "created_at", dir: "desc" }, pageSize: 15 });

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar ação, usuário ou target" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>
      <div className="bg-card border rounded-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead>
              <TableHead>Quem</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Severidade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
            ) : t.rows.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum evento de auditoria</TableCell></TableRow>
            ) : t.rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-xs">{r.user_email ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{r.action}</TableCell>
                <TableCell className="text-xs">{r.target}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      "text-[10px] " +
                      (r.severity === "warning" ? "border-warning/40 text-warning" :
                       r.severity === "critical" ? "border-destructive/40 text-destructive" :
                       "border-border")
                    }
                  >
                    {r.severity ?? "info"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination page={t.page} pageCount={t.pageCount} pageSize={t.pageSize} total={t.total} onPageChange={t.setPage} onPageSizeChange={t.setPageSize} />
      </div>
    </div>
  );
}
