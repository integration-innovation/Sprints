import Link from "next/link";
import { notFound } from "next/navigation";
import { GROUND_RULES, RUN_SHEET } from "@/lib/defaults";
import { formatDate, programmeByCode, todayIso } from "@/lib/programme";
import { dashboard, entriesForSession, nextSession, sessionsFor } from "@/lib/queries";
import { participantIn } from "@/lib/session";
import { Chips, SectionTitle, Stat, StatusBadge } from "@/components/ui";

export default async function ProgrammeOverview({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const programme = programmeByCode(code);
  if (!programme) notFound();

  const me = await participantIn(programme);
  const sessions = sessionsFor(programme.id);
  const upcoming = nextSession(programme.id);
  const view = dashboard(programme);
  const upcomingEntries = upcoming ? entriesForSession(upcoming.id) : [];
  const today = todayIso();

  return (
    <div className="space-y-10">
      {programme.tagline ? <p className="text-ink-600">{programme.tagline}</p> : null}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Sprints" value={sessions.length} sub={`every ${programme.cadence_weeks} weeks`} />
        <Stat label="Participants" value={view.byParticipant.length} />
        <Stat label="Targets set" value={view.totals.targetsSet} sub="across the programme" />
        <Stat
          label="Completion rate"
          value={`${Math.round(view.totals.completionRate * 100)}%`}
          sub={`${view.totals.complete} complete of ${view.totals.targetsSet} set`}
        />
      </section>

      {upcoming ? (
        <section className="card overflow-hidden">
          <div className="border-b border-ink-200 bg-accent-50 px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent-700">
              {upcoming.date >= today ? "Next session" : "Latest session"}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-ink-900">
              Sprint {String(upcoming.sprint_no).padStart(2, "0")} · {formatDate(upcoming.date)}
            </h2>
            <p className="mt-0.5 text-sm text-ink-600">
              {upcoming.day} · {upcoming.time}
            </p>
          </div>
          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <SectionTitle title="Session prompt" />
              <p className="text-sm leading-relaxed text-ink-800">{upcoming.prompt}</p>
              <div className="mt-5">
                <p className="label">Possible targets</p>
                <div className="mt-2">
                  <Chips value={upcoming.possible_targets} />
                </div>
              </div>
              <p className="mt-5 text-sm text-ink-600">
                <span className="font-semibold text-ink-800">Expected outcome:</span>{" "}
                {upcoming.expected_outcome}
              </p>
              {me ? (
                <Link
                  href={`/p/${programme.join_code}/me?sprint=${upcoming.sprint_no}`}
                  className="btn-primary mt-6"
                >
                  Set my target for Sprint {upcoming.sprint_no}
                </Link>
              ) : (
                <Link href={`/join?code=${programme.join_code}`} className="btn-primary mt-6">
                  Join to set a target
                </Link>
              )}
            </div>
            <div>
              <SectionTitle title="Who's ready" description="Targets set for this sprint." />
              <ul className="divide-y divide-ink-200 rounded-lg border border-ink-200">
                {upcomingEntries.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-ink-400">No participants yet.</li>
                ) : (
                  upcomingEntries.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <span className="truncate text-sm text-ink-800">{e.participant_name}</span>
                      {e.target.trim() ? (
                        <StatusBadge status={e.status} />
                      ) : (
                        <span className="shrink-0 text-xs text-ink-400">no target yet</span>
                      )}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      <section>
        <SectionTitle
          eyebrow="How an hour runs"
          title="60-minute run sheet"
          description="Plan in the first ten minutes, record the result in the last ten."
        />
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {RUN_SHEET.map((step) => (
            <li key={step.window} className="card p-4">
              <p className="font-mono text-xs text-accent-600">{step.window}</p>
              <p className="mt-1 text-sm font-semibold text-ink-900">{step.phase}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-600">{step.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <SectionTitle title="Core principle" />
          <p className="text-sm leading-relaxed text-ink-800">{programme.core_principle}</p>
          <div className="mt-6">
            <p className="label">Target formula</p>
            <p className="mt-2 rounded-lg bg-ink-100 px-4 py-3 font-mono text-sm text-ink-800">
              {programme.target_formula}
            </p>
          </div>
        </div>
        <div className="card p-6">
          <SectionTitle title="Ground rules" />
          <dl className="space-y-3">
            {GROUND_RULES.map((r) => (
              <div key={r.rule} className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-4">
                <dt className="text-sm font-semibold text-ink-900">{r.rule}</dt>
                <dd className="text-sm text-ink-600">{r.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  );
}
