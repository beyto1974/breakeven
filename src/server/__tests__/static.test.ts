import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHandler } from "../handler";
import { createLogger } from "../logger";

let root = "";
const lines: string[] = [];
let handle: (request: Request) => Promise<Response>;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "rentability-static-"));
  await writeFile(join(root, "index.html"), "<h1>report</h1>");
  await writeFile(join(root, "404.html"), "<h1>missing</h1>");
  await mkdir(join(root, "_next/static/chunks"), { recursive: true });
  await writeFile(join(root, "_next/static/chunks/app.js"), "console.log(1)");
  await mkdir(join(root, "docs"), { recursive: true });
  await writeFile(join(root, "docs/index.html"), "<h1>docs</h1>");
  await writeFile(join(root, "data.json"), "{}");
  await writeFile(join(root, "..", `${root.split("/").pop()}-secret.txt`), "secret");
  await symlink(join(root, "..", `${root.split("/").pop()}-secret.txt`), join(root, "exposed.txt"));
  const logger = createLogger({ level: "debug", write: (line) => lines.push(line) });
  handle = createHandler({ root, logger });
});

afterAll(async () => {
  await rm(join(root, "..", `${root.split("/").pop()}-secret.txt`), { force: true });
  await rm(root, { recursive: true, force: true });
});

const get = (path: string, init?: RequestInit) => handle(new Request(`http://localhost${path}`, init));

describe("static handler", () => {
  test("serves index.html at the root, whatever the query string", async () => {
    const response = await get("/?lang=nl&customers=20");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(await response.text()).toBe("<h1>report</h1>");
  });

  test("serves directory indexes with and without a trailing slash", async () => {
    expect(await (await get("/docs/")).text()).toBe("<h1>docs</h1>");
    expect(await (await get("/docs")).text()).toBe("<h1>docs</h1>");
  });

  test("sets content types by extension", async () => {
    expect((await get("/_next/static/chunks/app.js")).headers.get("content-type")).toBe("text/javascript; charset=utf-8");
    expect((await get("/data.json")).headers.get("content-type")).toBe("application/json; charset=utf-8");
  });

  test("caches hashed assets for a year and revalidates HTML", async () => {
    expect((await get("/_next/static/chunks/app.js")).headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect((await get("/")).headers.get("cache-control")).toBe("no-cache");
  });

  test("answers 404 with the 404 page", async () => {
    const response = await get("/nope");
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("<h1>missing</h1>");
  });

  test("never leaves the root", async () => {
    for (const path of ["/../etc/passwd", "/%2e%2e/%2e%2e/etc/passwd", "/..%2Fpackage.json", "/docs/../../x"]) {
      expect((await get(path)).status).toBe(404);
    }
  });

  test("does not follow a symlink out of the root", async () => {
    const response = await get("/exposed.txt");
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain("secret");
  });

  test("rejects methods other than GET and HEAD", async () => {
    const response = await get("/", { method: "POST" });
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, HEAD");
  });

  test("HEAD returns headers without a body", async () => {
    const response = await get("/", { method: "HEAD" });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
  });

  test("answers the health check", async () => {
    const response = await get("/healthz");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  test("sends security headers", async () => {
    const response = await get("/");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
  });

  test("echoes a valid inbound trace id and logs it", async () => {
    lines.length = 0;
    const response = await get("/", { headers: { "x-trace-id": "caller-trace-42" } });
    expect(response.headers.get("x-trace-id")).toBe("caller-trace-42");
    const entry = JSON.parse(lines.at(-1)!);
    expect(entry).toMatchObject({ level: "info", msg: "http.request", trace_id: "caller-trace-42", method: "GET", path: "/", status: 200 });
    expect(typeof entry.duration_ms).toBe("number");
  });

  test("mints a trace id when none is given", async () => {
    expect((await get("/")).headers.get("x-trace-id")).toMatch(/^[0-9a-f]{16}$/);
  });

  test("logs health checks at debug, not info", async () => {
    lines.length = 0;
    await get("/healthz");
    expect(JSON.parse(lines.at(-1)!).level).toBe("debug");
  });
});
