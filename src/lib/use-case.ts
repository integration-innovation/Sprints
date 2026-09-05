/**
 * Publishing a use case, as distinct from keeping a sprint log.
 *
 * The log is the working record: names, projects, evidence links, how long
 * things took. It belongs to the programme and stays in the programme's Google
 * Sheet. A use case is the part worth showing strangers — what someone set out
 * to do, why it mattered, how they did it, and what came of it — and it is
 * published only when a participant chooses to publish it.
 *
 * So this module is deliberately subtractive. `draftUseCase` starts from a log
 * row and drops every field that identifies a person, a client or an internal
 * system; `EXCLUDED` names what it dropped so the interface can show that
 * rather than assert it. The draft is then editable, because no rule catches a
 * client's name inside a sentence somebody typed — only the author can.
 */

export type UseCaseSource = {
  sprintNo: number;
  target: string;
  whyItMatters: string;
  definitionOfDone: string;
  result: string;
  whatChanged: string;
  nextPossibility: string;
  tools: string;
  aiUsedFor: string;
  status: string;
};

export type UseCaseDraft = {
  sprintNo: number;
  /** Who did the work, as they wish to be credited. Blank publishes anonymously. */
  author: string;
  /** Generic and participant-chosen, e.g. "Architect". */
  role: string;
  what: string;
  why: string;
  how: string;
  outcome: string;
  nextStep: string;
  tools: string;
  aiUsedFor: string;
  status: string;
};

/** Log fields that never travel, and the reason each one stays behind. */
export const EXCLUDED: readonly { field: string; reason: string }[] = [
  { field: "Email address", reason: "an author credit is not a contact detail" },
  { field: "Organisation", reason: "identifies an employer, who did not agree to this" },
  { field: "Project name", reason: "often carries a client's name" },
  { field: "Evidence links", reason: "usually point at internal files" },
  { field: "Facilitator notes", reason: "written about people, not for them" },
  { field: "Minutes over or under", reason: "says how fast someone works" },
  { field: "Programme join code", reason: "grants access to the log" },
];

export const DISCLAIMER = [
  "A published use case is public. It sits on a public web page in a public repository, can be " +
    "read by anyone, indexed by search engines, and copied elsewhere.",
  "It is published under your name, as you write it below, and that name is public with " +
    "everything else. Clear the field to publish without a credit.",
  "Publishing cannot be fully undone. Removing it later takes it off the page, but it stays in " +
    "the repository's history and may persist in caches and other people's copies.",
  "Only the fields below are published. Your email, organisation, project name, evidence links, " +
    "facilitator notes and timings are not.",
  "You are responsible for the words themselves. Nothing here can tell that a sentence names a " +
    "client — read the draft and edit anything that should not be public.",
] as const;

export const CONSENT_STATEMENT =
  "I have read the draft below, it contains nothing confidential, and I agree to publish it " +
  "publicly as a use case, credited to the author name shown.";

/** Bumped whenever the disclaimer changes, so a record says what was agreed to. */
export const CONSENT_VERSION = 2;

function joinSentences(parts: (string | undefined)[]): string {
  return parts
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .map((p) => (/[.!?]$/.test(p) ? p : `${p}.`))
    .join(" ");
}

/**
 * A first draft of the public account, built from the log row. Everything here
 * is a starting point for the author to edit, not a finished statement.
 */
export function draftUseCase(
  source: UseCaseSource,
  by: { author: string; role: string },
): UseCaseDraft {
  return {
    sprintNo: source.sprintNo,
    author: by.author.trim(),
    role: by.role.trim(),
    what: source.target.trim(),
    why: source.whyItMatters.trim(),
    how: joinSentences([source.whatChanged, source.definitionOfDone && `Done meant: ${source.definitionOfDone}`]),
    outcome: source.result.trim(),
    nextStep: source.nextPossibility.trim(),
    tools: source.tools.trim(),
    aiUsedFor: source.aiUsedFor.trim(),
    status: source.status.trim(),
  };
}

/** True once a draft says enough to be worth reading. */
export function isPublishable(draft: UseCaseDraft): boolean {
  return draft.what.trim() !== "" && draft.outcome.trim() !== "";
}

export type IdentifierWarning = { kind: "email" | "link" | "long number"; found: string };

/**
 * A blunt check for things that are obviously not for publication. It does not
 * detect names and does not pretend to: it catches the mechanical giveaways and
 * leaves judgement to the author.
 */
export function scanForIdentifiers(text: string): IdentifierWarning[] {
  const out: IdentifierWarning[] = [];
  const seen = new Set<string>();
  const add = (kind: IdentifierWarning["kind"], found: string) => {
    const key = `${kind}:${found}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ kind, found });
  };
  for (const m of text.matchAll(/[\w.+-]+@[\w-]+\.[\w.]+/g)) add("email", m[0]);
  for (const m of text.matchAll(/\b(?:https?:\/\/|www\.)\S+/gi)) add("link", m[0]);
  for (const m of text.matchAll(/\b\d{7,}\b/g)) add("long number", m[0]);
  return out;
}

export type PublishedUseCase = {
  kind: "structured-sprints/use-case";
  version: 1;
  publishedAt: string;
  consent: { statement: string; version: number; agreedAt: string };
  programme: { name: string; tagline: string };
  cases: UseCaseDraft[];
};

export function buildSubmission(input: {
  programmeName: string;
  programmeTagline: string;
  cases: UseCaseDraft[];
  agreedAt: string;
}): PublishedUseCase {
  return {
    kind: "structured-sprints/use-case",
    version: 1,
    publishedAt: input.agreedAt,
    consent: { statement: CONSENT_STATEMENT, version: CONSENT_VERSION, agreedAt: input.agreedAt },
    programme: { name: input.programmeName.trim(), tagline: input.programmeTagline.trim() },
    cases: input.cases,
  };
}

/** The same submission as prose, for a pull request body or an email. */
export function toMarkdown(submission: PublishedUseCase): string {
  const lines: string[] = [`# Use cases — ${submission.programme.name}`];
  if (submission.programme.tagline) lines.push(`_${submission.programme.tagline}_`);
  lines.push("", `Published ${submission.publishedAt}. Consent version ${submission.consent.version}.`);
  for (const c of submission.cases) {
    const by = [c.author, c.role].filter((s) => s.trim()).join(", ");
    lines.push("", `## Sprint ${String(c.sprintNo).padStart(2, "0")}${by ? ` · ${by}` : ""}`);
    if (c.what) lines.push("", `**What** ${c.what}`);
    if (c.why) lines.push("", `**Why** ${c.why}`);
    if (c.how) lines.push("", `**How** ${c.how}`);
    if (c.outcome) lines.push("", `**Outcome** ${c.outcome}`);
    if (c.nextStep) lines.push("", `**Next** ${c.nextStep}`);
    const meta = [c.tools && `Tools: ${c.tools}`, c.aiUsedFor && `AI used for: ${c.aiUsedFor}`, c.status && `Status: ${c.status}`]
      .filter(Boolean)
      .join(" · ");
    if (meta) lines.push("", meta);
  }
  return lines.join("\n");
}
