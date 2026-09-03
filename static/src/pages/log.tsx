import React from "react";
import { downloadFile, sprintLogCsv } from "../csv";
import { formatDate } from "../../../src/lib/dates";
import { participantName, projectName, recordId } from "../derive";
import type { SProgramme } from "../model";
import { SectionTitle, StatusBadge } from "../ui";

/** The workbook's Sprint Log, column for column. */
const COLUMNS: { key: string; label: string; wide?: boolean }[] = [
  { key: "recordId", label: "Record ID" },
  { key: "sprintNo", label: "Sprint" },
  { key: "date", label: "Date" },
  { key: "participant", label: "Participant" },
  { key: "project", label: "Project" },
  { key: "stageAtStart", label: "Stage at start" },
  { key: "target", label: "Today I will… (target)", wide: true },
  { key: "whyItMatters", label: "Why this matters", wide: true },
  { key: "definitionOfDone", label: "Definition of done", wide: true },
  { key: "scopeLimit", label: "Scope limit", wide: true },
  { key: "tools", label: "Tools" },
  { key: "startingPoint", label: "Starting point", wide: true },
  { key: "mainRisk", label: "Main risk", wide: true },
  { key: "fallback", label: "Fallback approach", wide: true },
  { key: "aiUsedFor", label: "AI used for" },
  { key: "result", label: 'Result — "This now works…"', wide: true },
  { key: "evidence", label: "Evidence" },
  { key: "whatChanged", label: "What changed", wide: true },
  { key: "nextPossibility", label: "Next possibility", wide: true },
  { key: "status", label: "Status" },
  { key: "minutesDelta", label: "Min ±" },
  { key: "facilitatorNotes", label: "Facilitator notes", wide: true },
];

export function LogPage({ programme }: { programme: SProgramme }) {
  const rows = [...programme.entries].sort(
    (a, b) => a.sprintNo - b.sprintNo || a.participantId.localeCompare(b.participantId),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle
          eyebrow="Sprint log"
          title="Every row, every column"
          description="One row per participant per sprint — the same shape as the workbook."
        />
        <button
          type="button"
          className="btn-secondary"
          onClick={() =>
            downloadFile(
              `${programme.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-sprint-log.csv`,
              sprintLogCsv(programme),
              "text/csv;charset=utf-8",
            )
          }
        >
          Download CSV
        </button>
      </div>

      <p className="text-xs text-ink-400 sm:hidden">Swipe the table sideways to see every column.</p>

      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-ink-200 bg-ink-50 text-left">
            <tr className="text-xs font-semibold uppercase tracking-wide text-ink-600">
              {COLUMNS.map((c) => (
                <th key={c.key} className={`px-3 py-3 ${c.wide ? "min-w-64" : "min-w-28"}`}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-200 align-top">
            {rows.map((e) => {
              const session = programme.sessions.find((s) => s.sprintNo === e.sprintNo);
              const flat: Record<string, unknown> = {
                ...e,
                recordId: recordId(programme, e.sprintNo, e.participantId),
                date: session ? formatDate(session.date) : "",
                participant: participantName(programme, e.participantId),
                project: projectName(programme, e.projectId) ?? "",
              };
              return (
                <tr key={e.id}>
                  {COLUMNS.map((c) => {
                    const value = flat[c.key];
                    return (
                      <td key={c.key} className="px-3 py-3 text-ink-600">
                        {c.key === "status" ? (
                          <StatusBadge status={e.status} />
                        ) : c.key === "recordId" ? (
                          <span className="font-mono text-xs text-ink-400">{String(value)}</span>
                        ) : value === null || value === undefined || value === "" ? (
                          <span className="text-ink-200">—</span>
                        ) : (
                          String(value)
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
