import type { EppoType, InvestmentCategory, InvestmentStatus } from "@/types/governance";

export interface AtlasRow {
  external_key: string;
  titulo: string;
  category: InvestmentCategory;
  eppo: EppoType;
  estimated_value: number;
  status: InvestmentStatus;
  horizonte_ano: number | null;
  horizonte_faixa: string | null;
  uf: string | null;
  municipio: string | null;
  ibge_code: string | null;
  descricao: string | null;
  tipo_intervencao: string | null;
  manancial: string | null;
  requer_estudo: boolean | null;
  fonte: string;
}

export interface AtlasDataset {
  id: string;
  label: string;
  /** Aba esperada (correspondência por prefixo, tolerante a variações). */
  sheet: string;
  /** Linha (0-based) do cabeçalho dentro da aba. */
  headerRow: number;
  /** Colunas obrigatórias — validação do dicionário antes de gravar. */
  required: string[];
  arquivoSugerido: string;
  normalize: (rows: Record<string, unknown>[], arquivo: string) => { rows: AtlasRow[]; erros: string[] };
}

const norm = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();
const isEmpty = (v: unknown) => ["", "-", "nan", "null", "undefined"].includes(norm(v).toLowerCase());
export const toNumber = (v: unknown): number | null => {
  if (isEmpty(v)) return null;
  const s = norm(v).replace(/\./g, (m, i, str) => (str.indexOf(",") > -1 ? "" : m)).replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/** Compara nomes de coluna ignorando acentos, caixa e espaços. */
export const canon = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

export function findColumn(headers: string[], expected: string): string | null {
  const c = canon(expected);
  return headers.find((h) => canon(h) === c) ?? headers.find((h) => canon(h).startsWith(c.slice(0, 18))) ?? null;
}

const PROD_COLS = {
  ibge: "IBGE",
  uf: "UF",
  municipio: "Município",
  tipologia: "Tipologias de Planejamento em Produção de Água",
  eppo: "Estudos, Planos, Projetos ou Obras (EPPOs)",
  intervencao: "Tipo da Intervenção",
  manancial: "Manancial",
  estudoComplementar: "Necessário Estudo Complementar (EC)?",
  recomendada: "Investimento Infra Recomendada (R$ Milhões)",
  potencial: "Investimento Infra Potencial (R$ Milhões)",
  descricaoIrea: "Descrição Infreaestrutura que Requer Estudo de Alternativas",
  irea: "Investimento IREA (R$ Milhões)",
};

const DIST_COLS = {
  codigo: "Código",
  municipio: "Município",
  uf: "UF",
  regiao: "Região",
};

export const ATLAS_DATASETS: AtlasDataset[] = [
  {
    id: "investimentos_producao",
    label: "Investimentos em Produção de Água",
    sheet: "02.Custos_SistProdutorMunicipio",
    headerRow: 2,
    arquivoSugerido: "AtlasAguas_InvestimentosProducao.xlsx",
    required: [PROD_COLS.ibge, PROD_COLS.uf, PROD_COLS.municipio, PROD_COLS.tipologia, PROD_COLS.recomendada, PROD_COLS.irea],
    normalize: (rows, arquivo) => {
      const erros: string[] = [];
      const out: AtlasRow[] = [];
      const headers = Object.keys(rows[0] ?? {});
      const col = (k: keyof typeof PROD_COLS) => findColumn(headers, PROD_COLS[k]);
      const cIbge = col("ibge"), cUf = col("uf"), cMun = col("municipio"), cTip = col("tipologia"),
        cEppo = col("eppo"), cInt = col("intervencao"), cMan = col("manancial"), cEc = col("estudoComplementar"),
        cRec = col("recomendada"), cPot = col("potencial"), cDescIrea = col("descricaoIrea"), cIrea = col("irea");

      rows.forEach((r, i) => {
        const ibge = norm(cIbge ? r[cIbge] : "");
        if (!ibge || ibge === "nan") return;
        const rec = cRec ? toNumber(r[cRec]) : null;
        const pot = cPot ? toNumber(r[cPot]) : null;
        const irea = cIrea ? toNumber(r[cIrea]) : null;
        let valor: number | null = null;
        let eppo: EppoType = "OBRA";
        let kind = "";
        if (rec) { valor = rec; eppo = "OBRA"; kind = "Infraestrutura Recomendada"; }
        else if (pot) { valor = pot; eppo = "PROJETO"; kind = "Infraestrutura Potencial"; }
        else if (irea) { valor = irea; eppo = "ESTUDO"; kind = "Estudo de Alternativas"; }
        if (!valor) {
          erros.push(`Linha ${i + 2}: sem valor de investimento — ignorada.`);
          return;
        }
        const descEppo = cEppo && !isEmpty(r[cEppo]) ? norm(r[cEppo]) : "";
        const descIrea = cDescIrea && !isEmpty(r[cDescIrea]) ? norm(r[cDescIrea]) : "";
        const tipologia = cTip ? norm(r[cTip]) : "";
        out.push({
          external_key: `ATLAS_PROD:${ibge}:${i}`,
          titulo: (descEppo || descIrea || tipologia || `Produção de água — ${norm(cMun ? r[cMun] : "")}`).slice(0, 300),
          category: "PRODUCTION",
          eppo,
          estimated_value: Math.round(valor * 1_000_000 * 100) / 100,
          status: "PLANEJADO",
          horizonte_ano: 2035,
          horizonte_faixa: "até 2035",
          uf: cUf ? norm(r[cUf]) || null : null,
          municipio: cMun ? norm(r[cMun]) || null : null,
          ibge_code: ibge,
          descricao: `${tipologia} | ${kind}`,
          tipo_intervencao: cInt && !isEmpty(r[cInt]) ? norm(r[cInt]) : null,
          manancial: cMan && !isEmpty(r[cMan]) ? norm(r[cMan]) : null,
          requer_estudo: cEc ? ({ sim: true, nao: false } as Record<string, boolean>)[canon(norm(r[cEc]))] ?? null : null,
          fonte: arquivo,
        });
      });
      return { rows: out, erros };
    },
  },
  {
    id: "investimentos_distribuicao",
    label: "Investimentos em Distribuição e Reposição",
    sheet: "03.Custos_Distribu_Municipio",
    headerRow: 3,
    arquivoSugerido: "AtlasAguas_InvestimentosDistribuicao_v2.xlsx",
    required: [DIST_COLS.codigo, DIST_COLS.municipio, DIST_COLS.uf],
    normalize: (rows, arquivo) => {
      const erros: string[] = [];
      const out: AtlasRow[] = [];
      const headers = Object.keys(rows[0] ?? {});
      const cCod = findColumn(headers, DIST_COLS.codigo);
      const cMun = findColumn(headers, DIST_COLS.municipio);
      const cUf = findColumn(headers, DIST_COLS.uf);
      // Os dois "TOTAL" da planilha: distribuição (12ª coluna) e reposição (20ª coluna).
      const totals = headers.filter((h) => canon(h).startsWith("total"));
      if (totals.length < 2) {
        erros.push('Não foram encontradas as duas colunas "TOTAL" (distribuição e reposição de ativos).');
        return { rows: out, erros };
      }
      const [cTotDist, cTotRep] = totals;

      rows.forEach((r, i) => {
        const ibge = norm(cCod ? r[cCod] : "");
        if (!ibge || ibge === "nan") return;
        const mun = cMun ? norm(r[cMun]) : "";
        const uf = cUf ? norm(r[cUf]) : "";
        const pares: [InvestmentCategory, string, string][] = [
          ["DISTRIBUTION", cTotDist, "Distribuição de água (rede, ligações e reservação)"],
          ["REPLACEMENT", cTotRep, "Reposição de ativos de distribuição"],
        ];
        pares.forEach(([cat, colName, label]) => {
          const v = toNumber(r[colName]);
          if (!v) {
            erros.push(`Linha ${i + 2} (${mun}/${uf}): ${label} sem valor — ignorada.`);
            return;
          }
          out.push({
            external_key: `ATLAS_DIST:${ibge}:${cat}`,
            titulo: `${label} — ${mun}/${uf}`,
            category: cat,
            eppo: "PLANO",
            estimated_value: Math.round(v * 100) / 100,
            status: "PLANEJADO",
            horizonte_ano: 2035,
            horizonte_faixa: "até 2035",
            uf: uf || null,
            municipio: mun || null,
            ibge_code: ibge,
            descricao: "Atlas Águas 2021 — necessidade de investimento até 2035",
            tipo_intervencao: null,
            manancial: null,
            requer_estudo: null,
            fonte: arquivo,
          });
        });
      });
      return { rows: out, erros };
    },
  },
];

export function detectDataset(fileName: string, sheetNames: string[]): AtlasDataset | null {
  const f = canon(fileName);
  return (
    ATLAS_DATASETS.find((d) => sheetNames.some((s) => canon(s) === canon(d.sheet))) ??
    ATLAS_DATASETS.find((d) => f.includes(canon(d.arquivoSugerido).slice(9, 24))) ??
    null
  );
}
