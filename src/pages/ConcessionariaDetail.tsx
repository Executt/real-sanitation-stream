import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Building2, Pencil, ExternalLink, Radio, Brain } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { EntityUsersTab } from "@/components/EntityUsersTab";
import { EtesListTab } from "@/components/EtesListTab";
import { IntegrationsSnirhTab } from "@/components/IntegrationsSnirhTab";
import { EntityAuditTab } from "@/components/EntityAuditTab";
import { CortexTab } from "@/components/CortexTab";

interface Concessionaria {
  id: string; nome: string; sigla: string | null; tipo: string;
  natureza: string | null; cnpj: string | null; uf: string;
  abrangencia: string | null; municipios_atendidos: number | null;
  populacao_atendida: number | null; site: string | null;
  email_contato: string | null; telefone: string | null; endereco: string | null;
  ativa: boolean; observacoes: string | null; agencia_reguladora_id: string | null;
}

export default function ConcessionariaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isSuperAdmin, isGestorAna, isGestorAR, loading } = useAuth();
  const canView = isSuperAdmin || isGestorAna || isGestorAR;

  const [item, setItem] = useState<Concessionaria | null>(null);
  const [agencia, setAgencia] = useState<{ id: string; nome: string; sigla: string | null } | null>(null);
  const [userIds, setUserIds] = useState<string[]>([]);
  const [eteCount, setEteCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [dboStats, setDboStats] = useState<{ total: number; conformes: number; ultimoEnvio: string | null }>({ total: 0, conformes: 0, ultimoEnvio: null });
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!id || !canView) return;
    (async () => {
      setLoadingData(true);
      const { data: c, error } = await supabase
        .from("concessionarias").select("*").eq("id", id).maybeSingle();
      if (error || !c) {
        toast({ title: "Erro", description: error?.message ?? "Não encontrada", variant: "destructive" });
        setLoadingData(false); return;
      }
      setItem(c as Concessionaria);

      const [profsRes, etesCountRes, agRes] = await Promise.all([
        supabase.from("profiles").select("user_id", { count: "exact" }).eq("concessionaria_id", id),
        supabase.from("etes").select("id", { count: "exact", head: true }).eq("concessionaria_id", id),
        c.agencia_reguladora_id
          ? supabase.from("agencias_reguladoras").select("id, nome, sigla").eq("id", c.agencia_reguladora_id).maybeSingle()
          : Promise.resolve({ data: null } as { data: null }),
      ]);
      setUserIds((profsRes.data ?? []).map((p) => p.user_id));
      setUserCount(profsRes.count ?? (profsRes.data?.length ?? 0));
      setEteCount(etesCountRes.count ?? 0);
      setAgencia((agRes as { data: { id: string; nome: string; sigla: string | null } | null }).data ?? null);

      // KPI DBO (últimas 1000 medições nas ETEs desta concessionária)
      const { data: eIds } = await supabase.from("etes").select("id").eq("concessionaria_id", id).limit(500);
      const ids = (eIds ?? []).map((e) => e.id);
      if (ids.length) {
        const { data: dbo } = await supabase
          .from("dbo_medicoes")
          .select("conforme, medido_em")
          .in("ete_id", ids)
          .order("medido_em", { ascending: false })
          .limit(1000);
        const rows = (dbo ?? []) as { conforme: boolean; medido_em: string }[];
        setDboStats({
          total: rows.length,
          conformes: rows.filter((r) => r.conforme).length,
          ultimoEnvio: rows[0]?.medido_em ?? null,
        });
      }
      setLoadingData(false);
    })();
  }, [id, canView]);

  if (loading) return null;
  if (!canView) return <Navigate to="/operador" replace />;
  if (loadingData) return <div className="text-muted-foreground text-sm">Carregando…</div>;
  if (!item) return <div className="text-muted-foreground text-sm">Entidade não encontrada.</div>;

  const conformidade = dboStats.total ? Math.round((dboStats.conformes / dboStats.total) * 100) : null;
  const conformidadeColor = conformidade == null ? "" : conformidade >= 85 ? "text-success" : conformidade >= 60 ? "text-warning" : "text-destructive";

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/concessionarias")}>
          <ArrowLeft className="size-4 mr-1" /> Voltar
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="size-6 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">{item.nome}</h1>
            {item.sigla && <Badge variant="outline" className="font-mono text-xs">{item.sigla}</Badge>}
            {item.ativa
              ? <Badge className="bg-success/10 text-success border-success/30 text-[10px]">Ativa</Badge>
              : <Badge variant="outline" className="text-[10px]">Inativa</Badge>}
          </div>
          <p className="text-muted-foreground text-sm">
            Concessionária • {item.uf}
            {item.abrangencia && ` • ${item.abrangencia}`}
            {item.natureza && ` • ${item.natureza}`}
          </p>
        </div>
        {isSuperAdmin && (
          <Button variant="outline" onClick={() => navigate("/admin/concessionarias")}>
            <Pencil className="size-4 mr-2" /> Editar cadastro
          </Button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Kpi label="ETEs" value={eteCount} accent />
        <Kpi label="Usuários" value={userCount} />
        <Kpi label="Municípios" value={item.municipios_atendidos ?? "—"} />
        <Kpi label="População" value={item.populacao_atendida ? item.populacao_atendida.toLocaleString("pt-BR") : "—"} />
        <div className="bg-card border rounded-sm p-4">
          <p className="text-xs text-muted-foreground uppercase">Conformidade DBO</p>
          <p className={"text-2xl font-semibold " + conformidadeColor}>
            {conformidade !== null ? `${conformidade}%` : "—"}
          </p>
          {dboStats.total > 0 && (
            <p className="text-[10px] text-muted-foreground font-mono">
              {dboStats.conformes}/{dboStats.total} medições
            </p>
          )}
        </div>
      </div>

      <Tabs defaultValue="cadastro">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
          <TabsTrigger value="etes">ETEs ({eteCount})</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários ({userCount})</TabsTrigger>
          <TabsTrigger value="dbo">Conformidade DBO</TabsTrigger>
          <TabsTrigger value="integracoes"><Radio className="size-3 mr-1.5" />Integrações SNIRH</TabsTrigger>
          <TabsTrigger value="cortex"><Brain className="size-3 mr-1.5" />Córtex IA</TabsTrigger>
          <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="cadastro">
          <div className="bg-card border rounded-sm p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <Info label="CNPJ" value={item.cnpj} mono />
            <Info label="Natureza" value={item.natureza} />
            <Info label="Abrangência" value={item.abrangencia} />
            <Info label="UF" value={item.uf} mono />
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
            <div className="md:col-span-2">
              <p className="text-xs text-muted-foreground uppercase mb-1">Agência Reguladora</p>
              {agencia ? (
                <Link to={`/admin/agencias/${agencia.id}`} className="text-primary underline">
                  {agencia.sigla ? `${agencia.sigla} — ${agencia.nome}` : agencia.nome}
                </Link>
              ) : <p className="text-muted-foreground">— Sem agência vinculada —</p>}
            </div>
            <Info label="Observações" value={item.observacoes} fullWidth />
          </div>
        </TabsContent>

        <TabsContent value="etes">
          <EtesListTab concessionariaIds={[item.id]} />
        </TabsContent>

        <TabsContent value="usuarios">
          <EntityUsersTab scope="concessionaria" entityId={item.id} entityName={item.nome} />
        </TabsContent>

        <TabsContent value="dbo">
          <div className="bg-card border rounded-sm p-5 text-sm space-y-2">
            <p><span className="text-muted-foreground">Total de medições recentes:</span> <span className="font-mono">{dboStats.total}</span></p>
            <p><span className="text-muted-foreground">Conformes:</span> <span className="font-mono text-success">{dboStats.conformes}</span></p>
            <p><span className="text-muted-foreground">Não conformes:</span> <span className="font-mono text-destructive">{dboStats.total - dboStats.conformes}</span></p>
            <p><span className="text-muted-foreground">Último envio:</span> <span className="font-mono">{dboStats.ultimoEnvio ? new Date(dboStats.ultimoEnvio).toLocaleString("pt-BR") : "—"}</span></p>
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/command-center/conformidade")}>
                Ver painel de conformidade
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="integracoes">
          <IntegrationsSnirhTab sourceFilter="SNIRH" />
        </TabsContent>

        <TabsContent value="cortex">
          <CortexTab scope="concessionaria" entityId={item.id} />
        </TabsContent>

        <TabsContent value="auditoria">
          <EntityAuditTab userIds={userIds} entityId={item.id} entityTable="concessionarias" />
        </TabsContent>
      </Tabs>
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
      <p className={mono ? "font-mono text-xs" : ""}>{value || <span className="text-muted-foreground">—</span>}</p>
    </div>
  );
}
