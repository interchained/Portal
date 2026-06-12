/**
 * portal build — builds the Portal app for production.
 */
export interface BuildOptions {
    outDir?: string;
    mode?: string;
    ssr?: boolean;
}
export declare function buildCommand(opts?: BuildOptions): Promise<void>;
//# sourceMappingURL=build.d.ts.map