import type { VulnerabilityLevel, WaterSourceType } from "@/types/governance";

export interface MananciaRow {
  nome: string;
  type: WaterSourceType;
  vulnerability_level: VulnerabilityLevel;
  uf: string | null;
  municipio: string | null;
  ibge_code: string | null;
  gad_metric: number | null;
  vazao_outorgada_lps: number | null;
  vazao_disponivel_lps: number | null;
  latitude: number | null;
  longitude: number | null;
  observacoes: string | null;
  external_key: string;
  fonte: string;
}

/** Padrão de importação: cabeçalhos aceitos para cada campo (case/acento-insensível). */
export const CAMPOS: Record<string, string[]> = {
  nome: ["nome", "manancial", "name", "nm_manancial", "denominacao", "descricao_manancial"],
  type: ["tipo", "type", "tipo_manancial", "categoria"],
  vulnerability_level: ["vulnerabilidade", "vulnerability", "vulnerability_level", "nivel_vulnerabilidade"],
  uf: ["uf", "estado", "sigla_uf", "state"],
  municipio: ["municipio", "cidade", "nm_municipio", "city"],
  ibge_code: ["ibge", "ibge_code", "codigo_ibge", "cd_municipio", "geocodigo"],
  gad_metric: ["gad", "gad_metric", "grau_atendimento", "gad_pct"],
  vazao_outorgada_lps: ["vazao_outorgada", "vazao_outorgada_lps", "outorga", "q_outorgada"],
  vazao_disponivel_lps: ["vazao_disponivel", "vazao_disponivel_lps", "disponibilidade", "q_disponivel"],
  latitude: ["latitude", "lat", "y"],
  longitude: ["longitude", "lon", "lng", "long", "x"],
  observacoes: ["observacoes", "obs", "comentario", "notas"],
  external_key: ["external_key", "chave", "id_externo", "codigo", "id"],
};

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const TIPO_MAP: Record<string, WaterSourceType> = {
  superficial: "SURFACE", surface: "SURFACE", rio: "SURFACE", reservatorio: "SURFACE", represa: "SURFACE",
  acude: "SURFACE", lago: "SURFACE", lagoa: "SURFACE", curso_dagua: "SURFACE",
  subterraneo: "GROUNDWATER", subterranea: "GROUNDWATER", groundwater: "GROUNDWATER", poco: "GROUNDWATER",
  aquifero: "GROUNDWATER", misto: "MIXED", mista: "MIXED", mixed: "MIXED",
};

const VULN_MAP: Record<string, VulnerabilityLevel> = {
  baixa: "LOW", baixo: "LOW", low: "LOW",
  media: "MEDIUM", medio: "MEDIUM", moderada: "MEDIUM", medium: "MEDIUM",
  alta: "HIGH", alto: "HIGH", high: "HIGH",
  critica: "CRITICAL", critico: "CRITICAL", critical: "CRITICAL", muito_alta: "CRITICAL",
};

