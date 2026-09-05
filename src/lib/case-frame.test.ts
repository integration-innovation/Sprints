import assert from "node:assert/strict";
import test from "node:test";
import {
  COLUMNS,
  frameCsv,
  frameJsonl,
  frameTsv,
  mergeRows,
  parseFrameJsonl,
  publishable,
  toRows,
  withdraw,
  type CaseRow,
} from "./case-frame.ts";
import { buildSubmission, type UseCaseDraft } from "./use-case.ts";

function draft(over: Partial<UseCaseDraft> = {}): UseCaseDraft {
  return {
    sprintNo: 1,
    author: "Mei Lin",
    role: "Architect",
    what: "Cut the door schedule down to one sheet",
    why: "The contractor kept working from the wrong revision",
    how: "Wrote a script over the export, then checked it by hand",
    outcome: "One sheet, generated, matching the model",
    nextStep: "Do the same for windows",
    tools: "Revit; Claude",
    aiUsedFor: "Writing code",
    status: "Complete",
    ...over,
  };
}

function submission(cases: UseCaseDraft[], destination?: "private-archive" | "public") {
  return buildSubmission({
    programmeName: "Sprints 2026",
    programmeTagline: "One hour, one outcome",
    cases,
    agreedAt: "2026-09-05T10:00:00.000Z",
    destination,
  });
}

let counter = 0;
const ids = () => `case-${++counter}`;

test("a row carries the sentence its author agreed to, not just a version number", () => {
  const [row] = toRows(submission([draft()], "private-archive"), ids, "2026-09-05T10:01:00.000Z");
  assert.match(row.consent_statement, /private archive/);
  assert.equal(row.consented_at, "2026-09-05T10:00:00.000Z");
  assert.equal(row.destination, "private-archive");
  assert.ok(row.consent_version > 0);
});

test("a submission with no destination is treated as the public one it was", () => {
  const legacy = { ...submission([draft()]), destination: undefined };
  const [row] = toRows(legacy, ids, "2026-09-05T10:01:00.000Z");
  assert.equal(row.destination, "public");
});

test("an anonymous case carries no name and nothing derived from one", () => {
  const [row] = toRows(submission([draft({ author: "  " })], "public"), ids, "now");
  assert.equal(row.author_mode, "anonymous");
  assert.equal(row.author, "");
  const serialised = JSON.stringify(row);
  assert.ok(!serialised.includes("Mei Lin"));
});

test("what, why, how and who all reach the frame", () => {
  const [row] = toRows(submission([draft()], "public"), ids, "now");
  assert.equal(row.what, "Cut the door schedule down to one sheet");
  assert.match(row.why, /wrong revision/);
  assert.match(row.how, /checked it by hand/);
  assert.equal(row.author, "Mei Lin");
  assert.equal(row.author_role, "Architect");
});

test("a draft's category reaches the frame, and a legacy row without one reads as blank", () => {
  const [row] = toRows(submission([draft({ category: "Plugin" })], "public"), ids, "now");
  assert.equal(row.category, "Plugin");
  const legacy = parseFrameJsonl(JSON.stringify({ case_id: "old", what: "x" }));
  assert.equal(legacy.rows[0].category, "");
});

test("the column list and a serialised row agree, so nothing is silently dropped", () => {
  const [row] = toRows(submission([draft()], "public"), ids, "now");
  assert.deepEqual(Object.keys(row).sort(), COLUMNS.map((c) => c.name).sort());
});

test("withdrawing empties the words and keeps the id", () => {
  const [row] = toRows(submission([draft()], "private-archive"), ids, "now");
  const gone = withdraw(row, "2026-09-06T09:00:00.000Z");
  assert.equal(gone.case_id, row.case_id);
  assert.equal(gone.record_status, "withdrawn");
  assert.equal(gone.what, "");
  assert.equal(gone.author, "");
  assert.equal(gone.author_mode, "anonymous");
  // The consent record survives, so the row still says what it was standing on.
  assert.equal(gone.consent_statement, row.consent_statement);
});

