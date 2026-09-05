/**
 * Taking in a use case somebody else published.
 *
 * A participant publishing on their own phone has no write access to the
 * facilitator's archive and should not: handing every participant a token that
 * can rewrite the whole archive to solve a once-a-fortnight import is a bad
 * trade. So they export a file, and this reads it.
 *
 * The file is treated as untrusted. It arrives by email or chat, it may have
 * been edited, and it may be a different kind of file altogether — the backup
 * module learned the same lesson. Anything that cannot be vouched for is
 * refused with a reason rather than half-imported, because a use case with a
 * missing or invented consent statement is exactly the row nobody can later
 * work out the standing of.
 */

import { toRows, type CaseRow } from "./case-frame.ts";
import type { PublishedUseCase, UseCaseDraft } from "./use-case.ts";

export const SUBMISSION_KIND = "structured-sprints/use-case";

export type IntakeResult =
  | { submission: PublishedUseCase; error: null }
  | { submission: null; error: string };

export function readSubmissionFile(text: string): IntakeResult {
  if (!text.trim()) return { submission: null, error: "That file is empty." };

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { submission: null, error: "That file is not JSON. Choose the file the Publish page produced." };
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { submission: null, error: "That file does not hold a use case submission." };
  }

  const file = raw as Record<string, unknown>;
  if (file.kind !== SUBMISSION_KIND) {
    return {
      submission: null,
      error:
        file.kind === "structured-sprints/backup"
          ? "That is a programme backup, not a use case submission. Restore it from the People tab instead."
          : file.kind === "structured-sprints/participant"
            ? "That is a participant's share bundle of sprint rows, not a published use case."
            : "That file is not a use case submission.",
    };
  }
  if (file.version !== 1) {
    return { submission: null, error: `This app reads version 1 submissions; that one is version ${String(file.version)}.` };
  }

  const consent = file.consent as PublishedUseCase["consent"] | undefined;
  if (!consent || typeof consent.statement !== "string" || !consent.statement.trim()) {
    return {
      submission: null,
      error: "That submission carries no consent statement, so there is nothing permitting it to be stored.",
    };
  }
  if (typeof consent.agreedAt !== "string" || !consent.agreedAt.trim()) {
    return { submission: null, error: "That submission does not say when its author agreed to it." };
  }

  const cases = file.cases;
  if (!Array.isArray(cases) || cases.length === 0) {
    return { submission: null, error: "That submission holds no cases." };
  }
  for (const item of cases as Partial<UseCaseDraft>[]) {
    if (!item || typeof item.what !== "string") {
      return { submission: null, error: "One of the cases in that file is missing its fields." };
    }
  }

  const programme = (file.programme ?? {}) as PublishedUseCase["programme"];

  return {
    submission: {
      kind: SUBMISSION_KIND,
      version: 1,
      publishedAt: typeof file.publishedAt === "string" ? file.publishedAt : consent.agreedAt,
      // Submissions written before destinations existed were all public ones.
      destination: file.destination === "private-archive" ? "private-archive" : "public",
      consent: {
        statement: consent.statement,
        version: Number(consent.version) || 0,
        agreedAt: consent.agreedAt,
      },
      programme: {
        name: typeof programme.name === "string" ? programme.name : "",
        tagline: typeof programme.tagline === "string" ? programme.tagline : "",
      },
      cases: cases as UseCaseDraft[],
    },
    error: null,
  };
}

/** The submission as frame rows. Ids are minted here; nothing in the file carries one. */
export function rowsFromSubmission(
  submission: PublishedUseCase,
  mintId: () => string,
  at: string,
): CaseRow[] {
  return toRows(submission, () => mintId(), at);
}
