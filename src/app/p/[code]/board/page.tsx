import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, programmeByCode, todayIso } from "@/lib/programme";
import { entriesForProgramme, sessionsFor, tally } from "@/lib/queries";
import { SectionTitle } from "@/components/ui";

export default async function BoardPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const programme = programmeByCode(code);
  if (!programme) notFound();

  const sessions = sessionsFor(programme.id);
  const entries = entriesForProgramme(programme.id);
  const today = todayIso();

  return (
    <div>
      <SectionTitle
        eyebrow="Sessions"
        title="All sprints"
        description="Each sprint stands alone — missing one should not make the next harder to join."
      />
      <ol className="space-y-3">
        {sessions.map((session) => {
          const t = tally(entries.filter((e) => e.session_id === session.id));
          const past = session.date < today;
          return (
            <li key={session.id}>
              <Link
                href={`/p/${programme.join_code}/sprint/${session.sprint_no}`}
                className="card block p-5 transition hover:border-accent-500"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <span className="font-mono text-xs text-ink-400">
                      S{String(session.sprint_no).padStart(2, "0")}
                    </span>
                    <h3 className="mt-0.5 text-base font-semibold text-ink-900">
                      {formatDate(session.date)} · {session.time}
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 text-sm tabular-nums text-ink-600">
                    <span>
                      <span className="font-semibold text-ink-900">{t.targetsSet}</span> targets
                    </span>
                    <span className="text-emerald-700">{t.complete} complete</span>
                    <span className="text-amber-700">{t.partial} partial</span>
                    <span className="text-rose-700">{t.blocked} blocked</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        past ? "bg-ink-100 text-ink-600" : "bg-accent-50 text-accent-700"
                      }`}
                    >
                      {past ? "Run" : "Upcoming"}
                    </span>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-ink-600">{session.prompt}</p>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
