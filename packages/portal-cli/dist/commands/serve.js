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
import { createServer } from "node:http";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve, relative, extname, sep, posix } from "node:path";
import { createHash } from "node:crypto";
import { brotliCompressSync, gzipSync, constants as zc, } from "node:zlib";
import pc from "picocolors";
import { banner, header, success, info, step, blank, icon } from "../utils/print.js";
// ── MIME types ────────────────────────────────────────────────────────────────
const MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".map": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".eot": "application/vnd.ms-fontobject",
    ".wasm": "application/wasm",
    ".txt": "text/plain; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
    ".webmanifest": "application/manifest+json",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mp3": "audio/mpeg",
    ".pdf": "application/pdf",
};
const COMPRESSIBLE = new Set([
    "text/html",
    "application/javascript",
    "text/css",
    "application/json",
    "image/svg+xml",
    "text/plain",
    "application/xml",
    "application/manifest+json",
]);
function mimeFor(path) {
    return MIME[extname(path).toLowerCase()] ?? "application/octet-stream";
}
function isCompressible(mime) {
    const base = mime.split(";")[0].trim();
    return COMPRESSIBLE.has(base);
}
/** Vite/webpack fingerprints look like name.a1b2c3d4.js — safe to cache forever. */
function isFingerprinted(path) {
    return /\.[a-f0-9]{8,}\.[a-z0-9]+$/i.test(path);
}
// ── Boot-time pipeline ────────────────────────────────────────────────────────
async function walk(dir) {
    const out = [];
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
        const full = join(dir, e.name);
        if (e.isDirectory())
            out.push(...(await walk(full)));
        else if (e.isFile())
            out.push(full);
    }
    return out;
}
async function buildAssetMap(distDir) {
    const files = await walk(distDir);
    const assets = new Map();
    const report = {
        files: 0,
        rawBytes: 0,
        brBytes: 0,
        gzBytes: 0,
        compressedFiles: 0,
    };
    for (const file of files) {
        // Never serve the precompressed siblings directly.
        if (file.endsWith(".br") || file.endsWith(".gz"))
            continue;
        const raw = await readFile(file);
        const st = await stat(file);
        const rel = relative(distDir, file).split(sep).join(posix.sep);
        const urlPath = "/" + rel;
        const mime = mimeFor(file);
        const hash = createHash("sha256").update(raw).digest("hex").slice(0, 16);
        const cacheControl = mime.startsWith("text/html")
            ? "no-cache"
            : isFingerprinted(file)
                ? "public, max-age=31536000, immutable"
                : "public, max-age=3600, must-revalidate";
        const asset = {
            urlPath,
            mime,
            etag: `"${hash}"`,
            cacheControl,
            raw,
            lastModified: st.mtime.toUTCString(),
        };
        // Compress once, in memory, at max quality — only keep it if it actually wins.
        if (isCompressible(mime) && raw.length >= 256) {
            const br = brotliCompressSync(raw, {
                params: {
                    [zc.BROTLI_PARAM_QUALITY]: 11,
                    [zc.BROTLI_PARAM_SIZE_HINT]: raw.length,
                },
            });
            const gz = gzipSync(raw, { level: 9 });
            if (br.length < raw.length * 0.98)
                asset.br = br;
            if (gz.length < raw.length * 0.98)
                asset.gz = gz;
            if (asset.br || asset.gz)
                report.compressedFiles++;
        }
        assets.set(urlPath, asset);
        report.files++;
        report.rawBytes += raw.length;
        report.brBytes += (asset.br ?? raw).length;
        report.gzBytes += (asset.gz ?? raw).length;
    }
    return { assets, report };
}
function extractEarlyHints(html) {
    const hints = [];
    const seen = new Set();
    const push = (href, as, rel) => {
        if (!href || href.startsWith("http") || href.startsWith("//"))
            return;
        const key = rel + "|" + href;
        if (seen.has(key))
            return;
        seen.add(key);
        hints.push({ href, as, rel });
    };
    // <link rel="modulepreload" href="...">
    for (const m of html.matchAll(/<link\b[^>]*rel=["']modulepreload["'][^>]*>/gi)) {
        const href = /href=["']([^"']+)["']/i.exec(m[0])?.[1];
        if (href)
            push(href, "script", "modulepreload");
    }
    // <link rel="stylesheet" href="...">
    for (const m of html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi)) {
        const href = /href=["']([^"']+)["']/i.exec(m[0])?.[1];
        if (href)
            push(href, "style", "preload");
    }
    // <link rel="preload" as="..." href="...">
    for (const m of html.matchAll(/<link\b[^>]*rel=["']preload["'][^>]*>/gi)) {
        const href = /href=["']([^"']+)["']/i.exec(m[0])?.[1];
        const as = /as=["']([^"']+)["']/i.exec(m[0])?.[1] ?? "fetch";
        if (href)
            push(href, as, "preload");
    }
    // <script type="module" src="..."> — the entry chunk
    for (const m of html.matchAll(/<script\b[^>]*type=["']module["'][^>]*>/gi)) {
        const src = /src=["']([^"']+)["']/i.exec(m[0])?.[1];
        if (src)
            push(src, "script", "modulepreload");
    }
    return hints.map((h) => h.rel === "modulepreload"
        ? `<${h.href}>; rel=modulepreload`
        : `<${h.href}>; rel=${h.rel}; as=${h.as}` +
            (h.as === "font" ? "; crossorigin" : ""));
}
// ── Security headers ──────────────────────────────────────────────────────────
function securityHeaders(opts) {
    const h = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=(), browsing-topics=()",
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Resource-Policy": "same-origin",
        "X-DNS-Prefetch-Control": "off",
    };
    if (opts.hsts) {
        h["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload";
    }
    if (opts.csp) {
        h["Content-Security-Policy"] = [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https:",
            "font-src 'self' data:",
            "connect-src 'self' https: wss:",
            "media-src 'self' https: data: blob:",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "upgrade-insecure-requests",
        ].join("; ");
    }
    return h;
}
// ── Helpers ───────────────────────────────────────────────────────────────────
function pickEncoding(accept, asset) {
    if (!accept)
        return null;
    const a = accept.toLowerCase();
    if (asset.br && a.includes("br"))
        return "br";
    if (asset.gz && a.includes("gzip"))
        return "gzip";
    return null;
}
function fmtBytes(n) {
    if (n < 1024)
        return `${n} B`;
    if (n < 1024 * 1024)
        return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
function parseRange(header, size) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
    if (!m)
        return null;
    let start = m[1] === "" ? NaN : parseInt(m[1], 10);
    let end = m[2] === "" ? NaN : parseInt(m[2], 10);
    if (Number.isNaN(start) && Number.isNaN(end))
        return null;
    if (Number.isNaN(start)) {
        start = size - end;
        end = size - 1;
    }
    else if (Number.isNaN(end)) {
        end = size - 1;
    }
    if (start > end || start < 0 || end >= size)
        return null;
    return { start, end };
}
export async function serveCommand(opts = {}) {
    banner();
    header("Portal Serve");
    const root = process.cwd();
    const distDir = resolve(root, opts.dir ?? "dist");
    const port = opts.port ?? Number(process.env["PORT"] ?? 4173);
    const host = opts.host ?? "0.0.0.0";
    const useCsp = opts.csp !== false;
    const useHsts = opts.hsts !== false;
    const useHints = opts.earlyHints !== false;
    // Verify build output exists
    try {
        const st = await stat(distDir);
        if (!st.isDirectory())
            throw new Error("not a directory");
    }
    catch {
        blank();
        console.log(`${icon.fail} ${pc.red(`No build found at ${pc.bold(relative(root, distDir) || ".")}`)}`);
        console.log(pc.dim("   Run portal build first."));
        blank();
        process.exit(1);
    }
    blank();
    step("Building in-memory asset pipeline…");
    const t0 = Date.now();
    const { assets, report } = await buildAssetMap(distDir);
    const buildMs = Date.now() - t0;
    if (report.files === 0) {
        console.log(`${icon.fail} ${pc.red("Build directory is empty.")}`);
        process.exit(1);
    }
    // SPA fallback document + its Early Hints, computed once.
    const indexAsset = assets.get("/index.html");
    const earlyHintLinks = useHints && indexAsset
        ? extractEarlyHints(indexAsset.raw.toString("utf-8"))
        : [];
    const secHeaders = securityHeaders({ csp: useCsp, hsts: useHsts });
    // ── Compression report ──────────────────────────────────────────────────────
    const brSaved = report.rawBytes - report.brBytes;
    const brPct = report.rawBytes ? (brSaved / report.rawBytes) * 100 : 0;
    const gzSaved = report.rawBytes - report.gzBytes;
    const gzPct = report.rawBytes ? (gzSaved / report.rawBytes) * 100 : 0;
    blank();
    success(`Pipeline ready in ${pc.bold(buildMs + "ms")}`);
    console.log(pc.dim("   ") +
        `${report.files} files  ${icon.dot}  ${report.compressedFiles} compressed  ${icon.dot}  ${earlyHintLinks.length} early hints`);
    blank();
    console.log(pc.bold("   Compression"));
    console.log(pc.dim("   raw      ") + pc.white(fmtBytes(report.rawBytes).padStart(10)));
    console.log(pc.dim("   gzip     ") +
        pc.green(fmtBytes(report.gzBytes).padStart(10)) +
        pc.dim(`   −${gzPct.toFixed(1)}%`));
    console.log(pc.dim("   brotli   ") +
        pc.green(fmtBytes(report.brBytes).padStart(10)) +
        pc.dim(`   −${brPct.toFixed(1)}%`) +
        pc.yellow(`   ${icon.spark} saves ${fmtBytes(brSaved)} per full load`));
    blank();
    // ── Request handler ─────────────────────────────────────────────────────────
    let inFlight = 0;
    let ready = true;
    const server = createServer((req, res) => {
        inFlight++;
        const started = Date.now();
        res.on("finish", () => {
            inFlight--;
            const ms = Date.now() - started;
            const code = res.statusCode;
            const color = code >= 500 ? pc.red : code >= 400 ? pc.yellow : code >= 300 ? pc.cyan : pc.green;
            console.log(pc.dim(new Date().toISOString().slice(11, 19)) + "  " +
                color(String(code)) + "  " +
                pc.dim((req.method ?? "?").padEnd(4)) +
                (req.url ?? "") + "  " +
                pc.dim(`${ms}ms`));
        });
        // Method allowlist
        if (req.method !== "GET" && req.method !== "HEAD") {
            res.writeHead(405, { "Allow": "GET, HEAD", ...secHeaders });
            res.end("Method Not Allowed");
            return;
        }
        // Health / readiness
        const rawUrl = req.url ?? "/";
        if (rawUrl === "/__health") {
            res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
            res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
            return;
        }
        if (rawUrl === "/__ready") {
            res.writeHead(ready ? 200 : 503, { "Content-Type": "application/json", "Cache-Control": "no-store" });
            res.end(JSON.stringify({ ready }));
            return;
        }
        // Resolve + sanitize path
        let pathname;
        try {
            pathname = decodeURIComponent(new URL(rawUrl, "http://localhost").pathname);
        }
        catch {
            res.writeHead(400, secHeaders);
            res.end("Bad Request");
            return;
        }
        // Normalize and reject traversal
        const norm = posix.normalize(pathname);
        if (norm.includes("\0") || norm.startsWith("../")) {
            res.writeHead(403, secHeaders);
            res.end("Forbidden");
            return;
        }
        // Lookup: exact → directory index → SPA fallback
        let asset = assets.get(norm) ??
            (norm.endsWith("/") ? assets.get(norm + "index.html") : undefined);
        let isFallback = false;
        if (!asset) {
            // Static asset miss (has an extension) → 404
            if (extname(norm)) {
                res.writeHead(404, { "Content-Type": "text/plain", ...secHeaders });
                res.end("Not Found");
                return;
            }
            // Otherwise serve the SPA shell
            asset = indexAsset;
            isFallback = true;
        }
        if (!asset) {
            res.writeHead(404, { "Content-Type": "text/plain", ...secHeaders });
            res.end("Not Found");
            return;
        }
        // Conditional request → 304
        const inm = req.headers["if-none-match"];
        if (inm && inm === asset.etag) {
            res.writeHead(304, {
                "ETag": asset.etag,
                "Cache-Control": asset.cacheControl,
                ...secHeaders,
            });
            res.end();
            return;
        }
        const baseHeaders = {
            "Content-Type": asset.mime,
            "ETag": asset.etag,
            "Last-Modified": asset.lastModified,
            "Cache-Control": asset.cacheControl,
            "Vary": "Accept-Encoding",
            ...secHeaders,
        };
        if (opts.cors)
            baseHeaders["Access-Control-Allow-Origin"] = "*";
        // Range requests (only on identity, for media)
        const range = req.headers["range"];
        if (range && !isFallback) {
            const parsed = parseRange(range, asset.raw.length);
            if (parsed) {
                const { start, end } = parsed;
                res.writeHead(206, {
                    ...baseHeaders,
                    "Content-Range": `bytes ${start}-${end}/${asset.raw.length}`,
                    "Accept-Ranges": "bytes",
                    "Content-Length": String(end - start + 1),
                });
                res.end(req.method === "HEAD" ? undefined : asset.raw.subarray(start, end + 1));
                return;
            }
        }
        // 🚀 Early Hints — push critical preloads before the HTML body.
        // Fires for the shell document however it was reached: "/", "/index.html",
        // or a deep SPA-fallback route.
        if (asset === indexAsset && earlyHintLinks.length > 0 && typeof res.writeEarlyHints === "function") {
            try {
                res.writeEarlyHints({ link: earlyHintLinks });
            }
            catch { /* proxy may not forward 1xx — harmless */ }
        }
        // Content negotiation
        const enc = pickEncoding(req.headers["accept-encoding"], asset);
        let body = asset.raw;
        if (enc === "br" && asset.br) {
            body = asset.br;
            baseHeaders["Content-Encoding"] = "br";
        }
        else if (enc === "gzip" && asset.gz) {
            body = asset.gz;
            baseHeaders["Content-Encoding"] = "gzip";
        }
        baseHeaders["Content-Length"] = String(body.length);
        if (asset.raw.length && (asset.mime.startsWith("video/") || asset.mime.startsWith("audio/"))) {
            baseHeaders["Accept-Ranges"] = "bytes";
        }
        res.writeHead(200, baseHeaders);
        res.end(req.method === "HEAD" ? undefined : body);
    });
    // ── Graceful shutdown ─────────────────────────────────────────────────────
    let shuttingDown = false;
    const shutdown = (sig) => {
        if (shuttingDown)
            return;
        shuttingDown = true;
        ready = false;
        blank();
        info(`${sig} received — draining ${inFlight} in-flight request${inFlight === 1 ? "" : "s"}…`);
        server.close(() => {
            success("Server closed cleanly.");
            process.exit(0);
        });
        // Hard cap so we never hang a deploy
        setTimeout(() => process.exit(0), 10_000).unref();
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
    server.listen(port, host, () => {
        success(`Serving ${pc.bold(relative(root, distDir) || ".")} on ${pc.cyan(`http://${host}:${port}`)}`);
        console.log(pc.dim("   security: ") +
            [useCsp && "CSP", useHsts && "HSTS", "COOP", "nosniff", "frame-deny"].filter(Boolean).join(", "));
        console.log(pc.dim("   health:   /__health   ·   readiness: /__ready"));
        blank();
        console.log(pc.dim("   Press Ctrl+C to stop."));
        blank();
    });
}
//# sourceMappingURL=serve.js.map