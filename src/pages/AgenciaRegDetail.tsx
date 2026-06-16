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
import { ArrowLeft, Gavel, Pencil, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Agencia {
  id: string; nome: string; sigla: string | null; esfera: string;
  uf: string | null; municipio: string | null; cnpj: string | null;
  email_contato: string | null; site: string | null; telefone: string | null;
  endereco: string | null; observacoes: string | null; ativa: boolean;
}

export default function AgenciaRegDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isSuperAdmin, isGestorAna, loading } = useAuth();
  const canView = isSuperAdmin || isGestorAna;

  const [item, setItem] = useState<Agencia | null>(null);
  const [concessionarias, setConcessionarias] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [eteCount, setEteCount] = useState(0);
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

      const [{ data: concs }, { data: profs }] = await Promise.all([
        supabase.from("concessionarias").select("id, nome, sigla, uf, ativa, municipios_atendidos, populacao_atendida").eq("agencia_reguladora_id", id).order("nome"),
        supabase.from("profiles").select("id, full_name, organization, position").eq("agencia_reguladora_id", id),
      ]);
      const concList = (concs ?? []) as any[];
      setConcessionarias(concList);
      setUsers((profs ?? []) as any[]);

      if (concList.length) {
        const { count } = await supabase
          .from("etes")
          .select("id", { count: "exact", head: true })
          .in("concessionaria_id", concList.map((c) => c.id));
        setEteCount(count ?? 0);
      }
      setLoadingData(false);
    })();
  }, [id, canView]);

  if (loading) return null;
  if (!canView) return <Navigate to="/operador" replace />;
  if (loadingData) return <div className="text-muted-foreground text-sm">Carregando…</div>;
  if (!item) return <div className="text-muted-foreground text-sm">Agência não encontrada.</div>;

  const totalPop = concessionarias.reduce((s, c) => s + (c.populacao_atendida ?? 0), 0);

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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-card border rounded-sm p-4">
          <p className="text-xs text-muted-foreground uppercase">Concessionárias</p>
          <p className="text-2xl font-semibold text-primary">{concessionarias.length}</p>
        </div>
        <div className="bg-card border rounded-sm p-4">
          <p className="text-xs text-muted-foreground uppercase">ETEs supervisionadas</p>
          <p className="text-2xl font-semibold">{eteCount}</p>
        </div>
        <div className="bg-card border rounded-sm p-4">
          <p className="text-xs text-muted-foreground uppercase">Usuários (gestor_ar)</p>
          <p className="text-2xl font-semibold">{users.length}</p>
        </div>
        <div className="bg-card border rounded-sm p-4">
          <p className="text-xs text-muted-foreground uppercase">População atendida</p>
          <p className="text-2xl font-semibold">{totalPop ? totalPop.toLocaleString("pt-BR") : "—"}</p>
        </div>
      </div>

      <Tabs defaultValue="cadastro">
        <TabsList>
          <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
          <TabsTrigger value="concessionarias">Concessionárias ({concessionarias.length})</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários ({users.length})</TabsTrigger>
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
          <div className="bg-card border rounded-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sigla</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>UF</TableHead>
                  <TableHead className="text-right">Municípios</TableHead>
                  <TableHead className="text-right">População</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {concessionarias.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma concessionária vinculada</TableCell></TableRow>
                ) : concessionarias.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/admin/concessionarias/${c.id}`)}>
                    <TableCell className="font-mono text-xs">{c.sigla ?? "—"}</TableCell>
                    <TableCell className="font-medium">
                      <Link to={`/admin/concessionarias/${c.id}`} className="hover:underline">{c.nome}</Link>
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
        </TabsContent>
      </Tabs>
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
