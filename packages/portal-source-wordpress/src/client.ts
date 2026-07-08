/**
 * Signed HTTP client for the WP Portal Bridge contract API.
 *
 * Every request travels the HMAC tunnel (PORTAL-BRIDGE-V1); every response
 * signature is verified when present (PORTAL-BRIDGE-RESPONSE-V1). The TMK
 * lives server-side only — this module must never be bundled for a browser.
 */

import { signRequest, verifyResponse } from "./hmac.js";
import {
  BridgeAuthError,
  BridgeContractError,
  BridgeIntegrityError,
  BridgeSnapshotTooLargeError,
  BridgeUnavailableError,
} from "./errors.js";
import type {
  BridgeAssetsPage,
  BridgeHealth,
  BridgeMenu,
  BridgeRoute,
  BridgeRoutesPage,
  BridgeSite,
  BridgeSitemap,
  BridgeSnapshot,
  BridgeTaxonomy,
} from "./types.js";

export interface BridgeClientOptions {
  /** Canonical WordPress origin, e.g. https://cms.example.com — no trailing slash needed. */
  baseUrl: string;
  /** PORTAL_TMK secret. Never expose client-side. */
  tmk: string;
  /** Override the derived key id (rare). */
  keyId?: string;
  /** Request timeout in ms (default 15000). */
  timeoutMs?: number;
  /** "verify" (default): fail on invalid signatures, tolerate unsigned.
   *  "require": fail on unsigned too. "off": skip verification. */
  responseSignatures?: "verify" | "require" | "off";
  /** Injectable fetch for tests. */
  fetchImpl?: typeof fetch;
}

const API_PREFIX = "/wp-json/wp-portal-bridge/v1";

export class BridgeClient {
  private readonly baseUrl: string;
  private readonly origin: string;
  private readonly basePath: string;

  constructor(private readonly options: BridgeClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    const url = new URL(this.baseUrl);
    this.origin = url.origin;
    // Subdirectory installs (https://example.com/blog) sign the full path.
    this.basePath = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "");
  }

  // ── The nine capabilities ─────────────────────────────────────────────────

  getHealth(): Promise<BridgeHealth> {
    return this.get<BridgeHealth>("/health");
  }

  getSite(): Promise<BridgeSite> {
    return this.get<BridgeSite>("/site");
  }

  getRoutes(page = 1, perPage = 0): Promise<BridgeRoutesPage> {
    return this.get<BridgeRoutesPage>(`/routes${paging(page, perPage)}`);
  }

  getRoute(path: string): Promise<BridgeRoute> {
    return this.get<BridgeRoute>(`/route?path=${encodeURIComponent(path)}`);
  }

  getMenus(): Promise<{ menus: BridgeMenu[] }> {
    return this.get<{ menus: BridgeMenu[] }>("/menus");
  }

  getAssets(page = 1, perPage = 0): Promise<BridgeAssetsPage> {
    return this.get<BridgeAssetsPage>(`/assets${paging(page, perPage)}`);
  }

  getTaxonomies(): Promise<{ taxonomies: BridgeTaxonomy[] }> {
    return this.get<{ taxonomies: BridgeTaxonomy[] }>("/taxonomies");
  }

  getSitemap(): Promise<BridgeSitemap> {
    return this.get<BridgeSitemap>("/sitemap");
  }

  /**
   * Full snapshot. Handles the 413 size guard transparently: when the plugin
   * says "too large", pages through the chunks and merges routes + assets.
   */
  async getSnapshot(): Promise<BridgeSnapshot> {
    try {
      return await this.get<BridgeSnapshot>("/snapshot");
    } catch (error) {
      if (!(error instanceof BridgeSnapshotTooLargeError)) throw error;

      const { perPage, totalPages } = error.chunking;
      let merged: BridgeSnapshot | null = null;
      for (let page = 1; page <= totalPages; page++) {
        const chunk = await this.get<BridgeSnapshot>(
          `/snapshot?page=${page}&perPage=${perPage}`
        );
        if (!merged) {
          merged = { ...chunk };
        } else {
          merged.routes = merged.routes.concat(chunk.routes);
          merged.assets = merged.assets.concat(chunk.assets);
        }
      }
      if (!merged) throw new BridgeContractError("Chunked snapshot yielded no pages.");
      delete merged.chunk;
      return merged;
    }
  }

  // ── Transport ─────────────────────────────────────────────────────────────

  private async get<T>(endpoint: string): Promise<T> {
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

    let response: Response;
    try {
      response = await fetchImpl(this.origin + pathWithQuery, {
        method: "GET",
        headers: headers as unknown as Record<string, string>,
        redirect: "manual", // redirects change the signed target — surface them, never follow.
        signal: controller.signal,
      });
    } catch (error) {
      throw new BridgeUnavailableError(
        `WordPress unreachable at ${this.origin}${pathWithQuery}`,
        error
      );
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 300 && response.status < 400) {
      throw new BridgeUnavailableError(
        `WordPress redirected (${response.status}) — PORTAL_BRIDGE_BASE_URL must be the canonical origin (redirects break signatures by design).`
      );
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
        throw new BridgeIntegrityError(
          `Response signature verification failed for ${endpoint} — possible tamper in transit.`
        );
      }
      if (verdict === "unsigned" && policy === "require") {
        throw new BridgeIntegrityError(
          `Response for ${endpoint} was unsigned but responseSignatures="require".`
        );
      }
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      throw new BridgeContractError(
        `Non-JSON response (${response.status}) from ${endpoint}: ${body.slice(0, 200)}`
      );
    }

    if (response.status === 413 && isSnapshotTooLarge(parsed)) {
      const data = (parsed as SnapshotTooLargePayload).data;
      throw new BridgeSnapshotTooLargeError(
        "Snapshot exceeds the plugin route ceiling.",
        data.routeCount,
        data.maxRoutes,
        data.chunking
      );
    }

    if (response.status === 401 || response.status === 403 || response.status === 429) {
      throw new BridgeAuthError(
        `Tunnel rejected the request (${response.status}). Check PORTAL_TMK, clock skew, and rate limits.`,
        response.status
      );
    }

    if (!response.ok) {
      const message =
        typeof parsed === "object" && parsed !== null && "message" in parsed
          ? String((parsed as { message: unknown }).message)
          : body.slice(0, 200);
      throw new BridgeUnavailableError(`Bridge error ${response.status}: ${message}`);
    }

    return parsed as T;
  }
}

interface SnapshotTooLargePayload {
  code: string;
  data: {
    routeCount: number;
    maxRoutes: number;
    chunking: { param: string; perPage: number; totalPages: number };
  };
}

function isSnapshotTooLarge(parsed: unknown): parsed is SnapshotTooLargePayload {
  return (
    typeof parsed === "object" &&
    parsed !== null &&
    (parsed as { code?: string }).code === "wpb_snapshot_too_large"
  );
}

function paging(page: number, perPage: number): string {
  const params: string[] = [];
  if (page > 1) params.push(`page=${page}`);
  if (perPage > 0) params.push(`perPage=${perPage}`);
  return params.length ? `?${params.join("&")}` : "";
}
