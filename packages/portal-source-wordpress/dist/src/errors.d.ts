/**
 * Bridge error hierarchy. Every failure mode is a named, catchable class —
 * "invalid/missing env fails clearly" is a v0 requirement, not a nicety.
 */
export declare class BridgeError extends Error {
    constructor(message: string);
}
/** Missing or malformed configuration (env vars, options). */
export declare class BridgeConfigError extends BridgeError {
}
/** The tunnel rejected us (401/403/429) — key mismatch, skew, or rate limit. */
export declare class BridgeAuthError extends BridgeError {
    readonly status: number;
    constructor(message: string, status: number);
}
/** WordPress is unreachable or answered with a server error. */
export declare class BridgeUnavailableError extends BridgeError {
    readonly cause?: unknown | undefined;
    constructor(message: string, cause?: unknown | undefined);
}
/** The plugin answered, but the payload violates the contract. */
export declare class BridgeContractError extends BridgeError {
}
/** Response signature verification failed — possible tamper in transit. */
export declare class BridgeIntegrityError extends BridgeError {
}
/** Snapshot exceeds the plugin's route ceiling; carries chunk metadata. */
export declare class BridgeSnapshotTooLargeError extends BridgeError {
    readonly routeCount: number;
    readonly maxRoutes: number;
    readonly chunking: {
        param: string;
        perPage: number;
        totalPages: number;
    };
    constructor(message: string, routeCount: number, maxRoutes: number, chunking: {
        param: string;
        perPage: number;
        totalPages: number;
    });
}
//# sourceMappingURL=errors.d.ts.map