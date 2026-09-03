import { notFound } from "next/navigation";
import { formatDate, programmeByCode } from "@/lib/programme";
import { dashboard } from "@/lib/queries";
import { SectionTitle, Stat } from "@/components/ui";

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/** A thin bar showing complete / partial / blocked out of targets set. */
function Bar({
  complete,
  partial,
  blocked,
  total,
}: {
  complete: number;
  partial: number;
  blocked: number;
  total: number;
}) {
  if (total === 0) return <div className="h-1.5 w-full rounded-full bg-ink-100" />;
  const w = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
      <div style={{ width: w(complete) }} className="bg-emerald-500" />
      <div style={{ width: w(partial) }} className="bg-amber-400" />
      <div style={{ width: w(blocked) }} className="bg-rose-500" />
    </div>
  );
}

export default async function DashboardPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const programme = programmeByCode(code);
  if (!programme) notFound();

  const view = dashboard(programme);

  return (
    <div className="space-y-10">
      <SectionTitle
        eyebrow="Dashboard"
        title="Programme totals"
        description="Derived from the sprint log — nothing here is entered by hand."
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Targets set" value={view.totals.targetsSet} />
        <Stat label="Complete" value={view.totals.complete} />
        <Stat label="Partial" value={view.totals.partial} />
        <Stat label="Blocked" value={view.totals.blocked} />
        <Stat label="Absent" value={view.totals.absent} />
        <Stat
          label="Completion rate"
          value={pct(view.totals.completionRate)}
          sub="complete ÷ targets set"
        />
        <Stat label="Sessions run to date" value={view.sessionsRun} />
        <Stat
          label="Next session"
          value={view.next ? formatDate(view.next.date) : "—"}
          sub={view.next ? `Sprint ${String(view.next.sprint_no).padStart(2, "0")}` : undefined}
        />
      </section>

      <section>
        <SectionTitle title="By sprint" />
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[48rem] text-sm">
            <thead className="border-b border-ink-200 bg-ink-50 text-left">
              <tr className="text-xs font-semibold uppercase tracking-wide text-ink-600">
                <th className="px-4 py-3">Sprint</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Targets set</th>
                <th className="px-4 py-3 text-right">Complete</th>
                <th className="px-4 py-3 text-right">Partial</th>
                <th className="px-4 py-3 text-right">Blocked</th>
                <th className="px-4 py-3 text-right">Absent</th>
                <th className="px-4 py-3 text-right">Rate</th>
                <th className="w-40 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-200">
              {view.bySprint.map(({ session, tally }) => (
                <tr key={session.id}>
                  <td className="px-4 py-3 font-medium text-ink-900">
                    S{String(session.sprint_no).padStart(2, "0")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-600">{formatDate(session.date)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{tally.targetsSet}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-700">{tally.complete}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-amber-700">{tally.partial}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-rose-700">{tally.blocked}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-400">{tally.absent}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {pct(tally.completionRate)}
                  </td>
                  <td className="px-4 py-3">
                    <Bar
                      complete={tally.complete}
                      partial={tally.partial}
                      blocked={tally.blocked}
                      total={tally.targetsSet}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <SectionTitle title="By participant" />
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[48rem] text-sm">
            <thead className="border-b border-ink-200 bg-ink-50 text-left">
              <tr className="text-xs font-semibold uppercase tracking-wide text-ink-600">
                <th className="px-4 py-3">Participant</th>
                <th className="px-4 py-3">Primary project</th>
                <th className="px-4 py-3 text-right">Targets set</th>
                <th className="px-4 py-3 text-right">Complete</th>
                <th className="px-4 py-3 text-right">Partial</th>
                <th className="px-4 py-3 text-right">Blocked</th>
                <th className="px-4 py-3 text-right">Absent</th>
                <th className="px-4 py-3 text-right">Rate</th>
                <th className="w-40 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-200">
              {view.byParticipant.map(({ participant, primaryProject, tally }) => (
                <tr key={participant.id}>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-ink-900">{participant.name}</td>
                  <td className="px-4 py-3 text-ink-600">{primaryProject ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{tally.targetsSet}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-700">{tally.complete}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-amber-700">{tally.partial}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-rose-700">{tally.blocked}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-400">{tally.absent}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {pct(tally.completionRate)}
                  </td>
                  <td className="px-4 py-3">
                    <Bar
                      complete={tally.complete}
                      partial={tally.partial}
                      blocked={tally.blocked}
                      total={tally.targetsSet}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
