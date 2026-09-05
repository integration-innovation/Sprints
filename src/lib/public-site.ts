/**
 * The public feed: `use-cases.json`, served beside the app on GitHub Pages.
 *
 * This is the one place in the codebase where something leaves the programme,
 * so it is built by subtraction and by a filter that fails closed.
 *
 * **Only `destination: "public"` rows, and only active ones.** A private-archive
 * row has an author who agreed to an access list, not to a search engine, and
 * a withdrawn row has an author who changed their mind. Both are dropped here
 * rather than anywhere further downstream, because this function's output is
 * the last thing anyone reviews before it is committed.
 *
 * **Anonymous means no name in the file at all.** The frame row already carries
 * an empty `author` when `author_mode` is anonymous; this drops the key
 * entirely rather than trusting that, so a hand-edited archive cannot leak a
 * name through the one file that goes on the internet.
 *
 * **The consent version travels, the statement does not.** A reader deserves to
 * know a consent step happened and which wording was in force; reproducing the
 * whole sentence on a public card is noise, and the wording is in the
 * repository for anyone who wants it.
 */

import { publishable, type CaseRow } from "./case-frame.ts";

export const PUBLIC_FILE_KIND = "structured-sprints/use-cases";

/** One card on the public page. What, why, how, and who — if they wanted naming. */
export type PublicCase = {
  id: string;
  programme: string;
  sprintNo: number;
  /** Absent entirely when the author chose anonymity. */
  author?: string;
  role?: string;
  what: string;
  why: string;
  how: string;
  outcome: string;
  nextStep: string;
  tools: string;
  aiUsedFor: string;
  status: string;
  /** Absent when the author left it unset; the page groups those as uncategorised. */
  category?: string;
  consentVersion: number;
  publishedAt: string;
};

export type PublicFile = {
  kind: typeof PUBLIC_FILE_KIND;
  version: 2;
  generatedAt: string;
  note: string;
  cases: PublicCase[];
};

const NOTE =
  "Generated from the programme's use case archive — do not edit by hand. Every case here was " +
  "published by the person who did the work, through the app's consent step, having chosen a " +
  "public destination. Rows consented to as private-archive, and rows since withdrawn, are " +
  "excluded by construction.";

/** Newest first: a visitor wants the latest hour, not the first one ever recorded. */
function newestFirst(a: PublicCase, b: PublicCase): number {
  return b.publishedAt.localeCompare(a.publishedAt) || b.sprintNo - a.sprintNo;
}

export function buildPublicFile(rows: readonly CaseRow[], generatedAt: string): PublicFile {
  const cases = publishable(rows)
    .map((row): PublicCase => {
      const named = row.author_mode === "credited" && row.author.trim() !== "";
      return {
        id: row.case_id,
        programme: row.programme,
        sprintNo: row.sprint_no,
        ...(named ? { author: row.author.trim() } : {}),
        ...(row.author_role.trim() ? { role: row.author_role.trim() } : {}),
        what: row.what,
        why: row.why,
        how: row.how,
        outcome: row.outcome,
        nextStep: row.next_step,
        tools: row.tools,
        aiUsedFor: row.ai_used_for,
        status: row.status,
        ...(row.category.trim() ? { category: row.category.trim() } : {}),
        consentVersion: row.consent_version,
        publishedAt: row.consented_at,
      };
    })
    .sort(newestFirst);

  return { kind: PUBLIC_FILE_KIND, version: 2, generatedAt, note: NOTE, cases };
}

type LegacyCase = {
  sprintNo?: number;
  author?: string;
  role?: string;
  what?: string;
  why?: string;
  how?: string;
  outcome?: string;
  nextStep?: string;
  tools?: string;
  aiUsedFor?: string;
  status?: string;
  category?: string;
  programme?: string;
};

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * Reads the file the page fetched.
 *
 * Version 1 was a hand-maintained list in the draft shape, and copies of it are
 * cached in people's service workers. Reading both means a browser holding the
 * old file still renders rather than showing an error, and the shapes converge
 * the next time the page is fetched fresh.
 */
export function readPublicFile(data: unknown): PublicCase[] {
  if (typeof data !== "object" || data === null) return [];
  const file = data as { cases?: unknown };
  if (!Array.isArray(file.cases)) return [];

  return file.cases.map((raw, index): PublicCase => {
    const item = (raw ?? {}) as LegacyCase & Partial<PublicCase>;
    const author = text(item.author).trim();
    return {
      id: text(item.id) || `case-${index}`,
      programme: text(item.programme),
      sprintNo: Number(item.sprintNo) || 0,
      // A blank name in either shape means anonymous, and stays absent.
      ...(author ? { author } : {}),
      ...(text(item.role).trim() ? { role: text(item.role).trim() } : {}),
      what: text(item.what),
      why: text(item.why),
      how: text(item.how),
      outcome: text(item.outcome),
      nextStep: text(item.nextStep),
      tools: text(item.tools),
      aiUsedFor: text(item.aiUsedFor),
      status: text(item.status),
      ...(text(item.category).trim() ? { category: text(item.category).trim() } : {}),
      consentVersion: Number(item.consentVersion) || 0,
      publishedAt: text(item.publishedAt),
    };
  });
}

/** The file as it is written to disk — trailing newline, so a diff stays clean. */
export function serialisePublicFile(file: PublicFile): string {
  return `${JSON.stringify(file, null, 2)}\n`;
}
