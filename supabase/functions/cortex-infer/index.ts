// Córtex IA — Inferência sob demanda
// - Lê modelo + fontes vinculadas (repositórios / bases externas)
// - Suporta modelos tipo MCP (lista tools do servidor Streamable HTTP)
// - Aplica thresholds por bacia/modelo na classificação antes de gravar
// - Grava predições e audit_log com parâmetros, bacia, modelo, fontes, duração
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

// --- UF → bacia (espelhado de src/lib/bacias.ts) ---
const UF_TO_BACIA: Record<string, string> = {
  SP: "Tietê", MG: "São Francisco", BA: "São Francisco", PE: "São Francisco",
  AL: "São Francisco", SE: "São Francisco", PR: "Paraná", MS: "Paraná",
  GO: "Paraná", DF: "Paraná", AM: "Amazonas", PA: "Amazonas", AC: "Amazonas",
  RO: "Amazonas", RR: "Amazonas", AP: "Amazonas", TO: "Amazonas", MA: "Amazonas",
  MT: "Paraguai", RJ: "Atlântico SE", ES: "Atlântico SE", SC: "Atlântico SE",
  RS: "Atlântico SE", CE: "Atlântico SE", RN: "Atlântico SE", PB: "Atlântico SE",
  PI: "Atlântico SE",
};
const ufToBacia = (uf?: string | null) => (uf ? UF_TO_BACIA[uf.toUpperCase()] ?? "Atlântico SE" : "Atlântico SE");

// --- Threshold resolver (mesma prioridade do client) ---
type Threshold = { bacia: string | null; modelo_id: string | null; alto_min: number; critico_min: number };
function resolveThreshold(thresholds: Threshold[], bacia: string, modeloId: string) {
  const b = bacia.trim().toLowerCase();
  const matches = thresholds.filter((t) => {
    const tb = (t.bacia ?? "").trim().toLowerCase();
    return (!t.bacia || tb === b) && (!t.modelo_id || t.modelo_id === modeloId);
  });
  if (!matches.length) return { alto_min: 0.5, critico_min: 0.75 };
  matches.sort((a, b) =>
    ((b.bacia ? 2 : 0) + (b.modelo_id ? 1 : 0)) - ((a.bacia ? 2 : 0) + (a.modelo_id ? 1 : 0))
  );
  return { alto_min: Number(matches[0].alto_min), critico_min: Number(matches[0].critico_min) };
}
function classifyByThreshold(valor: unknown, original: string, th: { alto_min: number; critico_min: number }) {
  if (original === "indeterminado") return "indeterminado";
  const v = Number(valor);
  if (!Number.isFinite(v)) return original || "indeterminado";
  if (v >= th.critico_min) return "critico";
  if (v >= th.alto_min) return "alto";
  if (v >= th.alto_min / 2) return "medio";
  return "baixo";
}

