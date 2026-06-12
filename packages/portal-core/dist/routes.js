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
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
const PAGE_EXTENSIONS = [".page.tsx", ".page.jsx", ".page.ts", ".page.js"];
function isPageFile(name) {
    return PAGE_EXTENSIONS.some((ext) => name.endsWith(ext));
}
function fileToRoutePath(relPath) {
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
function extractParams(routePath) {
    const matches = routePath.matchAll(/:([a-zA-Z_][a-zA-Z0-9_]*)/g);
    return [...matches].map((m) => m[1]);
}
async function walkDir(dir) {
    const files = [];
    let names;
    try {
        names = (await readdir(dir));
    }
    catch {
        return files;
    }
    for (const name of names) {
        const full = join(dir, name);
        try {
            const { stat } = await import("node:fs/promises");
            const s = await stat(full);
            if (s.isDirectory()) {
                files.push(...(await walkDir(full)));
            }
            else if (isPageFile(name)) {
                files.push(full);
            }
        }
        catch { /* skip inaccessible */ }
    }
    return files;
}
/** Discover all routes in a routes/ directory */
export async function discoverRoutes(routesDir) {
    const files = await walkDir(routesDir);
    const routes = [];
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
        if (a.dynamic !== b.dynamic)
            return a.dynamic ? 1 : -1;
        return a.path.length - b.path.length;
    });
}
/** Generate the virtual route manifest module source */
export function generateRouteManifest(routes) {
    const imports = routes
        .map((r, i) => `import Route${i} from ${JSON.stringify(r.importPath)};`)
        .join("\n");
    const entries = routes
        .map((r, i) => `  { path: ${JSON.stringify(r.path)}, component: Route${i}, params: ${JSON.stringify(r.params)}, dynamic: ${r.dynamic} }`)
        .join(",\n");
    return `${imports}\n\nexport const routes = [\n${entries}\n];\n`;
}
//# sourceMappingURL=routes.js.map