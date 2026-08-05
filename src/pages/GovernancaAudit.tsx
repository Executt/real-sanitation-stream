import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useAccessLog } from "@/hooks/useAccessLog";
import { useTable } from "@/lib/useTable";
import { TablePagination } from "@/components/TablePagination";
import { StatCard } from "@/components/StatCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, ShieldCheck, PencilLine } from "lucide-react";

interface AccessRow {
  id: string;
  user_email: string | null;
  modulo: string;
  acao: string;
  org_id: string | null;
  record_id: string | null;
  registros: number | null;
  filtros: Record<string, unknown> | null;
  created_at: string;
}

interface ChangeRow {
  id: string;
  user_email: string | null;
  action: string;
  target: string | null;
  severity: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

const MODULE_TABLES = [
  "investments_planning", "water_sources", "production_systems",
  "distribution_metrics", "etes", "dbo_medicoes", "organizations",
];

export default function GovernancaAudit() {
  const { orgs } = useOrg();
  const [access, setAccess] = useState<AccessRow[]>([]);
  const [changes, setChanges] = useState<ChangeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState("all");
  const [modulo, setModulo] = useState("all");
  const [email, setEmail] = useState("");
  const [dias, setDias] = useState("30");

  useAccessLog({ modulo: "Auditoria de Governança", acao: "VIEW", orgId: orgId === "all" ? null : orgId });

  const load = useCallback(async () => {
    setLoading(true);
    const desde = new Date(Date.now() - Number(dias) * 86400000).toISOString();

    let qa = supabase
      .from("access_audit_log")
      .select("id, user_email, modulo, acao, org_id, record_id, registros, filtros, created_at")
      .gte("created_at", desde)
      .order("created_at", { ascending: false })
      .limit(500);
    if (orgId !== "all") qa = qa.eq("org_id", orgId);
    if (modulo !== "all") qa = qa.eq("modulo", modulo);
    if (email.trim()) qa = qa.ilike("user_email", `%${email.trim()}%`);

    let qc = supabase
      .from("audit_log")
      .select("id, user_email, action, target, severity, created_at, metadata")
      .in("target", MODULE_TABLES)
      .gte("created_at", desde)
      .order("created_at", { ascending: false })
      .limit(500);
    if (email.trim()) qc = qc.ilike("user_email", `%${email.trim()}%`);

    const [{ data: a }, { data: c }] = await Promise.all([qa, qc]);
    setAccess((a ?? []) as AccessRow[]);
    setChanges((c ?? []) as ChangeRow[]);
    setLoading(false);
  }, [orgId, modulo, email, dias]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  const modulos = useMemo(() => Array.from(new Set(access.map((r) => r.modulo))).sort(), [access]);
  const orgName = (id: string | null) =>
    id ? orgs.find((o) => o.id === id)?.sigla || orgs.find((o) => o.id === id)?.name || id.slice(0, 8) : "Nacional";

  const accessTable = useTable(access, { pageSize: 20 });
  const changeTable = useTable(changes, { pageSize: 20 });

  const usuariosUnicos = new Set(access.map((r) => r.user_email)).size;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" /> Auditoria de Governança
        </h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">
          Quem acessou quais organizações e quais alterações foram feitas em cada módulo.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Acessos registrados" value={String(access.length)} icon={Eye} />
        <StatCard label="Usuários distintos" value={String(usuariosUnicos)} icon={ShieldCheck} />
        <StatCard label="Alterações nos módulos" value={String(changes.length)} icon={PencilLine} />
      </div>

      <div className="bg-card border rounded-sm p-4 mb-4 flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Usuário (e-mail)</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@org.gov.br" className="h-9 w-[240px] mt-1" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Organização</Label>
          <Select value={orgId} onValueChange={setOrgId}>
            <SelectTrigger className="h-9 w-[280px] mt-1"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-[320px]">
              <SelectItem value="all">Todas</SelectItem>
              {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.sigla ? `${o.sigla} — ` : ""}{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Módulo</Label>
          <Select value={modulo} onValueChange={setModulo}>
            <SelectTrigger className="h-9 w-[220px] mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {modulos.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Período</Label>
          <Select value={dias} onValueChange={setDias}>
            <SelectTrigger className="h-9 w-[140px] mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">24 horas</SelectItem>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="acessos">
        <TabsList>
          <TabsTrigger value="acessos">Acessos por organização</TabsTrigger>
          <TabsTrigger value="alteracoes">Alterações nos módulos</TabsTrigger>
        </TabsList>

        <TabsContent value="acessos">
          <div className="bg-card border rounded-sm">
            {loading ? (
              <div className="p-5 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/hora</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Módulo</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Organização</TableHead>
                      <TableHead className="text-right">Registros</TableHead>
                      <TableHead>Filtros</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accessTable.pageItems.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Nenhum acesso no período.</TableCell></TableRow>
                    )}
                    {accessTable.pageItems.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="text-xs">{r.user_email ?? "—"}</TableCell>
                        <TableCell className="text-xs">{r.modulo}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{r.acao}</Badge></TableCell>
                        <TableCell className="text-xs">{orgName(r.org_id)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{r.registros ?? "—"}</TableCell>
                        <TableCell className="text-[11px] font-mono text-muted-foreground max-w-[280px] truncate">
                          {r.filtros ? JSON.stringify(r.filtros) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination
                  page={accessTable.page} pageCount={accessTable.pageCount} pageSize={accessTable.pageSize}
                  total={access.length} onPage={accessTable.setPage} onPageSize={accessTable.setPageSize}
                />
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="alteracoes">
          <div className="bg-card border rounded-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Módulo/Tabela</TableHead>
                  <TableHead>Severidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changeTable.pageItems.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Nenhuma alteração no período.</TableCell></TableRow>
                )}
                {changeTable.pageItems.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-xs">{r.user_email ?? "sistema"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.action}</TableCell>
                    <TableCell className="text-xs">{r.target ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={r.severity === "warning" ? "destructive" : "outline"} className="text-xs">{r.severity}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              page={changeTable.page} pageCount={changeTable.pageCount} pageSize={changeTable.pageSize}
              total={changes.length} onPage={changeTable.setPage} onPageSize={changeTable.setPageSize}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
