import React from "react";
import { formatDate } from "../../../src/lib/dates";
import { primaryProjectName, sessionsRun, tally } from "../derive";
import type { SProgramme } from "../model";
import { nextSession } from "../store";
import { Bar, SectionTitle, Stat, StatusBadge } from "../ui";

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function DashboardPage({ programme }: { programme: SProgramme }) {
  const totals = tally(programme.entries);
  const upcoming = nextSession(programme);
  const updates = programme.entries
    .filter((entry) => entry.target.trim() || entry.status !== "Not started")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 12);

  return (
    <div className="space-y-10">
      <SectionTitle
        eyebrow="Working status report"
        title="Team progress at a glance"
        description="A live roll-up of commitments, outcomes, blockers and next actions from every member's sprint log."
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Targets set" value={totals.targetsSet} />
        <Stat label="Complete" value={totals.complete} />
        <Stat label="Partial" value={totals.partial} />
        <Stat label="Blocked" value={totals.blocked} />
        <Stat label="Absent" value={totals.absent} />
        <Stat label="Completion rate" value={pct(totals.completionRate)} sub="complete ÷ targets set" />
        <Stat label="Sessions run to date" value={sessionsRun(programme)} />
        <Stat
          label="Next session"
          value={upcoming ? formatDate(upcoming.date) : "—"}
          sub={upcoming ? `Sprint ${String(upcoming.sprintNo).padStart(2, "0")}` : undefined}
        />
      </section>

      <section>
        <SectionTitle
          title="Latest member updates"
          description="Use this as the short working report: who owns the work, its current status, what changed, and what happens next."
        />
        <div className="card overflow-x-auto">
          {updates.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-400">
              No updates yet. Members' targets and results will appear here automatically.
            </p>
          ) : (
            <table className="w-full min-w-[58rem] text-sm">
              <thead className="border-b border-ink-200 bg-ink-50 text-left">
                <tr className="text-xs font-semibold uppercase tracking-wide text-ink-600">
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Sprint</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Working target</th>
                  <th className="px-4 py-3">What changed / result</th>
                  <th className="px-4 py-3">Next action</th>
                  <th className="px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-200">
                {updates.map((entry) => {
                  const person = programme.participants.find((p) => p.id === entry.participantId);
                  return (
                    <tr key={entry.id}>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-ink-900">{person?.name ?? "Unknown"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-600">S{String(entry.sprintNo).padStart(2, "0")}</td>
                      <td className="px-4 py-3"><StatusBadge status={entry.status} /></td>
                      <td className="max-w-xs px-4 py-3 text-ink-800">{entry.target || "—"}</td>
                      <td className="max-w-xs px-4 py-3 text-ink-600">{entry.whatChanged || entry.result || "—"}</td>
                      <td className="max-w-xs px-4 py-3 text-ink-600">{entry.nextPossibility || entry.fallback || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-400">{new Date(entry.updatedAt).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section>
        <SectionTitle title="By sprint" />
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
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
              {programme.sessions.map((session) => {
                const t = tally(programme.entries.filter((e) => e.sprintNo === session.sprintNo));
                return (
                  <tr key={session.sprintNo}>
                    <td className="px-4 py-3 font-medium text-ink-900">
                      S{String(session.sprintNo).padStart(2, "0")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-600">{formatDate(session.date)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{t.targetsSet}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-emerald-700">{t.complete}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-amber-700">{t.partial}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-rose-700">{t.blocked}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-400">{t.absent}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {pct(t.completionRate)}
                    </td>
                    <td className="px-4 py-3">
                      <Bar
                        complete={t.complete}
                        partial={t.partial}
                        blocked={t.blocked}
                        total={t.targetsSet}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <SectionTitle title="By participant" />
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
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
              {programme.participants.map((person) => {
                const t = tally(programme.entries.filter((e) => e.participantId === person.id));
                return (
                  <tr key={person.id}>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-ink-900">{person.name}</td>
                    <td className="px-4 py-3 text-ink-600">
                      {primaryProjectName(programme, person.id) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{t.targetsSet}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-emerald-700">{t.complete}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-amber-700">{t.partial}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-rose-700">{t.blocked}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-400">{t.absent}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {pct(t.completionRate)}
                    </td>
                    <td className="px-4 py-3">
                      <Bar
                        complete={t.complete}
                        partial={t.partial}
                        blocked={t.blocked}
                        total={t.targetsSet}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
