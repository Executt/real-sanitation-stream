import { useEffect, useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Gavel, Building2, Activity, AlertTriangle, ShieldCheck } from "lucide-react";

interface AgenciaInfo {
  id: string;
  nome: string;
  sigla: string | null;
  esfera: string;
  uf: string | null;
}

interface ConcessionariaRow {
  id: string;
  nome: string;
  sigla: string | null;
  uf: string;
  ativa: boolean;
  agencia_reguladora_id: string | null;
  ete_count: number;
}

const TODAS = "__todas__";

export default function AgenciaDashboard() {
  const { isGestorAR, isSuperAdmin, isGestorAna, agenciaReguladoraId, loading } = useAuth();
  // Perfis de alcance nacional supervisionam qualquer agência (e o consolidado).
  const visaoNacional = isSuperAdmin || isGestorAna;

  const [agencias, setAgencias] = useState<AgenciaInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [concessionarias, setConcessionarias] = useState<ConcessionariaRow[]>([]);
  const [eteCount, setEteCount] = useState(0);
  const [naoConformes, setNaoConformes] = useState(0);
  const [loadingData, setLoadingData] = useState(true);

  // Define o escopo inicial: agência vinculada, ou visão consolidada para perfis nacionais.
  useEffect(() => {
    if (loading) return;
    setSelected((prev) => prev ?? (agenciaReguladoraId ?? (visaoNacional ? TODAS : null)));
  }, [loading, agenciaReguladoraId, visaoNacional]);

  // Lista de agências disponíveis para o seletor (apenas perfis nacionais).
  useEffect(() => {
    if (!visaoNacional) return;
    (async () => {
      const { data } = await supabase
        .from("agencias_reguladoras")
        .select("id, nome, sigla, esfera, uf")
        .order("nome");
      setAgencias((data ?? []) as AgenciaInfo[]);
    })();
  }, [visaoNacional]);

  // Agência vinculada precisa ser carregada mesmo sem o seletor.
  useEffect(() => {
    if (visaoNacional || !agenciaReguladoraId) return;
    (async () => {
      const { data } = await supabase
        .from("agencias_reguladoras")
        .select("id, nome, sigla, esfera, uf")
        .eq("id", agenciaReguladoraId)
        .maybeSingle();
      if (data) setAgencias([data as AgenciaInfo]);
    })();
  }, [visaoNacional, agenciaReguladoraId]);

  useEffect(() => {
    if (!selected) {
      setLoadingData(false);
      return;
    }
    (async () => {
      setLoadingData(true);

      let concQuery = supabase
        .from("concessionarias")
        .select("id, nome, sigla, uf, ativa, agencia_reguladora_id")
        .order("nome");
      if (selected !== TODAS) concQuery = concQuery.eq("agencia_reguladora_id", selected);

      const { data: concData } = await concQuery;
      const concs = concData ?? [];
      const concIds = concs.map((c) => c.id);

      let etesData: { id: string; concessionaria_id: string | null }[] = [];
      if (concIds.length > 0) {
        const { data } = await supabase
          .from("etes")
          .select("id, concessionaria_id")
          .in("concessionaria_id", concIds);
        etesData = data ?? [];

        const eteIds = etesData.map((e) => e.id);
        if (eteIds.length > 0) {
          const { data: dbo } = await supabase
            .from("dbo_medicoes")
            .select("ete_id, conforme, medido_em")
            .in("ete_id", eteIds)
            .order("medido_em", { ascending: false });
          const lastByEte = new Map<string, boolean | null>();
          (dbo ?? []).forEach((m) => {
            if (!lastByEte.has(m.ete_id)) lastByEte.set(m.ete_id, m.conforme);
          });
          let nao = 0;
          lastByEte.forEach((v) => {
            if (v === false) nao += 1;
          });
          setNaoConformes(nao);
        } else {
          setNaoConformes(0);
        }
      } else {
        setNaoConformes(0);
      }

      setEteCount(etesData.length);
      setConcessionarias(
        concs.map((c) => ({
          ...(c as Omit<ConcessionariaRow, "ete_count">),
          ete_count: etesData.filter((e) => e.concessionaria_id === c.id).length,
        }))
      );
      setLoadingData(false);
    })();
  }, [selected]);

  const agenciaAtual = useMemo(
    () => (selected && selected !== TODAS ? agencias.find((a) => a.id === selected) ?? null : null),
    [selected, agencias]
  );

  if (loading) return null;
  if (!isGestorAR && !visaoNacional) return <Navigate to="/operador" replace />;

  if (!selected) {
    return (
      <div className="max-w-xl mx-auto mt-20 text-center">
        <Gavel className="size-10 mx-auto mb-3 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Nenhuma Agência Reguladora vinculada</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Solicite ao superadmin que vincule seu perfil a uma agência reguladora para acessar este painel.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Gavel className="size-6 text-primary" />
            {selected === TODAS
              ? "Todas as Agências Reguladoras"
              : `${agenciaAtual?.sigla ?? "Agência Reguladora"} — Supervisão`}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {selected === TODAS
              ? `Visão consolidada nacional · ${agencias.length} agência(s)`
              : `${agenciaAtual?.nome ?? "—"} · ${agenciaAtual?.esfera ?? "—"}${
                  agenciaAtual?.uf ? ` · ${agenciaAtual.uf}` : ""
                }`}
          </p>
        </div>

        {visaoNacional && (
          <div className="min-w-[260px]">
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a agência" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50 max-h-72">
                <SelectItem value={TODAS}>Todas as agências (consolidado)</SelectItem>
                {agencias.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.sigla ? `${a.sigla} — ` : ""}
                    {a.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-card border rounded-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="size-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground uppercase">Concessionárias</p>
          </div>
          <p className="text-2xl font-semibold">{concessionarias.length}</p>
        </div>
        <div className="bg-card border rounded-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="size-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground uppercase">ETEs supervisionadas</p>
          </div>
          <p className="text-2xl font-semibold text-primary">{eteCount}</p>
        </div>
        <div className="bg-card border rounded-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="size-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground uppercase">Não conformes (DBO)</p>
          </div>
          <p className="text-2xl font-semibold text-destructive">{naoConformes}</p>
        </div>
        <div className="bg-card border rounded-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="size-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground uppercase">Conformidade</p>
          </div>
          <p className="text-2xl font-semibold text-success">
            {eteCount > 0 ? `${Math.round(((eteCount - naoConformes) / eteCount) * 100)}%` : "—"}
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-sm overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-sm">Concessionárias supervisionadas</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Cada concessionária pode ser detalhada no Centro de Comando.
          </p>
        </div>
        {loadingData ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : concessionarias.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma concessionária está vinculada a este escopo ainda.
          </div>
        ) : (
          <ul className="divide-y">
            {concessionarias.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/30">
                <div>
                  <div className="font-medium text-sm">
                    {c.sigla ? <span className="font-mono mr-2 text-muted-foreground">{c.sigla}</span> : null}
                    {c.nome}
                  </div>
                  <div className="text-xs text-muted-foreground">UF {c.uf} · {c.ete_count} ETE(s)</div>
                </div>
                <div className="flex items-center gap-3">
                  {c.ativa
                    ? <Badge className="bg-success/10 text-success border-success/30 text-[10px]">Ativa</Badge>
                    : <Badge variant="outline" className="text-[10px]">Inativa</Badge>}
                  <Link to={`/concessionarias/${c.id}`} className="text-xs text-primary hover:underline">
                    Detalhes →
                  </Link>
                  <Link
                    to={`/command-center/mapa?concessionaria=${c.id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    Mapa →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
