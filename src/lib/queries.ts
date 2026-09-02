import { db } from "./db";
import { todayIso } from "./programme";
import type { EntryRow, Participant, Programme, Project, Session, TargetRow } from "./types";

export function sessionsFor(programmeId: number): Session[] {
  return db()
    .prepare("SELECT * FROM sessions WHERE programme_id = ? ORDER BY sprint_no")
    .all(programmeId) as Session[];
}

export function sessionByNo(programmeId: number, sprintNo: number): Session | undefined {
  return db()
    .prepare("SELECT * FROM sessions WHERE programme_id = ? AND sprint_no = ?")
    .get(programmeId, sprintNo) as Session | undefined;
}

export function participantsFor(programmeId: number): Participant[] {
  return db()
    .prepare("SELECT * FROM participants WHERE programme_id = ? ORDER BY id")
    .all(programmeId) as Participant[];
}

export function projectsFor(programmeId: number): (Project & { owner_name: string | null })[] {
  return db()
    .prepare(
      `SELECT pr.*, pa.name AS owner_name
         FROM projects pr
         LEFT JOIN participants pa ON pa.id = pr.owner_id
        WHERE pr.programme_id = ?
        ORDER BY pr.ref`,
    )
    .all(programmeId) as (Project & { owner_name: string | null })[];
}

export function projectsOwnedBy(participantId: number): Project[] {
  return db()
    .prepare("SELECT * FROM projects WHERE owner_id = ? ORDER BY is_primary DESC, ref")
    .all(participantId) as Project[];
}

const ENTRY_SELECT = `
  SELECT e.*,
         pa.name AS participant_name,
         pa.ref  AS participant_ref,
         pr.name AS project_name,
         s.sprint_no AS sprint_no,
         s.date  AS date
    FROM entries e
    JOIN participants pa ON pa.id = e.participant_id
    JOIN sessions s      ON s.id  = e.session_id
    LEFT JOIN projects pr ON pr.id = e.project_id
`;

export function entriesForSession(sessionId: number): EntryRow[] {
  return db()
    .prepare(`${ENTRY_SELECT} WHERE e.session_id = ? ORDER BY pa.id`)
    .all(sessionId) as EntryRow[];
}

export function entriesForParticipant(participantId: number): EntryRow[] {
  return db()
    .prepare(`${ENTRY_SELECT} WHERE e.participant_id = ? ORDER BY s.sprint_no`)
    .all(participantId) as EntryRow[];
}

export function entriesForProgramme(programmeId: number): EntryRow[] {
  return db()
    .prepare(`${ENTRY_SELECT} WHERE e.programme_id = ? ORDER BY s.sprint_no, pa.id`)
    .all(programmeId) as EntryRow[];
}

export function entryById(entryId: number): EntryRow | undefined {
  return db().prepare(`${ENTRY_SELECT} WHERE e.id = ?`).get(entryId) as EntryRow | undefined;
}

export function entryFor(sessionId: number, participantId: number): EntryRow | undefined {
  return db()
    .prepare(`${ENTRY_SELECT} WHERE e.session_id = ? AND e.participant_id = ?`)
    .get(sessionId, participantId) as EntryRow | undefined;
}

export function targetsFor(programmeId: number): TargetRow[] {
  return db()
    .prepare(
      `SELECT t.*, pa.name AS owner_name, pr.name AS project_name
         FROM targets t
         LEFT JOIN participants pa ON pa.id = t.owner_id
         LEFT JOIN projects pr     ON pr.id = t.project_id
        WHERE t.programme_id = ?
        ORDER BY t.ref`,
    )
    .all(programmeId) as TargetRow[];
}

export function listValues(programmeId: number, category: string): string[] {
  return (
    db()
      .prepare("SELECT value FROM lists WHERE programme_id = ? AND category = ? ORDER BY sort_order")
      .all(programmeId, category) as { value: string }[]
  ).map((r) => r.value);
}

/** The next session on or after today, else the last one. */
export function nextSession(programmeId: number): Session | undefined {
  const today = todayIso();
  const upcoming = db()
    .prepare(
      "SELECT * FROM sessions WHERE programme_id = ? AND date >= ? ORDER BY date LIMIT 1",
    )
    .get(programmeId, today) as Session | undefined;
  if (upcoming) return upcoming;
  return db()
    .prepare("SELECT * FROM sessions WHERE programme_id = ? ORDER BY date DESC LIMIT 1")
    .get(programmeId) as Session | undefined;
}

export type Tally = {
  targetsSet: number;
  complete: number;
  partial: number;
  blocked: number;
  absent: number;
  notStarted: number;
  completionRate: number;
};

function emptyTally(): Tally {
  return {
    targetsSet: 0,
    complete: 0,
    partial: 0,
    blocked: 0,
    absent: 0,
    notStarted: 0,
    completionRate: 0,
  };
}

/**
 * Counts a set of entries the way the workbook's Dashboard does.
 * "Targets set" is any row whose target field has been filled in.
 */
export function tally(entries: EntryRow[]): Tally {
  const t = emptyTally();
  for (const e of entries) {
    if (e.target.trim() !== "") t.targetsSet++;
    if (e.status === "Complete") t.complete++;
    else if (e.status === "Partial") t.partial++;
    else if (e.status === "Blocked") t.blocked++;
    else if (e.status === "Absent") t.absent++;
    else if (e.status === "Not started") t.notStarted++;
  }
  t.completionRate = t.targetsSet === 0 ? 0 : t.complete / t.targetsSet;
  return t;
}

export type Dashboard = {
  totals: Tally;
  sessionsRun: number;
  next: Session | undefined;
  bySprint: { session: Session; tally: Tally }[];
  byParticipant: { participant: Participant; primaryProject: string | null; tally: Tally }[];
};

export function dashboard(programme: Programme): Dashboard {
  const entries = entriesForProgramme(programme.id);
  const sessions = sessionsFor(programme.id);
  const participants = participantsFor(programme.id);
  const today = todayIso();
  const projects = projectsFor(programme.id);

  return {
    totals: tally(entries),
    sessionsRun: sessions.filter((s) => s.date < today).length,
    next: nextSession(programme.id),
    bySprint: sessions.map((session) => ({
      session,
      tally: tally(entries.filter((e) => e.session_id === session.id)),
    })),
    byParticipant: participants.map((participant) => ({
      participant,
      primaryProject:
        projects.find((p) => p.owner_id === participant.id && p.is_primary === 1)?.name ??
        projects.find((p) => p.owner_id === participant.id)?.name ??
        null,
      tally: tally(entries.filter((e) => e.participant_id === participant.id)),
    })),
  };
}
