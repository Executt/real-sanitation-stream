import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, RefreshCw } from "lucide-react";

interface AuditEntry {
  id: string;
  created_at: string;
  user_email: string | null;
  action: string;
  target: string | null;
  severity: string;
}

export default function AuditLog() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("audit_log")
      .select("id, created_at, user_email, action, target, severity")
      .order("created_at", { ascending: false })
      .limit(200);
    setEntries(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (isSuperAdmin) fetchLogs();
  }, [isSuperAdmin]);

  if (authLoading) return null;
  if (!isSuperAdmin) return <Navigate to="/operador" replace />;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-md bg-primary/10 text-primary flex items-center justify-center"><ShieldCheck className="size-5" /></div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Auditoria & Segurança</h1>
            <p className="text-muted-foreground text-sm mt-1">Registro de ações realizadas no sistema</p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={"size-4 mr-2 " + (loading ? "animate-spin" : "")} />
          Atualizar
        </Button>
      </div>

      <div className="bg-card border rounded-sm shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Carregando...</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Nenhum registro de auditoria ainda.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-mono">Timestamp</TableHead>
                <TableHead className="text-xs">Usuário</TableHead>
                <TableHead className="text-xs">Ação</TableHead>
                <TableHead className="text-xs">Alvo</TableHead>
                <TableHead className="text-xs">Severidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs">{new Date(log.created_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-sm">{log.user_email ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{log.action}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.target ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={log.severity === "warning" || log.severity === "error" ? "destructive" : "secondary"} className="text-[10px]">
                      {log.severity.toUpperCase()}
                    </Badge>
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
