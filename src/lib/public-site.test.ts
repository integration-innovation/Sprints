import assert from "node:assert/strict";
import test from "node:test";
import { buildPublicFile, readPublicFile, serialisePublicFile } from "./public-site.ts";
import { toRows, withdraw, type CaseRow } from "./case-frame.ts";
import { buildSubmission, type UseCaseDraft } from "./use-case.ts";

function draft(over: Partial<UseCaseDraft> = {}): UseCaseDraft {
  return {
    sprintNo: 1,
    author: "Mei Lin",
    role: "Architect",
    what: "Cut the door schedule to one generated sheet",
    why: "The contractor kept building from the wrong revision",
    how: "Wrote a script over the model export",
    outcome: "One sheet, generated",
    nextStep: "Windows next",
    tools: "Revit",
    aiUsedFor: "Writing code",
    status: "Complete",
    ...over,
  };
}

let n = 0;
function rows(
  destination: "private-archive" | "public",
  over: Partial<UseCaseDraft> = {},
  agreedAt = "2026-09-05T10:00:00.000Z",
): CaseRow[] {
  return toRows(
    buildSubmission({
      programmeName: "Sprints 2026",
      programmeTagline: "",
      cases: [draft(over)],
      agreedAt,
      destination,
    }),
    () => `case-${++n}`,
    agreedAt,
  );
}

test("a private-archive row never reaches the public file", () => {
  const file = buildPublicFile(rows("private-archive"), "now");
  assert.equal(file.cases.length, 0);
});

test("a withdrawn public row never reaches the public file", () => {
  const [row] = rows("public");
  const file = buildPublicFile([withdraw(row, "later")], "now");
  assert.equal(file.cases.length, 0);
});

test("a public row publishes what, why, how and who", () => {
  const file = buildPublicFile(rows("public"), "now");
  const [c] = file.cases;
  assert.equal(c.what, "Cut the door schedule to one generated sheet");
  assert.match(c.why, /wrong revision/);
  assert.match(c.how, /model export/);
  assert.equal(c.outcome, "One sheet, generated");
  assert.equal(c.author, "Mei Lin");
  assert.equal(c.role, "Architect");
});

test("an anonymous author has no name key at all, not an empty one", () => {
  const file = buildPublicFile(rows("public", { author: "" }), "now");
  const [c] = file.cases;
  assert.equal("author" in c, false);
  assert.equal(c.role, "Architect");
  assert.ok(!serialisePublicFile(file).includes("Mei Lin"));
});

test("a hand-edited archive cannot leak a name through the public file", () => {
  const [row] = rows("public");
  // author_mode says anonymous while the name is still sitting in the row.
  const tampered: CaseRow = { ...row, author_mode: "anonymous" };
  const file = buildPublicFile([tampered], "now");
  assert.equal("author" in file.cases[0], false);
  assert.ok(!serialisePublicFile(file).includes("Mei Lin"));
});

test("the consent statement stays out of the public file; its version does not", () => {
  const file = buildPublicFile(rows("public"), "now");
  const text = serialisePublicFile(file);
  assert.ok(!text.includes("I have read the draft"));
  assert.ok(file.cases[0].consentVersion > 0);
});

test("the newest case is listed first", () => {
  const older = rows("public", { sprintNo: 1 }, "2026-01-01T00:00:00.000Z");
  const newer = rows("public", { sprintNo: 4 }, "2026-06-01T00:00:00.000Z");
  const file = buildPublicFile([...older, ...newer], "now");
  assert.deepEqual(file.cases.map((c) => c.sprintNo), [4, 1]);
});

test("the file says what it is and how it was made", () => {
  const file = buildPublicFile(rows("public"), "2026-09-05T12:00:00.000Z");
  assert.equal(file.kind, "structured-sprints/use-cases");
  assert.equal(file.generatedAt, "2026-09-05T12:00:00.000Z");
  assert.match(file.note, /do not edit by hand/i);
});

test("the page reads the file it was given back", () => {
  const file = buildPublicFile(rows("public"), "now");
  const parsed = readPublicFile(JSON.parse(serialisePublicFile(file)));
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].what, file.cases[0].what);
  assert.equal(parsed[0].author, "Mei Lin");
});

test("a version 1 file still renders, so a cached copy is not an error page", () => {
  const legacy = {
    kind: "structured-sprints/use-cases",
    version: 1,
    cases: [{ sprintNo: 2, author: "", role: "Engineer", what: "A stale-drawing check", why: "", how: "", outcome: "Caught two", nextStep: "", tools: "Excel", aiUsedFor: "", status: "Partial" }],
  };
  const [c] = readPublicFile(legacy);
  assert.equal(c.what, "A stale-drawing check");
  assert.equal("author" in c, false, "a blank legacy name still means anonymous");
  assert.equal(c.role, "Engineer");
});

test("a file with no cases, or nonsense in place of one, yields nothing rather than throwing", () => {
  assert.deepEqual(readPublicFile({}), []);
  assert.deepEqual(readPublicFile(null), []);
  assert.deepEqual(readPublicFile({ cases: "not a list" }), []);
  assert.equal(readPublicFile({ cases: [null] }).length, 1);
});
