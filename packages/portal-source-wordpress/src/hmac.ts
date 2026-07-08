/**
 * PORTAL-BRIDGE-V1 — HMAC signing primitives.
 *
 * The canonical algorithm is defined once, executably, in the wp-portal-bridge
 * repo (tools/generate-vectors.mjs). This module and the plugin's PHP
 * implementation are both asserted against the same golden vectors
 * (test/vectors/hmac-vectors.json) — drift on either side fails its suite.
 *
 * Canonical request string:
 *
 *   PORTAL-BRIDGE-V1 \n METHOD \n PATH_WITH_QUERY \n TIMESTAMP \n NONCE \n BODY_SHA256
 *
 * PATH_WITH_QUERY is the raw request target exactly as sent on the wire —
 * never re-encoded, never re-ordered. WordPress verifies it against
 * REQUEST_URI byte for byte.
 */

import { createHash, createHmac, randomBytes } from "node:crypto";

export const SIGNING_VERSION = "PORTAL-BRIDGE-V1";
export const RESPONSE_SIGNING_VERSION = "PORTAL-BRIDGE-RESPONSE-V1";

/** sha256 of the empty string — the BODY_SHA256 of every bodyless request. */
export const EMPTY_BODY_SHA256 =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

export function sha256Hex(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

export function canonicalRequest(
  method: string,
  pathWithQuery: string,
  timestamp: string | number,
  nonce: string,
  bodySha256: string
): string {
  return [
    SIGNING_VERSION,
    method.toUpperCase(),
    pathWithQuery,
    String(timestamp),
    nonce,
    bodySha256,
  ].join("\n");
}

export function canonicalResponse(
  requestNonce: string,
  statusCode: string | number,
  responseTimestamp: string | number,
  bodySha256: string
): string {
  return [
    RESPONSE_SIGNING_VERSION,
    requestNonce,
    String(statusCode),
    String(responseTimestamp),
    bodySha256,
  ].join("\n");
}

export function sign(tmkSecret: string, canonical: string): string {
  return createHmac("sha256", tmkSecret).update(canonical, "utf8").digest("hex");
}

/**
 * Deterministic key id (fingerprint) for a TMK secret:
 * wpb_ + first 12 hex of sha256(secret).
 *
 * This is why the Portal env is only two variables — the key id WordPress
 * stores for a minted key is derived from the secret itself, so the adapter
 * derives the same id from PORTAL_TMK independently.
 */
export function deriveKeyId(tmkSecret: string): string {
  return "wpb_" + sha256Hex(tmkSecret).slice(0, 12);
}

export interface SignedHeaders {
  "X-Portal-Timestamp": string;
  "X-Portal-Nonce": string;
  "X-Portal-Key-Id": string;
  "X-Portal-Body-SHA256": string;
  "X-Portal-Signature": string;
}

export interface SignRequestOptions {
  tmk: string;
  method: string;
  /** Raw request target: pathname + "?" + raw query, exactly as it will be sent. */
  pathWithQuery: string;
  body?: string | null;
  /** Override the derived key id (testing / multi-key futures). */
  keyId?: string;
  /** Injectables for deterministic tests. */
  timestamp?: number;
  nonce?: string;
}

/** Build the five X-Portal-* headers for one request. */
export function signRequest(options: SignRequestOptions): SignedHeaders {
  const timestamp = String(options.timestamp ?? Math.floor(Date.now() / 1000));
  const nonce = options.nonce ?? `portal-${randomBytes(12).toString("hex")}`;
  const bodySha =
    options.body === undefined || options.body === null
      ? EMPTY_BODY_SHA256
      : sha256Hex(Buffer.from(options.body, "utf8"));
  const canonical = canonicalRequest(
    options.method,
    options.pathWithQuery,
    timestamp,
    nonce,
    bodySha
  );
  return {
    "X-Portal-Timestamp": timestamp,
    "X-Portal-Nonce": nonce,
    "X-Portal-Key-Id": options.keyId ?? deriveKeyId(options.tmk),
    "X-Portal-Body-SHA256": bodySha,
    "X-Portal-Signature": sign(options.tmk, canonical),
  };
}

export interface VerifyResponseInput {
  tmk: string;
  requestNonce: string;
  statusCode: number;
  body: string | Buffer;
  headers: {
    timestamp?: string | null;
    bodySha256?: string | null;
    signature?: string | null;
  };
}

export type ResponseVerification = "valid" | "invalid" | "unsigned";

/**
 * Verify a PORTAL-BRIDGE-RESPONSE-V1 signature. "unsigned" means the plugin
 * did not sign (older plugin or signing disabled) — callers decide policy.
 */
export function verifyResponse(input: VerifyResponseInput): ResponseVerification {
  const { timestamp, bodySha256, signature } = input.headers;
  if (!timestamp || !signature) return "unsigned";

  const actualBodySha = sha256Hex(
    typeof input.body === "string" ? Buffer.from(input.body, "utf8") : input.body
  );
  if (bodySha256 && bodySha256.toLowerCase() !== actualBodySha) return "invalid";

  const canonical = canonicalResponse(
    input.requestNonce,
    input.statusCode,
    timestamp,
    actualBodySha
  );
  return sign(input.tmk, canonical) === signature.toLowerCase() ? "valid" : "invalid";
}
