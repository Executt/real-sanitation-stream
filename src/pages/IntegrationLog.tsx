import { useEffect, useMemo, useState } from "react";
import { FileClock, RefreshCw, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LogEntry {
  id: string;
  created_at: string;
  user_email: string | null;
  action: string;
  target: string | null;
  severity: string;
}

const INTEGRATION_TARGETS = ["dbo_medicoes", "etes", "ldap_config", "smtp_config", "sei_config", "cron_config"];

export default function IntegrationLog() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [severity, setSeverity] = useState<string>("all");

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("audit_log")
      .select("id, created_at, user_email, action, target, severity")
      .in("target", INTEGRATION_TARGETS)
      .order("created_at", { ascending: false })
      .limit(200);
    setEntries(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (severity !== "all" && e.severity !== severity) return false;
      if (!q) return true;
      const blob = `${e.action} ${e.target ?? ""} ${e.user_email ?? ""}`.toLowerCase();
      return blob.includes(q.toLowerCase());
    });
  }, [entries, q, severity]);

  const stats = useMemo(() => {
    const total = entries.length;
    const warnings = entries.filter((e) => e.severity === "warning" || e.severity === "error").length;
    const lastTs = entries[0]?.created_at;
    return { total, warnings, last: lastTs ? new Date(lastTs).toLocaleString("pt-BR") : "—" };
  }, [entries]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
            <FileClock className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Log de Integração</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Histórico detalhado de eventos das integrações automáticas.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={"size-4 mr-2 " + (loading ? "animate-spin" : "")} />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border rounded-sm p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Eventos (últimos 200)</p>
          <p className="text-2xl font-semibold mt-1 font-mono">{stats.total}</p>
        </div>
        <div className="bg-card border rounded-sm p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Alertas / Erros</p>
          <p className="text-2xl font-semibold mt-1 font-mono text-destructive">{stats.warnings}</p>
        </div>
        <div className="bg-card border rounded-sm p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Último Evento</p>
          <p className="text-sm mt-2 font-mono">{stats.last}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por ação, alvo ou usuário..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas severidades</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border rounded-sm shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Nenhum evento de integração encontrado.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-mono">Timestamp</TableHead>
                <TableHead className="text-xs">Origem</TableHead>
                <TableHead className="text-xs">Ação</TableHead>
                <TableHead className="text-xs">Usuário</TableHead>
                <TableHead className="text-xs">Severidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.target ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{log.action}</TableCell>
                  <TableCell className="text-sm">{log.user_email ?? "sistema"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        log.severity === "warning" || log.severity === "error" ? "destructive" : "secondary"
                      }
                      className="text-[10px]"
                    >
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
