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
import { ArrowLeft, Building2, Pencil, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
  const { isSuperAdmin, isGestorAna, loading } = useAuth();
  const canView = isSuperAdmin || isGestorAna;

  const [item, setItem] = useState<Concessionaria | null>(null);
  const [agencia, setAgencia] = useState<{ id: string; nome: string; sigla: string | null } | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [etes, setEtes] = useState<any[]>([]);
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

      const tasks: Promise<any>[] = [
        Promise.resolve(supabase.from("profiles").select("id, full_name, organization, position, user_id").eq("concessionaria_id", id)),
        Promise.resolve(supabase.from("etes").select("id, codigo, nome, municipio, uf, status, vazao_atual_lps, populacao_atendida").eq("concessionaria_id", id).order("nome")),
      ];
      if (c.agencia_reguladora_id) {
        tasks.push(Promise.resolve(supabase.from("agencias_reguladoras").select("id, nome, sigla").eq("id", c.agencia_reguladora_id).maybeSingle()));
      }
      const results = await Promise.all(tasks);
      setUsers((results[0].data ?? []) as any[]);
      const eteList = (results[1].data ?? []) as any[];
      setEtes(eteList);
      if (results[2]) setAgencia(results[2].data ?? null);

      if (eteList.length) {
        const eteIds = eteList.map((e) => e.id);
        const { data: dbo } = await supabase
          .from("dbo_medicoes")
          .select("conforme, data_medicao")
          .in("ete_id", eteIds)
          .order("data_medicao", { ascending: false })
          .limit(1000);
        const rows = (dbo ?? []) as any[];
        setDboStats({
          total: rows.length,
          conformes: rows.filter((r) => r.conforme).length,
          ultimoEnvio: rows[0]?.data_medicao ?? null,
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
            {item.tipo === "agencia_reguladora" ? "Agência Reguladora" : "Concessionária"} • {item.uf}
            {item.abrangencia && ` • ${item.abrangencia}`}
            {item.natureza && ` • ${item.natureza}`}
          </p>
        </div>
        {isSuperAdmin && (
          <Button variant="outline" onClick={() => navigate(`/admin/concessionarias?edit=${item.id}`)}>
            <Pencil className="size-4 mr-2" /> Editar cadastro
          </Button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-card border rounded-sm p-4">
          <p className="text-xs text-muted-foreground uppercase">ETEs</p>
          <p className="text-2xl font-semibold text-primary">{etes.length}</p>
        </div>
        <div className="bg-card border rounded-sm p-4">
          <p className="text-xs text-muted-foreground uppercase">Usuários</p>
          <p className="text-2xl font-semibold">{users.length}</p>
        </div>
        <div className="bg-card border rounded-sm p-4">
          <p className="text-xs text-muted-foreground uppercase">Municípios</p>
          <p className="text-2xl font-semibold">{item.municipios_atendidos ?? "—"}</p>
        </div>
        <div className="bg-card border rounded-sm p-4">
          <p className="text-xs text-muted-foreground uppercase">População</p>
          <p className="text-2xl font-semibold">
            {item.populacao_atendida ? item.populacao_atendida.toLocaleString("pt-BR") : "—"}
          </p>
        </div>
        <div className="bg-card border rounded-sm p-4">
          <p className="text-xs text-muted-foreground uppercase">Conformidade DBO</p>
          <p className="text-2xl font-semibold">
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
        <TabsList>
          <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
          <TabsTrigger value="etes">ETEs ({etes.length})</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários ({users.length})</TabsTrigger>
          <TabsTrigger value="dbo">Monitoramento DBO</TabsTrigger>
        </TabsList>

        <TabsContent value="cadastro">
          <div className="bg-card border rounded-sm p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <InfoRow label="CNPJ" value={item.cnpj} mono />
            <InfoRow label="Natureza" value={item.natureza} />
            <InfoRow label="Abrangência" value={item.abrangencia} />
            <InfoRow label="UF" value={item.uf} mono />
            <InfoRow label="E-mail" value={item.email_contato} />
            <InfoRow label="Telefone" value={item.telefone} />
            <div className="md:col-span-2">
              <p className="text-xs text-muted-foreground uppercase mb-1">Site</p>
              {item.site ? (
                <a href={item.site} target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-1">
                  {item.site} <ExternalLink className="size-3" />
                </a>
              ) : <p className="text-muted-foreground">—</p>}
            </div>
            <InfoRow label="Endereço" value={item.endereco} fullWidth />
            <div className="md:col-span-2">
              <p className="text-xs text-muted-foreground uppercase mb-1">Agência Reguladora</p>
              {agencia ? (
                <Link to={`/admin/agencias/${agencia.id}`} className="text-primary underline">
                  {agencia.sigla ? `${agencia.sigla} — ${agencia.nome}` : agencia.nome}
                </Link>
              ) : <p className="text-muted-foreground">— Sem agência vinculada —</p>}
            </div>
            <InfoRow label="Observações" value={item.observacoes} fullWidth />
          </div>
        </TabsContent>

        <TabsContent value="etes">
          <div className="bg-card border rounded-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Município/UF</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Vazão (L/s)</TableHead>
                  <TableHead className="text-right">População</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {etes.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma ETE vinculada</TableCell></TableRow>
                ) : etes.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.codigo ?? "—"}</TableCell>
                    <TableCell className="font-medium">{e.nome}</TableCell>
                    <TableCell className="text-xs">{e.municipio}/{e.uf}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] capitalize">{(e.status ?? "—").replace("_", " ")}</Badge></TableCell>
                    <TableCell className="text-right font-mono text-xs">{e.vazao_atual_lps ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{e.populacao_atendida?.toLocaleString("pt-BR") ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="usuarios">
          <div className="bg-card border rounded-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Organização</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Nenhum usuário vinculado</TableCell></TableRow>
                ) : users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name ?? "—"}</TableCell>
                    <TableCell className="text-xs">{u.position ?? "—"}</TableCell>
                    <TableCell className="text-xs">{u.organization ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {isSuperAdmin && (
            <div className="mt-3">
              <Button variant="outline" size="sm" onClick={() => navigate("/admin/usuarios")}>
                Gerenciar usuários
              </Button>
            </div>
          )}
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
      </Tabs>
    </div>
  );
}

function InfoRow({ label, value, mono, fullWidth }: { label: string; value: string | null; mono?: boolean; fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? "md:col-span-2" : ""}>
      <p className="text-xs text-muted-foreground uppercase mb-1">{label}</p>
      <p className={mono ? "font-mono text-xs" : ""}>{value || <span className="text-muted-foreground">—</span>}</p>
    </div>
  );
}
