/**
 * Builds the public feed from an archive, for the site to deploy.
 *
 *   npm run publish-cases -- <archive-dir>
 *
 * Reads `cases.jsonl`, keeps only the rows whose authors chose a public
 * destination and have not withdrawn, and writes `static/use-cases.json`. That
 * file is what GitHub Pages serves at `#/use-cases`, so this is the step where
 * something genuinely becomes public — and it is deliberately a command you run
 * and a diff you read, not something that happens on a timer.
 *
 * It prints what it is about to publish, by name, so a case that should not be
 * there is visible before the commit rather than after the deploy.
 */

import fs from "node:fs";
import path from "node:path";

import { parseFrameJsonl } from "../src/lib/case-frame.ts";
import { buildPublicFile, serialisePublicFile } from "../src/lib/public-site.ts";
import { CASES_JSONL } from "../src/lib/archive.ts";

const [, , archiveDir] = process.argv;
if (!archiveDir) {
  console.error("Usage: npm run publish-cases -- <archive-dir>");
  process.exit(2);
}

const source = path.join(archiveDir, CASES_JSONL);
if (!fs.existsSync(source)) {
  console.error(`No ${CASES_JSONL} in ${archiveDir}. Build the archive first: npm run archive.`);
  process.exit(1);
}

const { rows, skipped } = parseFrameJsonl(fs.readFileSync(source, "utf8"));
if (skipped) console.error(`  ${skipped} unreadable line(s) were left out.`);

const file = buildPublicFile(rows, new Date().toISOString());
const target = path.join("static", "use-cases.json");
fs.writeFileSync(target, serialisePublicFile(file), "utf8");

const held = rows.filter((r) => r.record_status === "active").length;
console.log(`${held} active row(s) in the archive; ${file.cases.length} agreed for publication.`);
for (const c of file.cases) {
  console.log(`  Sprint ${String(c.sprintNo).padStart(2, "0")} · ${c.author ?? "anonymous"} · ${c.what}`);
}
console.log(`\nWritten to ${target}. Read the diff, then commit — that is what publishes it.`);
