/**
 * Bridge error hierarchy. Every failure mode is a named, catchable class —
 * "invalid/missing env fails clearly" is a v0 requirement, not a nicety.
 */

export class BridgeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Missing or malformed configuration (env vars, options). */
export class BridgeConfigError extends BridgeError {}

/** The tunnel rejected us (401/403/429) — key mismatch, skew, or rate limit. */
export class BridgeAuthError extends BridgeError {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

/** WordPress is unreachable or answered with a server error. */
export class BridgeUnavailableError extends BridgeError {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
  }
}

/** The plugin answered, but the payload violates the contract. */
export class BridgeContractError extends BridgeError {}

/** Response signature verification failed — possible tamper in transit. */
export class BridgeIntegrityError extends BridgeError {}

/** Snapshot exceeds the plugin's route ceiling; carries chunk metadata. */
export class BridgeSnapshotTooLargeError extends BridgeError {
  constructor(
    message: string,
    public readonly routeCount: number,
    public readonly maxRoutes: number,
    public readonly chunking: { param: string; perPage: number; totalPages: number }
  ) {
    super(message);
  }
}
