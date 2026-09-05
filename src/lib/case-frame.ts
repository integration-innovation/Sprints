/**
 * Published use cases as a dataframe.
 *
 * A use case is prose; a frame is one row per case with fixed, typed columns,
 * which is what you need to count them, chart them, or hand them to someone
 * else's spreadsheet. This module is the single definition of that table — the
 * columns, their types, how a row is built from a consented submission, and the
 * three serialisations that leave the app.
 *
 * Three decisions shape it:
 *
 * 1. **JSONL is canonical; CSV and TSV are views.** A CSV round-trip has to
 *    guess at types and mangles the newlines inside a `how` paragraph. JSONL
 *    reads back exactly as written, so the archive stores that and regenerates
 *    the other two from it. Nothing is ever parsed back out of the CSV.
 *
 * 2. **The consent travels in the row.** Not a footnote in a README, not a
 *    version number to look up: the sentence the author actually agreed to, its
 *    version, when they agreed, and where they agreed it could go. A row
 *    separated from this file still says what may be done with it.
 *
 * 3. **Anonymous is structural, not cosmetic.** An anonymous row carries no
 *    name, no participant id, and no key derived from one. `case_id` is minted
 *    once when the case is first recorded — randomly in the app, which can
 *    remember it, and from the case's own text in the command-line tool, which
 *    cannot — so re-publishing updates the same row without anything in the
 *    table pointing back at a person. With seven people in a programme, any
 *    stable per-person key is a name.
 */

import type { Destination, PublishedUseCase, UseCaseDraft } from "./use-case.ts";

export const FRAME_VERSION = 1;

/** Where the author agreed their words may go. Defined with the consent it belongs to. */
export type { Destination };

/** A row still standing, or one its author has since withdrawn. */
export type RecordStatus = "active" | "withdrawn";

export type CaseRow = {
  case_id: string;
  schema_version: number;
  programme: string;
  sprint_no: number;
  what: string;
  why: string;
  how: string;
  outcome: string;
  next_step: string;
  tools: string;
  ai_used_for: string;
  status: string;
  author_mode: "credited" | "anonymous";
  author: string;
  author_role: string;
  destination: Destination;
  consent_version: number;
  consent_statement: string;
  consented_at: string;
  recorded_at: string;
  record_status: RecordStatus;
};

export type ColumnType = "string" | "integer" | "datetime" | "category";

export type ColumnSpec = {
  name: keyof CaseRow;
  type: ColumnType;
  /** For a category column, the complete set of values it can hold. */
  values?: readonly string[];
  description: string;
};

/**
 * The data dictionary. Order here is the column order everywhere — CSV, TSV and
 * the table on screen — so a frame exported today lines up with one exported
 * last month, and a pasted block lands under the headings already in the sheet.
 */
export const COLUMNS: readonly ColumnSpec[] = [
  { name: "case_id", type: "string", description: "Minted once per case, from a random draw or the case's own text. Stable across re-publishing, and never derived from who wrote it." },
  { name: "schema_version", type: "integer", description: "Version of this column set. Bumped when columns change meaning." },
  { name: "programme", type: "string", description: "Programme the sprint belonged to." },
  { name: "sprint_no", type: "integer", description: "Which sprint of the programme." },
  { name: "what", type: "string", description: "What the author set out to do in the hour." },
  { name: "why", type: "string", description: "Why it mattered to them." },
  { name: "how", type: "string", description: "How they did it, and what done meant." },
  { name: "outcome", type: "string", description: "What came of it." },
  { name: "next_step", type: "string", description: "What it opened up." },
  { name: "tools", type: "string", description: "Tools used. Free text, comma-separated by convention only." },
  { name: "ai_used_for", type: "string", description: "What AI was used for, from the programme's list." },
  { name: "status", type: "category", values: ["Complete", "Partial", "Blocked", "Deferred", "In progress", "Not started", "Absent"], description: "How the sprint ended, from the programme's list." },
  { name: "author_mode", type: "category", values: ["credited", "anonymous"], description: "Whether the author chose to be named. An anonymous row has no name to redact." },
  { name: "author", type: "string", description: "Name as the author wished to be credited. Always empty when author_mode is anonymous." },
  { name: "author_role", type: "string", description: "Generic role the author chose, e.g. Architect. May be empty." },
  { name: "destination", type: "category", values: ["private-archive", "public"], description: "Where the author agreed this could go. private-archive is not a licence to publish." },
  { name: "consent_version", type: "integer", description: "Version of the consent wording in force when they agreed." },
  { name: "consent_statement", type: "string", description: "The exact sentence the author agreed to. The row's authority to exist." },
  { name: "consented_at", type: "datetime", description: "ISO 8601 UTC. When the author ticked the box." },
  { name: "recorded_at", type: "datetime", description: "ISO 8601 UTC. When this row last entered the frame." },
  { name: "record_status", type: "category", values: ["active", "withdrawn"], description: "withdrawn means the author asked for it back. Withdrawn rows keep their id and lose their content." },
] as const;

