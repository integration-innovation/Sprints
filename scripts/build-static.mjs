/**
 * Builds the browser-local app into dist-static/ for GitHub Pages.
 * All asset references are relative, so the output works at any base path.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "dist-static");

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, "assets"), { recursive: true });

await esbuild.build({
  entryPoints: [path.join(root, "static/src/main.tsx")],
  bundle: true,
  minify: true,
  sourcemap: false,
  format: "iife",
  target: ["es2020"],
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  outfile: path.join(out, "assets/app.js"),
});

execFileSync(
  process.execPath,
  [
    path.join(root, "node_modules/@tailwindcss/cli/dist/index.mjs"),
    "--input",
    path.join(root, "static/styles.css"),
    "--output",
    path.join(out, "assets/app.css"),
    "--minify",
  ],
  { stdio: "inherit", cwd: root },
);

fs.copyFileSync(path.join(root, "static/index.html"), path.join(out, "index.html"));
// Serve the app for unknown paths too, and stop Pages running the output through Jekyll.
fs.copyFileSync(path.join(root, "static/index.html"), path.join(out, "404.html"));
fs.writeFileSync(path.join(out, ".nojekyll"), "");

const size = (f) => `${(fs.statSync(path.join(out, f)).size / 1024).toFixed(1)} kB`;
console.log(`built dist-static/  app.js ${size("assets/app.js")}  app.css ${size("assets/app.css")}`);
