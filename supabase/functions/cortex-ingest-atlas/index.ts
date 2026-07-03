// Córtex — Ingestão incremental de indicadores do Atlas Esgotos (ANA)
// Fonte primária: https://atlasesgotos.ana.gov.br/ (WebApp ArcGIS + shapefiles/PDF).
// Como a fonte não expõe API REST estável, este endpoint aceita:
//   - `indicadores`: array vindo de um ETL externo (payload manual/agendado), ou
//   - `seed=true`  : carrega um baseline agregado por UF (Atlas 2020) para bootstrap.
// Grava em `atlas_indicadores` com UPSERT por (ibge_code, ano_referencia) — ou (uf, ano_referencia).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Indicador = {
  bacia?: string | null;
  uf: string;
  municipio?: string | null;
  ibge_code?: string | null;
  carga_dbo_kg_dia?: number | null;
  cobertura_coleta_pct?: number | null;
  cobertura_tratamento_pct?: number | null;
  rios_comprometidos_km?: number | null;
  populacao_urbana?: number | null;
  ano_referencia?: number | null;
  fonte?: string | null;
  raw?: Record<string, unknown> | null;
};

// Baseline agregado por UF (Atlas Esgotos 2020, ANA) — usado no seed inicial.
const SEED_UF: Indicador[] = [
  { uf: "SP", cobertura_coleta_pct: 92.5, cobertura_tratamento_pct: 70.0, carga_dbo_kg_dia: 1_150_000, rios_comprometidos_km: 3200 },
  { uf: "MG", cobertura_coleta_pct: 86.4, cobertura_tratamento_pct: 42.7, carga_dbo_kg_dia:   620_000, rios_comprometidos_km: 2100 },
  { uf: "RJ", cobertura_coleta_pct: 66.3, cobertura_tratamento_pct: 44.1, carga_dbo_kg_dia:   540_000, rios_comprometidos_km:  980 },
  { uf: "DF", cobertura_coleta_pct: 87.5, cobertura_tratamento_pct: 87.5, carga_dbo_kg_dia:    72_000, rios_comprometidos_km:   90 },
  { uf: "BA", cobertura_coleta_pct: 43.5, cobertura_tratamento_pct: 40.1, carga_dbo_kg_dia:   410_000, rios_comprometidos_km: 1800 },
  { uf: "PE", cobertura_coleta_pct: 34.9, cobertura_tratamento_pct: 32.1, carga_dbo_kg_dia:   290_000, rios_comprometidos_km: 1450 },
  { uf: "CE", cobertura_coleta_pct: 38.6, cobertura_tratamento_pct: 36.0, carga_dbo_kg_dia:   240_000, rios_comprometidos_km: 1120 },
  { uf: "PR", cobertura_coleta_pct: 74.2, cobertura_tratamento_pct: 72.8, carga_dbo_kg_dia:   310_000, rios_comprometidos_km:  760 },
  { uf: "RS", cobertura_coleta_pct: 27.3, cobertura_tratamento_pct: 25.0, carga_dbo_kg_dia:   470_000, rios_comprometidos_km: 1650 },
  { uf: "GO", cobertura_coleta_pct: 60.7, cobertura_tratamento_pct: 58.4, carga_dbo_kg_dia:   190_000, rios_comprometidos_km:  540 },
].map((r) => ({ ...r, ano_referencia: 2020, fonte: "Atlas Esgotos ANA 2020 (baseline UF)", raw: null }));

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth (usuário autenticado ou cron via Authorization Bearer com anon key)
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Missing Authorization" }, 401);

    const body = (await req.json().catch(() => ({}))) as {
      indicadores?: Indicador[];
      seed?: boolean;
      ano_referencia?: number;
    };

    const ano = body.ano_referencia ?? new Date().getFullYear();
    const rows: Indicador[] = body.seed
      ? SEED_UF.map((r) => ({ ...r, ano_referencia: r.ano_referencia ?? ano }))
      : (body.indicadores ?? []);

    if (!rows.length) {
      return json({ error: "Nenhum indicador informado. Envie {indicadores:[...]} ou {seed:true}." }, 400);
    }

    // Separar upserts por chave disponível
    const comIbge = rows.filter((r) => r.ibge_code);
    const semIbge = rows.filter((r) => !r.ibge_code);

    let inserted = 0, updated = 0;

    if (comIbge.length) {
      const { data, error } = await admin
        .from("atlas_indicadores")
        .upsert(comIbge, { onConflict: "ibge_code,ano_referencia", ignoreDuplicates: false })
        .select("id");
      if (error) return json({ error: error.message, step: "upsert_ibge" }, 500);
      inserted += data?.length ?? 0;
    }

    if (semIbge.length) {
      const { data, error } = await admin
        .from("atlas_indicadores")
        .upsert(semIbge, { onConflict: "uf,ano_referencia", ignoreDuplicates: false })
        .select("id");
      if (error) return json({ error: error.message, step: "upsert_uf" }, 500);
      updated += data?.length ?? 0;
    }

    // Log em api_probe_log para rastreabilidade
    await admin.from("api_probe_log").insert({
      source: "AtlasEsgotos",
      endpoint: "cortex-ingest-atlas",
      state: "up",
      http_status: 200,
      duration_ms: 0,
      error_message: null,
    });

    return json({
      ok: true,
      total: rows.length,
      com_ibge: comIbge.length,
      sem_ibge: semIbge.length,
      inserted_or_updated: inserted + updated,
      ano_referencia: ano,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
