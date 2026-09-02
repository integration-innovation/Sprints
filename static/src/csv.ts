import { projectName, participantName, recordId } from "./derive";
import type { SProgramme } from "./model";

const COLUMNS: [string, string][] = [
  ["recordId", "Record ID"],
  ["sprintNo", "Sprint"],
  ["date", "Date"],
  ["participant", "Participant"],
  ["project", "Project"],
  ["stageAtStart", "Stage at start"],
  ["target", "Today I will… (target)"],
  ["whyItMatters", "Why this matters"],
  ["definitionOfDone", "Definition of done (observable)"],
  ["scopeLimit", "Scope limit"],
  ["tools", "Tools"],
  ["startingPoint", "Starting point"],
  ["mainRisk", "Main risk"],
  ["fallback", "Fallback approach"],
  ["aiUsedFor", "AI used for"],
  ["result", 'Result — "This now works…"'],
  ["evidence", "Evidence (link / screenshot / commit)"],
  ["whatChanged", "What changed"],
  ["nextPossibility", "Next possibility"],
  ["status", "Status"],
  ["minutesDelta", "Minutes over/under"],
  ["facilitatorNotes", "Facilitator notes"],
];

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export function sprintLogCsv(programme: SProgramme): string {
  const rows = [...programme.entries].sort(
    (a, b) => a.sprintNo - b.sprintNo || a.participantId.localeCompare(b.participantId),
  );

  const lines = [COLUMNS.map(([, label]) => cell(label)).join(",")];
  for (const e of rows) {
    const session = programme.sessions.find((s) => s.sprintNo === e.sprintNo);
    const flat: Record<string, unknown> = {
      ...e,
      recordId: recordId(programme, e.sprintNo, e.participantId),
      date: session?.date ?? "",
      participant: participantName(programme, e.participantId),
      project: projectName(programme, e.projectId) ?? "",
    };
    lines.push(COLUMNS.map(([key]) => cell(flat[key])).join(","));
  }

  // BOM so Excel reads the UTF-8 characters in the headers correctly.
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** Browsers block downloads in some embedded contexts, so callers surface failures. */
export function downloadFile(filename: string, contents: string, type: string): void {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
