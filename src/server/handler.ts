/**
 * Serves the static export. The report keeps its state in the query string, so
 * the server never reads it: every path maps to a file, and that is all.
 */
import { stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import type { Logger } from "./logger";
import { TRACE_HEADER, traceIdFor } from "./trace";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".map": "application/json; charset=utf-8",
};

/**
 * Next inlines its bootstrap scripts, so scripts need 'unsafe-inline'; there
 * is nothing to exfiltrate to, and connect-src stays 'self'.
 */
const SECURITY_HEADERS: Record<string, string> = {
  "content-security-policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), geolocation=(), microphone=(), payment=()",
  "cross-origin-opener-policy": "same-origin",
};

interface Options {
  root: string;
  logger: Logger;
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

/** The file a URL path names, or null. Never resolves outside `root`. */
async function resolve(root: string, pathname: string): Promise<string | null> {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;
  const target = normalize(join(root, decoded));
  if (target !== root && !target.startsWith(root + sep)) return null;
  for (const candidate of decoded.endsWith("/") ? [join(target, "index.html")] : [target, join(target, "index.html"), `${target}.html`]) {
    if (await isFile(candidate)) return candidate;
  }
  return null;
}

function cacheControl(pathname: string): string {
  return pathname.startsWith("/_next/static/") ? "public, max-age=31536000, immutable" : "no-cache";
}

export function createHandler({ root, logger }: Options): (request: Request) => Promise<Response> {
  const base = normalize(root).replace(/[\\/]+$/, "");

  async function respond(request: Request, url: URL): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed\n", { status: 405, headers: { allow: "GET, HEAD", "content-type": "text/plain; charset=utf-8" } });
    }
    if (url.pathname === "/healthz") return Response.json({ status: "ok" }, { headers: { "cache-control": "no-store" } });

    const file = await resolve(base, url.pathname);
    if (file) {
      return new Response(Bun.file(file), {
        headers: { "content-type": TYPES[extname(file)] ?? "application/octet-stream", "cache-control": cacheControl(url.pathname) },
      });
    }
    const missing = join(base, "404.html");
    return new Response((await isFile(missing)) ? Bun.file(missing) : "Not Found\n", {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" },
    });
  }

  return async (request) => {
    const started = performance.now();
    const traceId = traceIdFor(request.headers);
    const url = new URL(request.url);
    const log = logger.child({ trace_id: traceId });
    let response: Response;
    try {
      response = await respond(request, url);
    } catch (err) {
      log.error("http.error", { err, method: request.method, path: url.pathname });
      response = new Response("Internal Server Error\n", { status: 500, headers: { "content-type": "text/plain; charset=utf-8" } });
    }
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(name, value);
    response.headers.set(TRACE_HEADER, traceId);
    if (request.method === "HEAD") response = new Response(null, { status: response.status, headers: response.headers });

    const level = url.pathname === "/healthz" ? "debug" : response.status >= 500 ? "error" : response.status >= 400 ? "warn" : "info";
    log.log(level, "http.request", {
      method: request.method,
      path: url.pathname,
      // The query is the report's settings: its size is useful, its content is the user's business.
      query_length: url.search.length,
      status: response.status,
      duration_ms: Math.round((performance.now() - started) * 10) / 10,
      user_agent: request.headers.get("user-agent") ?? undefined,
    });
    return response;
  };
}
