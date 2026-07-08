/**
 * @interchained/portal-source-wordpress
 *
 * WordPress as your backend. Portal as your frontend. This package is the
 * Portal side of the WP Portal Bridge tunnel:
 *
 *   const source = wordpressPortalBridgeFromEnv();
 *   await source.ready();
 *   const route = await source.resolve("/about/");
 *
 * Env contract (two variables, that's the whole configuration):
 *   PORTAL_BRIDGE_BASE_URL=https://cms.example.com
 *   PORTAL_TMK=portal_tmk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *
 * Optional:
 *   PORTAL_BRIDGE_MODE=snapshot-first|live   (default snapshot-first)
 *   PORTAL_BRIDGE_CACHE_TTL=300              (seconds)
 *   PORTAL_BRIDGE_SNAPSHOT_PATH=.portal/bridge-snapshot.json
 *   PORTAL_BRIDGE_NEDB_URL=http://127.0.0.1:7070   (prefer NEDB persistence)
 *   NEDB_URL                                  (same, shared with other tools)
 *   NEDBD_TOKEN                               (bearer for a token-gated nedbd)
 *   PORTAL_BRIDGE_DISABLE=1                   (hard off-switch)
 *
 * PORTAL_TMK is server-side only. Never import this package in browser code.
 */

import { BridgeClient, type BridgeClientOptions } from "./client.js";
import { FileSnapshotStore, MemorySnapshotStore, DEFAULT_SNAPSHOT_PATH } from "./cache.js";
import { NedbSnapshotStore, siteKeyFromBaseUrl } from "./nedb-store.js";
import { BridgeConfigError } from "./errors.js";
import { WordPressBridgeSource } from "./source.js";
import type { BridgeMode, SnapshotStore } from "./types.js";

export * from "./types.js";
export * from "./errors.js";
export {
  BridgeClient,
  type BridgeClientOptions,
  FileSnapshotStore,
  MemorySnapshotStore,
  NedbSnapshotStore,
  siteKeyFromBaseUrl,
  WordPressBridgeSource,
};
export {
  SIGNING_VERSION,
  RESPONSE_SIGNING_VERSION,
  EMPTY_BODY_SHA256,
  canonicalRequest,
  canonicalResponse,
  sign,
  signRequest,
  verifyResponse,
  deriveKeyId,
  sha256Hex,
} from "./hmac.js";
export { renderRouteHtml, renderSitemapXml, type RenderOptions } from "./render.js";
export { sanitizeWordPressHtml } from "./sanitize.js";
export { WP_CONTENT_CSS } from "./wp-content-css.js";

export interface WordPressPortalBridgeOptions {
  baseUrl: string;
  tmk: string;
  mode?: BridgeMode;
  cacheTtl?: number;
  store?: SnapshotStore;
  /** nedbd URL — when set (and no explicit store), snapshots persist to NEDB. */
  nedbUrl?: string;
  nedbToken?: string;
  snapshotPath?: string;
  responseSignatures?: BridgeClientOptions["responseSignatures"];
  timeoutMs?: number;
  log?: (message: string) => void;
  fetchImpl?: typeof fetch;
}

/** Explicit-config factory. */
export function wordpressPortalBridge(
  options: WordPressPortalBridgeOptions
): WordPressBridgeSource {
  if (!options.baseUrl || !/^https?:\/\//.test(options.baseUrl)) {
    throw new BridgeConfigError(
      "wordpressPortalBridge: baseUrl must be an absolute http(s) URL (the canonical WordPress origin)."
    );
  }
  if (!options.tmk || options.tmk.length < 24) {
    throw new BridgeConfigError(
      "wordpressPortalBridge: tmk is missing or too short — copy PORTAL_TMK from WordPress Admin → Portal Bridge."
    );
  }

  const client = new BridgeClient({
    baseUrl: options.baseUrl,
    tmk: options.tmk,
    responseSignatures: options.responseSignatures,
    timeoutMs: options.timeoutMs,
    fetchImpl: options.fetchImpl,
  });

  // Store precedence: explicit store > NEDB (our database) > file fallback.
  const store =
    options.store ??
    (options.nedbUrl
      ? new NedbSnapshotStore({
          url: options.nedbUrl,
          token: options.nedbToken,
          siteKey: siteKeyFromBaseUrl(options.baseUrl),
          fetchImpl: options.fetchImpl,
        })
      : new FileSnapshotStore(options.snapshotPath ?? DEFAULT_SNAPSHOT_PATH));

  return new WordPressBridgeSource({
    client,
    store,
    mode: options.mode,
    cacheTtl: options.cacheTtl,
    log: options.log,
  });
}

/** True when the bridge env contract is present (and not disabled). */
export function isBridgeConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env["PORTAL_BRIDGE_DISABLE"] === "1" || env["PORTAL_BRIDGE_DISABLE"] === "true") {
    return false;
  }
  return Boolean(env["PORTAL_BRIDGE_BASE_URL"] && env["PORTAL_TMK"]);
}

/** Env-driven factory — the one `portal serve` uses. Fails clearly. */
export function wordpressPortalBridgeFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  overrides: Partial<WordPressPortalBridgeOptions> = {}
): WordPressBridgeSource {
  const baseUrl = env["PORTAL_BRIDGE_BASE_URL"];
  const tmk = env["PORTAL_TMK"];
  if (!baseUrl || !tmk) {
    throw new BridgeConfigError(
      "WordPress Portal Bridge requires PORTAL_BRIDGE_BASE_URL and PORTAL_TMK. " +
        "Generate both in WordPress Admin → Portal Bridge → Connect Portal Frontend."
    );
  }

  const mode = (env["PORTAL_BRIDGE_MODE"] as BridgeMode | undefined) ?? undefined;
  if (mode && mode !== "live" && mode !== "snapshot-first") {
    throw new BridgeConfigError(
      `PORTAL_BRIDGE_MODE must be "live" or "snapshot-first", got "${mode}".`
    );
  }

  const ttlRaw = env["PORTAL_BRIDGE_CACHE_TTL"];
  const cacheTtl = ttlRaw ? Number(ttlRaw) : undefined;
  if (cacheTtl !== undefined && (!Number.isFinite(cacheTtl) || cacheTtl < 0)) {
    throw new BridgeConfigError(`PORTAL_BRIDGE_CACHE_TTL must be a non-negative number of seconds.`);
  }

  return wordpressPortalBridge({
    baseUrl,
    tmk,
    mode,
    cacheTtl,
    nedbUrl: env["PORTAL_BRIDGE_NEDB_URL"] ?? env["NEDB_URL"],
    nedbToken: env["NEDBD_TOKEN"],
    snapshotPath: env["PORTAL_BRIDGE_SNAPSHOT_PATH"],
    ...overrides,
  });
}
