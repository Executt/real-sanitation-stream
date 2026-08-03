import type { Database } from "@/integrations/supabase/types";

export type OrgType = Database["public"]["Enums"]["org_type"];
export type WaterSourceType = Database["public"]["Enums"]["water_source_type"];
export type VulnerabilityLevel = Database["public"]["Enums"]["vulnerability_level"];
export type ProductionSystemType = Database["public"]["Enums"]["production_system_type"];
export type ProductionSystemStatus = Database["public"]["Enums"]["production_system_status"];
export type InvestmentCategory = Database["public"]["Enums"]["investment_category"];
export type EppoType = Database["public"]["Enums"]["eppo_type"];
export type InvestmentStatus = Database["public"]["Enums"]["investment_status"];

export interface Organization {
  id: string;
  name: string;
  sigla: string | null;
  type: OrgType;
  parent_id: string | null;
  uf: string | null;
  municipio: string | null;
  ibge_code: string | null;
  ativa: boolean;
}

export interface OrgNode extends Organization {
  children: OrgNode[];
  level: number;
}

export const ORG_TYPE_LABEL: Record<OrgType, string> = {
  STATE_AGENCY: "Agência Estadual",
  MUNICIPAL_AGENCY: "Agência Municipal",
  CONCESSIONAIRE: "Concessionária",
};

export const WATER_SOURCE_LABEL: Record<WaterSourceType, string> = {
  SURFACE: "Superficial",
  GROUNDWATER: "Subterrâneo",
  MIXED: "Misto",
};

export const VULNERABILITY_LABEL: Record<VulnerabilityLevel, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

export const PRODUCTION_TYPE_LABEL: Record<ProductionSystemType, string> = {
  ISOLATED: "Isolado",
  INTEGRATED: "Integrado",
};

export const PRODUCTION_STATUS_LABEL: Record<ProductionSystemStatus, string> = {
  SATISFACTORY: "Satisfatório",
  NEEDS_ADEQUATION: "Requer adequação",
  NEEDS_AMPLIFICATION: "Requer ampliação",
};

export const INVESTMENT_CATEGORY_LABEL: Record<InvestmentCategory, string> = {
  PRODUCTION: "Produção",
  DISTRIBUTION: "Distribuição",
  REPLACEMENT: "Reposição",
  SEWAGE: "Esgotamento",
};

export const EPPO_LABEL: Record<EppoType, string> = {
  ESTUDO: "Estudo",
  PLANO: "Plano",
  PROJETO: "Projeto",
  OBRA: "Obra",
};

export const INVESTMENT_STATUS_LABEL: Record<InvestmentStatus, string> = {
  PLANEJADO: "Planejado",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

export type IshClass = "MINIMA" | "BAIXA" | "MEDIA" | "ALTA" | "MAXIMA";

export const ISH_CLASS_LABEL: Record<IshClass, string> = {
  MINIMA: "Mínima",
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
  MAXIMA: "Máxima",
};

/** Tokens semânticos da escala ISH-U (definidos em index.css). */
export const ISH_CLASS_TOKEN: Record<IshClass, string> = {
  MINIMA: "bg-[hsl(var(--ish-minima))] text-white",
  BAIXA: "bg-[hsl(var(--ish-baixa))] text-white",
  MEDIA: "bg-[hsl(var(--ish-media))] text-foreground",
  ALTA: "bg-[hsl(var(--ish-alta))] text-white",
  MAXIMA: "bg-[hsl(var(--ish-maxima))] text-white",
};

export function buildOrgTree(orgs: Organization[]): OrgNode[] {
  const map = new Map<string, OrgNode>();
  orgs.forEach((o) => map.set(o.id, { ...o, children: [], level: 0 }));
  const roots: OrgNode[] = [];
  map.forEach((node) => {
    const parent = node.parent_id ? map.get(node.parent_id) : undefined;
    if (parent) {
      node.level = parent.level + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const fixLevels = (nodes: OrgNode[], level: number) => {
    nodes.forEach((n) => {
      n.level = level;
      fixLevels(n.children, level + 1);
    });
  };
  fixLevels(roots, 0);
  return roots;
}

export function flattenOrgTree(nodes: OrgNode[]): OrgNode[] {
  return nodes.flatMap((n) => [n, ...flattenOrgTree(n.children)]);
}
