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
import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, relative, extname, sep } from "node:path";
import { brotliCompressSync, gzipSync, constants as zc } from "node:zlib";
import pc from "picocolors";
import { banner, header, success, info, step, blank, icon } from "../utils/print.js";
const COMPRESSIBLE_EXT = new Set([
    ".html", ".js", ".mjs", ".css", ".json", ".map",
    ".svg", ".txt", ".xml", ".webmanifest", ".wasm",
]);
function fmtBytes(n) {
    if (n < 1024)
        return `${n} B`;
    if (n < 1024 * 1024)
        return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
async function walk(dir) {
    const out = [];
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
        const full = join(dir, e.name);
        if (e.isDirectory())
            out.push(...(await walk(full)));
        else if (e.isFile())
            out.push(full);
    }
    return out;
}
export async function compressCommand(dir = "dist") {
    banner();
    header("Portal Compress");
    const root = process.cwd();
    const target = join(root, dir);
    try {
        const st = await stat(target);
        if (!st.isDirectory())
            throw new Error();
    }
    catch {
        blank();
        console.log(`${icon.fail} ${pc.red(`No directory at ${pc.bold(dir)}`)}`);
        console.log(pc.dim("   Run portal build first."));
        blank();
        process.exit(1);
    }
    blank();
    step(`Compressing ${pc.bold(dir)}/ …`);
    blank();
    const files = (await walk(target)).filter((f) => !f.endsWith(".br") &&
        !f.endsWith(".gz") &&
        COMPRESSIBLE_EXT.has(extname(f).toLowerCase()));
    let rawTotal = 0;
    let brTotal = 0;
    let gzTotal = 0;
    let written = 0;
    let skipped = 0;
    for (const file of files) {
        const raw = await readFile(file);
        if (raw.length < 256) {
            skipped++;
            continue;
        }
        const br = brotliCompressSync(raw, {
            params: {
                [zc.BROTLI_PARAM_QUALITY]: 11,
                [zc.BROTLI_PARAM_SIZE_HINT]: raw.length,
            },
        });
        const gz = gzipSync(raw, { level: 9 });
        let wroteAny = false;
        if (br.length < raw.length * 0.98) {
            await writeFile(file + ".br", br);
            brTotal += br.length;
            wroteAny = true;
        }
        else {
            brTotal += raw.length;
        }
        if (gz.length < raw.length * 0.98) {
            await writeFile(file + ".gz", gz);
            gzTotal += gz.length;
            wroteAny = true;
        }
        else {
            gzTotal += raw.length;
        }
        rawTotal += raw.length;
        if (wroteAny) {
            written++;
            const rel = relative(target, file).split(sep).join("/");
            const pct = ((1 - br.length / raw.length) * 100).toFixed(0);
            console.log(`   ${icon.pass} ${rel.padEnd(40).slice(0, 40)} ` +
                pc.dim(fmtBytes(raw.length).padStart(9)) +
                pc.dim(" → ") +
                pc.green(fmtBytes(br.length).padStart(9)) +
                pc.yellow(`  −${pct}%`));
        }
        else {
            skipped++;
        }
    }
    const brPct = rawTotal ? ((1 - brTotal / rawTotal) * 100).toFixed(1) : "0";
    const gzPct = rawTotal ? ((1 - gzTotal / rawTotal) * 100).toFixed(1) : "0";
    blank();
    success(`Compressed ${written} file${written === 1 ? "" : "s"}${skipped ? pc.dim(`  (${skipped} skipped)`) : ""}`);
    console.log(pc.dim("   raw    ") + pc.white(fmtBytes(rawTotal).padStart(10)));
    console.log(pc.dim("   gzip   ") + pc.green(fmtBytes(gzTotal).padStart(10)) + pc.dim(`   −${gzPct}%`));
    console.log(pc.dim("   brotli ") + pc.green(fmtBytes(brTotal).padStart(10)) + pc.dim(`   −${brPct}%`) +
        pc.yellow(`   ${icon.spark} ${fmtBytes(rawTotal - brTotal)} smaller`));
    blank();
    info("Enable in nginx with: brotli_static on;  gzip_static on;");
    blank();
}
//# sourceMappingURL=compress.js.map