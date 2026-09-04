import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  markAbsentAction,
  pullTargetAction,
  savePlanAction,
  saveResultAction,
  useSuggestedTargetAction,
} from "@/lib/actions";
import { formatDate, programmeByCode } from "@/lib/programme";
import {
  entriesForParticipant,
  entryFor,
  listValues,
  nextSession,
  projectsOwnedBy,
  sessionByNo,
  sessionsFor,
  targetsFor,
} from "@/lib/queries";
import { participantIn } from "@/lib/session";
import {
  COPY,
  PLAN_DETAIL_FIELDS,
  QUICK_STATUSES,
  RESULT_DETAIL_FIELDS,
  carryForwardFrom,
  detailLabel,
  detailsFilled,
  rowIsBlank,
  type CarrySource,
} from "@/lib/submission";
import { Chips, DetailPanel, Field, SectionTitle, StatusBadge, StatusChoice } from "@/components/ui";

const SAVED_MESSAGE: Record<string, string> = {
  plan: "Plan saved. Build it, then record the result below.",
  result: "Result saved. This sprint is recorded in the Sprint Log.",
  absent: "Marked absent for this sprint.",
  pulled: "Target pulled from the bank — edit it to fit today.",
  carried: "Target carried over — edit it to fit today.",
};

export default async function MySprintPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ sprint?: string; saved?: string }>;
}) {
  const { code } = await params;
  const { sprint, saved } = await searchParams;

  const programme = programmeByCode(code);
  if (!programme) notFound();

  const me = await participantIn(programme);
  if (!me) redirect(`/join?code=${programme.join_code}`);

  const sessions = sessionsFor(programme.id);
  if (sessions.length === 0) {
    return <p className="text-sm text-ink-600">This programme has no sessions yet.</p>;
  }

  const fallbackSprint = nextSession(programme.id)?.sprint_no ?? sessions[0].sprint_no;
  const requested = sprint ? Number(sprint) : fallbackSprint;
  const session = sessionByNo(programme.id, requested) ?? sessionByNo(programme.id, fallbackSprint);
  if (!session) notFound();

  const entry = entryFor(session.id, me.id);
  if (!entry) notFound();

  const myEntries = entriesForParticipant(me.id);
  const myProjects = projectsOwnedBy(me.id);
  const stages = listValues(programme.id, "stage");
  const statuses = listValues(programme.id, "status");
  const aiUses = listValues(programme.id, "ai_use");
  const otherStatuses = statuses.filter((s) => !QUICK_STATUSES.includes(s as never));

  // What the sprint before this one already answered. A blank row starts from
  // it; a row the participant has touched is left exactly as they left it.
  const carrySources: CarrySource[] = myEntries.map((e) => ({
    sprintNo: e.sprint_no,
    projectId: e.project_id === null ? null : String(e.project_id),
    stageAtStart: e.stage_at_start,
    tools: e.tools,
    aiUsedFor: e.ai_used_for,
    result: e.result,
    nextPossibility: e.next_possibility,
  }));
  const blank = rowIsBlank(entry.status, [
    entry.project_id,
    entry.stage_at_start,
    entry.target,
    entry.why_it_matters,
    entry.definition_of_done,
    entry.scope_limit,
    entry.tools,
    entry.starting_point,
    entry.main_risk,
    entry.fallback,
    entry.ai_used_for,
    entry.result,
    entry.evidence,
    entry.what_changed,
    entry.next_possibility,
    entry.minutes_delta,
  ]);
  const carried = carryForwardFrom(carrySources, session.sprint_no);
  const prefill = blank ? carried : null;

  const plan = {
    projectId: entry.project_id !== null ? String(entry.project_id) : (prefill?.projectId ?? ""),
    stageAtStart: prefill?.stageAtStart || entry.stage_at_start,
    whyItMatters: entry.why_it_matters,
    definitionOfDone: entry.definition_of_done,
    scopeLimit: entry.scope_limit,
    tools: prefill?.tools || entry.tools,
    startingPoint: prefill?.startingPoint || entry.starting_point,
    mainRisk: entry.main_risk,
    fallback: entry.fallback,
    aiUsedFor: prefill?.aiUsedFor || entry.ai_used_for,
  };
  const result = {
    evidence: entry.evidence,
    whatChanged: entry.what_changed,
    nextPossibility: entry.next_possibility,
    minutesDelta: entry.minutes_delta === null ? "" : String(entry.minutes_delta),
  };
  const selectedAiUses = new Set(plan.aiUsedFor.split(";").map((s) => s.trim()).filter(Boolean));

  // Shortcuts for filling an empty target: last sprint's next step, or the bank.
  const needsTarget = entry.target.trim() === "";
  const bankTargets = needsTarget
    ? targetsFor(programme.id).filter(
        (t) =>
          t.used_in_sprint === null &&
          (t.owner_id === null || t.owner_id === me.id) &&
          t.sprint_target.trim() !== "",
      )
    : [];

  return (
    <div className="space-y-8">
      <div>
        <SectionTitle
          eyebrow={`${me.ref} · ${me.name}`}
          title="My sprint"
          description="Set one target before you build. Record what now works at the end."
        />
        <div className="flex flex-wrap gap-2">
          {myEntries.map((e) => (
            <Link
              key={e.id}
              href={`/p/${programme.join_code}/me?sprint=${e.sprint_no}`}
              className={`rounded-lg border px-3 py-2 text-sm transition ${
                e.sprint_no === session.sprint_no
                  ? "border-ink-900 bg-ink-900 text-white"
                  : "border-ink-200 bg-white text-ink-600 hover:bg-ink-100"
              }`}
            >
              <span className="font-semibold">Sprint {String(e.sprint_no).padStart(2, "0")}</span>
              <span
                className={`ml-2 text-xs ${
                  e.sprint_no === session.sprint_no ? "text-white/70" : "text-ink-400"
                }`}
              >
                {e.target.trim() ? e.status : "no target"}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {saved && SAVED_MESSAGE[saved] ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {SAVED_MESSAGE[saved]}
        </p>
      ) : null}

      <section className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-ink-400">{entry.record_id}</p>
            <h2 className="mt-0.5 text-xl font-semibold text-ink-900">
              Sprint {String(session.sprint_no).padStart(2, "0")} · {formatDate(session.date)}
            </h2>
            <p className="mt-0.5 text-sm text-ink-600">
              {session.day} · {session.time}
            </p>
          </div>
          <StatusBadge status={entry.status} />
        </div>
        <p className="mt-4 text-sm leading-relaxed text-ink-800">{session.prompt}</p>
        <div className="mt-4">
          <p className="label">Possible targets</p>
          <div className="mt-2">
            <Chips value={session.possible_targets} />
          </div>
        </div>
      </section>

      {/* Plan — Sprint Log columns E–O. One field is asked for; ten fold away. */}
      <section className="card p-6">
        <SectionTitle eyebrow="0–10 min" title="Plan" description={programme.target_formula} />

        {needsTarget && (carried?.suggestedTarget || bankTargets.length > 0) ? (
          <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-ink-200 bg-ink-50/70 px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-600">
              Start from
            </span>
            {carried?.suggestedTarget ? (
              <form action={useSuggestedTargetAction} className="contents">
                <input type="hidden" name="code" value={programme.join_code} />
                <input type="hidden" name="entry_id" value={entry.id} />
                <input type="hidden" name="sprint_no" value={session.sprint_no} />
                <input type="hidden" name="target" value={carried.suggestedTarget} />
                <button type="submit" className="btn-secondary text-xs">
                  Continue Sprint {String(carried.fromSprint).padStart(2, "0")}: “
                  {truncate(carried.suggestedTarget, 60)}”
                </button>
              </form>
            ) : null}
            {bankTargets.length > 0 ? (
              <form action={pullTargetAction} className="flex items-center gap-2">
                <input type="hidden" name="code" value={programme.join_code} />
                <input type="hidden" name="sprint_no" value={session.sprint_no} />
                <select name="target_id" defaultValue="" className="field w-auto py-1.5 text-xs">
                  <option value="">— the target bank —</option>
                  {bankTargets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {truncate(t.sprint_target, 70)}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn-secondary text-xs">
                  Use
                </button>
              </form>
            ) : null}
          </div>
        ) : null}

        {/*
          Keyed on updated_at: React keeps uncontrolled inputs as the browser
          left them across a server-action navigation, so without a remount a
          target pulled from the bank or carried forward would save but stay
          invisible in the box.
        */}
        <form action={savePlanAction} key={entry.updated_at} className="space-y-5">
          <input type="hidden" name="code" value={programme.join_code} />
          <input type="hidden" name="entry_id" value={entry.id} />
          <input type="hidden" name="sprint_no" value={session.sprint_no} />

          <Field label="Today I will… (target)" hint={COPY.planLead}>
            <textarea
              name="target"
              rows={3}
              defaultValue={entry.target}
              placeholder="Verb + specific feature, workflow or test + tool + observable result"
              className="field"
            />
          </Field>

          <DetailPanel
            summary={detailLabel(
              COPY.detailSummary,
              detailsFilled(plan, PLAN_DETAIL_FIELDS),
              PLAN_DETAIL_FIELDS.length,
            )}
          >
            {prefill ? (
              <p className="rounded-md bg-white px-3 py-2 text-xs text-ink-600">
                {COPY.carried} (Sprint {String(prefill.fromSprint).padStart(2, "0")})
              </p>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Project" hint="Add projects on the Projects tab.">
                <select name="project_id" defaultValue={plan.projectId} className="field">
                  <option value="">— none —</option>
                  {myProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Stage at start">
                <select name="stage_at_start" defaultValue={plan.stageAtStart} className="field">
                  <option value="">— select —</option>
                  {stages.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Why this matters">
                <textarea
                  name="why_it_matters"
                  rows={3}
                  defaultValue={plan.whyItMatters}
                  className="field"
                />
              </Field>
              <Field
                label="Definition of done (observable)"
                hint="What someone else could watch you demonstrate."
              >
                <textarea
                  name="definition_of_done"
                  rows={3}
                  defaultValue={plan.definitionOfDone}
                  className="field"
                />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Scope limit" hint="What you are explicitly not doing this hour.">
                <textarea
                  name="scope_limit"
                  rows={2}
                  defaultValue={plan.scopeLimit}
                  className="field"
                />
              </Field>
              <Field label="Tools" hint="Separate with semicolons.">
                <input name="tools" defaultValue={plan.tools} className="field" />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Starting point">
                <textarea
                  name="starting_point"
                  rows={2}
                  defaultValue={plan.startingPoint}
                  className="field"
                />
              </Field>
              <Field label="Main risk">
                <textarea name="main_risk" rows={2} defaultValue={plan.mainRisk} className="field" />
              </Field>
              <Field label="Fallback approach" hint="What you do instead if the risk lands.">
                <textarea name="fallback" rows={2} defaultValue={plan.fallback} className="field" />
              </Field>
            </div>

            <fieldset>
              <legend className="label">AI used for</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {aiUses.map((use) => (
                  <label
                    key={use}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-sm text-ink-800 hover:bg-ink-100 has-checked:border-accent-500 has-checked:bg-accent-50"
                  >
                    <input
                      type="checkbox"
                      name="ai_used_for"
                      value={use}
                      defaultChecked={selectedAiUses.has(use)}
                      className="accent-accent-500"
                    />
                    {use}
                  </label>
                ))}
              </div>
            </fieldset>
          </DetailPanel>

          <button type="submit" className="btn-primary">
            Save plan
          </button>
        </form>
      </section>

      {/* Result — Sprint Log columns P–U. */}
      <section className="card p-6">
        <SectionTitle
          eyebrow="50–60 min"
          title="Result"
          description="Show what changed, then record it. Demonstrate rather than report where you can."
        />
        <form action={saveResultAction} key={entry.updated_at} className="space-y-5">
          <input type="hidden" name="code" value={programme.join_code} />
          <input type="hidden" name="entry_id" value={entry.id} />
          <input type="hidden" name="sprint_no" value={session.sprint_no} />

          <Field label={`Result — "This now works…"`} hint={COPY.resultLead}>
            <textarea name="result" rows={3} defaultValue={entry.result} className="field" />
          </Field>

          <div>
            <p className="label">How did it go?</p>
            <div className="mt-2">
              <StatusChoice
                name="status"
                primary={QUICK_STATUSES}
                secondary={otherStatuses}
                value={entry.status}
              />
            </div>
          </div>

          <DetailPanel
            summary={detailLabel(
              COPY.resultDetailSummary,
              detailsFilled(result, RESULT_DETAIL_FIELDS),
              RESULT_DETAIL_FIELDS.length,
            )}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Evidence" hint="Link, screenshot, recording or commit.">
                <input name="evidence" defaultValue={result.evidence} className="field" />
              </Field>
              <Field label="What changed">
                <textarea
                  name="what_changed"
                  rows={2}
                  defaultValue={result.whatChanged}
                  className="field"
                />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Next possibility" hint="Offered as next sprint's target.">
                <textarea
                  name="next_possibility"
                  rows={2}
                  defaultValue={result.nextPossibility}
                  className="field"
                />
              </Field>
              <Field label="Minutes over/under" hint="Negative if you finished early.">
                <input
                  type="number"
                  name="minutes_delta"
                  defaultValue={result.minutesDelta}
                  className="field"
                />
              </Field>
            </div>
          </DetailPanel>

          <button type="submit" className="btn-primary">
            Save result
          </button>
        </form>

        <form action={markAbsentAction} className="mt-6 border-t border-ink-200 pt-4">
          <input type="hidden" name="code" value={programme.join_code} />
          <input type="hidden" name="entry_id" value={entry.id} />
          <input type="hidden" name="sprint_no" value={session.sprint_no} />
          <button type="submit" className="btn-ghost text-xs">
            Can&apos;t make this one — mark me absent
          </button>
        </form>
      </section>
    </div>
  );
}

function truncate(text: string, max: number): string {
  const clean = text.trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}
