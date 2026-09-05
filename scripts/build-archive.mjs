/**
 * Builds the use case archive folder from submission files, on your own machine.
 *
 *   node scripts/build-archive.mjs <submissions-dir> <archive-dir> [--programme "Name"] \
 *        [--custodian "Who holds it"] [--contact "how to ask"]
 *
 * The app can push straight to GitHub, which needs a token in the browser. This
 * is the other way round for anyone who would rather not do that: point it at a
 * folder of the JSON files participants sent you, point it at a clone of your
 * private repository, and commit the result yourself. Same five files, same
 * merge rules, no credential anywhere.
 *
 * Existing rows are read from cases.jsonl and merged, so running it twice does
 * not duplicate anything and a withdrawal made in the app is carried over.
 */

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

// Run through `npm run archive`, which passes --experimental-strip-types so
// these TypeScript modules — the same ones the app uses — import directly.
import { mergeRows, parseFrameJsonl } from "../src/lib/case-frame.ts";
import { buildArchiveFiles, CASES_JSONL } from "../src/lib/archive.ts";
import { readSubmissionFile, rowsFromSubmission } from "../src/lib/case-intake.ts";

function arg(name, fallback) {
  const at = process.argv.indexOf(`--${name}`);
  return at > 0 && process.argv[at + 1] ? process.argv[at + 1] : fallback;
}

const [, , sourceDir, targetDir] = process.argv;
if (!sourceDir || !targetDir || sourceDir.startsWith("--")) {
  console.error("Usage: node scripts/build-archive.mjs <submissions-dir> <archive-dir> [--programme X] [--custodian Y] [--contact Z]");
  process.exit(2);
}

const files = fs
  .readdirSync(sourceDir)
  .filter((name) => name.toLowerCase().endsWith(".json"))
  .sort();

const at = new Date().toISOString();
const incoming = [];
let refused = 0;

for (const name of files) {
  const { submission, error } = readSubmissionFile(fs.readFileSync(path.join(sourceDir, name), "utf8"));
  if (!submission) {
    console.error(`  skipped ${name}: ${error}`);
    refused += 1;
    continue;
  }
  // The app mints random ids and keeps them; a script run twice over the same
  // inbox has nothing to remember, so ids are derived from the case's own
  // content instead. That makes a re-run update rows rather than duplicate
  // them, and it uses only what the row already carries — no author, no
  // filename, nothing that would make a stable key for a person.
  let n = 0;
  incoming.push(
    ...rowsFromSubmission(
      submission,
      () => {
        const seed = [submission.programme.name, submission.consent.agreedAt, n++].join("|");
        return createHash("sha256").update(seed).digest("hex").slice(0, 32);
      },
      at,
    ),
  );
}

fs.mkdirSync(targetDir, { recursive: true });
const heldPath = path.join(targetDir, CASES_JSONL);
const held = fs.existsSync(heldPath) ? parseFrameJsonl(fs.readFileSync(heldPath, "utf8")) : { rows: [], skipped: 0 };
if (held.skipped) console.error(`  ${held.skipped} unreadable line(s) in the existing ${CASES_JSONL} were left out.`);

const merged = mergeRows(held.rows, incoming);
const meta = {
  programme: arg("programme", merged[0]?.programme || "Structured Sprints"),
  custodian: arg("custodian", "the programme facilitator"),
  contact: arg("contact", "your facilitator"),
  generatedAt: at,
};

for (const file of buildArchiveFiles(merged, meta)) {
  fs.writeFileSync(path.join(targetDir, file.name), file.contents, "utf8");
}

console.log(
  `${files.length - refused} submission file(s) read, ${incoming.length} row(s) in, ` +
    `${merged.length} in the archive. Written to ${targetDir}. Commit it when you have read NOTICE.md.`,
);
