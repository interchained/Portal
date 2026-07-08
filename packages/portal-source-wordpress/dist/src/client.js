/**
 * Signed HTTP client for the WP Portal Bridge contract API.
 *
 * Every request travels the HMAC tunnel (PORTAL-BRIDGE-V1); every response
 * signature is verified when present (PORTAL-BRIDGE-RESPONSE-V1). The TMK
 * lives server-side only — this module must never be bundled for a browser.
 */
import { signRequest, verifyResponse } from "./hmac.js";
import { BridgeAuthError, BridgeContractError, BridgeIntegrityError, BridgeSnapshotTooLargeError, BridgeUnavailableError, } from "./errors.js";
const API_PREFIX = "/wp-json/wp-portal-bridge/v1";
export class BridgeClient {
    options;
    baseUrl;
    origin;
    basePath;
    constructor(options) {
        this.options = options;
        this.baseUrl = options.baseUrl.replace(/\/+$/, "");
        const url = new URL(this.baseUrl);
        this.origin = url.origin;
        // Subdirectory installs (https://example.com/blog) sign the full path.
        this.basePath = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "");
    }
    // ── The nine capabilities ─────────────────────────────────────────────────
    getHealth() {
        return this.get("/health");
    }
    getSite() {
        return this.get("/site");
    }
    getRoutes(page = 1, perPage = 0) {
        return this.get(`/routes${paging(page, perPage)}`);
    }
    getRoute(path) {
        return this.get(`/route?path=${encodeURIComponent(path)}`);
    }
    getMenus() {
        return this.get("/menus");
    }
    getAssets(page = 1, perPage = 0) {
        return this.get(`/assets${paging(page, perPage)}`);
    }
    getTaxonomies() {
        return this.get("/taxonomies");
    }
    getSitemap() {
        return this.get("/sitemap");
    }
    /**
     * Full snapshot. Handles the 413 size guard transparently: when the plugin
     * says "too large", pages through the chunks and merges routes + assets.
     */
    async getSnapshot() {
        try {
            return await this.get("/snapshot");
        }
        catch (error) {
            if (!(error instanceof BridgeSnapshotTooLargeError))
                throw error;
            const { perPage, totalPages } = error.chunking;
            let merged = null;
            for (let page = 1; page <= totalPages; page++) {
                const chunk = await this.get(`/snapshot?page=${page}&perPage=${perPage}`);
                if (!merged) {
                    merged = { ...chunk };
                }
                else {
                    merged.routes = merged.routes.concat(chunk.routes);
                    merged.assets = merged.assets.concat(chunk.assets);
                }
            }
            if (!merged)
                throw new BridgeContractError("Chunked snapshot yielded no pages.");
            delete merged.chunk;
            return merged;
        }
    }
    // ── Transport ─────────────────────────────────────────────────────────────
    async get(endpoint) {
        const pathWithQuery = `${this.basePath}${API_PREFIX}${endpoint}`;
        const headers = signRequest({
            tmk: this.options.tmk,
            keyId: this.options.keyId,
            method: "GET",
            pathWithQuery,
        });
        const fetchImpl = this.options.fetchImpl ?? fetch;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 15000);
        let response;
        try {
            response = await fetchImpl(this.origin + pathWithQuery, {
                method: "GET",
                headers: headers,
                redirect: "manual", // redirects change the signed target — surface them, never follow.
                signal: controller.signal,
            });
        }
        catch (error) {
            throw new BridgeUnavailableError(`WordPress unreachable at ${this.origin}${pathWithQuery}`, error);
        }
        finally {
            clearTimeout(timer);
        }
        if (response.status >= 300 && response.status < 400) {
            throw new BridgeUnavailableError(`WordPress redirected (${response.status}) — PORTAL_BRIDGE_BASE_URL must be the canonical origin (redirects break signatures by design).`);
        }
        const body = await response.text();
        // Verify the response signature when policy demands it.
        const policy = this.options.responseSignatures ?? "verify";
        if (policy !== "off") {
            const verdict = verifyResponse({
                tmk: this.options.tmk,
                requestNonce: headers["X-Portal-Nonce"],
                statusCode: response.status,
                body,
                headers: {
                    timestamp: response.headers.get("x-portal-response-timestamp"),
                    bodySha256: response.headers.get("x-portal-response-body-sha256"),
                    signature: response.headers.get("x-portal-response-signature"),
                },
            });
            if (verdict === "invalid") {
                throw new BridgeIntegrityError(`Response signature verification failed for ${endpoint} — possible tamper in transit.`);
            }
            if (verdict === "unsigned" && policy === "require") {
                throw new BridgeIntegrityError(`Response for ${endpoint} was unsigned but responseSignatures="require".`);
            }
        }
        let parsed;
        try {
            parsed = JSON.parse(body);
        }
        catch {
            throw new BridgeContractError(`Non-JSON response (${response.status}) from ${endpoint}: ${body.slice(0, 200)}`);
        }
        if (response.status === 413 && isSnapshotTooLarge(parsed)) {
            const data = parsed.data;
            throw new BridgeSnapshotTooLargeError("Snapshot exceeds the plugin route ceiling.", data.routeCount, data.maxRoutes, data.chunking);
        }
        if (response.status === 401 || response.status === 403 || response.status === 429) {
            throw new BridgeAuthError(`Tunnel rejected the request (${response.status}). Check PORTAL_TMK, clock skew, and rate limits.`, response.status);
        }
        if (!response.ok) {
            const message = typeof parsed === "object" && parsed !== null && "message" in parsed
                ? String(parsed.message)
                : body.slice(0, 200);
            throw new BridgeUnavailableError(`Bridge error ${response.status}: ${message}`);
        }
        return parsed;
    }
}
function isSnapshotTooLarge(parsed) {
    return (typeof parsed === "object" &&
        parsed !== null &&
        parsed.code === "wpb_snapshot_too_large");
}
function paging(page, perPage) {
    const params = [];
    if (page > 1)
        params.push(`page=${page}`);
    if (perPage > 0)
        params.push(`perPage=${perPage}`);
    return params.length ? `?${params.join("&")}` : "";
}
//# sourceMappingURL=client.js.map