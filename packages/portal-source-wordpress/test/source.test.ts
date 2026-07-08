/**
 * BridgeClient + WordPressBridgeSource behavior against a mock WP Portal
 * Bridge server that INDEPENDENTLY verifies every signature (so the client's
 * signing is proven against a verifier, not against itself).
 */

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { createHmac, createHash } from "node:crypto";

import { wordpressPortalBridge, MemorySnapshotStore } from "../src/index.js";
import { BridgeAuthError, BridgeConfigError } from "../src/errors.js";
import { wordpressPortalBridgeFromEnv } from "../src/index.js";
import type { BridgeRoute, BridgeSnapshot } from "../src/types.js";

const TMK = "portal_tmk_test_5f2a9c1d3e8b4a7f6c0d9e2b1a8f7c6d5e4b3a2f1c0d9e8b";

// ── Fixture data ──────────────────────────────────────────────────────────────

function makeRoute(path: string, title: string): BridgeRoute {
  return {
    id: `wp:page:${path}`,
    source: "wordpress",
    type: "page",
    path,
    status: "publish",
    title,
    slug: path.replace(/\//g, "") || "home",
    content: {
      html: `<p>Content of ${title}</p>`,
      text: `Content of ${title}`,
      blocks: [],
    },
    seo: {
      title: `${title} – Mock Site`,
      description: `About ${title}`,
      canonical: `http://mock.test${path}`,
      og: { title: "", description: "", image: "" },
      twitter: { title: "", description: "", image: "" },
      robots: [],
      source: "fallback",
      schemaCandidates: ["WebPage"],
    },
    media: { featuredImage: {}, images: [] },
    taxonomies: [],
    author: {},
    dates: { published: "2026-07-01T00:00:00+00:00", modified: "2026-07-08T00:00:00+00:00" },
    links: { internal: [], external: [] },
    authority: { preservePath: true, score: 0, notes: [] },
  };
}

function makeSnapshot(routes: BridgeRoute[], id = "snap_mock1"): BridgeSnapshot {
  return {
    schemaVersion: "portal.wp.source.v1",
    snapshotId: id,
    contentHash: id.padEnd(64, "0"),
    routeCount: routes.length,
    generatedAt: new Date().toISOString(),
    generator: { name: "wp-portal-bridge", version: "0.1.0" },
    site: {
      schemaVersion: "portal.wp.source.v1",
      name: "Mock Site",
      description: "Mock",
      homeUrl: "http://mock.test/",
      siteUrl: "http://mock.test/",
      restUrl: "http://mock.test/wp-json/",
      language: "en-US",
      timezone: "UTC",
      permalinks: { structure: "/%postname%/", pretty: true },
      frontPage: { mode: "static_page", pageId: 1, blogId: null },
      source: { type: "wordpress", wpVersion: "6.8", phpVersion: "8.3", seoPlugins: [] },
      generator: { name: "wp-portal-bridge", version: "0.1.0" },
      content: { version: 1, lastChangedAt: "", dirty: false },
    },
    source: { type: "wordpress", homeUrl: "http://mock.test/", wpVersion: "6.8", seoPlugins: [] },
    routes,
    menus: [],
    taxonomies: [],
    assets: [],
    redirects: [],
  };
}

// ── Mock server with an INDEPENDENT verifier implementation ─────────────────

interface MockState {
  snapshot: BridgeSnapshot;
  wpDown: boolean;
  snapshotFetches: number;
  seenNonces: Set<string>;
}

function verifySignature(req: {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
}): boolean {
  const h = (name: string) => {
    const v = req.headers[name.toLowerCase()];
    return typeof v === "string" ? v : undefined;
  };
  const ts = h("X-Portal-Timestamp");
  const nonce = h("X-Portal-Nonce");
  const keyId = h("X-Portal-Key-Id");
  const bodySha = h("X-Portal-Body-SHA256");
  const sig = h("X-Portal-Signature");
  if (!ts || !nonce || !keyId || !bodySha || !sig) return false;

  const expectedKeyId = "wpb_" + createHash("sha256").update(TMK, "utf8").digest("hex").slice(0, 12);
  if (keyId !== expectedKeyId) return false;

  const canonical = ["PORTAL-BRIDGE-V1", req.method.toUpperCase(), req.url, ts, nonce, bodySha].join("\n");
  const expected = createHmac("sha256", TMK).update(canonical, "utf8").digest("hex");
  return expected === sig;
}

function startMockServer(state: MockState): Promise<{ server: Server; url: string }> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      if (state.wpDown) {
        req.socket.destroy();
        return;
      }
      if (!verifySignature({ method: req.method ?? "GET", url: req.url ?? "/", headers: req.headers })) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ code: "wpb_unauthorized", message: "Unauthorized." }));
        return;
      }
      const nonce = String(req.headers["x-portal-nonce"]);
      if (state.seenNonces.has(nonce)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ code: "wpb_unauthorized", message: "Unauthorized." }));
        return;
      }
      state.seenNonces.add(nonce);

      const url = new URL(req.url ?? "/", "http://localhost");
      const respond = (status: number, payload: unknown) => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(payload));
      };

      if (url.pathname.endsWith("/snapshot")) {
        state.snapshotFetches++;
        respond(200, state.snapshot);
      } else if (url.pathname.endsWith("/route")) {
        const path = url.searchParams.get("path") ?? "";
        const route = state.snapshot.routes.find((r) => r.path === path);
        if (route) respond(200, route);
        else respond(404, { code: "wpb_route_not_found", message: "No published route at that path." });
      } else if (url.pathname.endsWith("/health")) {
        respond(200, { ok: true });
      } else {
        respond(404, { code: "not_found" });
      }
    });
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

