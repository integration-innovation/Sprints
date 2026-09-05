/**
 * Code.gs only runs inside Google, so it is exercised here against an in-memory
 * stand-in for the Sheets API: build a sheet from a programme, read it back, and
 * check that what a person sees matches the workbook while what the app reads
 * survives the trip.
 *
 *   npm run test:sheet
 */
import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import { makeSpreadsheetApp, stubs } from "./sheets-stub.mjs";

function load() {
  const { SpreadsheetApp, spreadsheet } = makeSpreadsheetApp();
  const context = vm.createContext({ SpreadsheetApp, ...stubs, console });
  vm.runInContext(fs.readFileSync(new URL("../Code.gs", import.meta.url), "utf8"), context);
  return { context, spreadsheet };
}

const programme = {
  id: "AB12CD",
  name: "Bi-Weekly AI Build Sprints",
  tagline: "14 September – 23 November 2026 · Six independent 1-hour build sessions · Mondays 12:30–13:30",
  corePrinciple: "Each hour must produce a meaningful outcome for the participant's own project.",
  targetFormula: "[Verb] [specific feature, workflow or test] using [tool or approach] so that [observable result].",
  cadenceWeeks: 2,
  sessionTime: "12:30–13:30",
  createdAt: "2026-09-01T00:00:00.000Z",
  sessions: [
    { sprintNo: 1, date: "2026-09-14", day: "Monday", time: "12:30–13:30", prompt: "Choose one small, valuable problem…", possibleTargets: "Start a prototype; fix a problem", expectedOutcome: "One visible improvement", facilitatorNotes: "" },
    { sprintNo: 2, date: "2026-09-28", day: "Monday", time: "12:30–13:30", prompt: "Review the current state…", possibleTargets: "Continue; change direction", expectedOutcome: "One visible improvement", facilitatorNotes: "" },
  ],
  participants: [
    { id: "p1", name: "Woon Wei", role: "Facilitator / builder", organisation: "", preferredTools: "Blender; Bonsai; Claude Code; IfcOpenShell", email: "", notes: "", isFacilitator: true },
    { id: "p2", name: "Ar William Lau", role: "Architect / builder", organisation: "", preferredTools: "", email: "", notes: "", isFacilitator: false },
  ],
  projects: [
    { id: "prj1", ownerId: "p1", name: "Architect-Centred Bonsai Sketch", type: "Plugin", stage: "Prototype", primaryUser: "Architects", mainPurpose: "Make Bonsai feel natural", priority1: "Push/pull", priority2: "Snapping", priority3: "Walls", tools: "Blender 4.x; Bonsai", constraints: "IFC-native", successCondition: "A massing study without mesh tools", projectTest: "Massing scene", demonstration: "Screen recording", repoLink: "", notes: "", isPrimary: true },
  ],
  entries: [
    { id: "1:p1", sprintNo: 1, participantId: "p1", projectId: "prj1", stageAtStart: "Prototype", target: "Make push/pull keep extruding", whyItMatters: "Biggest friction", definitionOfDone: "Three pulls in one session", scopeLimit: "Planar faces only", tools: "Blender; Claude Code", startingPoint: "Existing operator", mainRisk: "Modal state reset", fallback: "Two pulls", aiUsedFor: "Research; Coding", result: "A wall face pulls repeatedly", evidence: "commit abc123", whatChanged: "Operator re-arms", nextPossibility: "Add snapping", status: "Complete", minutesDelta: -3, facilitatorNotes: "Worked example", updatedAt: "2026-09-14T05:00:00.000Z" },
    { id: "1:p2", sprintNo: 1, participantId: "p2", projectId: null, stageAtStart: "", target: "", whyItMatters: "", definitionOfDone: "", scopeLimit: "", tools: "", startingPoint: "", mainRisk: "", fallback: "", aiUsedFor: "", result: "", evidence: "", whatChanged: "", nextPossibility: "", status: "Not started", minutesDelta: null, facilitatorNotes: "", updatedAt: "2026-09-01T00:00:00.000Z" },
    { id: "2:p1", sprintNo: 2, participantId: "p1", projectId: "prj1", stageAtStart: "", target: "", whyItMatters: "", definitionOfDone: "", scopeLimit: "", tools: "", startingPoint: "", mainRisk: "", fallback: "", aiUsedFor: "", result: "", evidence: "", whatChanged: "", nextPossibility: "", status: "Not started", minutesDelta: null, facilitatorNotes: "", updatedAt: "2026-09-01T00:00:00.000Z" },
  ],
  targets: [
    { id: "t1", ownerId: null, projectId: null, tooLargeIdea: "Build an AI BIM compliance checker.", sprintTarget: "Configure AI to extract one required parameter…", suggestedSprint: null, usedInSprint: null, status: "Open", notes: "" },
    { id: "t2", ownerId: "p1", projectId: "prj1", tooLargeIdea: "Natural continuous push/pull", sprintTarget: "Improve the naturalness of continuous push/pull…", suggestedSprint: 1, usedInSprint: null, status: "Open", notes: "" },
  ],
  lists: {
    status: ["Not started", "In progress", "Complete", "Partial", "Blocked", "Deferred", "Absent"],
    project_type: ["Application", "Workflow", "Plugin"],
    stage: ["Idea", "Prototype", "Working system", "Production system", "Maintenance"],
    ai_use: ["Research", "Planning", "Coding"],
    tool_category: ["AI assistant", "Coding environment"],
  },
  runSheet: [
    { window: "0–5 min", phase: "Target", detail: "Confirm the intended outcome for the hour." },
    { window: "10–50 min", phase: "Build", detail: "Focused build." },
  ],
  groundRules: [{ rule: "Own target", detail: "Each participant chooses the outcome." }],
};

