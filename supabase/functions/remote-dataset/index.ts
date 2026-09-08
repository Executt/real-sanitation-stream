// Proxy de leitura para importação de mananciais via API (JSON / GeoJSON / ArcGIS FeatureServer).
// Também descobre as camadas publicadas em um item do ArcGIS Experience Builder (ex.: geoportal do INEA).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const BLOCKED = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1)/i;

function safeUrl(raw: string): URL | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (BLOCKED.test(u.hostname)) return null;
    return u;
  } catch {
    return null;
  }
}

async function getJson(url: string, timeoutMs = 25000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json,*/*" } });
    const text = await res.text();
    let parsed: unknown = null;
    try { parsed = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, ok: res.ok, parsed, text };
  } finally {
    clearTimeout(t);
  }
}

// Extrai recursivamente URLs de serviços de feição de um JSON qualquer
function collectServiceUrls(node: unknown, out: Set<string>) {
  if (!node) return;
  if (typeof node === "string") {
    if (/\/(FeatureServer|MapServer)(\/\d+)?$/i.test(node)) out.add(node.replace(/\/$/, ""));
    return;
  }
  if (Array.isArray(node)) { node.forEach((n) => collectServiceUrls(n, out)); return; }
  if (typeof node === "object") Object.values(node as Record<string, unknown>).forEach((v) => collectServiceUrls(v, out));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!req.headers.get("Authorization")) return json({ error: "Missing Authorization" }, 401);

  try {
    const body = (await req.json().catch(() => ({}))) as {
      url?: string;
      discoverPortalItem?: { portal: string; itemId: string };
      arcgisLayers?: string; // FeatureServer/MapServer root
    };

    // 1) Descoberta de camadas de um item de portal ArcGIS
    if (body.discoverPortalItem) {
      const { portal, itemId } = body.discoverPortalItem;
      const base = safeUrl(portal);
      if (!base || !/^[a-f0-9]{16,40}$/i.test(itemId)) return json({ error: "Portal ou itemId inválido." }, 400);
      const root = `${base.origin}${base.pathname.replace(/\/$/, "")}`;
      const [item, data] = await Promise.all([
        getJson(`${root}/sharing/rest/content/items/${itemId}?f=json`),
        getJson(`${root}/sharing/rest/content/items/${itemId}/data?f=json`),
      ]);
      if (!item.ok && !data.ok) return json({ error: `Portal indisponível (HTTP ${item.status}/${data.status}).` }, 502);
      const urls = new Set<string>();
      collectServiceUrls(item.parsed, urls);
      collectServiceUrls(data.parsed, urls);
      return json({ ok: true, item: (item.parsed as { title?: string } | null)?.title ?? null, services: [...urls] });
    }

    // 2) Lista as camadas de um FeatureServer/MapServer
    if (body.arcgisLayers) {
      const u = safeUrl(body.arcgisLayers);
      if (!u) return json({ error: "URL inválida." }, 400);
      const r = await getJson(`${u.toString().replace(/\/$/, "")}?f=json`);
      if (!r.ok) return json({ error: `Serviço respondeu HTTP ${r.status}`, details: r.text.slice(0, 500) }, 502);
      const p = r.parsed as { layers?: { id: number; name: string }[]; tables?: { id: number; name: string }[] } | null;
      return json({ ok: true, layers: [...(p?.layers ?? []), ...(p?.tables ?? [])] });
    }

    // 3) Leitura genérica de uma URL de dados
    if (!body.url) return json({ error: "Informe 'url'." }, 400);
    const u = safeUrl(body.url);
    if (!u) return json({ error: "URL inválida ou não permitida." }, 400);
    const r = await getJson(u.toString(), 45000);
    if (!r.ok) return json({ error: `Origem respondeu HTTP ${r.status}`, details: r.text.slice(0, 500) }, 502);
    if (r.parsed === null) return json({ error: "A resposta não é um JSON válido." }, 422);
    return json({ ok: true, data: r.parsed });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
