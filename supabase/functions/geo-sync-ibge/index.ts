// Pré-cadastro automático de estados e municípios (fonte: IBGE Localidades v1)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface IbgeUf { id: number; sigla: string; nome: string; regiao?: { nome?: string } }
interface IbgeMun { id: number; nome: string; microrregiao?: { mesorregiao?: { UF?: IbgeUf } }; "regiao-imediata"?: { "regiao-intermediaria"?: { UF?: IbgeUf } } }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!req.headers.get("Authorization")) return json({ error: "Missing Authorization" }, 401);

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { count } = await admin.from("municipios").select("codigo_ibge", { count: "exact", head: true });
    const body = (await req.json().catch(() => ({}))) as { force?: boolean };
    if (!body.force && (count ?? 0) >= 5500) {
      return json({ ok: true, skipped: true, municipios: count });
    }

    const ufsRes = await fetch("https://servicodedados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome");
    if (!ufsRes.ok) return json({ error: `IBGE estados: HTTP ${ufsRes.status}` }, 502);
    const ufs = (await ufsRes.json()) as IbgeUf[];

    const { error: ufErr } = await admin.from("ufs").upsert(
      ufs.map((u) => ({ sigla: u.sigla, nome: u.nome, codigo_ibge: u.id, regiao: u.regiao?.nome ?? null })),
      { onConflict: "sigla" },
    );
    if (ufErr) return json({ error: ufErr.message, step: "ufs" }, 500);

    const munRes = await fetch("https://servicodedados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome");
    if (!munRes.ok) return json({ error: `IBGE municípios: HTTP ${munRes.status}` }, 502);
    const muns = (await munRes.json()) as IbgeMun[];

    const rows = muns
      .map((m) => {
        const uf = m.microrregiao?.mesorregiao?.UF?.sigla ?? m["regiao-imediata"]?.["regiao-intermediaria"]?.UF?.sigla;
        return uf ? { codigo_ibge: String(m.id), nome: m.nome, uf } : null;
      })
      .filter(Boolean) as { codigo_ibge: string; nome: string; uf: string }[];

    let gravados = 0;
    for (let i = 0; i < rows.length; i += 1000) {
      const slice = rows.slice(i, i + 1000);
      const { error } = await admin.from("municipios").upsert(slice, { onConflict: "codigo_ibge" });
      if (error) return json({ error: error.message, step: "municipios", gravados }, 500);
      gravados += slice.length;
    }

    return json({ ok: true, ufs: ufs.length, municipios: gravados });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