const check = (label, fn) => { fn(); console.log("✓", label); };

// ---------------------------------------------------------------- fresh sheet
const { context, spreadsheet } = load();
context.initialiseSheet(programme);

check("the workbook's tabs, in the workbook's order", () => {
  const names = spreadsheet.sheets.map((s) => s.name);
  assert.deepEqual(names, ["Overview", "Dashboard", "Sprint Log", "Sessions", "Participants",
    "Projects", "Target Bank", "Lists", "Programme"]);
  assert.equal(spreadsheet.getSheetByName("Programme").hidden, true, "the machine tab is hidden");
});

check("title, explanation, headers on row 4, data from row 5", () => {
  const log = spreadsheet.getSheetByName("Sprint Log");
  assert.equal(log.get(1, 1), "Sprint Log");
  assert.match(String(log.get(2, 1)), /One row per participant per sprint/);
  assert.equal(log.get(3, 1), "");
  assert.equal(log.get(4, 1), "Record ID");
  assert.equal(log.get(4, 7), "Today I will… (target)");
  assert.equal(log.get(5, 1), "1:p1");
  assert.equal(log.frozenRows, 4);
});

check("the columns land where the workbook has them", () => {
  const log = spreadsheet.getSheetByName("Sprint Log");
  const headers = [];
  for (let c = 1; c <= 25; c++) headers.push(log.get(4, c));
  assert.deepEqual(headers.slice(0, 22), ["Record ID", "Sprint", "Date", "Participant", "Project",
    "Stage at start", "Today I will… (target)", "Why this matters", "Definition of done (observable)",
    "Scope limit", "Tools", "Starting point", "Main risk", "Fallback approach", "AI used for",
    'Result — "This now works…"', "Evidence (link / screenshot / commit)", "What changed",
    "Next possibility", "Status", "Minutes over/under", "Facilitator notes"]);
  assert.deepEqual(headers.slice(22), ["Participant ID", "Project ID", "Updated at"]);
  assert.deepEqual([...log.hiddenColumns].sort((a, b) => a - b), [23, 24, 25],
    "the app's own keys are hidden");
});