const ORDER = COLUMNS.map((c) => c.name);

/** Turns one consented submission into rows. `caseId` supplies the ids the drafts don't carry. */
export function toRows(
  submission: PublishedUseCase,
  caseId: (draft: UseCaseDraft, index: number) => string,
  recordedAt: string,
): CaseRow[] {
  const destination: Destination = submission.destination ?? "public";
  return submission.cases.map((draft, index) => {
    const credited = draft.author.trim() !== "";
    return {
      case_id: caseId(draft, index),
      schema_version: FRAME_VERSION,
      programme: submission.programme.name,
      sprint_no: draft.sprintNo,
      what: draft.what.trim(),
      why: draft.why.trim(),
      how: draft.how.trim(),
      outcome: draft.outcome.trim(),
      next_step: draft.nextStep.trim(),
      tools: draft.tools.trim(),
      ai_used_for: draft.aiUsedFor.trim(),
      status: draft.status.trim(),
      author_mode: credited ? "credited" : "anonymous",
      author: credited ? draft.author.trim() : "",
      author_role: draft.role.trim(),
      destination,
      consent_version: submission.consent.version,
      consent_statement: submission.consent.statement,
      consented_at: submission.consent.agreedAt,
      recorded_at: recordedAt,
      record_status: "active",
    };
  });
}

/**
 * Withdrawal, done properly: the row stays so the id can never be reissued, and
 * everything the author wrote goes. Blanking beats deleting because a deleted
 * row leaves a gap somebody later fills with a guess.
 */
export function withdraw(row: CaseRow, at: string): CaseRow {
  return {
    ...row,
    what: "",
    why: "",
    how: "",
    outcome: "",
    next_step: "",
    tools: "",
    ai_used_for: "",
    author: "",
    author_role: "",
    author_mode: "anonymous",
    record_status: "withdrawn",
    recorded_at: at,
  };
}

/**
 * Folds new rows into what the archive already holds, newest `recorded_at`
 * winning per `case_id`. A withdrawal always wins, whatever its timestamp says:
 * a device with a stale clock must not be able to un-withdraw somebody's words.
 */
export function mergeRows(existing: readonly CaseRow[], incoming: readonly CaseRow[]): CaseRow[] {
  const byId = new Map<string, CaseRow>();
  for (const row of [...existing, ...incoming]) {
    const held = byId.get(row.case_id);
    if (!held) {
      byId.set(row.case_id, row);
      continue;
    }
    if (held.record_status === "withdrawn") continue;
    if (row.record_status === "withdrawn" || row.recorded_at >= held.recorded_at) {
      byId.set(row.case_id, row);
    }
  }
  return [...byId.values()].sort(
    (a, b) => a.programme.localeCompare(b.programme) || a.sprint_no - b.sprint_no || a.case_id.localeCompare(b.case_id),
  );
}

/** Rows whose destination allows them onto a public page. Everything else stays in the archive. */
export function publishable(rows: readonly CaseRow[]): CaseRow[] {
  return rows.filter((r) => r.destination === "public" && r.record_status === "active");
}

// --- serialisation ----------------------------------------------------------

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

/**
 * The frame as CSV. Quoted per RFC 4180, so `pandas.read_csv` and
 * `readr::read_csv` both get the newlines inside a paragraph back intact, and
 * with a BOM so Excel reads the accented characters rather than mojibake.
 */
export function frameCsv(rows: readonly CaseRow[]): string {
  const lines = [ORDER.map(csvCell).join(",")];
  for (const row of rows) lines.push(ORDER.map((key) => csvCell(row[key])).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}

/**
 * A cell that survives the clipboard.
 *
 * Sheets splits a paste on tabs and newlines and ignores CSV quoting, so a
 * paragraph with a line break in it would tear the grid apart. Flattening is the
 * only thing that works, which is why this is a separate serialisation and not
 * the CSV with different separators — the loss is real and belongs in one place.
 */
function pasteCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/\r?\n+/g, " · ")
    .replace(/\t/g, " ")
    .trim();
}

