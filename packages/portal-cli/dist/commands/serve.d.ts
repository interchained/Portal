/**
 * portal serve — hardened, in-memory production server.
 *
 * ── Novel optimizations ──────────────────────────────────────────────────────
 *   1. Boot-time asset pipeline. Every file in the build dir is read, hashed,
 *      and (if compressible) Brotli(11) + gzip(9) compressed ONCE at startup and
 *      held in memory. There is zero disk I/O on the hot path — every response
 *      is a buffer slice.
 *   2. HTTP 103 Early Hints. index.html is parsed a single time at boot; its
 *      critical modulepreload / stylesheet / preload links are streamed to the
 *      browser as a 103 response BEFORE the 200 body. The browser starts
 *      fetching JS/CSS during the server's think-time and the TLS round-trips
 *      it would otherwise spend idle. Most static servers cannot do this.
 *   3. Content-hash strong ETags → instant 304 Not Modified. Fingerprinted
 *      assets get immutable year-long caching; HTML is always revalidated.
 *   4. Per-request content negotiation: br > gzip > identity from Accept-Encoding.
 *
 * ── Hardening ────────────────────────────────────────────────────────────────
 *   - Full security header suite (CSP, HSTS, COOP, CORP, frame/sniff/referrer,
 *     permissions policy).
 *   - Path-traversal proof (decoded, normalized, scoped to the build dir).
 *   - Method allowlist (GET / HEAD only).
 *   - Range requests for media streaming.
 *   - Graceful shutdown (drains in-flight requests on SIGTERM / SIGINT).
 *   - Liveness (/__health) + readiness (/__ready) endpoints.
 */
export interface ServeOptions {
    port?: number;
    host?: string;
    dir?: string;
    csp?: boolean;
    hsts?: boolean;
    earlyHints?: boolean;
    cors?: boolean;
}
export declare function serveCommand(opts?: ServeOptions): Promise<void>;
//# sourceMappingURL=serve.d.ts.map