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

/**
 * Where a use case is going. This is a consent concept before it is a storage
 * one: the two destinations differ in who can read the words, whether the
 * author can change their mind afterwards, and therefore in what can honestly
 * be asked of them.
 */
export type Destination = "private-archive" | "public";

export const DISCLAIMER = [
  "A published use case is public. It sits on a public web page in a public repository, can be " +
    "read by anyone, indexed by search engines, and copied elsewhere.",
  "Attribution is yours to choose. Credited, your name is public with everything else; " +
    "anonymous, no name is attached and none is recorded.",
  "Publishing cannot be fully undone. Removing it later takes it off the page, but it stays in " +
    "the repository's history and may persist in caches and other people's copies.",
  "Only the fields below are published. Your email, organisation, project name, evidence links, " +
    "facilitator notes and timings are not.",
  "You are responsible for the words themselves. Nothing here can tell that a sentence names a " +
    "client — read the draft and edit anything that should not be public.",
] as const;

/**
 * The same five points, told truthfully about a private archive.
 *
 * Two of them genuinely change. A private repository is not indexed and not
 * readable by strangers, so promising that it is would be scaremongering; and
 * withdrawal actually works there, which is the one real advantage the private
 * destination has and the reason it is worth offering. The other three hold
 * either way, because a small readership is still a readership.
 */
export const PRIVATE_DISCLAIMER = [
  "This goes to a private repository, not a public page. Only people with access to that " +
    "repository can read it — but that is an access list somebody else controls, and it can grow.",
  "Attribution is yours to choose. Credited, your name is stored with your words; anonymous, no " +
    "name is attached and none is recorded.",
  "This is not permission to publish. Nothing here goes on a public page unless you are asked " +
    "again and agree again, to a different sentence.",
  "Only the fields below are stored. Your email, organisation, project name, evidence links, " +
    "facilitator notes and timings are not.",
  "You can withdraw it. Ask, and the row is emptied — which is possible here precisely because " +
    "it was never made public. Old commits still hold what was written, so the archive's history " +
    "may need rewriting for a full erasure.",
] as const;

export function disclaimersFor(destination: Destination): readonly string[] {
  return destination === "public" ? DISCLAIMER : PRIVATE_DISCLAIMER;
}

/**
 * What the participant agrees to, in the four forms it can take.
 *
 * Two independent choices, so four sentences rather than one with holes cut in
 * it. Attribution is a choice: asking someone publishing anonymously to agree
 * they are "credited to the author name shown" would record an agreement they
 * never gave. Destination is the same problem one level up — an author who
 * agreed to a private archive has not agreed to a public page, and a sentence
 * vague enough to cover both would be a sentence that covers neither.
 */
export function consentStatement(credited: boolean, destination: Destination = "public"): string {
  const opening = "I have read the draft below, it contains nothing confidential, and I agree to ";
  if (destination === "public") {
    return credited
      ? `${opening}publish it publicly as a use case, credited to the author name shown.`
      : `${opening}publish it publicly as a use case, with no name attached to it.`;
  }
  return credited
    ? `${opening}store it as a use case in the programme's private archive, credited to the author ` +
        "name shown, on the understanding that publishing it publicly would need my agreement again."
    : `${opening}store it as a use case in the programme's private archive, with no name attached ` +
        "to it, on the understanding that publishing it publicly would need my agreement again.";
}

/** Bumped whenever the wording changes, so a record says what was agreed to. */
export const CONSENT_VERSION = 4;

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
  /** Absent on submissions made before destinations existed; those were all public. */
  destination?: Destination;
  consent: { statement: string; version: number; agreedAt: string };
  programme: { name: string; tagline: string };
  cases: UseCaseDraft[];
};

export function buildSubmission(input: {
  programmeName: string;
  programmeTagline: string;
  cases: UseCaseDraft[];
  agreedAt: string;
  destination?: Destination;
}): PublishedUseCase {
  const credited = input.cases.some((c) => c.author.trim() !== "");
  const destination = input.destination ?? "public";
  return {
    kind: "structured-sprints/use-case",
    version: 1,
    publishedAt: input.agreedAt,
    destination,
    consent: {
      statement: consentStatement(credited, destination),
      version: CONSENT_VERSION,
      agreedAt: input.agreedAt,
    },
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