/** The frame as tab-separated rows, for pasting into a Google Sheet at cell A1. */
export function frameTsv(rows: readonly CaseRow[]): string {
  const lines = [ORDER.map(pasteCell).join("\t")];
  for (const row of rows) lines.push(ORDER.map((key) => pasteCell(row[key])).join("\t"));
  return lines.join("\n");
}

/** The frame as JSON Lines — the canonical form, and the only one read back in. */
export function frameJsonl(rows: readonly CaseRow[]): string {
  return rows.map((row) => JSON.stringify(orderKeys(row))).join("\n") + (rows.length ? "\n" : "");
}

function orderKeys(row: CaseRow): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of ORDER) out[key] = row[key];
  return out;
}

/**
 * Reads a JSONL frame back.
 *
 * Anything unreadable is skipped rather than thrown, because this parses a file
 * that may have been hand-edited in a repository, and one bad line should cost
 * one row rather than the whole archive. What survives is reported so a caller
 * can say so instead of quietly losing rows.
 */
export function parseFrameJsonl(text: string): { rows: CaseRow[]; skipped: number } {
  const rows: CaseRow[] = [];
  let skipped = 0;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as Partial<CaseRow>;
      if (typeof parsed.case_id !== "string" || !parsed.case_id) {
        skipped += 1;
        continue;
      }
      rows.push(normaliseRow(parsed));
    } catch {
      skipped += 1;
    }
  }
  return { rows, skipped };
}

function str(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

/** Fills in anything a hand-edited or older row is missing, so callers get a complete row. */
function normaliseRow(row: Partial<CaseRow>): CaseRow {
  const mode = row.author_mode === "credited" ? "credited" : "anonymous";
  return {
    case_id: str(row.case_id),
    schema_version: Number(row.schema_version) || FRAME_VERSION,
    programme: str(row.programme),
    sprint_no: Number(row.sprint_no) || 0,
    what: str(row.what),
    why: str(row.why),
    how: str(row.how),
    outcome: str(row.outcome),
    next_step: str(row.next_step),
    tools: str(row.tools),
    ai_used_for: str(row.ai_used_for),
    status: str(row.status),
    author_mode: mode,
    // A row claiming to be anonymous while carrying a name is repaired, not trusted.
    author: mode === "credited" ? str(row.author) : "",
    author_role: str(row.author_role),
    destination: row.destination === "public" ? "public" : "private-archive",
    consent_version: Number(row.consent_version) || 0,
    consent_statement: str(row.consent_statement),
    consented_at: str(row.consented_at),
    recorded_at: str(row.recorded_at),
    record_status: row.record_status === "withdrawn" ? "withdrawn" : "active",
  };
}

/** The data dictionary as Markdown, written beside the data so the columns explain themselves. */
export function dataDictionary(): string {
  const lines = [
    "# Column reference",
    "",
    `Schema version ${FRAME_VERSION}. One row per published use case.`,
    "",
    "`cases.jsonl` is the canonical file — it is the only one read back in, and the only one",
    "to edit if you must edit by hand. `cases.csv` and `cases.tsv` are regenerated from it on",
    "every write, so changes made to those two are lost.",
    "",
    "| Column | Type | Meaning |",
    "| --- | --- | --- |",
  ];
  for (const column of COLUMNS) {
    const type = column.values ? `${column.type}<br>${column.values.map((v) => `\`${v}\``).join(", ")}` : column.type;
    lines.push(`| \`${column.name}\` | ${type} | ${column.description} |`);
  }
  lines.push(
    "",
    "## Reading it",
    "",
    "```python",
    "import pandas as pd",
    "",
    'cases = pd.read_csv("cases.csv")           # or pd.read_json("cases.jsonl", lines=True)',
    'live  = cases[cases.record_status == "active"]',
    'live.groupby("status").size()',
    "```",
    "",
    "## Two columns that are not decoration",
    "",
    "`consent_statement` is the sentence the author agreed to, and it is the row's authority to",
    "exist. `destination` says where they agreed it could go: `private-archive` is permission to",
    "keep, not permission to publish. Filter on it before anything leaves this repository.",
  );
  return lines.join("\n");
}
