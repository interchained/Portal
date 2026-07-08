/**
 * Signed HTTP client for the WP Portal Bridge contract API.
 *
 * Every request travels the HMAC tunnel (PORTAL-BRIDGE-V1); every response
 * signature is verified when present (PORTAL-BRIDGE-RESPONSE-V1). The TMK
 * lives server-side only — this module must never be bundled for a browser.
 */
import type { BridgeAssetsPage, BridgeHealth, BridgeMenu, BridgeRoute, BridgeRoutesPage, BridgeSite, BridgeSitemap, BridgeSnapshot, BridgeTaxonomy } from "./types.js";
export interface BridgeClientOptions {
    /** Canonical WordPress origin, e.g. https://cms.example.com — no trailing slash needed. */
    baseUrl: string;
    /** PORTAL_TMK secret. Never expose client-side. */
    tmk: string;
    /** Override the derived key id (rare). */
    keyId?: string;
    /** Request timeout in ms (default 15000). */
    timeoutMs?: number;
    /** "verify" (default): fail on invalid signatures, tolerate unsigned.
     *  "require": fail on unsigned too. "off": skip verification. */
    responseSignatures?: "verify" | "require" | "off";
    /** Injectable fetch for tests. */
    fetchImpl?: typeof fetch;
}
export declare class BridgeClient {
    private readonly options;
    private readonly baseUrl;
    private readonly origin;
    private readonly basePath;
    constructor(options: BridgeClientOptions);
    getHealth(): Promise<BridgeHealth>;
    getSite(): Promise<BridgeSite>;
    getRoutes(page?: number, perPage?: number): Promise<BridgeRoutesPage>;
    getRoute(path: string): Promise<BridgeRoute>;
    getMenus(): Promise<{
        menus: BridgeMenu[];
    }>;
    getAssets(page?: number, perPage?: number): Promise<BridgeAssetsPage>;
    getTaxonomies(): Promise<{
        taxonomies: BridgeTaxonomy[];
    }>;
    getSitemap(): Promise<BridgeSitemap>;
    /**
     * Full snapshot. Handles the 413 size guard transparently: when the plugin
     * says "too large", pages through the chunks and merges routes + assets.
     */
    getSnapshot(): Promise<BridgeSnapshot>;
    private get;
}
//# sourceMappingURL=client.d.ts.map