check("names show where the workbook shows names", () => {
  const log = spreadsheet.getSheetByName("Sprint Log");
  assert.equal(log.get(5, 4), '=IFERROR(VLOOKUP($W5,Participants!$A$5:$B,2,FALSE),"")');
  assert.equal(log.get(6, 4), '=IFERROR(VLOOKUP($W6,Participants!$A$5:$B,2,FALSE),"")');
  assert.equal(log.get(5, 23), "p1", "and the id it looks up is in the hidden column");
  assert.match(String(log.get(5, 3)), /VLOOKUP\(\$B5,Sessions!\$A\$5:\$B/);
});

check("computed columns count the right things", () => {
  const sessions = spreadsheet.getSheetByName("Sessions");
  assert.equal(sessions.get(4, 8), "Records logged");
  assert.equal(sessions.get(5, 8), "=COUNTIF('Sprint Log'!$B$5:$B,$A5)");
  assert.equal(sessions.get(5, 9), '=COUNTIFS(\'Sprint Log\'!$B$5:$B,$A5,\'Sprint Log\'!$T$5:$T,"Complete")');
  const people = spreadsheet.getSheetByName("Participants");
  assert.equal(people.get(5, 8), "=COUNTIF('Sprint Log'!$W$5:$W,$A5)");
  assert.match(String(people.get(5, 5)), /FILTER\(Projects!\$B\$5:\$B,Projects!\$T\$5:\$T=\$A5/);
});

check("yellow where you type, grey where you must not", () => {
  const log = spreadsheet.getSheetByName("Sprint Log");
  assert.equal(log.background.get("5:7"), "#fff8e1", "target is fill-in");
  assert.equal(log.background.get("5:4"), "#f1f3f5", "participant is a formula");
  assert.equal(log.background.get("5:1"), "#f1f3f5", "record id is the app's");
});

check("dropdowns read down the Lists columns", () => {
  const log = spreadsheet.getSheetByName("Sprint Log");
  const rule = log.validation.get("5:20"); // Status
  assert.ok(rule, "status has a dropdown");
  assert.equal(rule.range.sheet.name, "Lists");
  assert.equal(rule.range.col, 1, "…pointing at the Status column");
  assert.equal(rule.allowInvalid, true, "the app must always be able to write");
});

check("the Lists tab is columnar, with the sheet's own two extras", () => {
  const lists = spreadsheet.getSheetByName("Lists");
  const headers = [];
  for (let c = 1; c <= 7; c++) headers.push(lists.get(4, c));
  assert.deepEqual(headers, ["Status", "Project type", "Stage", "AI use", "Tool category", "Sprint", "Yes/No"]);
  assert.equal(lists.get(5, 1), "Not started");
  assert.equal(lists.get(5, 6), "1");
  assert.equal(lists.get(6, 6), "2");
  assert.equal(lists.get(7, 6), "", "one sprint per session, not a fixed six");
  assert.equal(lists.get(5, 7), "Yes");
});

check("the Overview explains the sheet in the workbook's words", () => {
  const overview = spreadsheet.getSheetByName("Overview");
  const text = [...overview.cells.values()].join("\n");
  for (const phrase of ["How this sheet works", "Legend", "Yellow cell", "Grey cell",
    "60-minute run sheet", "Ground rules", "Core principle", "Target formula"]) {
    assert.ok(text.includes(phrase), `Overview is missing: ${phrase}`);
  }
  assert.ok(text.includes(programme.corePrinciple));
  assert.ok(text.includes("Focused build."), "the run sheet came from the app, not a copy in the script");
});

check("the Dashboard totals, by sprint and by participant", () => {
  const dash = spreadsheet.getSheetByName("Dashboard");
  const column = [];
  for (let r = 1; r <= dash.getLastRow(); r++) column.push(String(dash.get(r, 1)));
  assert.ok(column.includes("Programme totals"));
  assert.ok(column.includes("By sprint"));
  assert.ok(column.includes("By participant"));
  const sprintHeader = column.indexOf("Sprint") + 1;
  assert.match(String(dash.get(sprintHeader + 1, 3)), /COUNTIFS\('Sprint Log'!\$B\$5:\$B/);
  const peopleHeader = column.indexOf("Participant") + 1;
  assert.match(String(dash.get(peopleHeader + 1, 1)), /Participants!\$B5/, "shown by name");
  assert.match(String(dash.get(peopleHeader + 1, 3)), /COUNTIFS\('Sprint Log'!\$W\$5:\$W,Participants!\$A5/,
    "counted by id");
  assert.match(String(dash.get(peopleHeader + 9, 1)), /Participants!\$B13/, "room for people who join later");
});

// ------------------------------------------------------------- reading it back
check("everything the app wrote comes back unchanged", () => {
  // Objects made inside the VM have a different prototype, so compare by value.
  const state = JSON.parse(JSON.stringify(context.buildState()));
  assert.equal(state.id, programme.id);
  assert.equal(state.name, programme.name);
  assert.equal(state.tagline, programme.tagline);
  assert.equal(state.cadenceWeeks, 2);
  assert.deepEqual(state.sessions, programme.sessions);
  assert.deepEqual(state.participants, programme.participants);
  assert.deepEqual(state.projects, programme.projects);
  assert.deepEqual(state.entries, programme.entries);
  assert.deepEqual(state.targets, programme.targets);
  for (const key of Object.keys(programme.lists)) {
    assert.deepEqual(state.lists[key], programme.lists[key], `list ${key}`);
  }
  assert.equal(state.entries[0].minutesDelta, -3);
  assert.equal(state.entries[1].minutesDelta, null);
  assert.deepEqual(state.lists.sprint, ["1", "2"]);
  assert.deepEqual(state.lists.yes_no, ["Yes", "No"]);
});

// -------------------------------------------------------------------- writing
check("a save from the app updates the row and leaves the formulas alone", () => {
  const log = spreadsheet.getSheetByName("Sprint Log");
  const edited = { ...programme.entries[1], target: "Draft the door schedule check", status: "In progress",
    updatedAt: "2026-09-14T06:00:00.000Z" };
  context.upsertEntry(edited);
  assert.equal(log.get(6, 7), "Draft the door schedule check");
  assert.equal(log.get(6, 20), "In progress");
  assert.equal(log.get(6, 4), '=IFERROR(VLOOKUP($W6,Participants!$A$5:$B,2,FALSE),"")', "formula survived");
  assert.equal(log.getLastRow(), 7, "no row was appended");
  const back = JSON.parse(JSON.stringify(context.buildState())).entries.find((e) => e.id === "1:p2");
  assert.equal(back.target, "Draft the door schedule check");
});

check("a stale save cannot overwrite newer work", () => {
  const log = spreadsheet.getSheetByName("Sprint Log");
  context.upsertEntry({ ...programme.entries[1], target: "An older draft", updatedAt: "2026-09-14T05:00:00.000Z" });
  assert.equal(log.get(6, 7), "Draft the door schedule check");
});

check("a new participant is appended, formatted and counted", () => {
  const people = spreadsheet.getSheetByName("Participants");
  context.upsert("Participants", { id: "p3", name: "Ar Toon Cheng", role: "Architect / builder",
    organisation: "", preferredTools: "", email: "", notes: "", isFacilitator: false });
  assert.equal(people.get(7, 2), "Ar Toon Cheng");
  assert.equal(people.get(7, 8), "=COUNTIF('Sprint Log'!$W$5:$W,$A7)", "its formulas are this row's");
  assert.equal(people.background.get("7:2"), "#fff8e1");
  const state = JSON.parse(JSON.stringify(context.buildState()));
  assert.equal(state.participants.length, 3);
  assert.equal(state.participants[2].name, "Ar Toon Cheng");
});

check("reconnecting rebuilds the sheet without doubling anything up", () => {
  const before = JSON.parse(JSON.stringify(context.buildState()));
  context.initialiseSheet({ ...programme, participants: before.participants });
  const after = JSON.parse(JSON.stringify(context.buildState()));
  assert.equal(after.participants.length, before.participants.length);
  assert.equal(after.entries.length, programme.entries.length);
  assert.deepEqual(spreadsheet.sheets.map((s) => s.name), ["Overview", "Dashboard", "Sprint Log",
    "Sessions", "Participants", "Projects", "Target Bank", "Lists", "Programme"]);
  const log = spreadsheet.getSheetByName("Sprint Log");
  assert.equal(log.get(5, 1), "1:p1", "data still starts on row 5");
  assert.equal(log.validation.size > 0, true, "dropdowns were rebuilt");
});

// ------------------------------------------------------- an older sheet's data
check("a sheet built by the previous version still reads", () => {
  const { context: old, spreadsheet: book } = load();
  const log = book.insertSheet("Sprint Log");
  const headers = ["Record ID", "Sprint", "Participant ID", "Project ID", "Stage at start",
    "Today I will… (target)", "Why this matters", "Definition of done (observable)", "Scope limit",
    "Tools", "Starting point", "Main risk", "Fallback approach", "AI used for",
    'Result — "This now works…"', "Evidence (link / screenshot / commit)", "What changed",
    "Next possibility", "Status", "Minutes over/under", "Facilitator notes", "Updated at"];
  headers.forEach((h, i) => log.set(1, i + 1, h));
  const row = ["1:p1", 1, "p1", "prj1", "Prototype", "An older target", "", "", "", "", "", "", "", "",
    "", "", "", "", "Complete", -3, "", "2026-09-14T05:00:00.000Z"];
  row.forEach((v, i) => log.set(2, i + 1, v));

  const lists = book.insertSheet("Lists");
  ["Category", "Value", "Sort order"].forEach((h, i) => lists.set(1, i + 1, h));
  [["status", "Not started", 0], ["status", "Complete", 1]].forEach((r, i) =>
    r.forEach((v, c) => lists.set(2 + i, c + 1, v)));

  const state = JSON.parse(JSON.stringify(old.buildState()));
  assert.equal(state.entries.length, 1);
  assert.equal(state.entries[0].target, "An older target");
  assert.equal(state.entries[0].participantId, "p1");
  assert.equal(state.entries[0].status, "Complete");
  assert.deepEqual(state.lists.status, ["Not started", "Complete"]);

  old.upsertEntry({ ...state.entries[0], target: "Updated in place", updatedAt: "2026-09-15T00:00:00.000Z" });
  assert.equal(log.get(2, 6), "Updated in place", "and still writes to the right column");
  assert.equal(log.getLastRow(), 2);
});

console.log("\nall checks passed");
