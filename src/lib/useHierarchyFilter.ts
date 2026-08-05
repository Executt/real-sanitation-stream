import { useCallback, useMemo, useState } from "react";
import { useOrg } from "@/contexts/OrgContext";
import type { OrgNode } from "@/types/governance";

export interface HierarchyFilterValue {
  uf: string;
  municipio: string;
  orgId: string;
  includeChildren: boolean;
  search: string;
}

interface LooseQuery {
  in: (c: string, v: readonly string[]) => LooseQuery;
  eq: (c: string, v: unknown) => LooseQuery;
  ilike: (c: string, v: string) => LooseQuery;
}

const INITIAL: HierarchyFilterValue = {
  uf: "all",
  municipio: "all",
  orgId: "all",
  includeChildren: true,
  search: "",
};

function collectSubtree(node: OrgNode, acc: string[]) {
  acc.push(node.id);
  node.children.forEach((c) => collectSubtree(c, acc));
}

/**
 * Estado compartilhado dos filtros hierárquicos em cascata
 * (UF → Município → Organização → subordinadas) usado por
 * Esgotamento, Mananciais, Distribuição/Perdas, ISH-U e Investimentos.
 */
export function useHierarchyFilter(initial?: Partial<HierarchyFilterValue>) {
  const { flat } = useOrg();
  const [value, setValue] = useState<HierarchyFilterValue>({ ...INITIAL, ...initial });

  const set = useCallback((patch: Partial<HierarchyFilterValue>) => {
    setValue((prev) => {
      const next = { ...prev, ...patch };
      // cascata: mudar UF limpa município e organização; mudar município limpa organização
      if (patch.uf !== undefined && patch.uf !== prev.uf) {
        next.municipio = "all";
        next.orgId = "all";
      }
      if (patch.municipio !== undefined && patch.municipio !== prev.municipio) {
        next.orgId = "all";
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => setValue({ ...INITIAL, ...initial }), [initial]);

  /** Ids da organização selecionada (+ subordinadas quando marcado). */
  const orgIds = useMemo<string[] | null>(() => {
    if (value.orgId === "all") return null;
    const node = flat.find((o) => o.id === value.orgId);
    if (!node) return [value.orgId];
    if (!value.includeChildren) return [node.id];
    const acc: string[] = [];
    collectSubtree(node, acc);
    return acc;
  }, [value.orgId, value.includeChildren, flat]);

  /** Aplica os filtros a uma query PostgREST de qualquer módulo. */
  const applyTo = useCallback(
    <T,>(
      query: T,
      opts?: { orgColumn?: string | null; ufColumn?: string | null; municipioColumn?: string | null },
    ): T => {
      const orgColumn = opts?.orgColumn === undefined ? "org_id" : opts.orgColumn;
      const ufColumn = opts?.ufColumn === undefined ? "uf" : opts.ufColumn;
      const municipioColumn = opts?.municipioColumn === undefined ? "municipio" : opts.municipioColumn;
      let q = query as unknown as LooseQuery;
      if (orgColumn && orgIds) q = q.in(orgColumn, orgIds);
      if (ufColumn && value.uf !== "all") q = q.eq(ufColumn, value.uf);
      if (municipioColumn && value.municipio !== "all") q = q.eq(municipioColumn, value.municipio);
      if (municipioColumn && value.municipio === "all" && value.search.trim()) {
        q = q.ilike(municipioColumn, `%${value.search.trim()}%`);
      }
      return q as unknown as T;
    },
    [orgIds, value.uf, value.municipio, value.search],
  );

  /** Assinatura estável para dependências de efeito. */
  const key = `${value.uf}|${value.municipio}|${value.orgId}|${value.includeChildren}|${value.search}`;

  /** Resumo dos filtros para a trilha de auditoria de governança. */
  const auditFilters = useMemo(
    () => ({
      uf: value.uf, municipio: value.municipio, org_id: value.orgId,
      inclui_subordinadas: value.includeChildren, busca: value.search || null,
    }),
    [value],
  );

  return { value, set, reset, orgIds, applyTo, key, auditFilters };
}

export type HierarchyFilter = ReturnType<typeof useHierarchyFilter>;