const servers: Server[] = [];
after(() => {
  for (const server of servers) server.close();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

test("snapshot-first: ready() fetches through the tunnel, resolve() serves from memory", async () => {
  const state: MockState = {
    snapshot: makeSnapshot([makeRoute("/", "Home"), makeRoute("/about/", "About")]),
    wpDown: false,
    snapshotFetches: 0,
    seenNonces: new Set(),
  };
  const { server, url } = await startMockServer(state);
  servers.push(server);

  const source = wordpressPortalBridge({
    baseUrl: url,
    tmk: TMK,
    store: new MemorySnapshotStore(),
    responseSignatures: "off", // mock does not sign responses
  });
  await source.ready();

  assert.equal(state.snapshotFetches, 1);

  const about = await source.resolve("/about/");
  assert.equal(about?.title, "About");

  // Trailing-slash toggle, both directions.
  const aboutNoSlash = await source.resolve("/about");
  assert.equal(aboutNoSlash?.title, "About");

  const home = await source.resolve("/");
  assert.equal(home?.title, "Home");

  const missing = await source.resolve("/nope/");
  assert.equal(missing, null);

  // Snapshot-first never re-fetched per request.
  assert.equal(state.snapshotFetches, 1);
});

test("snapshot-first: WordPress down → last-good snapshot keeps serving", async () => {
  const state: MockState = {
    snapshot: makeSnapshot([makeRoute("/about/", "About")]),
    wpDown: false,
    snapshotFetches: 0,
    seenNonces: new Set(),
  };
  const { server, url } = await startMockServer(state);
  servers.push(server);

  const store = new MemorySnapshotStore();
  const source = wordpressPortalBridge({
    baseUrl: url,
    tmk: TMK,
    store,
    cacheTtl: 0, // every request is "stale" → refresh attempts fire
    responseSignatures: "off",
  });
  await source.ready();

  state.wpDown = true;
  const about = await source.resolve("/about/");
  assert.equal(about?.title, "About", "served from last-good while WP is down");

  // A second source booting from the SAME store also works with WP down.
  const source2 = wordpressPortalBridge({
    baseUrl: url,
    tmk: TMK,
    store,
    responseSignatures: "off",
  });
  await source2.ready();
  const about2 = await source2.resolve("/about");
  assert.equal(about2?.title, "About", "cold boot from store with WP down");
});

test("live mode: resolves through the tunnel per request, falls back to snapshot when down", async () => {
  const state: MockState = {
    snapshot: makeSnapshot([makeRoute("/live/", "Live Page")]),
    wpDown: false,
    snapshotFetches: 0,
    seenNonces: new Set(),
  };
  const { server, url } = await startMockServer(state);
  servers.push(server);

  const source = wordpressPortalBridge({
    baseUrl: url,
    tmk: TMK,
    mode: "live",
    store: new MemorySnapshotStore(),
    responseSignatures: "off",
  });
  await source.ready();

  const live = await source.resolve("/live/");
  assert.equal(live?.title, "Live Page");

  state.wpDown = true;
  const fallback = await source.resolve("/live/");
  assert.equal(fallback?.title, "Live Page", "live mode falls back to snapshot");
});

test("wrong TMK is rejected by the (independent) verifier", async () => {
  const state: MockState = {
    snapshot: makeSnapshot([]),
    wpDown: false,
    snapshotFetches: 0,
    seenNonces: new Set(),
  };
  const { server, url } = await startMockServer(state);
  servers.push(server);

  const source = wordpressPortalBridge({
    baseUrl: url,
    tmk: "portal_tmk_test_wrong_key_wrong_key_wrong_key_wrong",
    store: new MemorySnapshotStore(),
    responseSignatures: "off",
  });
  await assert.rejects(
    () => source.ready(),
    (error: unknown) => error instanceof BridgeAuthError && error.status === 401
  );
});

test("env factory: fails clearly on missing or invalid env", () => {
  assert.throws(
    () => wordpressPortalBridgeFromEnv({}),
    BridgeConfigError
  );
  assert.throws(
    () =>
      wordpressPortalBridgeFromEnv({
        PORTAL_BRIDGE_BASE_URL: "http://x.test",
        PORTAL_TMK: TMK,
        PORTAL_BRIDGE_MODE: "warp",
      }),
    BridgeConfigError
  );
  assert.throws(
    () =>
      wordpressPortalBridgeFromEnv({
        PORTAL_BRIDGE_BASE_URL: "not-a-url",
        PORTAL_TMK: TMK,
      }),
    BridgeConfigError
  );
});
