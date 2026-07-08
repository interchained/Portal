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
export declare const SIGNING_VERSION = "PORTAL-BRIDGE-V1";
export declare const RESPONSE_SIGNING_VERSION = "PORTAL-BRIDGE-RESPONSE-V1";
/** sha256 of the empty string — the BODY_SHA256 of every bodyless request. */
export declare const EMPTY_BODY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
export declare function sha256Hex(input: string | Buffer): string;
export declare function canonicalRequest(method: string, pathWithQuery: string, timestamp: string | number, nonce: string, bodySha256: string): string;
export declare function canonicalResponse(requestNonce: string, statusCode: string | number, responseTimestamp: string | number, bodySha256: string): string;
export declare function sign(tmkSecret: string, canonical: string): string;
/**
 * Deterministic key id (fingerprint) for a TMK secret:
 * wpb_ + first 12 hex of sha256(secret).
 *
 * This is why the Portal env is only two variables — the key id WordPress
 * stores for a minted key is derived from the secret itself, so the adapter
 * derives the same id from PORTAL_TMK independently.
 */
export declare function deriveKeyId(tmkSecret: string): string;
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
export declare function signRequest(options: SignRequestOptions): SignedHeaders;
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
export declare function verifyResponse(input: VerifyResponseInput): ResponseVerification;
//# sourceMappingURL=hmac.d.ts.map