import { programmeByCode } from "@/lib/programme";
import { entriesForProgramme } from "@/lib/queries";

const HEADERS: [string, string][] = [
  ["record_id", "Record ID"],
  ["sprint_no", "Sprint"],
  ["date", "Date"],
  ["participant_name", "Participant"],
  ["project_name", "Project"],
  ["stage_at_start", "Stage at start"],
  ["target", "Today I will… (target)"],
  ["why_it_matters", "Why this matters"],
  ["definition_of_done", "Definition of done (observable)"],
  ["scope_limit", "Scope limit"],
  ["tools", "Tools"],
  ["starting_point", "Starting point"],
  ["main_risk", "Main risk"],
  ["fallback", "Fallback approach"],
  ["ai_used_for", "AI used for"],
  ["result", 'Result — "This now works…"'],
  ["evidence", "Evidence (link / screenshot / commit)"],
  ["what_changed", "What changed"],
  ["next_possibility", "Next possibility"],
  ["status", "Status"],
  ["minutes_delta", "Minutes over/under"],
  ["facilitator_notes", "Facilitator notes"],
];

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const programme = programmeByCode(code);
  if (!programme) return new Response("Not found", { status: 404 });

  const entries = entriesForProgramme(programme.id);
  const lines = [HEADERS.map(([, label]) => csvCell(label)).join(",")];
  for (const entry of entries) {
    const row = entry as unknown as Record<string, unknown>;
    lines.push(HEADERS.map(([key]) => csvCell(row[key])).join(","));
  }

  const filename = `${programme.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-sprint-log.csv`;
  // BOM so Excel opens the UTF-8 characters in the headers correctly.
  return new Response(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
