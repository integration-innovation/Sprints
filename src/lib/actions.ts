"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";
import {
  addParticipant,
  createProgramme,
  ensureEntries,
  pad2,
  programmeByCode,
  todayIso,
} from "./programme";
import { currentParticipant, signIn, signOut } from "./session";
import type { Entry, Participant, Programme } from "./types";

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

function multi(form: FormData, key: string): string {
  return form
    .getAll(key)
    .map((v) => String(v).trim())
    .filter(Boolean)
    .join("; ");
}

function optionalInt(form: FormData, key: string): number | null {
  const raw = str(form, key);
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/** Loads a programme by code and the caller's membership, or throws. */
async function requireMembership(
  code: string,
): Promise<{ programme: Programme; me: Participant }> {
  const programme = programmeByCode(code);
  if (!programme) throw new Error("Programme not found.");
  const me = await currentParticipant();
  if (!me || me.programme_id !== programme.id) throw new Error("Join this programme first.");
  return { programme, me };
}

function refreshProgramme(code: string) {
  revalidatePath(`/p/${code}`, "layout");
}

// --- Programme lifecycle ----------------------------------------------------

export async function createProgrammeAction(form: FormData) {
  const name = str(form, "name");
  const facilitatorName = str(form, "facilitator_name");
  const startDate = str(form, "start_date");
  if (!name || !facilitatorName || !startDate) throw new Error("Name, facilitator and start date are required.");

  const sprintCount = Math.min(Math.max(Number(str(form, "sprint_count")) || 6, 1), 24);
  const cadenceWeeks = Math.min(Math.max(Number(str(form, "cadence_weeks")) || 2, 1), 8);

  const { programme, facilitator } = createProgramme({
    name,
    tagline: str(form, "tagline"),
    startDate,
    sprintCount,
    cadenceWeeks,
    sessionTime: str(form, "session_time") || "12:30–13:30",
    facilitatorName,
    facilitatorEmail: str(form, "facilitator_email"),
  });

  await signIn(facilitator.id);
  redirect(`/p/${programme.join_code}`);
}

export async function joinProgrammeAction(form: FormData) {
  const code = str(form, "code").toUpperCase();
  const programme = programmeByCode(code);
  if (!programme) throw new Error("No programme with that code.");

  const existingId = optionalInt(form, "participant_id");
  if (existingId !== null) {
    const existing = db()
      .prepare("SELECT * FROM participants WHERE id = ? AND programme_id = ?")
      .get(existingId, programme.id) as Participant | undefined;
    if (!existing) throw new Error("That participant is not in this programme.");
    await signIn(existing.id);
    redirect(`/p/${programme.join_code}/me`);
  }

  const name = str(form, "name");
  if (!name) throw new Error("Enter your name.");

  const participant = addParticipant(programme.id, {
    name,
    email: str(form, "email"),
    role: str(form, "role") || "Builder",
    organisation: str(form, "organisation"),
    preferredTools: str(form, "preferred_tools"),
  });

  await signIn(participant.id);
  redirect(`/p/${programme.join_code}/me`);
}

export async function signOutAction() {
  await signOut();
  redirect("/");
}

// --- Sprint Log -------------------------------------------------------------

/** Loads an entry the caller is allowed to edit. Facilitators may edit any row. */
async function requireEntryAccess(code: string, entryId: number) {
  const { programme, me } = await requireMembership(code);
  const entry = db().prepare("SELECT * FROM entries WHERE id = ?").get(entryId) as
    | Entry
    | undefined;
  if (!entry || entry.programme_id !== programme.id) throw new Error("Entry not found.");
  const owns = entry.participant_id === me.id;
  if (!owns && !me.is_facilitator) throw new Error("You can only edit your own sprint entry.");
  return { programme, me, entry, owns };
}

/** Saves the plan half of a Sprint Log row (workbook columns F–O). */
export async function savePlanAction(form: FormData) {
  const code = str(form, "code");
  const entryId = Number(str(form, "entry_id"));
  const { entry } = await requireEntryAccess(code, entryId);

  const target = str(form, "target");
  const projectId = optionalInt(form, "project_id");

  db()
    .prepare(
      `UPDATE entries SET
         project_id = ?, stage_at_start = ?, target = ?, why_it_matters = ?,
         definition_of_done = ?, scope_limit = ?, tools = ?, starting_point = ?,
         main_risk = ?, fallback = ?, ai_used_for = ?,
         status = CASE WHEN status = 'Not started' AND ? <> '' THEN 'In progress' ELSE status END,
         plan_submitted_at = COALESCE(plan_submitted_at, CASE WHEN ? <> '' THEN datetime('now') END),
         updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(
      projectId,
      str(form, "stage_at_start"),
      target,
      str(form, "why_it_matters"),
      str(form, "definition_of_done"),
      str(form, "scope_limit"),
      str(form, "tools"),
      str(form, "starting_point"),
      str(form, "main_risk"),
      str(form, "fallback"),
      multi(form, "ai_used_for"),
      target,
      target,
      entry.id,
    );

  refreshProgramme(code);
  redirect(`/p/${code}/me?sprint=${str(form, "sprint_no")}&saved=plan`);
}

/**
 * Takes a target the participant has already written elsewhere — last sprint's
 * next possibility — and puts it in this sprint's target, so continuing a piece
 * of work costs one tap instead of retyping it.
 */
export async function useSuggestedTargetAction(form: FormData) {
  const code = str(form, "code");
  const entryId = Number(str(form, "entry_id"));
  await requireEntryAccess(code, entryId);

  const target = str(form, "target");
  if (target !== "") {
    db()
      .prepare(
        `UPDATE entries SET
           target = ?,
           status = CASE WHEN status = 'Not started' THEN 'In progress' ELSE status END,
           plan_submitted_at = COALESCE(plan_submitted_at, datetime('now')),
           updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(target, entryId);
    refreshProgramme(code);
  }

  redirect(`/p/${code}/me?sprint=${str(form, "sprint_no")}&saved=carried`);
}

/** Saves the result half of a Sprint Log row (workbook columns P–U). */
export async function saveResultAction(form: FormData) {
  const code = str(form, "code");
  const entryId = Number(str(form, "entry_id"));
  const { entry } = await requireEntryAccess(code, entryId);

  const result = str(form, "result");
  const status = str(form, "status") || "In progress";

  db()
    .prepare(
      `UPDATE entries SET
         result = ?, evidence = ?, what_changed = ?, next_possibility = ?,
         status = ?, minutes_delta = ?,
         result_submitted_at = COALESCE(result_submitted_at, CASE WHEN ? <> '' THEN datetime('now') END),
         updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(
      result,
      str(form, "evidence"),
      str(form, "what_changed"),
      str(form, "next_possibility"),
      status,
      optionalInt(form, "minutes_delta"),
      result,
      entry.id,
    );

  refreshProgramme(code);
  redirect(`/p/${code}/me?sprint=${str(form, "sprint_no")}&saved=result`);
}

export async function saveFacilitatorNotesAction(form: FormData) {
  const code = str(form, "code");
  const { me } = await requireMembership(code);
  if (!me.is_facilitator) throw new Error("Facilitators only.");

  db()
    .prepare("UPDATE entries SET facilitator_notes = ?, updated_at = datetime('now') WHERE id = ?")
    .run(str(form, "facilitator_notes"), Number(str(form, "entry_id")));

  refreshProgramme(code);
}

// --- Sessions ---------------------------------------------------------------

export async function saveSessionAction(form: FormData) {
  const code = str(form, "code");
  const { programme, me } = await requireMembership(code);
  if (!me.is_facilitator) throw new Error("Facilitators only.");

  const sessionId = Number(str(form, "session_id"));
  db()
    .prepare(
      `UPDATE sessions SET date = ?, day = ?, time = ?, prompt = ?, possible_targets = ?,
                           expected_outcome = ?, facilitator_notes = ?
        WHERE id = ? AND programme_id = ?`,
    )
    .run(
      str(form, "date"),
      str(form, "day"),
      str(form, "time"),
      str(form, "prompt"),
      str(form, "possible_targets"),
      str(form, "expected_outcome"),
      str(form, "facilitator_notes"),
      sessionId,
      programme.id,
    );

  refreshProgramme(code);
  redirect(`/p/${code}/sprint/${str(form, "sprint_no")}`);
}

// --- Projects ---------------------------------------------------------------

export async function saveProjectAction(form: FormData) {
  const code = str(form, "code");
  const { programme, me } = await requireMembership(code);

  const projectId = optionalInt(form, "project_id");
  const fields = [
    str(form, "name"),
    str(form, "type"),
    str(form, "stage"),
    str(form, "primary_user"),
    str(form, "main_purpose"),
    str(form, "priority_1"),
    str(form, "priority_2"),
    str(form, "priority_3"),
    str(form, "tools"),
    str(form, "constraints"),
    str(form, "success_condition"),
    str(form, "project_test"),
    str(form, "demonstration"),
    str(form, "repo_link"),
    str(form, "notes"),
    form.get("is_primary") ? 1 : 0,
  ];
  if (!fields[0]) throw new Error("Project name is required.");

  if (projectId !== null) {
    const owner = db()
      .prepare("SELECT owner_id FROM projects WHERE id = ? AND programme_id = ?")
      .get(projectId, programme.id) as { owner_id: number | null } | undefined;
    if (!owner) throw new Error("Project not found.");
    if (owner.owner_id !== me.id && !me.is_facilitator) throw new Error("Not your project.");

    db()
      .prepare(
        `UPDATE projects SET name = ?, type = ?, stage = ?, primary_user = ?, main_purpose = ?,
             priority_1 = ?, priority_2 = ?, priority_3 = ?, tools = ?, constraints = ?,
             success_condition = ?, project_test = ?, demonstration = ?, repo_link = ?,
             notes = ?, is_primary = ?
           WHERE id = ?`,
      )
      .run(...fields, projectId);
  } else {
    const count = db()
      .prepare("SELECT COUNT(*) AS n FROM projects WHERE programme_id = ?")
      .get(programme.id) as { n: number };
    db()
      .prepare(
        `INSERT INTO projects
           (programme_id, ref, owner_id, name, type, stage, primary_user, main_purpose,
            priority_1, priority_2, priority_3, tools, constraints, success_condition,
            project_test, demonstration, repo_link, notes, is_primary)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(programme.id, `PRJ-${pad2(count.n + 1)}`, me.id, ...fields);
  }

  refreshProgramme(code);
  redirect(`/p/${code}/projects`);
}

// --- Target bank ------------------------------------------------------------

export async function saveTargetAction(form: FormData) {
  const code = str(form, "code");
  const { programme, me } = await requireMembership(code);

  const count = db()
    .prepare("SELECT COUNT(*) AS n FROM targets WHERE programme_id = ?")
    .get(programme.id) as { n: number };

  db()
    .prepare(
      `INSERT INTO targets
         (programme_id, ref, owner_id, project_id, too_large_idea, sprint_target,
          suggested_sprint, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Open', ?)`,
    )
    .run(
      programme.id,
      `T-${pad2(count.n + 1)}`,
      me.id,
      optionalInt(form, "project_id"),
      str(form, "too_large_idea"),
      str(form, "sprint_target"),
      optionalInt(form, "suggested_sprint"),
      str(form, "notes"),
    );

  refreshProgramme(code);
  redirect(`/p/${code}/targets`);
}

export async function setTargetStatusAction(form: FormData) {
  const code = str(form, "code");
  const { programme, me } = await requireMembership(code);
  const targetId = Number(str(form, "target_id"));

  const owner = db()
    .prepare("SELECT owner_id FROM targets WHERE id = ? AND programme_id = ?")
    .get(targetId, programme.id) as { owner_id: number | null } | undefined;
  if (!owner) throw new Error("Target not found.");
  if (owner.owner_id !== null && owner.owner_id !== me.id && !me.is_facilitator) {
    throw new Error("Not your target.");
  }

  db()
    .prepare("UPDATE targets SET status = ? WHERE id = ?")
    .run(str(form, "status") || "Open", targetId);

  refreshProgramme(code);
}

/** Copies a banked target into the caller's Sprint Log row for a session. */
export async function pullTargetAction(form: FormData) {
  const code = str(form, "code");
  const { programme, me } = await requireMembership(code);
  const targetId = Number(str(form, "target_id"));
  const sprintNo = Number(str(form, "sprint_no"));
  // The inline picker on My sprint can be submitted with nothing chosen.
  if (!Number.isFinite(targetId) || targetId <= 0) {
    redirect(`/p/${code}/me?sprint=${sprintNo}`);
  }

  const target = db()
    .prepare("SELECT * FROM targets WHERE id = ? AND programme_id = ?")
    .get(targetId, programme.id) as
    | { id: number; sprint_target: string; project_id: number | null }
    | undefined;
  if (!target) throw new Error("Target not found.");

  const session = db()
    .prepare("SELECT id FROM sessions WHERE programme_id = ? AND sprint_no = ?")
    .get(programme.id, sprintNo) as { id: number } | undefined;
  if (!session) throw new Error("Sprint not found.");

  ensureEntries(programme.id);
  db()
    .prepare(
      `UPDATE entries
          SET target = ?,
              project_id = COALESCE(project_id, ?),
              status = CASE WHEN status = 'Not started' THEN 'In progress' ELSE status END,
              updated_at = datetime('now')
        WHERE session_id = ? AND participant_id = ?`,
    )
    .run(target.sprint_target, target.project_id, session.id, me.id);

  db()
    .prepare("UPDATE targets SET used_in_sprint = ?, status = 'Used' WHERE id = ?")
    .run(sprintNo, targetId);

  refreshProgramme(code);
  redirect(`/p/${code}/me?sprint=${sprintNo}&saved=pulled`);
}

// --- Participant profile ----------------------------------------------------

export async function saveProfileAction(form: FormData) {
  const code = str(form, "code");
  const { me } = await requireMembership(code);

  db()
    .prepare(
      `UPDATE participants SET name = ?, role = ?, organisation = ?, preferred_tools = ?,
                               email = ?, notes = ?
        WHERE id = ?`,
    )
    .run(
      str(form, "name") || me.name,
      str(form, "role"),
      str(form, "organisation"),
      str(form, "preferred_tools"),
      str(form, "email"),
      str(form, "notes"),
      me.id,
    );

  refreshProgramme(code);
  redirect(`/p/${code}/participants`);
}

/** Marks the caller absent for a sprint, so the dashboard reflects it. */
export async function markAbsentAction(form: FormData) {
  const code = str(form, "code");
  const entryId = Number(str(form, "entry_id"));
  await requireEntryAccess(code, entryId);

  db()
    .prepare("UPDATE entries SET status = 'Absent', updated_at = datetime('now') WHERE id = ?")
    .run(entryId);

  refreshProgramme(code);
  redirect(`/p/${code}/me?sprint=${str(form, "sprint_no")}&saved=absent`);
}

export async function todayAction(): Promise<string> {
  return todayIso();
}
