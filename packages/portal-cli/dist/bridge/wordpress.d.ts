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
import type { IncomingMessage, ServerResponse } from "node:http";
import { BridgeConfigError } from "@interchained/portal-source-wordpress";
export interface WordPressServeBridge {
    /** Attempt to serve the request. False = not a bridge route, fall through. */
    handle(req: IncomingMessage, res: ServerResponse, pathname: string, secHeaders: Record<string, string>): Promise<boolean>;
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
export declare function bootWordPressBridge(log: (message: string) => void): Promise<WordPressServeBridge | null>;
export { BridgeConfigError };
//# sourceMappingURL=wordpress.d.ts.map