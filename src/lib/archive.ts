/**
 * The archive: a folder of five files, rewritten as a set.
 *
 * `cases.jsonl` is the record. The CSV and TSV are conveniences regenerated
 * from it on every push, and the two Markdown files are generated from the same
 * rows — so the notice can never describe an archive that is no longer there,
 * and the column reference can never document columns that have moved.
 *
 * Every push is read-merge-write rather than append. Two facilitators, or one
 * facilitator on a laptop and a phone, otherwise overwrite each other's rows;
 * merging on `case_id` means the later push adds to the earlier one instead.
 */

import {
  dataDictionary,
  frameCsv,
  frameJsonl,
  frameTsv,
  mergeRows,
  parseFrameJsonl,
  type CaseRow,
} from "./case-frame.ts";
import { buildNotice, type NoticeMeta } from "./notice.ts";
import {
  inspectRepo,
  readFile,
  repoUrl,
  writeFile,
  GitHubError,
  type ArchiveConfig,
} from "./github.ts";

export const CASES_JSONL = "cases.jsonl";
export const CASES_CSV = "cases.csv";
export const CASES_TSV = "cases.tsv";
export const README = "README.md";
export const NOTICE = "NOTICE.md";

export type ArchiveFile = { name: string; contents: string };

function readme(meta: NoticeMeta, rows: readonly CaseRow[]): string {
  const active = rows.filter((r) => r.record_status === "active").length;
  return [
    `# Use cases — ${meta.programme}`,
    "",
    `${active} published account${active === 1 ? "" : "s"} of one hour's work, one row each.`,
    `Last written ${meta.generatedAt} by ${meta.custodian}.`,
    "",
    "**Read [NOTICE.md](./NOTICE.md) before doing anything with this.** It says who consented to",
    "what, what may leave this repository, and how someone takes their account back.",
    "",
    "| File | For |",
    "| --- | --- |",
    `| [\`${CASES_JSONL}\`](./${CASES_JSONL}) | The record. Canonical; the only file read back in. |`,
    `| [\`${CASES_CSV}\`](./${CASES_CSV}) | Analysis. \`pd.read_csv\`, Excel, anything that takes a CSV. |`,
    `| [\`${CASES_TSV}\`](./${CASES_TSV}) | Google Sheets. Open it raw, copy, paste at cell A1. |`,
    `| [\`${NOTICE}\`](./${NOTICE}) | Consent, licence, trade marks, personal data, withdrawal. |`,
    "",
    "Everything except `cases.jsonl` is regenerated on every push, so edits to them are lost.",
    "",
    dataDictionary(),
  ].join("\n");
}

/** The whole folder, derived from the merged rows. Pure — no network, easy to test. */
export function buildArchiveFiles(rows: readonly CaseRow[], meta: NoticeMeta): ArchiveFile[] {
  return [
    { name: CASES_JSONL, contents: frameJsonl(rows) },
    { name: CASES_CSV, contents: frameCsv(rows) },
    { name: CASES_TSV, contents: frameTsv(rows) },
    { name: README, contents: readme(meta, rows) },
    { name: NOTICE, contents: buildNotice(rows, meta) },
  ];
}

export type PushResult = {
  added: number;
  updated: number;
  total: number;
  skippedLines: number;
  url: string;
};

/**
 * Pushes rows into the archive.
 *
 * The repository is checked before anything is written. A public repository is
 * refused outright when any row was consented to as `private-archive`: those
 * authors agreed to an access list, not to the internet, and no error message
 * afterwards would put that back.
 */
export async function pushToArchive(
  config: ArchiveConfig,
  incoming: readonly CaseRow[],
  meta: NoticeMeta,
): Promise<PushResult> {
  const facts = await inspectRepo(config);
  if (!facts.canWrite) {
    throw new GitHubError("That token can read this repository but not write to it. It needs Contents: read and write.");
  }
  if (!facts.private && incoming.some((row) => row.destination === "private-archive")) {
    throw new GitHubError(
      `${config.owner}/${config.repo} is a public repository. These authors agreed to a private ` +
        "archive, so nothing has been written. Use a private repository, or ask them again against " +
        "the public wording.",
    );
  }

  const held = await readFile(config, CASES_JSONL);
  const parsed = held ? parseFrameJsonl(held.text) : { rows: [], skipped: 0 };
  const existingIds = new Set(parsed.rows.map((r) => r.case_id));
  const merged = mergeRows(parsed.rows, incoming);

  const added = incoming.filter((r) => !existingIds.has(r.case_id)).length;
  const updated = incoming.length - added;
  const message =
    added && updated
      ? `Add ${added} and update ${updated} use case${added + updated === 1 ? "" : "s"}`
      : added
        ? `Add ${added} use case${added === 1 ? "" : "s"}`
        : `Update ${updated} use case${updated === 1 ? "" : "s"}`;

  for (const file of buildArchiveFiles(merged, meta)) {
    // Each file is written against the sha just read for it. cases.jsonl reuses
    // the read above; a stale sha is what turns a lost row into a 409.
    const sha = file.name === CASES_JSONL ? held?.sha : (await readFile(config, file.name))?.sha;
    await writeFile(config, file.name, file.contents, sha, message);
  }

  return { added, updated, total: merged.length, skippedLines: parsed.skipped, url: repoUrl(config) };
}

/** Reads the archive without writing to it, for showing what is already there. */
export async function fetchArchive(config: ArchiveConfig): Promise<{ rows: CaseRow[]; skipped: number }> {
  const held = await readFile(config, CASES_JSONL);
  return held ? parseFrameJsonl(held.text) : { rows: [], skipped: 0 };
}
