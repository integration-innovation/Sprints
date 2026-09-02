import { db } from "./db";
import {
  DEFAULT_CORE_PRINCIPLE,
  DEFAULT_LISTS,
  DEFAULT_TARGET_BANK,
  DEFAULT_TARGET_FORMULA,
  SESSION_TEMPLATES,
} from "./defaults";
import type { Participant, Programme } from "./types";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1

export function randomCode(length = 6): string {
  let out = "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return out;
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** yyyy-mm-dd, `weeks` after `iso`. Dates are handled as plain calendar days. */
export function addWeeks(iso: string, weeks: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + weeks * 7);
  return dt.toISOString().slice(0, 10);
}

export function weekdayName(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    weekday: "long",
    timeZone: "UTC",
  });
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export type CreateProgrammeInput = {
  name: string;
  tagline?: string;
  startDate: string;
  sprintCount: number;
  cadenceWeeks: number;
  sessionTime: string;
  facilitatorName: string;
  facilitatorEmail?: string;
};

/**
 * Creates a programme with its sessions, dropdown lists, seed target bank and
 * the facilitator as first participant. Returns the programme and that participant.
 */
export function createProgramme(input: CreateProgrammeInput): {
  programme: Programme;
  facilitator: Participant;
} {
  const conn = db();

  return conn.transaction(() => {
    let joinCode = randomCode();
    while (conn.prepare("SELECT 1 FROM programmes WHERE join_code = ?").get(joinCode)) {
      joinCode = randomCode();
    }

    const info = conn
      .prepare(
        `INSERT INTO programmes
           (name, tagline, core_principle, target_formula, join_code, admin_code,
            cadence_weeks, session_day, session_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.name,
        input.tagline ?? "",
        DEFAULT_CORE_PRINCIPLE,
        DEFAULT_TARGET_FORMULA,
        joinCode,
        randomCode(8),
        input.cadenceWeeks,
        weekdayName(input.startDate),
        input.sessionTime,
      );
    const programmeId = Number(info.lastInsertRowid);

    const insertSession = conn.prepare(
      `INSERT INTO sessions
         (programme_id, sprint_no, date, day, time, prompt, possible_targets, expected_outcome)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (let i = 0; i < input.sprintCount; i++) {
      const date = addWeeks(input.startDate, i * input.cadenceWeeks);
      const tpl = SESSION_TEMPLATES[i % SESSION_TEMPLATES.length];
      insertSession.run(
        programmeId,
        i + 1,
        date,
        weekdayName(date),
        input.sessionTime,
        tpl.prompt,
        tpl.possible_targets,
        tpl.expected_outcome,
      );
    }

    const insertList = conn.prepare(
      "INSERT INTO lists (programme_id, category, value, sort_order) VALUES (?, ?, ?, ?)",
    );
    for (const [category, values] of Object.entries(DEFAULT_LISTS)) {
      values.forEach((value, i) => insertList.run(programmeId, category, value, i));
    }

    const insertTarget = conn.prepare(
      "INSERT INTO targets (programme_id, ref, too_large_idea, sprint_target) VALUES (?, ?, ?, ?)",
    );
    DEFAULT_TARGET_BANK.forEach((t, i) =>
      insertTarget.run(programmeId, `T-${pad2(i + 1)}`, t.too_large_idea, t.sprint_target),
    );

    const facilitator = addParticipant(programmeId, {
      name: input.facilitatorName,
      email: input.facilitatorEmail ?? "",
      role: "Facilitator / builder",
      isFacilitator: true,
    });

    const programme = conn
      .prepare("SELECT * FROM programmes WHERE id = ?")
      .get(programmeId) as Programme;
    return { programme, facilitator };
  })();
}

export type AddParticipantInput = {
  name: string;
  email?: string;
  role?: string;
  organisation?: string;
  preferredTools?: string;
  isFacilitator?: boolean;
};

/** Adds a participant and materialises their Sprint Log row for every session. */
export function addParticipant(programmeId: number, input: AddParticipantInput): Participant {
  const conn = db();

  const count = conn
    .prepare("SELECT COUNT(*) AS n FROM participants WHERE programme_id = ?")
    .get(programmeId) as { n: number };
  const ref = `P${count.n + 1}`;

  const info = conn
    .prepare(
      `INSERT INTO participants
         (programme_id, ref, name, role, organisation, preferred_tools, email, is_facilitator)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      programmeId,
      ref,
      input.name,
      input.role ?? "Builder",
      input.organisation ?? "",
      input.preferredTools ?? "",
      input.email ?? "",
      input.isFacilitator ? 1 : 0,
    );

  const participantId = Number(info.lastInsertRowid);
  ensureEntries(programmeId);
  return conn.prepare("SELECT * FROM participants WHERE id = ?").get(participantId) as Participant;
}

/**
 * Guarantees one Sprint Log row per participant per session — the workbook's
 * pre-seeded grid. Safe to call repeatedly.
 */
export function ensureEntries(programmeId: number): void {
  const conn = db();
  const sessions = conn
    .prepare("SELECT id, sprint_no FROM sessions WHERE programme_id = ? ORDER BY sprint_no")
    .all(programmeId) as { id: number; sprint_no: number }[];
  const participants = conn
    .prepare("SELECT id, ref FROM participants WHERE programme_id = ? ORDER BY id")
    .all(programmeId) as { id: number; ref: string }[];

  const insert = conn.prepare(
    `INSERT OR IGNORE INTO entries (programme_id, record_id, session_id, participant_id)
     VALUES (?, ?, ?, ?)`,
  );
  conn.transaction(() => {
    for (const s of sessions) {
      for (const p of participants) {
        insert.run(programmeId, `S${pad2(s.sprint_no)}-${p.ref}`, s.id, p.id);
      }
    }
  })();
}

export function programmeByCode(code: string): Programme | undefined {
  return db()
    .prepare("SELECT * FROM programmes WHERE join_code = ?")
    .get(code.toUpperCase()) as Programme | undefined;
}