function pick(row: Record<string, unknown>, field: string): unknown {
  const keys = Object.keys(row);
  for (const alias of CAMPOS[field] ?? []) {
    const hit = keys.find((k) => norm(k) === alias);
    if (hit !== undefined && row[hit] !== undefined && row[hit] !== null && String(row[hit]).trim() !== "") return row[hit];
  }
  return null;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/\./g, "").replace(",", ".").replace(/[^\d.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Aceita JSON puro (array), GeoJSON (FeatureCollection) e resposta ArcGIS (features/attributes). */
export function extrairRegistros(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  const p = payload as Record<string, unknown> | null;
  if (!p || typeof p !== "object") return [];
  if (Array.isArray(p.features)) {
    return (p.features as Record<string, unknown>[]).map((f) => {
      const attrs = (f.attributes ?? f.properties ?? {}) as Record<string, unknown>;
      const geom = (f.geometry ?? {}) as Record<string, unknown>;
      const coords = Array.isArray((geom as { coordinates?: unknown }).coordinates)
        ? ((geom as { coordinates: unknown[] }).coordinates as unknown[])
        : null;
      return {
        ...attrs,
        latitude: attrs.latitude ?? geom.y ?? (coords && typeof coords[1] === "number" ? coords[1] : null),
        longitude: attrs.longitude ?? geom.x ?? (coords && typeof coords[0] === "number" ? coords[0] : null),
      };
    });
  }
  for (const key of ["mananciais", "data", "items", "records", "results", "rows"]) {
    if (Array.isArray(p[key])) return p[key] as Record<string, unknown>[];
  }
  return [];
}

export function normalizar(
  registros: Record<string, unknown>[],
  fonte: string,
): { rows: MananciaRow[]; erros: string[] } {
  const rows: MananciaRow[] = [];
  const erros: string[] = [];
  const vistos = new Set<string>();

  registros.forEach((r, i) => {
    const nome = String(pick(r, "nome") ?? "").trim();
    if (!nome) { erros.push(`Linha ${i + 1}: campo "nome" ausente — registro ignorado.`); return; }

    const tipoRaw = norm(String(pick(r, "type") ?? ""));
    const vulnRaw = norm(String(pick(r, "vulnerability_level") ?? ""));
    const uf = String(pick(r, "uf") ?? "").trim().toUpperCase().slice(0, 2) || null;
    const municipio = (String(pick(r, "municipio") ?? "").trim() || null);
    const ibge = pick(r, "ibge_code");
    const ext = String(pick(r, "external_key") ?? "").trim();

    const key = `${fonte}:${ext || `${uf ?? "BR"}|${municipio ?? ""}|${nome}`}`.slice(0, 200);
    if (vistos.has(key)) { erros.push(`Linha ${i + 1}: registro duplicado no arquivo (${nome}) — ignorado.`); return; }
    vistos.add(key);

    rows.push({
      nome,
      type: TIPO_MAP[tipoRaw] ?? (tipoRaw.includes("subterr") ? "GROUNDWATER" : "SURFACE"),
      vulnerability_level: VULN_MAP[vulnRaw] ?? "MEDIUM",
      uf,
      municipio,
      ibge_code: ibge ? String(ibge).replace(/\D/g, "").slice(0, 7) || null : null,
      gad_metric: num(pick(r, "gad_metric")),
      vazao_outorgada_lps: num(pick(r, "vazao_outorgada_lps")),
      vazao_disponivel_lps: num(pick(r, "vazao_disponivel_lps")),
      latitude: num(pick(r, "latitude")),
      longitude: num(pick(r, "longitude")),
      observacoes: (String(pick(r, "observacoes") ?? "").trim() || null),
      external_key: key,
      fonte,
    });
  });

  return { rows, erros };
}

export const MODELO_JSON = [
  {
    nome: "Reservatório de Juturnaíba",
    tipo: "Superficial",
    vulnerabilidade: "Alta",
    uf: "RJ",
    municipio: "Silva Jardim",
    ibge_code: "3305604",
    gad: 78,
    vazao_outorgada_lps: 5200,
    vazao_disponivel_lps: 4100,
    latitude: -22.5714,
    longitude: -42.3057,
    observacoes: "Abastece a Região dos Lagos",
    external_key: "INEA-JUTURNAIBA",
  },
];

export interface PortalPreset {
  id: string;
  label: string;
  portal: string;
  itemId: string;
  fonte: string;
  descricao: string;
}

/** Atalhos de portais geoespaciais conhecidos — a importação aceita qualquer portal ArcGIS. */
export const API_PRESETS: PortalPreset[] = [
  {
    id: "inea-rj",
    label: "INEA / RJ — Geoportal",
    portal: "https://geoportal.inea.rj.gov.br/portal",
    itemId: "8cff310438e9479cbb4a89631710f4ed",
    fonte: "INEA/RJ - Geoportal",
    descricao: "Camadas de recursos hídricos publicadas pelo INEA (Rio de Janeiro).",
  },
  {
    id: "ana-br",
    label: "ANA — Metadados Geoespaciais",
    portal: "https://metadados.snirh.gov.br/geonetwork",
    itemId: "",
    fonte: "ANA - SNIRH",
    descricao: "Serviços publicados pela Agência Nacional de Águas e Saneamento Básico.",
  },
];
