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
import { FileSnapshotStore, MemorySnapshotStore } from "./cache.js";
import { NedbSnapshotStore, siteKeyFromBaseUrl } from "./nedb-store.js";
import { WordPressBridgeSource } from "./source.js";
import type { BridgeMode, SnapshotStore } from "./types.js";
export * from "./types.js";
export * from "./errors.js";
export { BridgeClient, type BridgeClientOptions, FileSnapshotStore, MemorySnapshotStore, NedbSnapshotStore, siteKeyFromBaseUrl, WordPressBridgeSource, };
export { SIGNING_VERSION, RESPONSE_SIGNING_VERSION, EMPTY_BODY_SHA256, canonicalRequest, canonicalResponse, sign, signRequest, verifyResponse, deriveKeyId, sha256Hex, } from "./hmac.js";
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
export declare function wordpressPortalBridge(options: WordPressPortalBridgeOptions): WordPressBridgeSource;
/** True when the bridge env contract is present (and not disabled). */
export declare function isBridgeConfigured(env?: NodeJS.ProcessEnv): boolean;
/** Env-driven factory — the one `portal serve` uses. Fails clearly. */
export declare function wordpressPortalBridgeFromEnv(env?: NodeJS.ProcessEnv, overrides?: Partial<WordPressPortalBridgeOptions>): WordPressBridgeSource;
//# sourceMappingURL=index.d.ts.map