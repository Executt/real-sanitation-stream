// LDAP sync — connects to a real LDAP/AD server using persisted ldap_config,
// searches users by filter, and provisions them into auth.users + user_roles.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Client } from "npm:ldapts@7.2.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SyncResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: { email?: string; message: string }[];
  users: { email: string; name: string; status: "created" | "updated" | "skipped" | "error" }[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate caller and superadmin role
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Invalid token" }, 401);

    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "superadmin",
    });
    if (!isAdmin) return json({ error: "Forbidden: superadmin only" }, 403);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Load LDAP config
    const { data: cfg, error: cfgErr } = await admin
      .from("ldap_config")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (cfgErr || !cfg) return json({ error: "LDAP config not found" }, 500);
    if (!cfg.enabled) return json({ error: "LDAP is disabled" }, 400);
    if (!cfg.host || !cfg.base_dn) {
      return json({ error: "LDAP host or base_dn not configured" }, 400);
    }

    // Optional dry-run mode
    let dryRun = false;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        dryRun = !!body?.dryRun;
      } catch (_) { /* no body is fine */ }
    }

    const result: SyncResult = {
      total: 0, created: 0, updated: 0, skipped: 0, errors: [], users: [],
    };

    // Connect to LDAP
    const client = new Client({
      url: `${cfg.use_tls ? "ldaps" : "ldap"}://${cfg.host}:${cfg.port}`,
    });

    try {
      await client.bind(cfg.bind_dn, cfg.bind_password);

      const entries = await client.search(cfg.base_dn, {
        scope: "sub",
        filter: cfg.user_filter || "(objectClass=person)",
        attributes: [cfg.attr_email, cfg.attr_name, cfg.attr_org],
      });

      result.total = entries.length;

      for (const entry of entries) {
        const attrs: Record<string, string> = {};
        for (const a of entry.attributes ?? []) {
          attrs[a.type.toLowerCase()] = Array.isArray(a.values) ? a.values[0] : a.values;
        }
        const email = attrs[cfg.attr_email.toLowerCase()];
        const fullName = attrs[cfg.attr_name.toLowerCase()] ?? email;
        const organization = attrs[cfg.attr_org.toLowerCase()] ?? null;

        if (!email) {
          result.skipped++;
          result.errors.push({ message: `Entry without ${cfg.attr_email}: ${entry.dn}` });
          continue;
        }

        if (dryRun) {
          result.users.push({ email, name: fullName, status: "skipped" });
          result.skipped++;
          continue;
        }

        // Check if user already exists (by email)
        const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const found = existing?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

        try {
          if (found) {
            // Update profile metadata
            await admin.from("profiles").update({
              full_name: fullName,
              organization,
            }).eq("user_id", found.id);
            result.updated++;
            result.users.push({ email, name: fullName, status: "updated" });
          } else {
            // Create user (auto-confirmed) with random password
            const tempPassword = crypto.randomUUID() + "Aa1!";
            const { data: created, error: createErr } = await admin.auth.admin.createUser({
              email,
              password: tempPassword,
              email_confirm: true,
              user_metadata: { full_name: fullName, source: "ldap" },
            });
            if (createErr || !created.user) {
              result.errors.push({ email, message: createErr?.message ?? "create failed" });
              result.users.push({ email, name: fullName, status: "error" });
              continue;
            }
            // Profile is created by handle_new_user trigger; update org/name
            await admin.from("profiles").update({
              full_name: fullName,
              organization,
            }).eq("user_id", created.user.id);

            // Assign default role from config
            await admin.from("user_roles").insert({
              user_id: created.user.id,
              role: cfg.default_role,
            });

            result.created++;
            result.users.push({ email, name: fullName, status: "created" });
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          result.errors.push({ email, message: msg });
          result.users.push({ email, name: fullName, status: "error" });
        }
      }
    } finally {
      try { await client.unbind(); } catch (_) { /* ignore */ }
    }

    // Audit
    await admin.from("audit_log").insert({
      user_id: userData.user.id,
      user_email: userData.user.email,
      action: dryRun ? "LDAP_SYNC_DRYRUN" : "LDAP_SYNC",
      target: `${cfg.host}:${cfg.port}`,
      severity: "info",
      metadata: {
        total: result.total, created: result.created,
        updated: result.updated, skipped: result.skipped,
        errors: result.errors.length,
      },
    });

    return json({ success: true, dryRun, ...result });
  } catch (e) {
    console.error("ldap-sync error:", e);
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
