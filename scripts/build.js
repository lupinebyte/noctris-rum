// Bundles src/index.js into a single browser-ready IIFE.
// Output: dist/v1/noctris-rum.js (readable) + noctris-rum.min.js (minified)
//
// Usage: node scripts/build.js

import { build } from "esbuild";
import { mkdirSync } from "fs";

const OUT_DIR = "dist/v1";

mkdirSync(OUT_DIR, { recursive: true });

const shared = {
  entryPoints: ["src/index.js"],
  bundle: true,
  format: "iife",
  target: ["es2018"], // broad browser support without full ES5 transpilation overhead
  logLevel: "info",
};

await build({
  ...shared,
  outfile: `${OUT_DIR}/noctris-rum.js`,
  minify: false,
});

await build({
  ...shared,
  outfile: `${OUT_DIR}/noctris-rum.min.js`,
  minify: true,
  sourcemap: true,
});

console.log(`\nBuilt ${OUT_DIR}/noctris-rum.js and noctris-rum.min.js`);
