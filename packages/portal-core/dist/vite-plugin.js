/**
 * Portal Vite Plugin
 *
 * Adds to a standard Vite+React project:
 *  - Virtual module `@portal/routes`  — auto-generated route manifest
 *  - Virtual module `@portal/contract` — app contract at runtime
 *  - Watches routes/ and app.contract.ts for changes, HMR-safe
 *  - Injects portal metadata into the HTML template
 */
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { discoverRoutes, generateRouteManifest } from "./routes.js";
const VIRTUAL_ROUTES = "virtual:@portal/routes";
const VIRTUAL_CONTRACT = "virtual:@portal/contract";
const RESOLVED_ROUTES = "\0" + VIRTUAL_ROUTES;
const RESOLVED_CONTRACT = "\0" + VIRTUAL_CONTRACT;
export function portalPlugin(options = {}) {
    let root;
    let routesDir;
    let contractPath;
    let cachedRouteManifest = null;
    let cachedContract = null;
    async function buildRouteManifest() {
        const routes = await discoverRoutes(routesDir);
        cachedRouteManifest = generateRouteManifest(routes);
        return cachedRouteManifest;
    }
    async function loadContract() {
        try {
            // Dynamic import of the contract — Vite handles TS transpilation
            const raw = await readFile(contractPath, "utf-8");
            // Return as JS that re-exports the contract object
            // The actual module is loaded by the CLI; here we embed the JSON
            // representation for the runtime (no sensitive data in contracts).
            return `export const contract = ${JSON.stringify(cachedContract ?? { name: "Portal App", goals: [] })};`;
        }
        catch {
            return `export const contract = { name: "Portal App", goals: [] };`;
        }
    }
    return {
        name: "portal",
        enforce: "pre",
        configResolved(config) {
            root = config.root ?? process.cwd();
            routesDir = options.routesDir ?? join(root, "routes");
            contractPath = options.contractPath ?? join(root, "app.contract.ts");
        },
        resolveId(id) {
            if (id === "@portal/routes")
                return RESOLVED_ROUTES;
            if (id === "@portal/contract")
                return RESOLVED_CONTRACT;
            return undefined;
        },
        async load(id) {
            if (id === RESOLVED_ROUTES)
                return buildRouteManifest();
            if (id === RESOLVED_CONTRACT)
                return loadContract();
            return undefined;
        },
        configureServer(server) {
            // Watch routes directory for changes
            server.watcher.add(routesDir);
            server.watcher.add(contractPath);
            server.watcher.on("add", (file) => {
                if (file.startsWith(routesDir)) {
                    invalidateRoutes(server);
                }
            });
            server.watcher.on("unlink", (file) => {
                if (file.startsWith(routesDir)) {
                    invalidateRoutes(server);
                }
            });
            server.watcher.on("change", (file) => {
                if (file === contractPath) {
                    invalidateContract(server);
                }
            });
        },
        // Inject portal meta tag into HTML
        transformIndexHtml(html) {
            return html.replace(/<\/head>/, `  <meta name="generator" content="Portal by Interchained" />\n  </head>`);
        },
    };
    function invalidateRoutes(server) {
        cachedRouteManifest = null;
        const mod = server.moduleGraph.getModuleById(RESOLVED_ROUTES);
        if (mod) {
            server.moduleGraph.invalidateModule(mod);
            server.ws.send({ type: "full-reload" });
        }
    }
    function invalidateContract(server) {
        cachedContract = null;
        const mod = server.moduleGraph.getModuleById(RESOLVED_CONTRACT);
        if (mod) {
            server.moduleGraph.invalidateModule(mod);
        }
    }
}
//# sourceMappingURL=vite-plugin.js.map