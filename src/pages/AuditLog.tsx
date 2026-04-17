import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

const mockLogs = [
  { time: "2026-04-17 10:32", user: "admin@ana.gov.br", action: "ROLE_ASSIGNED", target: "operador1@sabesp.com.br", severity: "info" },
  { time: "2026-04-17 09:15", user: "operador1@sabesp.com.br", action: "LOGIN_SUCCESS", target: "—", severity: "info" },
  { time: "2026-04-17 08:50", user: "system", action: "LDAP_SYNC", target: "12 usuários importados", severity: "info" },
  { time: "2026-04-16 22:11", user: "unknown", action: "LOGIN_FAILED", target: "admin@ana.gov.br", severity: "warning" },
  { time: "2026-04-16 18:00", user: "admin@ana.gov.br", action: "SMTP_CONFIG_UPDATED", target: "—", severity: "info" },
];

export default function AuditLog() {
  const { isSuperAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isSuperAdmin) return <Navigate to="/operador" replace />;

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="size-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Auditoria & Segurança</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Registro de ações realizadas no sistema
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-sm shadow-sm overflow-hidden">
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
            {mockLogs.map((log, i) => (
              <TableRow key={i}>
                <TableCell className="font-mono text-xs">{log.time}</TableCell>
                <TableCell className="text-sm">{log.user}</TableCell>
                <TableCell className="font-mono text-xs">{log.action}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{log.target}</TableCell>
                <TableCell>
                  <Badge variant={log.severity === "warning" ? "destructive" : "secondary"} className="text-[10px]">
                    {log.severity.toUpperCase()}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
