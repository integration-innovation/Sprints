/**
 * Builds the browser-local app into dist-static/ for GitHub Pages.
 * All asset references are relative, so the output works at any base path.
 */
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
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
  // The Apps Script source ships inside the app, so setup needs no repository.
  loader: { ".gs": "text" },
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
// Published use cases, edited by hand between builds rather than generated.
fs.copyFileSync(path.join(root, "static/use-cases.json"), path.join(out, "use-cases.json"));

// PWA assets: manifest, icons, and a service worker stamped with this build's id
// so a new deploy replaces the old cache instead of serving stale files forever.
fs.cpSync(path.join(root, "static/pwa"), path.join(out, "pwa"), { recursive: true });
fs.copyFileSync(path.join(root, "static/pwa/manifest.webmanifest"), path.join(out, "manifest.webmanifest"));
const buildId = crypto.createHash("sha256")
  .update(fs.readFileSync(path.join(out, "assets/app.js")))
  .update(fs.readFileSync(path.join(out, "assets/app.css")))
  .digest("hex")
  .slice(0, 12);
fs.writeFileSync(
  path.join(out, "sw.js"),
  fs.readFileSync(path.join(root, "static/sw.js"), "utf8").replace("__BUILD_ID__", buildId),
);
// Serve the app for unknown paths too, and stop Pages running the output through Jekyll.
fs.copyFileSync(path.join(root, "static/index.html"), path.join(out, "404.html"));
fs.writeFileSync(path.join(out, ".nojekyll"), "");

const size = (f) => `${(fs.statSync(path.join(out, f)).size / 1024).toFixed(1)} kB`;
console.log(`built dist-static/  app.js ${size("assets/app.js")}  app.css ${size("assets/app.css")}`);

// A single self-contained file, for hosts that take one HTML document.
// It carries no <html>/<head>/<body> of its own so it can be wrapped by a host.
const js = fs.readFileSync(path.join(out, "assets/app.js"), "utf8");
const css = fs.readFileSync(path.join(out, "assets/app.css"), "utf8");
const seal = (code, tag) => code.replaceAll(`</${tag}`, `<\\/${tag}`);

const standalone = `<title>Structured Sprints</title>
<style>
${seal(css, "style")}
</style>
<div id="root"></div>
<script>window.__SPRINTS_EMBEDDED__ = true;</script>
<script>
${seal(js, "script")}
</script>
`;
fs.writeFileSync(path.join(out, "standalone.html"), standalone);
console.log(`  standalone.html ${size("standalone.html")}`);
