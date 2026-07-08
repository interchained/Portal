/**
 * Server-side HTML renderer for WordPress-backed routes.
 *
 * v0 contract: WordPress HTML is preserved (sanitized, contained under
 * .wp-bridge-content) and wrapped in a clean, fast, semantic Portal document
 * with the route's earned SEO — title, description, canonical, OG, Twitter,
 * robots — applied exactly. Zero client JS required to read the page.
 */
import type { BridgeMenu, BridgeRoute, BridgeSite, BridgeSitemapEntry } from "./types.js";
export interface RenderOptions {
    /** Public origin of the PORTAL site (for canonical rewriting), e.g. https://www.example.com */
    publicOrigin?: string;
    /** Extra CSS appended after the baseline (theme hook). */
    extraCss?: string;
    /** Skip sanitization (only for fully trusted single-tenant setups). */
    dangerouslyTrustHtml?: boolean;
}
/** Render one WordPress-backed route as a complete HTML document. */
export declare function renderRouteHtml(route: BridgeRoute, site: BridgeSite, menus: BridgeMenu[], options?: RenderOptions): string;
/** Render sitemap entries as an XML sitemap (Portal owns the XML). */
export declare function renderSitemapXml(entries: BridgeSitemapEntry[], publicOrigin?: string): string;
//# sourceMappingURL=render.d.ts.map