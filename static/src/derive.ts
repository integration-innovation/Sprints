import { todayIso } from "../../src/lib/dates";
import type { SEntry, SProgramme } from "./model";

export type Tally = {
  targetsSet: number;
  complete: number;
  partial: number;
  blocked: number;
  absent: number;
  completionRate: number;
};

/** Counts entries the way the workbook's Dashboard does. */
export function tally(entries: SEntry[]): Tally {
  const t: Tally = {
    targetsSet: 0,
    complete: 0,
    partial: 0,
    blocked: 0,
    absent: 0,
    completionRate: 0,
  };
  for (const e of entries) {
    if (e.target.trim() !== "") t.targetsSet++;
    if (e.status === "Complete") t.complete++;
    else if (e.status === "Partial") t.partial++;
    else if (e.status === "Blocked") t.blocked++;
    else if (e.status === "Absent") t.absent++;
  }
  t.completionRate = t.targetsSet === 0 ? 0 : t.complete / t.targetsSet;
  return t;
}

export function sessionsRun(programme: SProgramme): number {
  const today = todayIso();
  return programme.sessions.filter((s) => s.date < today).length;
}

export function primaryProjectName(programme: SProgramme, participantId: string): string | null {
  const owned = programme.projects.filter((p) => p.ownerId === participantId);
  return owned.find((p) => p.isPrimary)?.name ?? owned[0]?.name ?? null;
}

export function projectName(programme: SProgramme, projectId: string | null): string | null {
  if (!projectId) return null;
  return programme.projects.find((p) => p.id === projectId)?.name ?? null;
}

export function participantName(programme: SProgramme, participantId: string): string {
  return programme.participants.find((p) => p.id === participantId)?.name ?? "Unknown";
}

/** Sxx-Pn style record id, derived from the participant's position in the roster. */
export function recordId(programme: SProgramme, sprintNo: number, participantId: string): string {
  const index = programme.participants.findIndex((p) => p.id === participantId);
  return `S${String(sprintNo).padStart(2, "0")}-P${index >= 0 ? index + 1 : "?"}`;
}
