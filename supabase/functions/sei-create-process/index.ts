// sei-create-process — opens a real process in SEI using persisted credentials.
// Accepts: { interessado, especificacao, observacao?, documentos?: [{tipo, conteudo}] }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateProcessBody {
  interessado: string;
  especificacao: string;
  observacao?: string;
  tipo_processo?: string;
  documentos?: { tipo: string; conteudo: string }[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // AuthN/AuthZ: any authenticated user with operador/gestor/superadmin can open a process
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Invalid token" }, 401);

    const body = (await req.json()) as CreateProcessBody;
    if (!body?.interessado || !body?.especificacao) {
      return json({ error: "Required: interessado, especificacao" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: cfg, error: cfgErr } = await admin
      .from("sei_config").select("*").limit(1).maybeSingle();
    if (cfgErr || !cfg) return json({ error: "SEI config not found" }, 500);
    if (!cfg.enabled) return json({ error: "SEI integration disabled" }, 400);
    if (!cfg.api_url || !cfg.api_key || !cfg.orgao_id || !cfg.unidade_id) {
      return json({ error: "SEI config incomplete (api_url/api_key/orgao_id/unidade_id)" }, 400);
    }

    // Build SEI payload (compatible with SEI API v4 "gerarProcedimento")
    const tipoProcesso = body.tipo_processo || cfg.tipo_processo;
    const seiPayload = {
      Tipo: tipoProcesso,
      Especificacao: body.especificacao,
      Interessados: [{ Nome: body.interessado }],
      Observacao: body.observacao ?? "",
      NivelAcesso: "0", // public
      Documentos: (body.documentos ?? []).map((d) => ({
        Tipo: d.tipo,
        Conteudo: d.conteudo,
      })),
    };

    const url = `${cfg.api_url.replace(/\/$/, "")}/orgaos/${cfg.orgao_id}/unidades/${cfg.unidade_id}/procedimentos`;

    let seiResponse: Response;
    let seiData: unknown;
    try {
      seiResponse = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": cfg.api_key,
        },
        body: JSON.stringify(seiPayload),
      });
      const text = await seiResponse.text();
      try { seiData = JSON.parse(text); } catch { seiData = { raw: text }; }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await admin.from("audit_log").insert({
        user_id: userData.user.id,
        user_email: userData.user.email,
        action: "SEI_CREATE_PROCESS_ERROR",
        target: url,
        severity: "error",
        metadata: { error: msg, payload: seiPayload },
      });
      return json({ error: `SEI request failed: ${msg}` }, 502);
    }

    const ok = seiResponse.ok;
    await admin.from("audit_log").insert({
      user_id: userData.user.id,
      user_email: userData.user.email,
      action: ok ? "SEI_CREATE_PROCESS" : "SEI_CREATE_PROCESS_ERROR",
      target: url,
      severity: ok ? "info" : "error",
      metadata: {
        status: seiResponse.status,
        interessado: body.interessado,
        especificacao: body.especificacao,
        tipo: tipoProcesso,
        response: seiData,
      },
    });

    if (!ok) {
      return json({ error: "SEI returned error", status: seiResponse.status, response: seiData }, 502);
    }

    return json({ success: true, process: seiData });
  } catch (e) {
    console.error("sei-create-process error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
