/**
 * Portal Vite Plugin
 *
 * Adds to a standard Vite+React project:
 *  - Virtual module `@portal/routes`  — auto-generated route manifest
 *  - Virtual module `@portal/contract` — app contract at runtime
 *  - Watches routes/ and app.contract.ts for changes, HMR-safe
 *  - Injects portal metadata into the HTML template
 */
import type { Plugin } from "vite";
export interface PortalPluginOptions {
    /** Absolute path to routes/ directory. Defaults to <root>/routes */
    routesDir?: string;
    /** Absolute path to app.contract.ts. Defaults to <root>/app.contract.ts */
    contractPath?: string;
    /** Enable SSR mode */
    ssr?: boolean;
}
export declare function portalPlugin(options?: PortalPluginOptions): Plugin;
//# sourceMappingURL=vite-plugin.d.ts.map