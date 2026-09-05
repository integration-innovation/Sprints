import assert from "node:assert/strict";
import test from "node:test";
import {
  AI_UPDATE_FIELDS,
  buildUpdatePrompt,
  defaultSelection,
  parseUpdate,
  proposeChanges,
  type UpdateVocabulary,
} from "./ai-update.ts";

const VOCAB: UpdateVocabulary = {
  status: ["Not started", "In progress", "Complete", "Partial", "Blocked", "Deferred", "Absent"],
  stage: ["Idea", "Prototype", "Working system", "Production system", "Maintenance"],
  ai_use: ["Research", "Planning", "Coding", "Debugging", "Refactoring", "Testing", "Documentation"],
};

const parse = (t: string) => parseUpdate(t, VOCAB);
const wrap = (o: unknown) => "```json\n" + JSON.stringify(o) + "\n```";

test("the prompt names every field the log can take", () => {
  const p = buildUpdatePrompt({ sprintNo: 7, date: "5 September 2026", vocabulary: VOCAB });
  for (const f of AI_UPDATE_FIELDS) assert.ok(p.includes(f.key), `prompt is missing ${f.key}`);
  assert.ok(p.includes("Sprint 07, 5 September 2026."));
  assert.ok(p.includes("```json"), "prompt must ask for a fenced JSON block");
});

test("the prompt carries the controlled vocabularies, so replies come back usable", () => {
  const p = buildUpdatePrompt({ sprintNo: 1, vocabulary: VOCAB });
  assert.ok(p.includes("Not started, In progress, Complete"));
  assert.ok(p.includes("Idea, Prototype, Working system"));
  assert.ok(p.includes("Research, Planning, Coding"));
});

test("the prompt says an empty field is a correct answer", () => {
  const p = buildUpdatePrompt({ sprintNo: 1, vocabulary: VOCAB });
  assert.ok(p.includes("An empty field is a correct answer"));
  assert.ok(p.includes("Never invent evidence"));
});

test("a target already on the row is passed through; otherwise it is not invented", () => {
  assert.ok(buildUpdatePrompt({ sprintNo: 1, currentTarget: "Ship the parser", vocabulary: VOCAB })
    .includes("Target I set: Ship the parser"));
  assert.ok(buildUpdatePrompt({ sprintNo: 1, vocabulary: VOCAB })
    .includes("Target I set: not recorded"));
});

test("reads a fenced reply, bare JSON, and JSON buried in prose", () => {
  const want = { target: "Ship the parser" };
  for (const reply of [
    wrap(want),
    JSON.stringify(want),
    'Sure! Here is your log:\n\n```json\n{"target":"Ship the parser"}\n```\n\nLet me know if you want changes.',
    'Here you go: {"target":"Ship the parser"} — hope that helps!',
  ]) {
    const r = parse(reply);
    assert.equal(r.error, null);
    assert.equal(r.values.target, "Ship the parser");
  }
});

test("controlled values come back in the list's own spelling", () => {
  const r = parse(wrap({ status: "complete", stageAtStart: "WORKING SYSTEM" }));
  assert.equal(r.values.status, "Complete");
  assert.equal(r.values.stageAtStart, "Working system");
});

test("a status outside the list is refused rather than written in", () => {
  const r = parse(wrap({ status: "Done", result: "It works" }));
  assert.equal(r.values.status, undefined);
  assert.equal(r.values.result, "It works");
  assert.match(r.warnings.join(" "), /Status: "Done" is not one of the allowed values/);
});

test("AI uses: known values kept, unknown ones reported not silently dropped", () => {
  const r = parse(wrap({ aiUsedFor: ["Coding", "vibe checking", "Debugging"] }));
  assert.equal(r.values.aiUsedFor, "Coding; Debugging");
  assert.match(r.warnings.join(" "), /"vibe checking" is not one of the allowed values/);
});

test("AI uses accepts a semicolon string and drops duplicates", () => {
  const r = parse(wrap({ aiUsedFor: "coding; Coding; planning" }));
  assert.equal(r.values.aiUsedFor, "Coding; Planning");
});

test("free multi-value fields keep what the model sent, joined the workbook's way", () => {
  assert.equal(parse(wrap({ tools: ["Claude Code", "VS Code"] })).values.tools, "Claude Code; VS Code");
  assert.equal(parse(wrap({ tools: "Claude Code, VS Code, Claude Code" })).values.tools, "Claude Code; VS Code");
});