test("merging keeps the newer row per case_id", () => {
  const [first] = toRows(submission([draft({ outcome: "First telling" })], "public"), () => "fixed", "2026-09-05T10:00:00.000Z");
  const [second] = toRows(submission([draft({ outcome: "Better telling" })], "public"), () => "fixed", "2026-09-06T10:00:00.000Z");
  const merged = mergeRows([first], [second]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].outcome, "Better telling");
});

test("a withdrawal cannot be undone by a device with a stale clock", () => {
  const [row] = toRows(submission([draft()], "public"), () => "fixed", "2026-09-05T10:00:00.000Z");
  const gone = withdraw(row, "2026-09-06T10:00:00.000Z");
  // The stale row claims to be newer than the withdrawal and still must not win.
  const stale: CaseRow = { ...row, recorded_at: "2026-09-07T10:00:00.000Z" };
  const merged = mergeRows([gone], [stale]);
  assert.equal(merged[0].record_status, "withdrawn");
  assert.equal(merged[0].what, "");
});

test("only rows consented to publicly are publishable", () => {
  const rows = [
    ...toRows(submission([draft()], "private-archive"), ids, "now"),
    ...toRows(submission([draft({ sprintNo: 2 })], "public"), ids, "now"),
  ];
  const out = publishable(rows);
  assert.equal(out.length, 1);
  assert.equal(out[0].destination, "public");
});

test("a withdrawn public row is not publishable either", () => {
  const [row] = toRows(submission([draft()], "public"), ids, "now");
  assert.equal(publishable([withdraw(row, "later")]).length, 0);
});

test("JSONL round-trips exactly, newlines included", () => {
  const [row] = toRows(submission([draft({ how: "First line\nSecond line" })], "public"), ids, "now");
  const { rows, skipped } = parseFrameJsonl(frameJsonl([row]));
  assert.equal(skipped, 0);
  assert.deepEqual(rows[0], row);
  assert.equal(rows[0].how, "First line\nSecond line");
});

test("one broken line costs one row, not the archive", () => {
  const [row] = toRows(submission([draft()], "public"), ids, "now");
  const text = `${frameJsonl([row])}{"not json\n{"case_id":""}\n`;
  const { rows, skipped } = parseFrameJsonl(text);
  assert.equal(rows.length, 1);
  assert.equal(skipped, 2);
});

test("a hand-edited row claiming anonymity while carrying a name is repaired", () => {
  const parsed = parseFrameJsonl(
    JSON.stringify({ case_id: "x", author_mode: "anonymous", author: "Mei Lin" }),
  );
  assert.equal(parsed.rows[0].author, "");
});

test("CSV quotes a comma and a newline rather than tearing the row apart", () => {
  const [row] = toRows(submission([draft({ what: 'A "big" one, split\nover lines' })], "public"), ids, "now");
  const csv = frameCsv([row]);
  assert.ok(csv.includes('"A ""big"" one, split\nover lines"'));
  assert.ok(csv.startsWith("﻿"), "a BOM, so Excel reads UTF-8");
});

test("TSV flattens newlines, because a spreadsheet paste splits on them", () => {
  const [row] = toRows(submission([draft({ how: "First\nSecond" })], "public"), ids, "now");
  const lines = frameTsv([row]).split("\n");
  assert.equal(lines.length, 2, "header and one row, whatever the prose did");
  assert.ok(lines[1].includes("First · Second"));
  assert.equal(lines[0].split("\t").length, COLUMNS.length);
  assert.equal(lines[1].split("\t").length, COLUMNS.length);
});

test("an empty frame is still a readable file with headings", () => {
  assert.equal(frameJsonl([]), "");
  assert.equal(frameCsv([]).trim().split(",").length, COLUMNS.length);
  assert.equal(frameTsv([]).split("\t").length, COLUMNS.length);
});
