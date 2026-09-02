import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, programmeByCode } from "@/lib/programme";
import { entriesForProgramme } from "@/lib/queries";
import { SectionTitle, StatusBadge } from "@/components/ui";

/** The workbook's Sprint Log, column for column. */
const COLUMNS: { key: string; label: string; wide?: boolean }[] = [
  { key: "record_id", label: "Record ID" },
  { key: "sprint_no", label: "Sprint" },
  { key: "date", label: "Date" },
  { key: "participant_name", label: "Participant" },
  { key: "project_name", label: "Project" },
  { key: "stage_at_start", label: "Stage at start" },
  { key: "target", label: "Today I will… (target)", wide: true },
  { key: "why_it_matters", label: "Why this matters", wide: true },
  { key: "definition_of_done", label: "Definition of done", wide: true },
  { key: "scope_limit", label: "Scope limit", wide: true },
  { key: "tools", label: "Tools" },
  { key: "starting_point", label: "Starting point", wide: true },
  { key: "main_risk", label: "Main risk", wide: true },
  { key: "fallback", label: "Fallback approach", wide: true },
  { key: "ai_used_for", label: "AI used for" },
  { key: "result", label: 'Result — "This now works…"', wide: true },
  { key: "evidence", label: "Evidence" },
  { key: "what_changed", label: "What changed", wide: true },
  { key: "next_possibility", label: "Next possibility", wide: true },
  { key: "status", label: "Status" },
  { key: "minutes_delta", label: "Min ±" },
  { key: "facilitator_notes", label: "Facilitator notes", wide: true },
];

export default async function LogPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const programme = programmeByCode(code);
  if (!programme) notFound();

  const entries = entriesForProgramme(programme.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle
          eyebrow="Sprint log"
          title="Every row, every column"
          description="One row per participant per sprint — the same shape as the workbook."
        />
        <Link href={`/p/${programme.join_code}/log/export`} className="btn-secondary" prefetch={false}>
          Download CSV
        </Link>
      </div>

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
            {entries.map((e) => {
              const row = e as unknown as Record<string, unknown>;
              return (
                <tr key={e.id}>
                  {COLUMNS.map((c) => {
                    const value = row[c.key];
                    return (
                      <td key={c.key} className="px-3 py-3 text-ink-600">
                        {c.key === "status" ? (
                          <StatusBadge status={e.status} />
                        ) : c.key === "record_id" ? (
                          <span className="font-mono text-xs text-ink-400">{e.record_id}</span>
                        ) : c.key === "date" ? (
                          formatDate(e.date)
                        ) : value === null || value === "" ? (
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
