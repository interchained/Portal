/**
 * File-based route discovery.
 *
 * Scans `routes/` for *.page.tsx files and builds a route manifest.
 *
 * Conventions:
 *   routes/index.page.tsx          → /
 *   routes/about.page.tsx          → /about
 *   routes/blog/[slug].page.tsx    → /blog/:slug
 *   routes/blog/index.page.tsx     → /blog
 */

import { readdir, stat } from "node:fs/promises";
import { join, relative, extname, basename } from "node:path";

export interface RouteEntry {
  /** URL path pattern, e.g. "/blog/:slug" */
  path: string;
  /** Absolute file path */
  filePath: string;
  /** Import path relative to project root */
  importPath: string;
  /** Whether this route has dynamic segments */
  dynamic: boolean;
  /** Extracted param names, e.g. ["slug"] */
  params: string[];
}

const PAGE_EXTENSIONS = [".page.tsx", ".page.jsx", ".page.ts", ".page.js"];

function isPageFile(name: string): boolean {
  return PAGE_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function fileToRoutePath(relPath: string): string {
  let path = relPath;

  // Strip extension
  for (const ext of PAGE_EXTENSIONS) {
    if (path.endsWith(ext)) {
      path = path.slice(0, -ext.length);
      break;
    }
  }

  // Normalize separators
  path = path.replace(/\\/g, "/");

  // index → ""
  if (path === "index" || path.endsWith("/index")) {
    path = path.replace(/\/?index$/, "");
  }

  // [param] → :param
  path = path.replace(/\[([^\]]+)\]/g, ":$1");

  return "/" + path;
}

function extractParams(routePath: string): string[] {
  const matches = routePath.matchAll(/:([a-zA-Z_][a-zA-Z0-9_]*)/g);
  return [...matches].map((m) => m[1]);
}

async function walkDir(dir: string): Promise<string[]> {
  const files: string[] = [];
  let names: string[];
  try {
    names = (await readdir(dir)) as string[];
  } catch {
    return files;
  }
  for (const name of names) {
    const full = join(dir, name);
    try {
      const { stat } = await import("node:fs/promises");
      const s = await stat(full);
      if (s.isDirectory()) {
        files.push(...(await walkDir(full)));
      } else if (isPageFile(name)) {
        files.push(full);
      }
    } catch { /* skip inaccessible */ }
  }
  return files;
}

/** Discover all routes in a routes/ directory */
export async function discoverRoutes(routesDir: string): Promise<RouteEntry[]> {
  const files = await walkDir(routesDir);
  const routes: RouteEntry[] = [];

  for (const filePath of files) {
    const relPath = relative(routesDir, filePath);
    const routePath = fileToRoutePath(relPath);
    const params = extractParams(routePath);

    routes.push({
      path: routePath,
      filePath,
      importPath: "./" + relative(process.cwd(), filePath).replace(/\\/g, "/"),
      dynamic: params.length > 0,
      params,
    });
  }

  // Sort: static before dynamic, shorter before longer
  return routes.sort((a, b) => {
    if (a.dynamic !== b.dynamic) return a.dynamic ? 1 : -1;
    return a.path.length - b.path.length;
  });
}

/** Generate the virtual route manifest module source */
export function generateRouteManifest(routes: RouteEntry[]): string {
  const imports = routes
    .map((r, i) => `import Route${i} from ${JSON.stringify(r.importPath)};`)
    .join("\n");

  const entries = routes
    .map(
      (r, i) =>
        `  { path: ${JSON.stringify(r.path)}, component: Route${i}, params: ${JSON.stringify(r.params)}, dynamic: ${r.dynamic} }`
    )
    .join(",\n");

  return `${imports}\n\nexport const routes = [\n${entries}\n];\n`;
}
