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
/** Discover all routes in a routes/ directory */
export declare function discoverRoutes(routesDir: string): Promise<RouteEntry[]>;
/** Generate the virtual route manifest module source */
export declare function generateRouteManifest(routes: RouteEntry[]): string;
//# sourceMappingURL=routes.d.ts.map