/**
 * Seeds the "Bi-Weekly AI Build Sprints" programme from the source workbook:
 * six sessions, four participants, one project, the target bank and the
 * worked Sprint 01 example.
 *
 *   npm run seed
 */
import { db } from "../src/lib/db";
import { addParticipant, createProgramme, pad2 } from "../src/lib/programme";

const conn = db();

const existing = conn
  .prepare("SELECT join_code FROM programmes WHERE name = ?")
  .get("Bi-Weekly AI Build Sprints") as { join_code: string } | undefined;

if (existing) {
  console.log(`Already seeded. Join code: ${existing.join_code}`);
  process.exit(0);
}

const { programme, facilitator } = createProgramme({
  name: "Bi-Weekly AI Build Sprints",
  tagline: "Six independent 1-hour build sessions · Mondays 12:30–13:30",
  startDate: "2026-09-14",
  sprintCount: 6,
  cadenceWeeks: 2,
  sessionTime: "12:30–13:30",
  facilitatorName: "Woon Wei",
});

for (const name of ["Ar William Lau", "Ar Toon Cheng", "Ar Chan Kok Way"]) {
  addParticipant(programme.id, { name, role: "Architect / builder" });
}

const projectInfo = conn
  .prepare(
    `INSERT INTO projects
       (programme_id, ref, owner_id, name, type, stage, primary_user, main_purpose,
        priority_1, priority_2, priority_3, tools, constraints, success_condition,
        project_test, demonstration, repo_link, notes, is_primary)
     VALUES (?, 'PRJ-01', ?, ?, 'Plugin', 'Prototype', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', 1)`,
  )
  .run(
    programme.id,
    facilitator.id,
    "Architect-Centred Bonsai Sketch",
    "Architects doing early-stage massing and sketch design",
    "Make Bonsai Sketch workflows feel natural to architects: push/pull, snapping, walls and openings, sketch-to-IFC",
    "Continuous push/pull without restarting the tool",
    "Architectural snapping and inference",
    "Wall and opening creation",
    "Blender 4.x; Bonsai; Python; Claude Code; IfcOpenShell",
    "Must stay IFC-native; no forks of Bonsai core; 1-hour scope per change",
    "An architect can complete a simple massing study in Bonsai without touching the Blender mesh tools",
    "Run the massing test scene from a fresh Blender session",
    "Screen recording of the workflow before vs after",
  );
const projectId = Number(projectInfo.lastInsertRowid);

const bank: [string, string, number][] = [
  ["Natural continuous push/pull", "Improve the naturalness of continuous push/pull behaviour so that repeated pulls need no tool restart.", 1],
  ["Architectural snapping", "Improve architectural snapping and inference so that wall ends snap to existing wall faces.", 2],
  ["Walls and openings", "Improve wall and opening creation so that a door can be placed in a wall in two clicks.", 3],
  ["Sketch-to-IFC", "Test a faster 2D sketch-to-IFC workflow so that a closed polyline becomes IFC walls in one command.", 4],
  ["AI-callable modelling", "Make one modelling command callable through AI or MCP so that a prompt creates a wall.", 5],
  ["Biggest friction point", "Resolve the architect workflow currently presenting the greatest friction so that the demo scene completes without workarounds.", 6],
];

const insertTarget = conn.prepare(
  `INSERT INTO targets
     (programme_id, ref, owner_id, project_id, too_large_idea, sprint_target, suggested_sprint, status)
   VALUES (?, ?, ?, ?, ?, ?, ?, 'Open')`,
);
bank.forEach(([idea, target, sprint], i) =>
  insertTarget.run(programme.id, `T-${pad2(i + 4)}`, facilitator.id, projectId, idea, target, sprint),
);

// The worked Sprint 01 example from the workbook.
const session1 = conn
  .prepare("SELECT id FROM sessions WHERE programme_id = ? AND sprint_no = 1")
  .get(programme.id) as { id: number };

conn
  .prepare(
    `UPDATE entries SET
       project_id = ?, stage_at_start = 'Prototype', target = ?, why_it_matters = ?,
       definition_of_done = ?, scope_limit = ?, tools = ?, starting_point = ?, main_risk = ?,
       fallback = ?, ai_used_for = ?, result = ?, evidence = ?, what_changed = ?,
       next_possibility = ?, status = 'Complete', minutes_delta = -3, facilitator_notes = ?,
       plan_submitted_at = datetime('now'), result_submitted_at = datetime('now')
     WHERE session_id = ? AND participant_id = ?`,
  )
  .run(
    projectId,
    "Make push/pull on a wall face keep extruding after the first pull, using Bonsai + Claude Code, so that an architect can pull the same face three times without restarting the tool.",
    "Restarting the tool after every pull is the single biggest friction point when massing in Bonsai.",
    "Three consecutive push/pull operations on one face in a fresh Blender session, with no tool restart and the IFC wall still valid.",
    "One face type (planar wall face) only. No snapping, no undo handling.",
    "Blender 4.x; Bonsai; Claude Code",
    "Existing push/pull operator in Bonsai sketch module",
    "Modal operator state is reset on mouse release",
    "Reduce to two consecutive pulls, or log the exact reset call for next sprint",
    "Research; Coding; Debugging; Testing",
    "This now works: a wall face can be pulled repeatedly in one modal session; the IFC wall updates after each pull.",
    "commit abc123; 40-sec screen recording",
    "Modal operator no longer exits on release; re-arms on next click.",
    "Add snapping to the pull distance (multiples of 100 mm).",
    "Worked example — overwrite with the real Sprint 01 entry.",
    session1.id,
    facilitator.id,
  );

console.log(`Seeded "${programme.name}".`);
console.log(`Join code: ${programme.join_code}`);
