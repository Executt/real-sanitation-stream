import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AppRole = "operador" | "gestor_ana" | "gestor_ar" | "superadmin";

interface InvitePayload {
  email: string;
  full_name?: string;
  role: AppRole;
  concessionaria_id?: string | null;
  agencia_reguladora_id?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization" }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Identify the caller from JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userRes?.user) return json({ error: "Invalid session" }, 401);
    const caller = userRes.user;

    const { data: callerRolesData } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", caller.id);
    const callerRoles = (callerRolesData ?? []).map((r: { role: AppRole }) => r.role);

    const isSuper = callerRoles.includes("superadmin");
    const isAna = callerRoles.includes("gestor_ana");
    const isAr = callerRoles.includes("gestor_ar");
    if (!isSuper && !isAna && !isAr) return json({ error: "Sem permissão" }, 403);

    const payload = (await req.json()) as InvitePayload;
    if (!payload?.email || !payload?.role) return json({ error: "email e role são obrigatórios" }, 400);

    // gestor_ar pode convidar apenas dentro da sua AR
    if (isAr && !isSuper && !isAna) {
      const { data: prof } = await supabaseAdmin
        .from("profiles").select("agencia_reguladora_id").eq("user_id", caller.id).maybeSingle();
      const myAr = prof?.agencia_reguladora_id;
      if (!myAr) return json({ error: "Usuário sem AR vinculada" }, 403);
      if (payload.agencia_reguladora_id && payload.agencia_reguladora_id !== myAr) {
        return json({ error: "Fora da sua Agência Reguladora" }, 403);
      }
      payload.agencia_reguladora_id = myAr;
      if (payload.role === "superadmin" || payload.role === "gestor_ana") {
        return json({ error: "Role não permitido para gestor_ar" }, 403);
      }
    }

    // Verifica se já existe
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
    const found = existing?.users?.find((u: { email?: string }) => u.email?.toLowerCase() === payload.email.toLowerCase());
    let userId: string;
    let invited = false;

    if (found) {
      userId = found.id;
    } else {
      const { data: invite, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        payload.email,
        { data: { full_name: payload.full_name ?? null } },
      );
      if (inviteErr || !invite?.user) {
        // Fallback: cria com senha temporária se o convite por e-mail falhar (ex.: SMTP não configurado)
        const tempPwd = crypto.randomUUID().replace(/-/g, "") + "Aa1!";
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: payload.email,
          password: tempPwd,
          email_confirm: false,
          user_metadata: { full_name: payload.full_name ?? null },
        });
        if (createErr || !created?.user) return json({ error: inviteErr?.message ?? createErr?.message ?? "Falha ao convidar" }, 500);
        userId = created.user.id;
      } else {
        userId = invite.user.id;
      }
      invited = true;
    }

    // Atualiza profile com vínculos
    await supabaseAdmin.from("profiles").upsert({
      user_id: userId,
      full_name: payload.full_name ?? null,
      concessionaria_id: payload.concessionaria_id ?? null,
      agencia_reguladora_id: payload.agencia_reguladora_id ?? null,
    }, { onConflict: "user_id" });

    // Atribui role se ainda não tem
    const { data: existsRole } = await supabaseAdmin
      .from("user_roles").select("id")
      .eq("user_id", userId).eq("role", payload.role).maybeSingle();
    if (!existsRole) {
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: payload.role });
    }

    // Audit
    await supabaseAdmin.from("audit_log").insert({
      user_id: caller.id,
      user_email: caller.email,
      action: invited ? "USER_INVITED" : "USER_UPDATED",
      target: "profiles",
      severity: "info",
      metadata: {
        invited_user_id: userId,
        invited_email: payload.email,
        role: payload.role,
        concessionaria_id: payload.concessionaria_id ?? null,
        agencia_reguladora_id: payload.agencia_reguladora_id ?? null,
      },
    });

    return json({ success: true, userId, invited });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
