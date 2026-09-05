/**
 * The notice that travels with the data.
 *
 * A frame of use cases is other people's words about their own work, some of
 * them named. That raises four separate questions — who agreed to what, who owns
 * the words, whose trade marks are named in them, and how someone takes theirs
 * back — and a dataset that answers none of them puts the burden on whoever
 * finds it next.
 *
 * So the notice is generated from the frame rather than written once and left
 * to rot: it counts the rows, states the destinations actually present, and
 * lists the consent versions actually in force. A notice that says "all cases
 * are private" while a public row sits three lines below it is worse than none.
 *
 * This is a careful default, not legal advice, and it says so at the bottom.
 * A programme running in a regulated setting should have a lawyer read it.
 */

import type { CaseRow } from "./case-frame.ts";

export type NoticeMeta = {
  /** Programme the cases came from. */
  programme: string;
  /** Who holds this archive and answers for it — a name or a team, not an individual's email. */
  custodian: string;
  /** Where a person goes to ask a question or withdraw. */
  contact: string;
  /** Generated for the header, so a stale copy is visibly stale. */
  generatedAt: string;
};

function countBy<T extends string>(rows: readonly CaseRow[], pick: (row: CaseRow) => T): Map<T, number> {
  const out = new Map<T, number>();
  for (const row of rows) out.set(pick(row), (out.get(pick(row)) ?? 0) + 1);
  return out;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * NOTICE.md, written beside the data.
 *
 * Everything here is either a statement of fact about the rows or a term the
 * custodian is committing to. Nothing is aspirational, and nothing describes a
 * safeguard the code does not actually implement.
 */
export function buildNotice(rows: readonly CaseRow[], meta: NoticeMeta): string {
  const active = rows.filter((r) => r.record_status === "active");
  const withdrawn = rows.length - active.length;
  const byDestination = countBy(active, (r) => r.destination);
  const credited = active.filter((r) => r.author_mode === "credited").length;
  const anonymous = active.length - credited;
  const versions = [...new Set(rows.map((r) => r.consent_version))].sort((a, b) => a - b);
  const hasPublic = (byDestination.get("public") ?? 0) > 0;

  const lines: string[] = [
    `# Notice — use case archive, ${meta.programme}`,
    "",
    `Generated ${meta.generatedAt}. Held by ${meta.custodian}. Questions and withdrawals: ${meta.contact}.`,
    "",
    "This file is generated from the data beside it. If you edit the data by hand, regenerate this",
    "or it will describe an archive that no longer exists.",
    "",
    "## What this is",
    "",
    `${plural(active.length, "account", "accounts")} written by participants in a Structured Sprints`,
    "programme, each describing one hour of their own work: what they set out to do, why it mattered,",
    "how they did it, and what came of it. Each was written by the person who did the work and",
    "published by them on purpose.",
    "",
    "It is not the programme's sprint log. Names of clients and employers, email addresses, project",
    "names, evidence links, facilitator notes and timings are excluded by construction — they are",
    "not columns in this table.",
    "",
    "## Consent",
    "",
    "Every row carries the sentence its author agreed to, in `consent_statement`, with the version",
    "in `consent_version` and the moment in `consented_at`. That sentence, not this file, is the",
    "row's authority to exist. Where they disagree, the row wins.",
    "",
    `Consent ${versions.length === 1 ? "version" : "versions"} present: ${versions.join(", ") || "none"}.`,
    "",
    "`destination` records what each author agreed to:",
    "",
    `- **private-archive** — ${byDestination.get("private-archive") ?? 0}. Permission to keep, not permission to publish.`,
    `- **public** — ${byDestination.get("public") ?? 0}. Agreed for a public page.`,
    "",
    hasPublic
      ? "Both are present. Filter on `destination` before anything leaves this repository."
      : "No row here has been agreed for publication. Publishing any of it means asking its author again,",
    hasPublic ? "" : "against the public wording, and recording a new consent.",
    "",
    "## Attribution",
    "",
    `${plural(credited, "row is", "rows are")} credited to a named author; ${plural(anonymous, "row carries", "rows carry")} no name.`,
    "",
    "Anonymity here is structural, not a display setting. An anonymous row holds no name, no",
    "participant identifier, and no key derived from one — `case_id` comes from a random draw or",
    "from the case's own text, never from who wrote it. There is nothing in the table to join back",
    "to a person. Do not add one: with a handful of participants, a stable per-person key is a name,",
    "however it is hashed.",
    "",
    "Credited authors are named because they asked to be. Their names are personal data; see below.",
    "",
    "## Copyright and licence",
    "",
    "**Authors keep the copyright in their own words.** Contributing a use case grants",
    `${meta.custodian} a non-exclusive licence to store it, and to use it within the programme, for`,
    "the destination the author agreed to and no further.",
    "",
    "**The compilation is separate from its contents.** Whatever rights exist in the selection and",
    `arrangement of this table belong to ${meta.custodian}; the rights in each account belong to its`,
    "author. Neither carries the other.",
    "",
    "**No licence is granted to anyone else by this file.** Access to the repository is not a licence",
    "to republish. If you have been given a copy and want to use it outside the programme, ask.",
    "",
    "## Names that are not the authors'",
    "",
    "Accounts mention the tools people used. Product, company and service names are the trade marks",
    "of their respective owners and appear here descriptively — to say truthfully what somebody used",
    "on a Tuesday afternoon. No affiliation, sponsorship or endorsement is claimed or implied, in",
    "either direction.",
    "",
    "This archive holds text only. No logos, screenshots, extracts of documentation, code from",
    "third-party projects, or copies of anyone's interface are stored here, which is the simplest way",
    "to keep a fair-dealing argument from ever being needed.",
    "",
    "Authors write about their own work. They do not speak for their employers or their clients, and",
    "nothing here should be read as a statement by any organisation an author happens to work for.",
    "",
    "## Written with AI assistance",
    "",
    "These are accounts of hours in which AI tools were used, and some of the text was drafted with",
    "AI help and then edited by the author — `ai_used_for` says what the tool was used for in the",
    "work itself. Treat the accounts as first-person recollection, not verified fact: nothing here",
    "has been independently checked, benchmarked, or reproduced.",
    "",
    "## No warranty",
    "",
    "Provided as-is, for the programme's own learning. Nothing here is professional, legal,",
    "engineering or financial advice, and no one should rely on it to make a decision that matters.",
    "",
    "## Personal data",
    "",
    "For rows where `author_mode` is `credited`, this archive holds a name and a self-chosen role.",
    "That is personal data.",
    "",
    "- **Why it is held:** the author asked to be credited for their own work.",
    "- **Basis:** their consent, recorded per row, and withdrawable.",
    `- **Who can see it:** people with access to this repository, controlled by ${meta.custodian}.`,
    "- **How long:** while the programme keeps its record, or until the author withdraws.",
    "- **Not held here:** email addresses, employers, job titles as given by an employer, and",
    "  anything else from the sprint log. Those stay in the programme's own record.",
    "",
    "An author may ask to see what is held about them, correct it, be de-credited while their",
    `account stays, or withdraw the account entirely. Ask ${meta.contact}.`,
    "",
    "## Withdrawal",
    "",
    "Withdrawing sets `record_status` to `withdrawn` and empties every field the author wrote. The",
    "row and its `case_id` remain so the id can never be reissued to something else.",
    "",
    withdrawn > 0
      ? `${plural(withdrawn, "row has", "rows have")} been withdrawn.`
      : "No row has been withdrawn.",
    "",
    "Be straight about the limit: earlier commits still contain what was written. A genuine erasure",
    "means rewriting this repository's history, which is possible here because it is private and few",
    "people hold clones — and is exactly what is not possible once something has been public. That",
    "asymmetry is the reason the two consent sentences are different sentences.",
    "",
    "## About this notice",
    "",
    "A careful default, written to be read by the people in the programme. It is not legal advice",
    "and has not been reviewed by a lawyer. A programme running under a client contract, a research",
    "ethics approval, or a regulator should have someone qualified read it against those obligations",
    "before the first row is added.",
  ];

  return lines.filter((line, i, all) => !(line === "" && all[i - 1] === "")).join("\n") + "\n";
}
