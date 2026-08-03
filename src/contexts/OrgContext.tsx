import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { buildOrgTree, flattenOrgTree, type Organization, type OrgNode } from "@/types/governance";

interface OrgContextType {
  /** Organização do usuário logado (nível raiz da sua visibilidade). */
  currentOrg: Organization | null;
  /** Todas as organizações visíveis (própria + subordinadas, via RLS). */
  orgs: Organization[];
  tree: OrgNode[];
  flat: OrgNode[];
  loading: boolean;
  error: string | null;
  /** ids visíveis — útil para filtros `.in("org_id", ...)`. */
  visibleOrgIds: string[];
  isConcessionaria: boolean;
  isAgencia: boolean;
  refresh: () => Promise<void>;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export function OrgProvider({ children }: { children: ReactNode }) {
  const { session, profile, loading: authLoading } = useAuth();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) {
      setOrgs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name, sigla, type, parent_id, uf, municipio, ibge_code, ativa")
      .order("name");
    if (error) setError(error.message);
    else {
      setError(null);
      setOrgs((data ?? []) as Organization[]);
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, load]);

  const value = useMemo<OrgContextType>(() => {
    const orgId = (profile as { org_id?: string | null } | null)?.org_id ?? null;
    const currentOrg = orgs.find((o) => o.id === orgId) ?? null;
    const tree = buildOrgTree(orgs);
    return {
      currentOrg,
      orgs,
      tree,
      flat: flattenOrgTree(tree),
      loading,
      error,
      visibleOrgIds: orgs.map((o) => o.id),
      isConcessionaria: currentOrg?.type === "CONCESSIONAIRE",
      isAgencia: currentOrg?.type === "STATE_AGENCY" || currentOrg?.type === "MUNICIPAL_AGENCY",
      refresh: load,
    };
  }, [orgs, profile, loading, error, load]);

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}
