/**
 * portal compress [dir] — pre-compress build output to disk.
 *
 * Writes a .br (Brotli q11) and .gz (gzip q9) sibling next to every
 * compressible asset, so a reverse proxy (nginx brotli_static / gzip_static,
 * Caddy, etc.) can serve the precompressed bytes with zero CPU at request time.
 *
 * Pairs with `portal build`:
 *     portal build && portal compress dist
 *
 * Then in nginx:
 *     brotli_static on;
 *     gzip_static on;
 */
export declare function compressCommand(dir?: string): Promise<void>;
//# sourceMappingURL=compress.d.ts.map