test("minutes: whole numbers pass, everything else is refused", () => {
  assert.equal(parse(wrap({ minutesDelta: 15 })).values.minutesDelta, "15");
  assert.equal(parse(wrap({ minutesDelta: "+15" })).values.minutesDelta, "15");
  assert.equal(parse(wrap({ minutesDelta: -20 })).values.minutesDelta, "-20");
  assert.equal(parse(wrap({ minutesDelta: 0 })).values.minutesDelta, "0");

  const vague = parse(wrap({ minutesDelta: "about ten over" }));
  assert.equal(vague.values.minutesDelta, undefined);
  assert.match(vague.warnings.join(" "), /is not a whole number/);

  const wild = parse(wrap({ minutesDelta: 99999 }));
  assert.equal(wild.values.minutesDelta, undefined);
  assert.match(wild.warnings.join(" "), /too far outside an hour/);

  const fractional = parse(wrap({ minutesDelta: 12.5 }));
  assert.equal(fractional.values.minutesDelta, undefined);
});

test("markdown the model was told not to use is stripped rather than stored", () => {
  const r = parse(wrap({ result: "- Parser ships\n- Tests pass" }));
  assert.equal(r.values.result, "Parser ships Tests pass");
  assert.equal(parse(wrap({ evidence: "  spaced   out\n\n  text  " })).values.evidence, "spaced out text");
});

test("an empty string is a real answer and leaves the field alone", () => {
  const r = parse(wrap({ target: "Ship it", result: "", evidence: null }));
  assert.equal(r.values.target, "Ship it");
  assert.equal(r.values.result, undefined);
  assert.equal(r.values.evidence, undefined);
  assert.deepEqual(r.warnings, []);
});

test("keys the log has no field for are reported, not ignored", () => {
  const r = parse(wrap({ target: "Ship it", mood: "great", confidence: 0.9 }));
  assert.equal(r.values.target, "Ship it");
  assert.match(r.warnings.join(" "), /"mood", "confidence"/);
});

test("unusable replies fail with something a person can act on", () => {
  assert.match(parse("").error ?? "", /Nothing pasted/);
  assert.match(parse("I could not find that conversation, sorry.").error ?? "", /No JSON object found/);
  // Truncated before the closing brace: there is no object to find at all.
  assert.match(parse('```json\n{"target": "unclosed\n```').error ?? "", /No JSON object found/);
  // Braces present but the contents are not JSON.
  assert.match(parse('{"target": "a",}').error ?? "", /not valid JSON/);
  assert.match(parse("{target: 'a'}").error ?? "", /not valid JSON/);
  assert.match(parse(wrap(["a", "b"])).error ?? "", /No JSON object found/);
  assert.match(parse(wrap({ target: "", result: "" })).error ?? "", /every field was empty/);
});

test("an object the model wrapped in an array is still read", () => {
  // The parser slices between the outermost braces, so the wrapping falls away.
  const r = parse('```json\n[{"target": "Ship the parser"}]\n```');
  assert.equal(r.error, null);
  assert.equal(r.values.target, "Ship the parser");
});

test("a change is only a change when it differs from what is already there", () => {
  const current = { target: "Ship the parser", result: "" };
  const changes = proposeChanges(current, { target: "Ship the parser", result: "It works", evidence: "" });
  assert.deepEqual(changes.map((c) => c.key), ["result"]);
  assert.equal(changes[0].overwrites, false);
});

test("replacing the participant's own words is flagged as an overwrite", () => {
  const changes = proposeChanges(
    { target: "My own wording", result: "" },
    { target: "The AI's wording", result: "It works" },
  );
  const byKey = Object.fromEntries(changes.map((c) => [c.key, c]));
  assert.equal(byKey.target.overwrites, true);
  assert.equal(byKey.target.current, "My own wording");
  assert.equal(byKey.result.overwrites, false);

  // Only the gap-filling change is ticked; nothing they wrote goes without a decision.
  const selected = defaultSelection(changes);
  assert.deepEqual([...selected], ["result"]);
});

test("a round trip through the parser preserves every field the form holds", () => {
  const full = Object.fromEntries(
    AI_UPDATE_FIELDS.map((f) => [
      f.key,
      f.numeric ? 5 : f.list === "status" ? "Partial" : f.list === "stage" ? "Prototype"
        : f.list === "ai_use" ? "Coding" : `value for ${f.key}`,
    ]),
  );
  const r = parse(wrap(full));
  assert.equal(r.error, null);
  assert.deepEqual(r.warnings, []);
  assert.equal(Object.keys(r.values).length, AI_UPDATE_FIELDS.length);
});
