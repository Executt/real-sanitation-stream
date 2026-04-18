import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SmtpSendBody {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate the caller and check superadmin role using their JWT
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: "Invalid token" }, 401);
    }

    const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "superadmin",
    });
    if (roleErr || !isAdmin) {
      return json({ error: "Forbidden: superadmin only" }, 403);
    }

    const body = (await req.json()) as SmtpSendBody;
    if (!body?.to || !body?.subject || (!body.html && !body.text)) {
      return json(
        { error: "Required: to, subject, and html or text" },
        400,
      );
    }

    // Load SMTP config with service role (bypasses RLS, already authorized above)
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: cfg, error: cfgErr } = await adminClient
      .from("smtp_config")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (cfgErr || !cfg) {
      return json({ error: "SMTP config not found" }, 500);
    }
    if (!cfg.enabled) {
      return json({ error: "SMTP is disabled in configuration" }, 400);
    }
    if (!cfg.host || !cfg.from_email) {
      return json({ error: "SMTP host or from_email not configured" }, 400);
    }

    const client = new SMTPClient({
      connection: {
        hostname: cfg.host,
        port: cfg.port,
        tls: cfg.use_tls,
        auth: cfg.username
          ? { username: cfg.username, password: cfg.password }
          : undefined,
      },
    });

    try {
      await client.send({
        from: `${cfg.from_name} <${cfg.from_email}>`,
        to: body.to,
        replyTo: body.replyTo,
        subject: body.subject,
        content: body.text ?? "",
        html: body.html,
      });
    } finally {
      await client.close();
    }

    // Audit log entry (trigger will not fire since this isn't a config change)
    await adminClient.from("audit_log").insert({
      user_id: userData.user.id,
      user_email: userData.user.email,
      action: "SMTP_EMAIL_SENT",
      target: Array.isArray(body.to) ? body.to.join(", ") : body.to,
      severity: "info",
      metadata: { subject: body.subject },
    });

    return json({ success: true });
  } catch (e) {
    console.error("smtp-send error:", e);
    return json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      500,
    );
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
