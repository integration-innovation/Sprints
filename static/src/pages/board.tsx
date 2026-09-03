import React from "react";
import { formatDate, todayIso } from "../../../src/lib/dates";
import { participantName, projectName, recordId, tally } from "../derive";
import type { SParticipant, SProgramme } from "../model";
import { Link, navigate } from "../router";
import { appendSession, updateEntry, updateSession } from "../store";
import { Chips, Field, SectionTitle, Stat, StatusBadge } from "../ui";

export function BoardPage({ programme, me }: { programme: SProgramme; me: SParticipant | undefined }) {
  const today = todayIso();
  return (
    <div>
      <SectionTitle
        eyebrow="Sessions"
        title="All sprints"
        description="Each sprint stands alone — missing one should not make the next harder to join."
      />
      <ol className="space-y-3">
        {programme.sessions.map((session) => {
          const t = tally(programme.entries.filter((e) => e.sprintNo === session.sprintNo));
          const past = session.date < today;
          return (
            <li key={session.sprintNo}>
              <Link
                to={`/p/${programme.id}/sprint/${session.sprintNo}`}
                className="card block p-5 transition hover:border-accent-500"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <span className="font-mono text-xs text-ink-400">
                      S{String(session.sprintNo).padStart(2, "0")}
                    </span>
                    <h3 className="mt-0.5 text-base font-semibold text-ink-900">
                      {formatDate(session.date)} · {session.time}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm tabular-nums text-ink-600">
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
      {me?.isFacilitator ? (
        <section className="card mt-6 flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="font-semibold text-ink-900">Continue with another sprint</p>
            <p className="mt-1 text-sm text-ink-600">Adds the next independent session using this programme's cadence. Participants may return, join, or choose a different project.</p>
          </div>
          <button type="button" className="btn-primary" onClick={() => {
            const sprintNo = appendSession(programme.id);
            if (sprintNo) navigate(`/p/${programme.id}/sprint/${sprintNo}`);
          }}>Add next sprint</button>
        </section>
      ) : null}
    </div>
  );
}

export function SprintPage({
  programme,
  me,
  sprintNo,
}: {
  programme: SProgramme;
  me: SParticipant | undefined;
  sprintNo: number;
}) {
  const session = programme.sessions.find((s) => s.sprintNo === sprintNo);
  if (!session) return <p className="text-sm text-ink-600">No such sprint.</p>;

  const entries = programme.entries.filter((e) => e.sprintNo === sprintNo);
  const t = tally(entries);

  function saveSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();
    updateSession(programme.id, sprintNo, {
      date: get("date"),
      day: get("day"),
      time: get("time"),
      prompt: get("prompt"),
      possibleTargets: get("possibleTargets"),
      expectedOutcome: get("expectedOutcome"),
      facilitatorNotes: get("facilitatorNotes"),
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <Link to={`/p/${programme.id}/board`} className="inline-block py-1 text-sm text-ink-400 hover:text-ink-600">
          ← All sprints
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-ink-900">
          Sprint {String(session.sprintNo).padStart(2, "0")} · {formatDate(session.date)}
        </h1>
        <p className="mt-1 text-sm text-ink-600">
          {session.day} · {session.time}
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Targets set" value={t.targetsSet} sub={`of ${entries.length} people`} />
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
            <Chips value={session.possibleTargets} />
          </div>
        </div>
        <p className="mt-5 text-sm text-ink-600">
          <span className="font-semibold text-ink-800">Expected outcome:</span>{" "}
          {session.expectedOutcome}
        </p>
      </section>

      <section>
        <SectionTitle
          title="Sprint log for this session"
          description="Everyone whose export has been merged into this device."
        />
        <div className="space-y-3">
          {entries.map((e) => (
            <article key={e.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="font-mono text-xs text-ink-400">
                    {recordId(programme, e.sprintNo, e.participantId)}
                  </span>
                  <h3 className="mt-0.5 text-base font-semibold text-ink-900">
                    {participantName(programme, e.participantId)}
                  </h3>
                  {projectName(programme, e.projectId) ? (
                    <p className="text-xs text-ink-400">{projectName(programme, e.projectId)}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  {e.minutesDelta !== null ? (
                    <span className="text-xs tabular-nums text-ink-400">
                      {e.minutesDelta > 0 ? `+${e.minutesDelta}` : e.minutesDelta} min
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
                    {e.definitionOfDone ? (
                      <div>
                        <p className="label">Definition of done</p>
                        <p className="mt-1 text-sm text-ink-600">{e.definitionOfDone}</p>
                      </div>
                    ) : null}
                    {e.aiUsedFor ? (
                      <div>
                        <p className="label">AI used for</p>
                        <div className="mt-1.5">
                          <Chips value={e.aiUsedFor} />
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
                    {e.nextPossibility ? (
                      <div>
                        <p className="label">Next possibility</p>
                        <p className="mt-1 text-sm text-ink-600">{e.nextPossibility}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-ink-400">No target set for this sprint yet.</p>
              )}

              {me?.isFacilitator ? (
                <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-ink-200 pt-4">
                  <div className="min-w-64 flex-1">
                    <Field label="Facilitator notes">
                      <input
                        defaultValue={e.facilitatorNotes}
                        onBlur={(ev) =>
                          updateEntry(programme.id, e.sprintNo, e.participantId, {
                            facilitatorNotes: ev.target.value,
                          })
                        }
                        className="field"
                      />
                    </Field>
                  </div>
                </div>
              ) : e.facilitatorNotes ? (
                <p className="mt-4 border-t border-ink-200 pt-3 text-xs text-ink-400">
                  Facilitator: {e.facilitatorNotes}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      {me?.isFacilitator ? (
        <section className="card p-6">
          <SectionTitle
            eyebrow="Facilitator"
            title="Edit this session"
            description={programme.remote ? "Changes sync to the shared Google Sheet." : "This is a private draft. Connect Google Sheets before inviting participants."}
          />
          <form onSubmit={saveSession} className="space-y-5" key={session.sprintNo + session.date}>
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
                name="possibleTargets"
                rows={2}
                defaultValue={session.possibleTargets}
                className="field"
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Expected outcome">
                <input name="expectedOutcome" defaultValue={session.expectedOutcome} className="field" />
              </Field>
              <Field label="Facilitator notes">
                <input name="facilitatorNotes" defaultValue={session.facilitatorNotes} className="field" />
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
