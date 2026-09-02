import Link from "next/link";
import { notFound } from "next/navigation";
import { saveFacilitatorNotesAction, saveSessionAction } from "@/lib/actions";
import { formatDate, programmeByCode } from "@/lib/programme";
import { entriesForSession, sessionByNo, tally } from "@/lib/queries";
import { participantIn } from "@/lib/session";
import { Chips, Field, SectionTitle, Stat, StatusBadge } from "@/components/ui";

export default async function SprintPage({
  params,
}: {
  params: Promise<{ code: string; n: string }>;
}) {
  const { code, n } = await params;
  const programme = programmeByCode(code);
  if (!programme) notFound();

  const session = sessionByNo(programme.id, Number(n));
  if (!session) notFound();

  const me = await participantIn(programme);
  const entries = entriesForSession(session.id);
  const t = tally(entries);

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/p/${programme.join_code}/board`} className="text-sm text-ink-400 hover:text-ink-600">
          ← All sprints
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-ink-900">
          Sprint {String(session.sprint_no).padStart(2, "0")} · {formatDate(session.date)}
        </h1>
        <p className="mt-1 text-sm text-ink-600">
          {session.day} · {session.time}
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Targets set" value={t.targetsSet} sub={`of ${entries.length} participants`} />
        <Stat label="Complete" value={t.complete} />
        <Stat label="Partial" value={t.partial} />
        <Stat label="Blocked" value={t.blocked} />
      </section>

      <section className="card p-6">
        <SectionTitle title="Session prompt" />
        <p className="text-sm leading-relaxed text-ink-800">{session.prompt}</p>
        <div className="mt-5">
          <p className="label">Possible targets</p>
          <div className="mt-2">
            <Chips value={session.possible_targets} />
          </div>
        </div>
        <p className="mt-5 text-sm text-ink-600">
          <span className="font-semibold text-ink-800">Expected outcome:</span>{" "}
          {session.expected_outcome}
        </p>
      </section>

      <section>
        <SectionTitle
          title="Sprint log for this session"
          description="One row per participant. Plan on the left, result on the right."
        />
        <div className="space-y-3">
          {entries.map((e) => (
            <article key={e.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="font-mono text-xs text-ink-400">{e.record_id}</span>
                  <h3 className="mt-0.5 text-base font-semibold text-ink-900">
                    {e.participant_name}
                  </h3>
                  {e.project_name ? (
                    <p className="text-xs text-ink-400">{e.project_name}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  {e.minutes_delta !== null ? (
                    <span className="text-xs tabular-nums text-ink-400">
                      {e.minutes_delta > 0 ? `+${e.minutes_delta}` : e.minutes_delta} min
                    </span>
                  ) : null}
                  <StatusBadge status={e.status} />
                </div>
              </div>

              {e.target.trim() ? (
                <div className="mt-4 grid gap-5 lg:grid-cols-2">
                  <div className="space-y-3">
                    <div>
                      <p className="label">Target</p>
                      <p className="mt-1 text-sm text-ink-800">{e.target}</p>
                    </div>
                    {e.definition_of_done ? (
                      <div>
                        <p className="label">Definition of done</p>
                        <p className="mt-1 text-sm text-ink-600">{e.definition_of_done}</p>
                      </div>
                    ) : null}
                    {e.ai_used_for ? (
                      <div>
                        <p className="label">AI used for</p>
                        <div className="mt-1.5">
                          <Chips value={e.ai_used_for} />
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-3 lg:border-l lg:border-ink-200 lg:pl-5">
                    {e.result ? (
                      <div>
                        <p className="label">Result</p>
                        <p className="mt-1 text-sm text-ink-800">{e.result}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-ink-400">Result not recorded yet.</p>
                    )}
                    {e.evidence ? (
                      <div>
                        <p className="label">Evidence</p>
                        <p className="mt-1 text-sm text-ink-600">{e.evidence}</p>
                      </div>
                    ) : null}
                    {e.next_possibility ? (
                      <div>
                        <p className="label">Next possibility</p>
                        <p className="mt-1 text-sm text-ink-600">{e.next_possibility}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-ink-400">No target set for this sprint yet.</p>
              )}

              {me?.is_facilitator ? (
                <form
                  action={saveFacilitatorNotesAction}
                  className="mt-4 flex flex-wrap items-end gap-3 border-t border-ink-200 pt-4"
                >
                  <input type="hidden" name="code" value={programme.join_code} />
                  <input type="hidden" name="entry_id" value={e.id} />
                  <div className="min-w-64 flex-1">
                    <Field label="Facilitator notes">
                      <input
                        name="facilitator_notes"
                        defaultValue={e.facilitator_notes}
                        className="field"
                      />
                    </Field>
                  </div>
                  <button type="submit" className="btn-secondary">
                    Save note
                  </button>
                </form>
              ) : e.facilitator_notes ? (
                <p className="mt-4 border-t border-ink-200 pt-3 text-xs text-ink-400">
                  Facilitator: {e.facilitator_notes}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      {me?.is_facilitator ? (
        <section className="card p-6">
          <SectionTitle
            eyebrow="Facilitator"
            title="Edit this session"
            description="Move the date or reword the prompt; the log and dashboard follow."
          />
          <form action={saveSessionAction} className="space-y-5">
            <input type="hidden" name="code" value={programme.join_code} />
            <input type="hidden" name="session_id" value={session.id} />
            <input type="hidden" name="sprint_no" value={session.sprint_no} />
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Date">
                <input type="date" name="date" defaultValue={session.date} className="field" />
              </Field>
              <Field label="Day">
                <input name="day" defaultValue={session.day} className="field" />
              </Field>
              <Field label="Time">
                <input name="time" defaultValue={session.time} className="field" />
              </Field>
            </div>
            <Field label="Session prompt">
              <textarea name="prompt" rows={4} defaultValue={session.prompt} className="field" />
            </Field>
            <Field label="Possible targets" hint="Separate with semicolons.">
              <textarea
                name="possible_targets"
                rows={2}
                defaultValue={session.possible_targets}
                className="field"
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Expected outcome">
                <input
                  name="expected_outcome"
                  defaultValue={session.expected_outcome}
                  className="field"
                />
              </Field>
              <Field label="Facilitator notes">
                <input
                  name="facilitator_notes"
                  defaultValue={session.facilitator_notes}
                  className="field"
                />
              </Field>
            </div>
            <button type="submit" className="btn-primary">
              Save session
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
