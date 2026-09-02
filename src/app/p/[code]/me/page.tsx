import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { markAbsentAction, savePlanAction, saveResultAction } from "@/lib/actions";
import { formatDate, programmeByCode } from "@/lib/programme";
import {
  entriesForParticipant,
  entryFor,
  listValues,
  nextSession,
  projectsOwnedBy,
  sessionByNo,
  sessionsFor,
} from "@/lib/queries";
import { participantIn } from "@/lib/session";
import { Chips, Field, SectionTitle, StatusBadge } from "@/components/ui";

const SAVED_MESSAGE: Record<string, string> = {
  plan: "Plan saved. Build it, then record the result below.",
  result: "Result saved. This sprint is recorded in the Sprint Log.",
  absent: "Marked absent for this sprint.",
  pulled: "Target pulled from the bank — review the plan and fill in the rest.",
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
  const selectedAiUses = new Set(
    entry.ai_used_for.split(";").map((s) => s.trim()).filter(Boolean),
  );

  return (
    <div className="space-y-8">
      <div>
        <SectionTitle
          eyebrow={`${me.ref} · ${me.name}`}
          title="My sprint"
          description="Fill the plan before you build. Record the result in the last ten minutes."
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

      {/* Plan — Sprint Log columns E–O */}
      <section className="card p-6">
        <SectionTitle
          eyebrow="0–10 min"
          title="Plan"
          description={programme.target_formula}
        />
        <form action={savePlanAction} className="space-y-5">
          <input type="hidden" name="code" value={programme.join_code} />
          <input type="hidden" name="entry_id" value={entry.id} />
          <input type="hidden" name="sprint_no" value={session.sprint_no} />

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Project" hint="Add projects on the Projects tab.">
              <select name="project_id" defaultValue={entry.project_id ?? ""} className="field">
                <option value="">— none —</option>
                {myProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Stage at start">
              <select name="stage_at_start" defaultValue={entry.stage_at_start} className="field">
                <option value="">— select —</option>
                {stages.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field
            label="Today I will… (target)"
            hint="One sprint-sized outcome, written to the formula above."
          >
            <textarea name="target" rows={3} defaultValue={entry.target} className="field" />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Why this matters">
              <textarea
                name="why_it_matters"
                rows={3}
                defaultValue={entry.why_it_matters}
                className="field"
              />
            </Field>
            <Field label="Definition of done (observable)" hint="What someone else could watch you demonstrate.">
              <textarea
                name="definition_of_done"
                rows={3}
                defaultValue={entry.definition_of_done}
                className="field"
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Scope limit" hint="What you are explicitly not doing this hour.">
              <textarea
                name="scope_limit"
                rows={2}
                defaultValue={entry.scope_limit}
                className="field"
              />
            </Field>
            <Field label="Tools" hint="Separate with semicolons.">
              <input name="tools" defaultValue={entry.tools} className="field" />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Starting point">
              <textarea
                name="starting_point"
                rows={2}
                defaultValue={entry.starting_point}
                className="field"
              />
            </Field>
            <Field label="Main risk">
              <textarea name="main_risk" rows={2} defaultValue={entry.main_risk} className="field" />
            </Field>
            <Field label="Fallback approach" hint="What you do instead if the risk lands.">
              <textarea name="fallback" rows={2} defaultValue={entry.fallback} className="field" />
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

          <div className="flex flex-wrap gap-3">
            <button type="submit" className="btn-primary">
              Save plan
            </button>
            <Link href={`/p/${programme.join_code}/targets`} className="btn-secondary">
              Pull from target bank
            </Link>
          </div>
        </form>
      </section>

      {/* Result — Sprint Log columns P–U */}
      <section className="card p-6">
        <SectionTitle
          eyebrow="50–60 min"
          title="Result"
          description="Show what changed, then record it. Demonstrate rather than report where you can."
        />
        <form action={saveResultAction} className="space-y-5">
          <input type="hidden" name="code" value={programme.join_code} />
          <input type="hidden" name="entry_id" value={entry.id} />
          <input type="hidden" name="sprint_no" value={session.sprint_no} />

          <Field label={`Result — "This now works…"`}>
            <textarea name="result" rows={3} defaultValue={entry.result} className="field" />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Evidence" hint="Link, screenshot, recording or commit.">
              <input name="evidence" defaultValue={entry.evidence} className="field" />
            </Field>
            <Field label="What changed">
              <textarea
                name="what_changed"
                rows={2}
                defaultValue={entry.what_changed}
                className="field"
              />
            </Field>
          </div>

          <Field label="Next possibility" hint="The obvious next sprint-sized step.">
            <textarea
              name="next_possibility"
              rows={2}
              defaultValue={entry.next_possibility}
              className="field"
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Status">
              <select name="status" defaultValue={entry.status} className="field">
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Minutes over/under" hint="Negative if you finished early.">
              <input
                type="number"
                name="minutes_delta"
                defaultValue={entry.minutes_delta ?? ""}
                className="field"
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="btn-primary">
              Save result
            </button>
          </div>
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
