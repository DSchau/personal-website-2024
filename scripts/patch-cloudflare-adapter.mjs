// @astrojs/cloudflare 12.x's wasm module loader records import rewrites by
// chunk *name*, and the client build can emit a chunk with the same name as
// a server chunk (e.g. "index" for the React island runtime). The adapter
// then tries to rewrite dist/_worker.js/_astro/<client-chunk>.js, which only
// exists under dist/_astro/, and the whole build dies with ENOENT.
// Fixed lineages of the adapter require Astro 6, so until this project
// upgrades we make the rewrite step skip files that don't exist.
import fs from "node:fs";

const file = new URL(
  "../node_modules/@astrojs/cloudflare/dist/utils/cloudflare-module-loader.js",
  import.meta.url
);

let src;
try {
  src = fs.readFileSync(file, "utf8");
} catch {
  process.exit(0);
}

const target = 'const contents = await fs.readFile(filepath, "utf-8");';
const replacement =
  'let contents; try { contents = await fs.readFile(filepath, "utf-8"); } catch { continue; }';

if (src.includes(replacement)) {
  process.exit(0);
}

if (!src.includes(target)) {
  console.warn(
    "[patch-cloudflare-adapter] expected pattern not found — the adapter may have been updated; check whether the patch is still needed"
  );
  process.exit(0);
}

fs.writeFileSync(file, src.replace(target, replacement));
console.log("[patch-cloudflare-adapter] applied");
