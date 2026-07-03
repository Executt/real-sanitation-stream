import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Gavel, Pencil, ExternalLink, Radio, Brain } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { EntityUsersTab } from "@/components/EntityUsersTab";
import { EtesListTab } from "@/components/EtesListTab";
import { IntegrationsSnirhTab } from "@/components/IntegrationsSnirhTab";
import { EntityAuditTab } from "@/components/EntityAuditTab";
import { CortexTab } from "@/components/CortexTab";
import { useTable } from "@/lib/useTable";
import { SortHeader } from "@/components/SortHeader";
import { TablePagination } from "@/components/TablePagination";

interface Agencia {
  id: string; nome: string; sigla: string | null; esfera: string;
  uf: string | null; municipio: string | null; cnpj: string | null;
  email_contato: string | null; site: string | null; telefone: string | null;
  endereco: string | null; observacoes: string | null; ativa: boolean;
}

interface ConcRow {
  id: string; nome: string; sigla: string | null; uf: string;
  ativa: boolean; municipios_atendidos: number | null; populacao_atendida: number | null;
}

type CSort = "sigla" | "nome" | "uf" | "municipios_atendidos" | "populacao_atendida" | "ativa";

export default function AgenciaRegDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isSuperAdmin, isGestorAna, isGestorAR, loading } = useAuth();
  const canView = isSuperAdmin || isGestorAna || isGestorAR;

  const [item, setItem] = useState<Agencia | null>(null);
  const [concessionarias, setConcessionarias] = useState<ConcRow[]>([]);
  const [userIds, setUserIds] = useState<string[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [eteCount, setEteCount] = useState(0);
  const [dboStats, setDboStats] = useState<{ total: number; conformes: number }>({ total: 0, conformes: 0 });
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!id || !canView) return;
    (async () => {
      setLoadingData(true);
      const { data: a, error } = await supabase
        .from("agencias_reguladoras").select("*").eq("id", id).maybeSingle();
      if (error || !a) {
        toast({ title: "Erro", description: error?.message ?? "Não encontrada", variant: "destructive" });
        setLoadingData(false); return;
      }
      setItem(a as Agencia);

      const [concsRes, profsRes] = await Promise.all([
        supabase.from("concessionarias")
          .select("id, nome, sigla, uf, ativa, municipios_atendidos, populacao_atendida")
          .eq("agencia_reguladora_id", id).order("nome"),
        supabase.from("profiles").select("user_id", { count: "exact" }).eq("agencia_reguladora_id", id),
      ]);
      const concList = (concsRes.data ?? []) as ConcRow[];
      setConcessionarias(concList);
      setUserIds((profsRes.data ?? []).map((p) => p.user_id));
      setUserCount(profsRes.count ?? (profsRes.data?.length ?? 0));

      if (concList.length) {
        const concIds = concList.map((c) => c.id);
        const { count } = await supabase.from("etes").select("id", { count: "exact", head: true }).in("concessionaria_id", concIds);
        setEteCount(count ?? 0);

        // DBO em todas as ETEs supervisionadas (amostra)
        const { data: eIds } = await supabase.from("etes").select("id").in("concessionaria_id", concIds).limit(500);
        const ids = (eIds ?? []).map((e) => e.id);
        if (ids.length) {
          const { data: dbo } = await supabase
            .from("dbo_medicoes")
            .select("conforme")
            .in("ete_id", ids)
            .order("medido_em", { ascending: false })
            .limit(1000);
          const rows = (dbo ?? []) as { conforme: boolean }[];
          setDboStats({ total: rows.length, conformes: rows.filter((r) => r.conforme).length });
        }
      }
      setLoadingData(false);
    })();
  }, [id, canView]);

  if (loading) return null;
  if (!canView) return <Navigate to="/operador" replace />;
  if (loadingData) return <div className="text-muted-foreground text-sm">Carregando…</div>;
  if (!item) return <div className="text-muted-foreground text-sm">Agência não encontrada.</div>;

  const totalPop = concessionarias.reduce((s, c) => s + (c.populacao_atendida ?? 0), 0);
  const conformidade = dboStats.total ? Math.round((dboStats.conformes / dboStats.total) * 100) : null;
  const conformidadeColor = conformidade == null ? "" : conformidade >= 85 ? "text-success" : conformidade >= 60 ? "text-warning" : "text-destructive";

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/agencias")}>
          <ArrowLeft className="size-4 mr-1" /> Voltar
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Gavel className="size-6 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">{item.nome}</h1>
            {item.sigla && <Badge variant="outline" className="font-mono text-xs">{item.sigla}</Badge>}
            {item.ativa
              ? <Badge className="bg-success/10 text-success border-success/30 text-[10px]">Ativa</Badge>
              : <Badge variant="outline" className="text-[10px]">Inativa</Badge>}
          </div>
          <p className="text-muted-foreground text-sm capitalize">
            Agência Reguladora • {item.esfera} {item.uf && `• ${item.uf}`} {item.municipio && `• ${item.municipio}`}
          </p>
        </div>
        {isSuperAdmin && (
          <Button variant="outline" onClick={() => navigate("/admin/agencias")}>
            <Pencil className="size-4 mr-2" /> Editar cadastro
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Kpi label="Concessionárias" value={concessionarias.length} accent />
        <Kpi label="ETEs" value={eteCount} />
        <Kpi label="Usuários" value={userCount} />
        <Kpi label="População" value={totalPop ? totalPop.toLocaleString("pt-BR") : "—"} />
        <div className="bg-card border rounded-sm p-4">
          <p className="text-xs text-muted-foreground uppercase">Conformidade DBO</p>
          <p className={"text-2xl font-semibold " + conformidadeColor}>
            {conformidade !== null ? `${conformidade}%` : "—"}
          </p>
          {dboStats.total > 0 && (
            <p className="text-[10px] text-muted-foreground font-mono">{dboStats.conformes}/{dboStats.total} medições</p>
          )}
        </div>
      </div>

      <Tabs defaultValue="cadastro">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
          <TabsTrigger value="concessionarias">Concessionárias ({concessionarias.length})</TabsTrigger>
          <TabsTrigger value="etes">ETEs ({eteCount})</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários ({userCount})</TabsTrigger>
          <TabsTrigger value="integracoes"><Radio className="size-3 mr-1.5" />Integrações SNIRH</TabsTrigger>
          <TabsTrigger value="cortex"><Brain className="size-3 mr-1.5" />Córtex IA</TabsTrigger>
          <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="cadastro">
          <div className="bg-card border rounded-sm p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <Info label="CNPJ" value={item.cnpj} mono />
            <Info label="Esfera" value={item.esfera} />
            <Info label="UF" value={item.uf} mono />
            <Info label="Município" value={item.municipio} />
            <Info label="E-mail" value={item.email_contato} />
            <Info label="Telefone" value={item.telefone} />
            <div className="md:col-span-2">
              <p className="text-xs text-muted-foreground uppercase mb-1">Site</p>
              {item.site ? (
                <a href={item.site} target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-1">
                  {item.site} <ExternalLink className="size-3" />
                </a>
              ) : <p className="text-muted-foreground">—</p>}
            </div>
            <Info label="Endereço" value={item.endereco} fullWidth />
            <Info label="Observações" value={item.observacoes} fullWidth />
          </div>
        </TabsContent>

        <TabsContent value="concessionarias">
          <ConcsSubTable items={concessionarias} onRowClick={(c) => navigate(`/admin/concessionarias/${c.id}`)} />
        </TabsContent>

        <TabsContent value="etes">
          <EtesListTab concessionariaIds={concessionarias.map((c) => c.id)} />
        </TabsContent>

        <TabsContent value="usuarios">
          <EntityUsersTab scope="agencia" entityId={item.id} entityName={item.nome} />
        </TabsContent>

        <TabsContent value="integracoes">
          <IntegrationsSnirhTab sourceFilter="SNIRH" />
        </TabsContent>

        <TabsContent value="cortex">
          <CortexTab scope="agencia" entityId={item.id} concessionariaIds={concessionarias.map((c) => c.id)} />
        </TabsContent>

        <TabsContent value="auditoria">
          <EntityAuditTab userIds={userIds} entityId={item.id} entityTable="agencias_reguladoras" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ConcsSubTable({ items, onRowClick }: { items: ConcRow[]; onRowClick: (c: ConcRow) => void }) {
  const t = useTable(items, { initialSort: { key: "nome", dir: "asc" }, pageSize: 10 });
  const cur = (t.sort?.key as CSort) ?? null;
  const click = (k: CSort) => t.toggleSort(k as keyof ConcRow);

  return (
    <div className="bg-card border rounded-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <SortHeader<CSort> label="Sigla" sortKey="sigla" currentKey={cur} dir={t.sort?.dir ?? null} onClick={click} />
            <SortHeader<CSort> label="Nome" sortKey="nome" currentKey={cur} dir={t.sort?.dir ?? null} onClick={click} />
            <SortHeader<CSort> label="UF" sortKey="uf" currentKey={cur} dir={t.sort?.dir ?? null} onClick={click} />
            <SortHeader<CSort> label="Municípios" sortKey="municipios_atendidos" currentKey={cur} dir={t.sort?.dir ?? null} onClick={click} align="right" />
            <SortHeader<CSort> label="População" sortKey="populacao_atendida" currentKey={cur} dir={t.sort?.dir ?? null} onClick={click} align="right" />
            <SortHeader<CSort> label="Status" sortKey="ativa" currentKey={cur} dir={t.sort?.dir ?? null} onClick={click} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {t.rows.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma concessionária vinculada</TableCell></TableRow>
          ) : t.rows.map((c) => (
            <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onRowClick(c)}>
              <TableCell className="font-mono text-xs">{c.sigla ?? "—"}</TableCell>
              <TableCell className="font-medium">
                <Link to={`/admin/concessionarias/${c.id}`} onClick={(e) => e.stopPropagation()} className="hover:underline">{c.nome}</Link>
              </TableCell>
              <TableCell className="font-mono text-xs">{c.uf}</TableCell>
              <TableCell className="text-right font-mono text-xs">{c.municipios_atendidos ?? "—"}</TableCell>
              <TableCell className="text-right font-mono text-xs">{c.populacao_atendida?.toLocaleString("pt-BR") ?? "—"}</TableCell>
              <TableCell>
                {c.ativa
                  ? <Badge className="bg-success/10 text-success border-success/30 text-[10px]">Ativa</Badge>
                  : <Badge variant="outline" className="text-[10px]">Inativa</Badge>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination page={t.page} pageCount={t.pageCount} pageSize={t.pageSize} total={t.total} onPageChange={t.setPage} onPageSizeChange={t.setPageSize} />
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="bg-card border rounded-sm p-4">
      <p className="text-xs text-muted-foreground uppercase">{label}</p>
      <p className={"text-2xl font-semibold " + (accent ? "text-primary" : "")}>{value}</p>
    </div>
  );
}

function Info({ label, value, mono, fullWidth }: { label: string; value: string | null; mono?: boolean; fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? "md:col-span-2" : ""}>
      <p className="text-xs text-muted-foreground uppercase mb-1">{label}</p>
      <p className={mono ? "font-mono text-xs" : "capitalize"}>{value || <span className="text-muted-foreground normal-case">—</span>}</p>
    </div>
  );
}
