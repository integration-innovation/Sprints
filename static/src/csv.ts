import { projectName, participantName, recordId } from "./derive";
import type { SEntry, SProgramme } from "./model";

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

/** One log row, flattened to the column keys both exports use. */
function flatRow(programme: SProgramme, entry: SEntry): Record<string, unknown> {
  const session = programme.sessions.find((s) => s.sprintNo === entry.sprintNo);
  return {
    ...entry,
    recordId: recordId(programme, entry.sprintNo, entry.participantId),
    date: session?.date ?? "",
    participant: participantName(programme, entry.participantId),
    project: projectName(programme, entry.projectId) ?? "",
  };
}

/**
 * A cell for pasting straight into a spreadsheet.
 *
 * Google Sheets splits pasted text on tabs and newlines, so a value containing
 * either would break the grid apart. CSV solves that with quoting, which Sheets
 * ignores on paste — it drops the lot into one column. Flattening is the only
 * thing that survives the clipboard, so line breaks become middots and the loss
 * is stated rather than hidden.
 */
function pasteCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/\r?\n+/g, " · ")
    .replace(/\t/g, " ")
    .trim();
}

/** The sprint log as tab-separated rows, for pasting into a Google Sheet. */
export function sprintLogTsv(programme: SProgramme): string {
  const rows = [...programme.entries].sort(
    (a, b) => a.sprintNo - b.sprintNo || a.participantId.localeCompare(b.participantId),
  );
  const lines = [COLUMNS.map(([, label]) => pasteCell(label)).join("\t")];
  for (const entry of rows) {
    const flat = flatRow(programme, entry);
    lines.push(COLUMNS.map(([key]) => pasteCell(flat[key])).join("\t"));
  }
  return lines.join("\n");
}

export function sprintLogCsv(programme: SProgramme): string {
  const rows = [...programme.entries].sort(
    (a, b) => a.sprintNo - b.sprintNo || a.participantId.localeCompare(b.participantId),
  );

  const lines = [COLUMNS.map(([, label]) => cell(label)).join(",")];
  for (const e of rows) {
    const flat = flatRow(programme, e);
    lines.push(COLUMNS.map(([key]) => cell(flat[key])).join(","));
  }

  // BOM so Excel reads the UTF-8 characters in the headers correctly.
  return `﻿${lines.join("\r\n")}\r\n`;
}

/**
 * Hands the viewer a file.
 *
 * A plain blob link is inert inside the claude.ai artifact viewer, so when that
 * host offers a downloads capability we go through it; everywhere else (GitHub
 * Pages, Netlify, a local file) the ordinary anchor is used.
 *
 * Resolves with what happened, and throws only when the save genuinely failed,
 * so callers can tell the viewer rather than appearing to do nothing.
 */
type DownloadsApi = {
  save: (request: { filename: string; data: string }) => Promise<{ status: string }>;
};
type ClaudeHost = { use?: (name: string) => Promise<DownloadsApi | null> };

export async function offerFile(
  filename: string,
  contents: string,
  type: string,
): Promise<"saved" | "declined" | "downloaded"> {
  const host = (window as { claude?: ClaudeHost }).claude;
  if (host?.use) {
    let downloads: DownloadsApi | null = null;
    try {
      downloads = await host.use("downloads");
    } catch {
      downloads = null;
    }
    if (downloads) {
      try {
        await downloads.save({ filename, data: contents });
        return "saved";
      } catch (error) {
        const code = (error as { code?: string })?.code;
        if (code === "declined") return "declined";
        throw new Error(
          code === "too_large"
            ? "That file is too large to save here."
            : "Couldn't save the file in this viewer.",
        );
      }
    }
  }

  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
