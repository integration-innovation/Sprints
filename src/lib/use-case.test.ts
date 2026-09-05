import assert from "node:assert/strict";
import test from "node:test";
import {
  CONSENT_STATEMENT,
  DISCLAIMER,
  buildSubmission,
  draftUseCase,
  isPublishable,
  scanForIdentifiers,
  toMarkdown,
  type UseCaseSource,
} from "./use-case.ts";

const ROW: UseCaseSource = {
  sprintNo: 3,
  target: "Screen one project for accessibility triggers",
  whyItMatters: "Retrofitting an accessible toilet late is the expensive way to find out",
  definitionOfDone: "A verdict with the gate that decided it",
  result: "The tool returns a verdict and shows which gate decided it",
  whatChanged: "Reporting every failing gate beat reporting only the first",
  nextPossibility: "Read dimensions out of the model",
  tools: "Claude Code; VS Code",
  aiUsedFor: "Coding; Testing",
  status: "Complete",
};

test("a draft carries what, why, how and the outcome", () => {
  const d = draftUseCase(ROW, "Architect");
  assert.equal(d.role, "Architect");
  assert.equal(d.what, ROW.target);
  assert.equal(d.why, ROW.whyItMatters);
  assert.equal(d.outcome, ROW.result);
  assert.equal(d.nextStep, ROW.nextPossibility);
  assert.match(d.how, /Reporting every failing gate/);
  assert.match(d.how, /Done meant: A verdict with the gate that decided it/);
});

test("identifying fields cannot reach a draft even when the row carries them", () => {
  // A wider row than the type admits: the draft is built by naming what goes in,
  // so anything not named is structurally incapable of travelling.
  const wide = {
    ...ROW,
    participantName: "Jane Tan",
    email: "jane.tan@example.com",
    organisation: "Example Architects LLP",
    projectName: "Marina Client Tower",
    evidence: "https://intranet.example.com/doc/1234567",
    facilitatorNotes: "Struggled with the brief",
    minutesDelta: 25,
  } as UseCaseSource;

  const json = JSON.stringify(draftUseCase(wide, "Architect"));
  for (const leak of [
    "Jane Tan", "jane.tan@example.com", "Example Architects LLP",
    "Marina Client Tower", "intranet.example.com", "Struggled with the brief", "25",
  ]) {
    assert.ok(!json.includes(leak), `draft leaked ${leak}`);
  }
});

test("a draft needs both an attempt and an outcome to be worth publishing", () => {
  assert.equal(isPublishable(draftUseCase(ROW, "Architect")), true);
  assert.equal(isPublishable(draftUseCase({ ...ROW, result: "" }, "Architect")), false);
  assert.equal(isPublishable(draftUseCase({ ...ROW, target: "  " }, "Architect")), false);
});

test("the scan catches mechanical giveaways in text the author typed", () => {
  const found = scanForIdentifiers(
    "Ask jane.tan@example.com or see https://intranet.example.com/doc, ref 12345678.",
  );
  assert.deepEqual(found.map((f) => f.kind), ["email", "link", "long number"]);
  assert.equal(found[0].found, "jane.tan@example.com");
});

test("the scan does not invent problems in ordinary prose", () => {
  assert.deepEqual(scanForIdentifiers("We screened a 1,460 m2 A&A against the 500 m2 threshold."), []);
  assert.deepEqual(scanForIdentifiers(""), []);
});

test("repeats are reported once", () => {
  const found = scanForIdentifiers("a@b.com and a@b.com again");
  assert.equal(found.length, 1);
});

test("a submission records what was agreed and when", () => {
  const s = buildSubmission({
    programmeName: "Architects AI Sprints",
    programmeTagline: "Six hours, six working things",
    cases: [draftUseCase(ROW, "Architect")],
    agreedAt: "2026-09-05T10:00:00.000Z",
  });
  assert.equal(s.kind, "structured-sprints/use-case");
  assert.equal(s.consent.statement, CONSENT_STATEMENT);
  assert.equal(s.consent.agreedAt, "2026-09-05T10:00:00.000Z");
  assert.equal(s.consent.version, 1);
  assert.equal(s.cases.length, 1);
});

test("the disclaimer states the three things a person needs before agreeing", () => {
  const all = DISCLAIMER.join(" ");
  assert.match(all, /public/i);
  assert.match(all, /cannot be fully undone/i);
  assert.match(all, /not published|are not published|are not\./i);
  assert.match(CONSENT_STATEMENT, /I have read the draft/);
});

test("markdown renders the case and omits what was left empty", () => {
  const md = toMarkdown(buildSubmission({
    programmeName: "Architects AI Sprints",
    programmeTagline: "",
    cases: [draftUseCase({ ...ROW, nextPossibility: "", whyItMatters: "" }, "")],
    agreedAt: "2026-09-05T10:00:00.000Z",
  }));
  assert.match(md, /## Sprint 03/);
  assert.match(md, /\*\*What\*\* Screen one project/);
  assert.match(md, /\*\*Outcome\*\*/);
  assert.ok(!md.includes("**Next**"), "empty next step should not render");
  assert.ok(!md.includes("**Why**"), "empty why should not render");
  assert.match(md, /Tools: Claude Code; VS Code · AI used for: Coding; Testing · Status: Complete/);
});
