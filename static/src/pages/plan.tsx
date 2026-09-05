import React from "react";
import { formatDate } from "../../../src/lib/dates";
import {
  BUILD_MODES,
  OUTCOME_TYPES,
  SPINE,
  TRACKS,
  buildMode,
  firstInstruction,
  outcomeType,
  suggestedOutcome,
  type BuildModeId,
  type OutcomeTypeId,
} from "../../../src/lib/framework";
import type { SParticipant, SProgramme } from "../model";
import { Link } from "../router";
import { entryFor } from "../store";
import {
  clearSprintType,
  modeFor,
  planKey,
  setSprintMode,
  setSprintType,
  setTrack,
  usePlan,
} from "../plan-state";
import { CopyBlock, DetailPanel, SectionTitle, StatusBadge } from "../ui";

/**
 * The plan for someone's six sprints, and the briefing for each one.
 *
 * There is no facilitator, so this page has to do what a facilitator would: say
 * what the six hours are for, offer a shape to anyone who wants one, and then
 * get out of the way of anyone who does not.
 */
export function PlanPage({ programme, me }: { programme: SProgramme; me: SParticipant }) {
  const key = planKey(programme.id, me.id);
  const plan = usePlan(key);
  const chosen = TRACKS.find((t) => t.id === plan.track) ?? TRACKS[0];

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow={me.name}
        title="Your six sprints"
        description="Six hours, one outcome each. Pick a shape or pick none — the hour runs the same way either way."
      />

      <section className="card p-6">
        <h2 className="text-lg font-semibold text-ink-900">How do you want to spend the six?</h2>
        <p className="mt-1 text-sm text-ink-600">
          A suggestion, not a commitment. Change it whenever you like; nothing you have recorded is
          affected.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {TRACKS.map((t) => {
            const active = t.id === plan.track;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTrack(key, t.id)}
                aria-pressed={active}
                className={`rounded-xl border p-4 text-left transition ${
                  active
                    ? "border-accent-500 bg-accent-50 ring-1 ring-accent-500"
                    : "border-ink-200 bg-white hover:bg-ink-50"
                }`}
              >
                <p className="font-semibold text-ink-900">{t.name}</p>
                <p className="mt-1 text-sm text-ink-700">{t.pitch}</p>
                <p className="mt-2 text-xs leading-relaxed text-ink-500">{t.suits}</p>
              </button>
            );
          })}
        </div>
        <div className="mt-5 space-y-3 rounded-lg border border-ink-200 bg-ink-50/70 p-4">
          <div>
            <p className="label">How to choose your targets on this track</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-800">{chosen.strategy}</p>
          </div>
          <div>
            <p className="label">What to watch for</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-800">{chosen.watchFor}</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink-900">The six</h2>
        {programme.sessions.map((session) => (
          <SprintCard
            key={session.sprintNo}
            programme={programme}
            me={me}
            planKeyValue={key}
            sprintNo={session.sprintNo}
            date={session.date}
            day={session.day}
            time={session.time}
            chosenType={plan.types[session.sprintNo] ?? null}
            mode={modeFor(plan, session.sprintNo)}
            trackId={plan.track}
          />
        ))}
        {programme.sessions.length === 0 ? (
          <p className="text-sm text-ink-600">This programme has no sessions yet.</p>
        ) : null}
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-semibold text-ink-900">What never changes</h2>
        <p className="mt-1 text-sm text-ink-600">
          Whatever you build and however you build it, the hour runs like this.
        </p>
        <ol className="mt-4 space-y-3">
          {SPINE.map((step) => (
            <li key={step.window} className="flex gap-4">
              <span className="w-20 shrink-0 pt-0.5 font-mono text-xs text-ink-400">
                {step.window}
              </span>
              <div>
                <p className="text-sm font-semibold text-ink-900">{step.name}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-700">{step.instruction}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function SprintCard({
  programme,
  me,
  planKeyValue,
  sprintNo,
  date,
  day,
  time,
  chosenType,
  mode,
  trackId,
}: {
  programme: SProgramme;
  me: SParticipant;
  planKeyValue: string;
  sprintNo: number;
  date: string;
  day: string;
  time: string;
  chosenType: OutcomeTypeId | null;
  mode: BuildModeId;
  trackId: Parameters<typeof suggestedOutcome>[0];
}) {
  const suggested = suggestedOutcome(trackId, sprintNo);
  const type = chosenType ? outcomeType(chosenType) : suggested;
  const entry = entryFor(programme, sprintNo, me.id);
  const target = entry?.target.trim() ?? "";
  const modeInfo = buildMode(mode);

  return (
    <article className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-ink-400">
            Sprint {String(sprintNo).padStart(2, "0")} · {formatDate(date)} · {day} {time}
          </p>
          <h3 className="mt-0.5 text-base font-semibold text-ink-900">
            {type ? type.name : "You choose on the day"}
          </h3>
          <p className="mt-0.5 text-sm text-ink-600">
            {type ? type.youWillHave : "No shape suggested for this sprint — pick what the week needs."}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {entry ? <StatusBadge status={entry.status} /> : null}
          <Link to={`/p/${programme.id}/me?sprint=${sprintNo}`} className="btn-secondary text-xs">
            Open sprint
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <label className="text-xs text-ink-600">
          <span className="label block">Making</span>
          <select
            value={chosenType ?? ""}
            onChange={(e) =>
              e.target.value
                ? setSprintType(planKeyValue, sprintNo, e.target.value as OutcomeTypeId)
                : clearSprintType(planKeyValue, sprintNo)
            }
            className="field mt-1 w-auto py-1.5 text-sm"
          >
            <option value="">
              {suggested ? `Suggested — ${suggested.name}` : "— not decided —"}
            </option>
            {OUTCOME_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-ink-600">
          <span className="label block">Working</span>
          <select
            value={mode}
            onChange={(e) => setSprintMode(planKeyValue, sprintNo, e.target.value as BuildModeId)}
            className="field mt-1 w-auto py-1.5 text-sm"
          >
            {BUILD_MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {type ? (
        <div className="mt-4">
          <DetailPanel summary={`Briefing for Sprint ${String(sprintNo).padStart(2, "0")}`}>
            <div>
              <p className="label">Before the clock starts</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-800">{type.briefing}</p>
            </div>
            <div>
              <p className="label">Working {modeInfo.name.toLowerCase()}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-800">{modeInfo.howTheHourChanges}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                <span className="font-semibold">Answer this at minute 5:</span>{" "}
                {modeInfo.extraQuestion}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{modeInfo.failureMode}</p>
            </div>
            <CopyBlock
              label="Paste this into your assistant"
              text={firstInstruction(type, target)}
            />
            {target === "" ? (
              <p className="text-xs text-ink-500">
                Write your target on the sprint page first and this instruction will carry it.
              </p>
            ) : null}
            <div>
              <p className="label">By minute 25</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-800">{type.halfway}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                <span className="font-semibold">The trap:</span> {type.timeTrap}
              </p>
            </div>
            <div>
              <p className="label">At minute 50, check</p>
              <ul className="mt-1 space-y-1">
                {type.doneChecks.map((check) => (
                  <li key={check} className="flex gap-2 text-sm text-ink-800">
                    <span aria-hidden className="text-ink-400">
                      ·
                    </span>
                    {check}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="label">Show</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-800">{type.evidence}</p>
            </div>
            <div>
              <p className="label">If you carry on in your own time</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-800">{type.ownTime}</p>
            </div>
          </DetailPanel>
        </div>
      ) : null}
    </article>
  );
}
