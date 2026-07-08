/**
 * portal serve × WP Portal Bridge — WordPress-backed dynamic routes.
 *
 * When PORTAL_BRIDGE_BASE_URL + PORTAL_TMK are present, `portal serve` boots
 * the WordPress source adapter (snapshot-first by default) and serves
 * WordPress-backed routes server-rendered, ahead of the SPA fallback:
 *
 *   - extensionless paths are offered to the bridge first; the SPA shell and
 *     static assets keep serving everything the bridge does not resolve
 *   - /sitemap.xml is generated from the source contract
 *   - WordPress down → the last-good snapshot keeps the public site up
 *
 * The TMK stays server-side. Invalid env fails the boot loudly and clearly.
 */

import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import type { IncomingMessage, ServerResponse } from "node:http";

import {
  BridgeConfigError,
  isBridgeConfigured,
  renderRouteHtml,
  renderSitemapXml,
  wordpressPortalBridgeFromEnv,
  type WordPressBridgeSource,
} from "@interchained/portal-source-wordpress";

export interface WordPressServeBridge {
  /** Attempt to serve the request. False = not a bridge route, fall through. */
  handle(
    req: IncomingMessage,
    res: ServerResponse,
    pathname: string,
    secHeaders: Record<string, string>
  ): Promise<boolean>;
  /** Human lines for the serve boot banner. */
  bannerLines(): string[];
  /** Health payload fragment. */
  healthFragment(): Record<string, unknown>;
}

/**
 * Boot the bridge from env. Returns null when the env contract is absent
 * (bridge off). Throws BridgeConfigError on malformed env — serve fails fast.
 * A reachable-but-empty boot (no store, WordPress down) also throws: a bridge
 * with nothing to serve must be loud, not silently absent.
 */
export async function bootWordPressBridge(
  log: (message: string) => void
): Promise<WordPressServeBridge | null> {
  if (!isBridgeConfigured()) return null;

  const source = wordpressPortalBridgeFromEnv(process.env, { log });
  await source.ready();

  const publicOrigin = process.env["PORTAL_BRIDGE_PUBLIC_ORIGIN"];
  return new ServeBridge(source, publicOrigin);
}

class ServeBridge implements WordPressServeBridge {
  constructor(
    private readonly source: WordPressBridgeSource,
    private readonly publicOrigin: string | undefined
  ) {}

  async handle(
    req: IncomingMessage,
    res: ServerResponse,
    pathname: string,
    secHeaders: Record<string, string>
  ): Promise<boolean> {
    if (pathname === "/sitemap.xml") {
      const xml = renderSitemapXml(this.source.sitemapEntries(), this.publicOrigin);
      this.send(req, res, xml, "application/xml; charset=utf-8", secHeaders);
      return true;
    }

    const route = await this.source.resolve(pathname);
    if (!route) return false;

    const site = this.source.site();
    if (!site) return false;

    const html = renderRouteHtml(route, site, this.source.menus(), {
      publicOrigin: this.publicOrigin,
    });
    this.send(req, res, html, "text/html; charset=utf-8", secHeaders);
    return true;
  }

  private send(
    req: IncomingMessage,
    res: ServerResponse,
    body: string,
    contentType: string,
    secHeaders: Record<string, string>
  ): void {
    const raw = Buffer.from(body, "utf8");
    const etag = `"wpb-${createHash("sha256").update(raw).digest("hex").slice(0, 16)}"`;

    if (req.headers["if-none-match"] === etag) {
      res.writeHead(304, {
        ETag: etag,
        "Cache-Control": "no-cache",
        Vary: "Accept-Encoding",
        ...secHeaders,
      });
      res.end();
      return;
    }

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      ETag: etag,
      "Cache-Control": "no-cache",
      Vary: "Accept-Encoding",
      "X-Portal-Source": "wordpress-portal-bridge",
      ...secHeaders,
    };

    let payload = raw;
    const accept = String(req.headers["accept-encoding"] ?? "");
    if (raw.length >= 256 && /\bgzip\b/.test(accept)) {
      payload = gzipSync(raw, { level: 6 });
      headers["Content-Encoding"] = "gzip";
    }
    headers["Content-Length"] = String(payload.length);

    res.writeHead(200, headers);
    res.end(req.method === "HEAD" ? undefined : payload);
  }

  bannerLines(): string[] {
    const site = this.source.site();
    const snapshot = this.source.snapshot();
    const age = this.source.snapshotAgeSeconds();
    return [
      `WordPress bridge: ${site?.name ?? "?"} (${snapshot?.source.homeUrl ?? "?"})`,
      `mode: ${this.source.mode}  ·  routes: ${snapshot?.routeCount ?? 0}  ·  snapshot: ${snapshot?.snapshotId ?? "-"} (${age ?? "?"}s old)`,
    ];
  }

  healthFragment(): Record<string, unknown> {
    const snapshot = this.source.snapshot();
    return {
      bridge: {
        source: "wordpress-portal-bridge",
        mode: this.source.mode,
        routes: snapshot?.routeCount ?? 0,
        snapshotId: snapshot?.snapshotId ?? null,
        snapshotAgeSeconds: this.source.snapshotAgeSeconds(),
      },
    };
  }
}

export { BridgeConfigError };
