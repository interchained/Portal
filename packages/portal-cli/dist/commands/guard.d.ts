/**
 * portal guard — safety check on pending patches before they touch the codebase.
 *
 * Usage:
 *   portal guard             (check all pending patches)
 *   portal guard --apply     (apply patches that pass all guard checks)
 */
export interface GuardOptions {
    apply?: boolean;
}
export declare function guardCommand(opts?: GuardOptions): Promise<void>;
//# sourceMappingURL=guard.d.ts.map