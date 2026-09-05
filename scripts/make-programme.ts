/**
 * Creates a programme and writes the join page participants open.
 *
 * The organiser runs this once. Everything after it — joining, choosing a track,
 * targets, records, status — happens in the app, by the participants, with
 * nobody in the loop.
 *
 *   npx tsx scripts/make-programme.ts
 *   npx tsx scripts/make-programme.ts --start 2026-09-05 --sprints 6 --every 2 --time "16:00"
 *   npx tsx scripts/make-programme.ts --base https://you.github.io/sprints/
 */

import { writeFileSync } from "node:fs";

import { buildProgramme, setupPayload } from "../static/src/store";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const programme = buildProgramme({
  name: arg("name", "AI Build Sprints 2026"),
  tagline: arg(
    "tagline",
    "Six hours, one outcome each. Your own project, your own target, your own build.",
  ),
  startDate: arg("start", today()),
  sprintCount: Number(arg("sprints", "6")),
  cadenceWeeks: Number(arg("every", "2")),
  sessionTime: arg("time", "16:00"),
});

const payload = setupPayload(programme);
const base = arg("base", "http://localhost:4173/");
const link = base + "#/setup?d=" + payload;

/**
 * A 7kB link does not survive a chat app and nobody types one. The join page is
 * the thing you actually hand someone: one short URL that carries the rest.
 */
const joinPath = arg("out", "dist-static/join.html");
const page = [
  '<!doctype html><meta charset="utf-8">',
  "<title>Join " + escapeHtml(programme.name) + "</title>",
  '<meta name="viewport" content="width=device-width,initial-scale=1">',
  "<style>",
  "body{font:16px/1.6 system-ui,-apple-system,sans-serif;margin:0;display:grid;place-items:center;",
  "min-height:100vh;background:#faf9f7;color:#1c1917;padding:24px}",
  ".c{max-width:32rem;text-align:center}",
  "h1{font-size:1.5rem;margin:0 0 .5rem}",
  "p{color:#57534e;margin:.25rem 0}",
  "a{display:inline-block;margin-top:1.5rem;background:#1c1917;color:#fff;padding:.75rem 1.25rem;",
  "border-radius:.5rem;text-decoration:none;font-weight:600}",
  "</style>",
  '<div class="c">',
  "<h1>" + escapeHtml(programme.name) + "</h1>",
  "<p>" + escapeHtml(programme.tagline) + "</p>",
  "<p>" +
    programme.sessions.length +
    " sprints, starting " +
    (programme.sessions[0]?.date ?? "") +
    ".</p>",
  '<a id="go" href="' + escapeHtml(link) + '">Join and add your name</a>',
  "</div>",
  // Redirect, but leave the button for anyone whose browser blocks it.
  '<script>location.replace(document.getElementById("go").href)</script>',
].join("\n");

writeFileSync(joinPath, page, "utf8");

console.log("\n  " + programme.name);
console.log("  " + programme.tagline + "\n");
for (const session of programme.sessions) {
  console.log(
    "  Sprint " +
      String(session.sprintNo).padStart(2, "0") +
      "  " +
      session.date +
      "  " +
      session.day +
      "  " +
      session.time,
  );
}
console.log("\n  Programme code: " + programme.id);
console.log("  Join page:      " + joinPath);
console.log("  Hand people:    " + base + "join.html\n");
console.log("  Setup link is " + payload.length + " characters.");
if (payload.length > 6000) {
  console.log("  Too long to paste into a chat app — send the join page URL instead,");
  console.log("  or connect a Google Sheet and re-run for a short link.\n");
}