// --- MCP tool discovery (Streamable HTTP) ---
async function discoverMcpTools(serverUrl: string, timeoutMs = 4000): Promise<string[]> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const r = await fetch(serverUrl, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    clearTimeout(t);
    if (!r.ok) return [];
    const ct = r.headers.get("content-type") ?? "";
    let payload: Record<string, unknown> = {};
    if (ct.includes("text/event-stream")) {
      const text = await r.text();
      const line = text.split("\n").find((l) => l.startsWith("data:"));
      if (line) payload = JSON.parse(line.slice(5).trim());
    } else {
      payload = await r.json();
    }
    const tools = (payload as { result?: { tools?: { name?: string }[] } })?.result?.tools ?? [];
    return tools.map((t) => t?.name).filter((n): n is string => !!n);
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const started = Date.now();

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "Missing LOVABLE_API_KEY", code: "missing_key" }, 500);

    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Sessão inválida — faça login novamente.", code: "unauth" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: userRes, error: userErr } = await admin.auth.getUser(auth.replace("Bearer ", ""));
    if (userErr || !userRes?.user) return json({ error: "Sessão inválida.", code: "unauth" }, 401);
    const userId = userRes.user.id;
    const userEmail = userRes.user.email;

    const body = (await req.json().catch(() => ({}))) as Payload;
    const horizonte = body.horizonte_dias ?? 30;
    const limit = Math.min(body.limit ?? 10, 25);

    // 1) Modelo
    let modelo: Record<string, unknown> | null;
    if (body.modelo_id) {
      const { data } = await admin.from("cortex_modelos").select("*").eq("id", body.modelo_id).maybeSingle();
      modelo = data;
    } else {
      const { data } = await admin.from("cortex_modelos")
        .select("*").in("status", ["prod", "shadow"])
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      modelo = data;
    }
    if (!modelo) {
      return json({ error: "Nenhum modelo Córtex configurado. Cadastre um em Administração → Modelos Córtex IA.", code: "no_model" }, 400);
    }
    const modeloId = String(modelo.id);
    const tipo = String(modelo.tipo ?? "online");
    const providerModel = String(modelo.provider_model || "google/gemini-3-flash-preview");
    const metricasCfg = (modelo.metricas ?? {}) as Record<string, unknown>;

    // 2) Fontes vinculadas
    const { data: fontesRaw } = await admin
      .from("cortex_modelos_fontes")
      .select("papel, repositorio_id, base_dados_id, observacoes")
      .eq("modelo_id", modeloId);
    const repoIds = (fontesRaw ?? []).map((f) => f.repositorio_id).filter(Boolean) as string[];
    const baseIds = (fontesRaw ?? []).map((f) => f.base_dados_id).filter(Boolean) as string[];
    const [{ data: repos }, { data: bases }] = await Promise.all([
      repoIds.length
        ? admin.from("repositorios_artefatos").select("id, nome, tipo, bucket_ou_path, endpoint, ativo").in("id", repoIds)
        : Promise.resolve({ data: [] as unknown[] }),
      baseIds.length
        ? admin.from("bases_dados_externas").select("id, nome, tipo, host, database, ativo").in("id", baseIds)
        : Promise.resolve({ data: [] as unknown[] }),
    ]);
    type Repo = { id: string; nome: string; tipo: string; bucket_ou_path: string | null; endpoint: string | null; ativo: boolean };
    type Base = { id: string; nome: string; tipo: string; host: string | null; database: string | null; ativo: boolean };
    const repoMap = new Map<string, Repo>((repos as Repo[] ?? []).map((r) => [r.id, r]));
    const baseMap = new Map<string, Base>((bases as Base[] ?? []).map((b) => [b.id, b]));
    const fontesResumo = (fontesRaw ?? []).map((f) => {
      if (f.repositorio_id) {
        const r = repoMap.get(f.repositorio_id);
        return r ? { papel: f.papel, tipo_fonte: "repositorio", tipo: r.tipo, nome: r.nome, ativo: r.ativo } : null;
      }
      if (f.base_dados_id) {
        const b = baseMap.get(f.base_dados_id);
        return b ? { papel: f.papel, tipo_fonte: "base_dados", tipo: b.tipo, nome: b.nome, ativo: b.ativo } : null;
      }
      return null;
    }).filter(Boolean) as { papel: string; tipo_fonte: string; tipo: string; nome: string; ativo: boolean }[];
    const fontesAtivas = fontesResumo.filter((f) => f.ativo);

    // 3) MCP tools (opcional)
    let mcpTools: string[] = [];
    let mcpServerUrl: string | null = null;
    if (tipo === "mcp") {
      const mcpCfg = (metricasCfg.mcp ?? {}) as { server_url?: string; tools?: string[] };
      mcpServerUrl = mcpCfg.server_url ?? null;
      const declared = Array.isArray(mcpCfg.tools) ? mcpCfg.tools : [];
      const discovered = mcpServerUrl ? await discoverMcpTools(mcpServerUrl) : [];
      mcpTools = Array.from(new Set([...declared, ...discovered]));
    }

    // 4) Thresholds
    const { data: thsRaw } = await admin.from("cortex_thresholds").select("bacia, modelo_id, alto_min, critico_min");
    const thresholds = (thsRaw ?? []) as Threshold[];

    // 5) ETEs alvo
    let etesQ = admin.from("etes")
      .select("id, nome, municipio, uf, concessionaria_id")
      .eq("status", "ativa").limit(limit);
    if (body.ete_ids?.length) etesQ = etesQ.in("id", body.ete_ids);
    const { data: etes, error: etesErr } = await etesQ;
    if (etesErr) return json({ error: `Falha ao listar ETEs: ${etesErr.message}`, code: "db" }, 500);
    if (!etes?.length) return json({ predicoes: [], warning: "Nenhuma ETE elegível no escopo." });

    // agencia por concessionaria
    const concIds = Array.from(new Set(etes.map((e) => e.concessionaria_id).filter(Boolean))) as string[];
    const { data: concs } = concIds.length
      ? await admin.from("concessionarias").select("id, agencia_reguladora_id").in("id", concIds)
      : { data: [] };
    const concToAr = new Map<string, string | null>((concs ?? []).map((c: { id: string; agencia_reguladora_id: string | null }) => [c.id, c.agencia_reguladora_id]));

    const results: unknown[] = [];
    const errors: { ete_id: string; error: string }[] = [];

    for (const ete of etes) {
      try {
        const { data: medicoes } = await admin
          .from("dbo_medicoes")
          .select("medido_em, dbo_entrada_mg_l, dbo_saida_mg_l, eficiencia_pct, conforme")
          .eq("ete_id", ete.id)
          .order("medido_em", { ascending: false })
          .limit(6);

        const { data: atlas } = await admin
          .from("atlas_indicadores")
          .select("cobertura_tratamento_pct, carga_dbo_kg_dia, rios_comprometidos_km")
          .eq("uf", ete.uf).maybeSingle();

        const bacia = ufToBacia(ete.uf);
        const features = {
          historico_medicoes: medicoes ?? [],
          atlas_contexto: atlas ?? null,
          maturidade_dados_pct: medicoes?.length ? (medicoes.length / 6) * 100 : 0,
          horizonte_dias: horizonte,
          bacia,
          fontes_vinculadas: fontesAtivas,
          mcp: tipo === "mcp" ? { server_url: mcpServerUrl, tools: mcpTools } : undefined,
        };

        const system = `Você é o Córtex, um analista de saneamento da ANA.
REGRA DO FALSO AFLUENTE (obrigatória):
1. Nunca use apenas sazonalidade — pondere a maturidade de dados.
2. Considere o contexto do Atlas Esgotos como confusor.
3. Se maturidade < 50%, reduza a confiança e use "indeterminado" ou "baixo".
4. Justifique citando as variáveis usadas e as fontes vinculadas quando relevantes.
${tipo === "mcp" && mcpTools.length ? `Ferramentas MCP disponíveis (indique quando usá-las): ${mcpTools.join(", ")}.` : ""}
${fontesAtivas.length ? `Fontes de conhecimento ativas: ${fontesAtivas.map((f) => `${f.nome}(${f.tipo}/${f.papel})`).join("; ")}.` : ""}
Responda APENAS JSON válido: {"valor_dbo_previsto":number,"risco_nao_conformidade":number(0-1),"classificacao":"baixo|medio|alto|critico|indeterminado","confianca":number(0-1),"explicacao":string}`;

        const userMsg = `ETE: ${ete.nome} (${ete.municipio}/${ete.uf}) · bacia ${bacia}
Horizonte: ${horizonte} dias
Features: ${JSON.stringify(features)}`;

        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_API_KEY },
          body: JSON.stringify({
            model: providerModel,
            messages: [
              { role: "system", content: system },
              { role: "user", content: userMsg },
            ],
            response_format: { type: "json_object" },
          }),
        });

        if (resp.status === 429) {
          return json({ error: "Limite de requisições do AI Gateway atingido. Aguarde alguns instantes e tente novamente.", code: "rate_limit" }, 429);
        }
        if (resp.status === 402) {
          return json({ error: "Créditos do AI Gateway esgotados. Adicione créditos no workspace para continuar.", code: "no_credits" }, 402);
        }
        if (!resp.ok) {
          const detail = await resp.text();
          errors.push({ ete_id: ete.id, error: `AI Gateway ${resp.status}: ${detail.slice(0, 240)}` });
          continue;
        }

        const j = await resp.json();
        let parsed: Record<string, unknown> = {};
        try { parsed = JSON.parse(j.choices?.[0]?.message?.content ?? "{}"); }
        catch { parsed = { explicacao: j.choices?.[0]?.message?.content ?? "" }; }

        const valorNum = Number(parsed.risco_nao_conformidade);
        const classOriginal = String(parsed.classificacao ?? "indeterminado");
        const th = resolveThreshold(thresholds, bacia, modeloId);
        const classFinal = classifyByThreshold(Number.isFinite(valorNum) ? valorNum : null, classOriginal, th);

        const { data: pred, error: pErr } = await admin.from("cortex_predicoes").insert({
          modelo_id: modeloId,
          escopo: "ete",
          ete_id: ete.id,
          concessionaria_id: ete.concessionaria_id,
          agencia_reguladora_id: ete.concessionaria_id ? concToAr.get(ete.concessionaria_id) ?? null : null,
          bacia,
          horizonte_dias: horizonte,
          metrica: "risco_nao_conformidade",
          valor: Number.isFinite(valorNum) ? valorNum : null,
          confianca: Number(parsed.confianca) || null,
          classificacao: classFinal,
          features,
          explicacao: String(parsed.explicacao ?? ""),
        }).select().single();

        if (pErr) {
          errors.push({ ete_id: ete.id, error: pErr.message });
          continue;
        }
        results.push({ ...pred, threshold_aplicado: th, classificacao_modelo: classOriginal });
      } catch (e) {
        errors.push({ ete_id: ete.id, error: (e as Error).message });
      }
    }

    const duracaoMs = Date.now() - started;
    const baciasSet = Array.from(new Set(etes.map((e) => ufToBacia(e.uf))));

    // Audit log
    await admin.from("audit_log").insert({
      user_id: userId,
      user_email: userEmail,
      action: "CORTEX_INFER_RUN",
      target: "cortex_predicoes",
      severity: errors.length ? "warning" : "info",
      metadata: {
        parametros: { ete_ids: body.ete_ids ?? null, horizonte_dias: horizonte, limit, modelo_id: body.modelo_id ?? null },
        modelo: { id: modeloId, nome: modelo.nome, versao: modelo.versao, status: modelo.status, tipo, provider_model: providerModel },
        bacias: baciasSet,
        fontes: fontesResumo,
        mcp: tipo === "mcp" ? { server_url: mcpServerUrl, tools: mcpTools } : null,
        contagem: { etes: etes.length, predicoes: results.length, erros: errors.length },
        duracao_ms: duracaoMs,
      },
    });

    return json({
      modelo: { id: modeloId, nome: modelo.nome, status: modelo.status, tipo, provider_model: providerModel },
      predicoes: results,
      erros: errors,
      duracao_ms: duracaoMs,
      fontes: fontesResumo,
      mcp_tools: mcpTools,
    });
  } catch (e) {
    return json({ error: (e as Error).message, code: "internal" }, 500);
  }
});
