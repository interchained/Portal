/**
 * Bridge error hierarchy. Every failure mode is a named, catchable class —
 * "invalid/missing env fails clearly" is a v0 requirement, not a nicety.
 */
export class BridgeError extends Error {
    constructor(message) {
        super(message);
        this.name = new.target.name;
    }
}
/** Missing or malformed configuration (env vars, options). */
export class BridgeConfigError extends BridgeError {
}
/** The tunnel rejected us (401/403/429) — key mismatch, skew, or rate limit. */
export class BridgeAuthError extends BridgeError {
    status;
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}
/** WordPress is unreachable or answered with a server error. */
export class BridgeUnavailableError extends BridgeError {
    cause;
    constructor(message, cause) {
        super(message);
        this.cause = cause;
    }
}
/** The plugin answered, but the payload violates the contract. */
export class BridgeContractError extends BridgeError {
}
/** Response signature verification failed — possible tamper in transit. */
export class BridgeIntegrityError extends BridgeError {
}
/** Snapshot exceeds the plugin's route ceiling; carries chunk metadata. */
export class BridgeSnapshotTooLargeError extends BridgeError {
    routeCount;
    maxRoutes;
    chunking;
    constructor(message, routeCount, maxRoutes, chunking) {
        super(message);
        this.routeCount = routeCount;
        this.maxRoutes = maxRoutes;
        this.chunking = chunking;
    }
}
//# sourceMappingURL=errors.js.map