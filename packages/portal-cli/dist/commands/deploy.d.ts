/**
 * portal deploy — build and prepare deployment artifacts.
 *
 * Adapters: static | node | docker
 */
export type DeployAdapter = "static" | "node" | "docker";
export interface DeployOptions {
    adapter?: DeployAdapter;
    outDir?: string;
    tag?: string;
}
export declare function deployCommand(opts?: DeployOptions): Promise<void>;
//# sourceMappingURL=deploy.d.ts.map