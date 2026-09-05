import assert from "node:assert/strict";
import test from "node:test";
import { buildArchiveFiles, CASES_CSV, CASES_JSONL, CASES_TSV, NOTICE, README } from "./archive.ts";
import { toRows, type CaseRow } from "./case-frame.ts";
import { buildNotice } from "./notice.ts";
import { assertConfig, parseRepoRef, GitHubError, type ArchiveConfig } from "./github.ts";
import { readSubmissionFile, rowsFromSubmission } from "./case-intake.ts";
import { buildSubmission, consentStatement, type UseCaseDraft } from "./use-case.ts";

function draft(over: Partial<UseCaseDraft> = {}): UseCaseDraft {
  return {
    sprintNo: 1,
    author: "Mei Lin",
    role: "Architect",
    what: "Cut the door schedule down to one sheet",
    why: "The contractor kept working from the wrong revision",
    how: "Wrote a script over the export",
    outcome: "One sheet, generated",
    nextStep: "Windows next",
    tools: "Revit",
    aiUsedFor: "Writing code",
    status: "Complete",
    ...over,
  };
}

function rows(destination: "private-archive" | "public", over: Partial<UseCaseDraft> = {}): CaseRow[] {
  let n = 0;
  return toRows(
    buildSubmission({
      programmeName: "Sprints 2026",
      programmeTagline: "One hour, one outcome",
      cases: [draft(over)],
      agreedAt: "2026-09-05T10:00:00.000Z",
      destination,
    }),
    () => `case-${++n}`,
    "2026-09-05T10:01:00.000Z",
  );
}

const META = {
  programme: "Sprints 2026",
  custodian: "Integration & Innovation",
  contact: "the facilitator",
  generatedAt: "2026-09-05T10:02:00.000Z",
};

// --- the folder --------------------------------------------------------------

test("an archive is five files, and the record is one of them", () => {
  const files = buildArchiveFiles(rows("private-archive"), META);
  assert.deepEqual(files.map((f) => f.name), [CASES_JSONL, CASES_CSV, CASES_TSV, README, NOTICE]);
});

test("the README points at the notice before the data", () => {
  const files = buildArchiveFiles(rows("private-archive"), META);
  const readme = files.find((f) => f.name === README)?.contents ?? "";
  assert.ok(readme.indexOf("NOTICE.md") < readme.indexOf(CASES_CSV));
  assert.match(readme, /regenerated on every push/);
});

// --- the notice --------------------------------------------------------------

test("the notice counts the rows it is actually sitting next to", () => {
  const notice = buildNotice(rows("private-archive"), META);
  assert.match(notice, /\*\*private-archive\*\* — 1\./);
  assert.match(notice, /\*\*public\*\* — 0\./);
});

test("a notice over private-only rows does not claim anything may be published", () => {
  const notice = buildNotice(rows("private-archive"), META);
  assert.match(notice, /No row here has been agreed for publication/);
  assert.ok(!/Filter on `destination` before anything leaves/.test(notice));
});

test("a notice over a mixed archive tells the reader to filter", () => {
  const notice = buildNotice([...rows("private-archive"), ...rows("public", { sprintNo: 2 })], META);
  assert.match(notice, /Filter on `destination` before anything leaves/);
});

test("the notice covers copyright, trade marks, personal data and withdrawal", () => {
  const notice = buildNotice(rows("private-archive"), META);
  for (const heading of ["## Copyright and licence", "## Names that are not the authors'", "## Personal data", "## Withdrawal"]) {
    assert.ok(notice.includes(heading), `missing ${heading}`);
  }
  assert.match(notice, /Authors keep the copyright in their own words/);
  assert.match(notice, /trade marks/);
  assert.match(notice, /No affiliation, sponsorship or endorsement/);
  assert.match(notice, /not legal advice/);
});

test("the notice names the custodian and the route to withdraw", () => {
  const notice = buildNotice(rows("private-archive"), META);
  assert.match(notice, /Integration & Innovation/);
  assert.match(notice, /the facilitator/);
});

test("the notice does not promise an erasure git cannot deliver", () => {
  const notice = buildNotice(rows("private-archive"), META);
  assert.match(notice, /earlier commits still contain what was written/i);
});

test("an anonymous archive does not report credited authors", () => {
  const notice = buildNotice(rows("private-archive", { author: "" }), META);
  assert.match(notice, /0 rows are credited/);
  assert.match(notice, /1 row carries no name/);
});

// --- github config -----------------------------------------------------------

const CONFIG: ArchiveConfig = { owner: "a-user", repo: "sprint-cases", branch: "main", dir: "use-cases", token: "t" };

test("a repository reference is taken in any of the three shapes people paste", () => {
  const expected = { owner: "a-user", repo: "sprint-cases" };
  assert.deepEqual(parseRepoRef("a-user/sprint-cases"), expected);
  assert.deepEqual(parseRepoRef("https://github.com/a-user/sprint-cases"), expected);
  assert.deepEqual(parseRepoRef("git@github.com:a-user/sprint-cases.git"), expected);
  assert.equal(parseRepoRef("just some words"), null);
});

test("a folder that climbs out of the repository is refused", () => {
  assert.throws(() => assertConfig({ ...CONFIG, dir: "../elsewhere" }), GitHubError);
  assert.throws(() => assertConfig({ ...CONFIG, dir: "/absolute" }), GitHubError);
  assert.doesNotThrow(() => assertConfig({ ...CONFIG, dir: "" }));
});

test("a missing token is refused before any request is made", () => {
  assert.throws(() => assertConfig({ ...CONFIG, token: "  " }), /token is needed/);
});

// --- intake ------------------------------------------------------------------

test("a submission without a consent statement is refused, not imported", () => {
  const file = JSON.stringify({
    kind: "structured-sprints/use-case",
    version: 1,
    cases: [draft()],
    programme: { name: "x", tagline: "" },
  });
  const result = readSubmissionFile(file);
  assert.equal(result.submission, null);
  assert.match(result.error ?? "", /no consent statement/);
});

test("a backup offered as a submission is named, not just rejected", () => {
  const result = readSubmissionFile(JSON.stringify({ kind: "structured-sprints/backup", version: 1 }));
  assert.match(result.error ?? "", /programme backup/);
});

test("a valid submission comes back with its consent intact and fresh ids", () => {
  const file = JSON.stringify(
    buildSubmission({
      programmeName: "Sprints 2026",
      programmeTagline: "",
      cases: [draft()],
      agreedAt: "2026-09-05T10:00:00.000Z",
      destination: "private-archive",
    }),
  );
  const { submission, error } = readSubmissionFile(file);
  assert.equal(error, null);
  assert.equal(submission?.consent.statement, consentStatement(true, "private-archive"));

  let n = 0;
  const built = rowsFromSubmission(submission!, () => `id-${++n}`, "2026-09-05T11:00:00.000Z");
  assert.equal(built.length, 1);
  assert.equal(built[0].case_id, "id-1");
  assert.equal(built[0].destination, "private-archive");
});
