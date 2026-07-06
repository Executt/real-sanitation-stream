// Córtex IA - Inferência sob demanda
// Gera predições de risco/DBO para ETEs, aplicando a Regra do Falso Afluente.
// Escrita em cortex_predicoes usa service_role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Payload = {
  modelo_id?: string;
  ete_ids?: string[];
  horizonte_dias?: number;
  limit?: number;
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "Missing LOVABLE_API_KEY" }, 500);

    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Missing Authorization" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userRes, error: userErr } = await admin.auth.getUser(
      auth.replace("Bearer ", ""),
    );
    if (userErr || !userRes?.user) return json({ error: "Invalid session" }, 401);

    const body = (await req.json().catch(() => ({}))) as Payload;
    const horizonte = body.horizonte_dias ?? 30;
    const limit = Math.min(body.limit ?? 10, 25);

    // 1) Seleciona modelo (o mais recente ativo em shadow ou prod se não informado)
    let modelo;
    if (body.modelo_id) {
      const { data } = await admin.from("cortex_modelos").select("*").eq("id", body.modelo_id).maybeSingle();
      modelo = data;
    } else {
      const { data } = await admin.from("cortex_modelos")
        .select("*").in("status", ["prod", "shadow"])
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      modelo = data;
    }
    if (!modelo) return json({ error: "Nenhum modelo Córtex configurado" }, 400);

    // 2) Seleciona ETEs alvo (com últimas medições)
    let etesQ = admin.from("etes").select("id, nome, municipio, uf, concessionaria_id").eq("status", "ativa").limit(limit);
    if (body.ete_ids?.length) etesQ = etesQ.in("id", body.ete_ids);
    const { data: etes, error: etesErr } = await etesQ;
    if (etesErr) return json({ error: etesErr.message }, 500);
    if (!etes?.length) return json({ predicoes: [], warning: "Nenhuma ETE elegível" });

    const results: unknown[] = [];

    for (const ete of etes) {
      // Últimas 6 medições
      const { data: medicoes } = await admin
        .from("dbo_medicoes")
        .select("medido_em, dbo_entrada_mg_l, dbo_saida_mg_l, eficiencia_pct, conforme")
        .eq("ete_id", ete.id)
        .order("medido_em", { ascending: false })
        .limit(6);

      // Indicador Atlas da UF/município (Regra do Falso Afluente: variável de contexto)
      const { data: atlas } = await admin
        .from("atlas_indicadores")
        .select("cobertura_tratamento_pct, carga_dbo_kg_dia, rios_comprometidos_km")
        .eq("uf", ete.uf)
        .maybeSingle();

      const features = {
        historico_medicoes: medicoes ?? [],
        atlas_contexto: atlas ?? null,
        maturidade_dados_pct: medicoes?.length ? (medicoes.length / 6) * 100 : 0,
        horizonte_dias: horizonte,
      };

      const system = `Você é o Córtex, um analista de saneamento da ANA.
REGRA DO FALSO AFLUENTE (obrigatória):
1. Nunca use apenas sazonalidade/calendário — pondere a maturidade de dados do município.
2. Considere o contexto do Atlas Esgotos (cobertura, carga, rios comprometidos) como confusor.
3. Se maturidade de dados < 50%, reduza a confiança e classifique risco como "indeterminado" ou "baixo" com nota.
4. Justifique brevemente a predição citando as variáveis usadas.
Responda APENAS JSON válido: {"valor_dbo_previsto":number,"risco_nao_conformidade":number(0-1),"classificacao":"baixo|medio|alto|critico|indeterminado","confianca":number(0-1),"explicacao":string}`;

      const user = `ETE: ${ete.nome} (${ete.municipio}/${ete.uf})
Horizonte: ${horizonte} dias
Features: ${JSON.stringify(features)}`;

      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": LOVABLE_API_KEY,
        },
        body: JSON.stringify({
          model: modelo.provider_model || "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (resp.status === 429) return json({ error: "Rate limit no AI Gateway" }, 429);
      if (resp.status === 402) return json({ error: "Créditos AI esgotados" }, 402);
      if (!resp.ok) {
        const t = await resp.text();
        return json({ error: "AI Gateway error", detail: t }, 500);
      }

      const j = await resp.json();
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(j.choices?.[0]?.message?.content ?? "{}");
      } catch {
        parsed = { explicacao: j.choices?.[0]?.message?.content ?? "" };
      }

      const { data: pred, error: pErr } = await admin.from("cortex_predicoes").insert({
        modelo_id: modelo.id,
        escopo: "ete",
        ete_id: ete.id,
        concessionaria_id: ete.concessionaria_id,
        horizonte_dias: horizonte,
        metrica: "risco_nao_conformidade",
        valor: Number(parsed.risco_nao_conformidade) || null,
        confianca: Number(parsed.confianca) || null,
        classificacao: String(parsed.classificacao ?? "indeterminado"),
        features,
        explicacao: String(parsed.explicacao ?? ""),
      }).select().single();

      if (pErr) return json({ error: pErr.message }, 500);
      results.push(pred);
    }

    return json({ modelo: { id: modelo.id, nome: modelo.nome, status: modelo.status }, predicoes: results });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
