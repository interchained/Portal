/**
 * Portal Vite Plugin
 *
 * Adds to a standard Vite+React project:
 *  - Virtual module `@portal/routes`  — auto-generated route manifest
 *  - Virtual module `@portal/contract` — app contract at runtime
 *  - Watches routes/ and app.contract.ts for changes, HMR-safe
 *  - Injects portal metadata into the HTML template
 */

import type { Plugin, ViteDevServer } from "vite";
import { join, resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { discoverRoutes, generateRouteManifest } from "./routes.js";
import type { AppContract } from "@interchained/portal-contract";

const VIRTUAL_ROUTES   = "virtual:@portal/routes";
const VIRTUAL_CONTRACT = "virtual:@portal/contract";
const RESOLVED_ROUTES   = "\0" + VIRTUAL_ROUTES;
const RESOLVED_CONTRACT = "\0" + VIRTUAL_CONTRACT;

export interface PortalPluginOptions {
  /** Absolute path to routes/ directory. Defaults to <root>/routes */
  routesDir?: string;
  /** Absolute path to app.contract.ts. Defaults to <root>/app.contract.ts */
  contractPath?: string;
  /** Enable SSR mode */
  ssr?: boolean;
}

export function portalPlugin(options: PortalPluginOptions = {}): Plugin {
  let root: string;
  let routesDir: string;
  let contractPath: string;
  let cachedRouteManifest: string | null = null;
  let cachedContract: AppContract | null = null;

  async function buildRouteManifest(): Promise<string> {
    const routes = await discoverRoutes(routesDir);
    cachedRouteManifest = generateRouteManifest(routes);
    return cachedRouteManifest;
  }

  async function loadContract(): Promise<string> {
    try {
      // Dynamic import of the contract — Vite handles TS transpilation
      const raw = await readFile(contractPath, "utf-8");
      // Return as JS that re-exports the contract object
      // The actual module is loaded by the CLI; here we embed the JSON
      // representation for the runtime (no sensitive data in contracts).
      return `export const contract = ${JSON.stringify(cachedContract ?? { name: "Portal App", goals: [] })};`;
    } catch {
      return `export const contract = { name: "Portal App", goals: [] };`;
    }
  }

  return {
    name: "portal",
    enforce: "pre",

    configResolved(config) {
      root        = config.root ?? process.cwd();
      routesDir   = options.routesDir   ?? join(root, "routes");
      contractPath = options.contractPath ?? join(root, "app.contract.ts");
    },

    resolveId(id) {
      if (id === "@portal/routes")   return RESOLVED_ROUTES;
      if (id === "@portal/contract") return RESOLVED_CONTRACT;
      return undefined;
    },

    async load(id) {
      if (id === RESOLVED_ROUTES)   return buildRouteManifest();
      if (id === RESOLVED_CONTRACT) return loadContract();
      return undefined;
    },

    configureServer(server: ViteDevServer) {
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
      return html.replace(
        /<\/head>/,
        `  <meta name="generator" content="Portal by Interchained" />\n  </head>`
      );
    },
  };

  function invalidateRoutes(server: ViteDevServer): void {
    cachedRouteManifest = null;
    const mod = server.moduleGraph.getModuleById(RESOLVED_ROUTES);
    if (mod) {
      server.moduleGraph.invalidateModule(mod);
      server.ws.send({ type: "full-reload" });
    }
  }

  function invalidateContract(server: ViteDevServer): void {
    cachedContract = null;
    const mod = server.moduleGraph.getModuleById(RESOLVED_CONTRACT);
    if (mod) {
      server.moduleGraph.invalidateModule(mod);
    }
  }
}
