// ai-relay: transparent relay to the cf-ai-image Cloudflare Worker.
//
// The Worker's workers.dev origin is unreachable from mainland-China
// networks, so this EdgeOne (Tencent) edge function forwards every
// request to the Worker server-side and rewrites image URLs inside
// text/JSON responses so they point back at this relay's own origin.
// Auth is end-to-end: the app sends the Worker's own API key in the
// Authorization header and it is forwarded untouched; this relay
// holds no secrets.

const UPSTREAM = "https://cf-ai-image.564983541.workers.dev";
const ALT_ORIGIN = "https://ai.172518.xyz";

export async function onRequest(context) {
  const request = context.request;
  const inUrl = new URL(request.url);
  const target = UPSTREAM + inUrl.pathname + inUrl.search;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const init = { method: request.method, headers: headers, redirect: "manual" };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  let resp;
  try {
    resp = await fetch(target, init);
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "relay upstream fetch failed: " + (e && e.message ? e.message : String(e)) }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  const outHeaders = new Headers(resp.headers);
  const loc = outHeaders.get("Location");
  if (loc) {
    outHeaders.set(
      "Location",
      loc.split(UPSTREAM).join(inUrl.origin).split(ALT_ORIGIN).join(inUrl.origin)
    );
  }

  const ct = resp.headers.get("Content-Type") || "";
  if (ct.indexOf("json") !== -1 || ct.indexOf("text") === 0) {
    let text = await resp.text();
    text = text.split(UPSTREAM).join(inUrl.origin).split(ALT_ORIGIN).join(inUrl.origin);
    outHeaders.delete("Content-Length");
    outHeaders.delete("Content-Encoding");
    return new Response(text, { status: resp.status, headers: outHeaders });
  }

  return new Response(resp.body, { status: resp.status, headers: outHeaders });
}
