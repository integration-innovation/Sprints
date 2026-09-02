import React from "react";
import { formatDate } from "../../../src/lib/dates";
import { recordId } from "../derive";
import type { SEntry, SParticipant, SProgramme } from "../model";
import { Link, navigate } from "../router";
import { entryFor, nextSession, updateEntry } from "../store";
import { Chips, Field, Flash, SectionTitle, StatusBadge, useFlash } from "../ui";

export function MySprintPage({
  programme,
  me,
  sprintNo,
}: {
  programme: SProgramme;
  me: SParticipant;
  sprintNo: number | null;
}) {
  const fallback = nextSession(programme)?.sprintNo ?? programme.sessions[0]?.sprintNo ?? 1;
  const active = programme.sessions.some((s) => s.sprintNo === sprintNo) ? sprintNo! : fallback;
  const session = programme.sessions.find((s) => s.sprintNo === active);
  const entry = session ? entryFor(programme, active, me.id) : undefined;
  const [flash, showFlash] = useFlash();

  if (!session || !entry) {
    return <p className="text-sm text-ink-600">This programme has no sessions yet.</p>;
  }

  const myEntries = programme.entries
    .filter((e) => e.participantId === me.id)
    .sort((a, b) => a.sprintNo - b.sprintNo);
  const myProjects = programme.projects.filter((p) => p.ownerId === me.id);
  const selectedAi = new Set(entry.aiUsedFor.split(";").map((s) => s.trim()).filter(Boolean));

  function savePlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();
    const target = get("target");
    const ai = form
      .getAll("aiUsedFor")
      .map((v) => String(v))
      .join("; ");

    updateEntry(programme.id, active, me.id, {
      projectId: get("projectId") || null,
      stageAtStart: get("stageAtStart"),
      target,
      whyItMatters: get("whyItMatters"),
      definitionOfDone: get("definitionOfDone"),
      scopeLimit: get("scopeLimit"),
      tools: get("tools"),
      startingPoint: get("startingPoint"),
      mainRisk: get("mainRisk"),
      fallback: get("fallback"),
      aiUsedFor: ai,
      status: entry!.status === "Not started" && target ? "In progress" : entry!.status,
    });
    showFlash("Plan saved. Build it, then record the result below.");
  }

  function saveResult(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();
    const minutes = get("minutesDelta");

    updateEntry(programme.id, active, me.id, {
      result: get("result"),
      evidence: get("evidence"),
      whatChanged: get("whatChanged"),
      nextPossibility: get("nextPossibility"),
      status: get("status") || "In progress",
      minutesDelta: minutes === "" ? null : Number(minutes),
    });
    showFlash("Result saved. This sprint is recorded in your sprint log.");
  }

  function markAbsent() {
    updateEntry(programme.id, active, me.id, { status: "Absent" });
    showFlash("Marked absent for this sprint.");
  }

  return (
    <div className="space-y-8">
      <div>
        <SectionTitle
          eyebrow={me.name}
          title="My sprint"
          description="Fill the plan before you build. Record the result in the last ten minutes."
        />
        <div className="flex flex-wrap gap-2">
          {myEntries.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => navigate(`/p/${programme.id}/me?sprint=${e.sprintNo}`)}
              className={`rounded-lg border px-3 py-2 text-sm transition ${
                e.sprintNo === active
                  ? "border-ink-900 bg-ink-900 text-white"
                  : "border-ink-200 bg-white text-ink-600 hover:bg-ink-100"
              }`}
            >
              <span className="font-semibold">Sprint {String(e.sprintNo).padStart(2, "0")}</span>
              <span className={`ml-2 text-xs ${e.sprintNo === active ? "text-white/70" : "text-ink-400"}`}>
                {e.target.trim() ? e.status : "no target"}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Flash message={flash} />

      <section className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-ink-400">
              {recordId(programme, active, me.id)}
            </p>
            <h2 className="mt-0.5 text-xl font-semibold text-ink-900">
              Sprint {String(session.sprintNo).padStart(2, "0")} · {formatDate(session.date)}
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
            <Chips value={session.possibleTargets} />
          </div>
        </div>
      </section>

      {/* Plan — workbook columns E–O */}
      <section className="card p-6">
        <SectionTitle eyebrow="0–10 min" title="Plan" description={programme.targetFormula} />
        <form onSubmit={savePlan} className="space-y-5" key={`plan-${entry.id}-${entry.updatedAt}`}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Project" hint="Add projects on the Projects tab.">
              <select name="projectId" defaultValue={entry.projectId ?? ""} className="field">
                <option value="">— none —</option>
                {myProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Stage at start">
              <select name="stageAtStart" defaultValue={entry.stageAtStart} className="field">
                <option value="">— select —</option>
                {programme.lists.stage?.map((s) => (
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
              <textarea name="whyItMatters" rows={3} defaultValue={entry.whyItMatters} className="field" />
            </Field>
            <Field
              label="Definition of done (observable)"
              hint="What someone else could watch you demonstrate."
            >
              <textarea
                name="definitionOfDone"
                rows={3}
                defaultValue={entry.definitionOfDone}
                className="field"
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Scope limit" hint="What you are explicitly not doing this hour.">
              <textarea name="scopeLimit" rows={2} defaultValue={entry.scopeLimit} className="field" />
            </Field>
            <Field label="Tools" hint="Separate with semicolons.">
              <input name="tools" defaultValue={entry.tools} className="field" />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Starting point">
              <textarea name="startingPoint" rows={2} defaultValue={entry.startingPoint} className="field" />
            </Field>
            <Field label="Main risk">
              <textarea name="mainRisk" rows={2} defaultValue={entry.mainRisk} className="field" />
            </Field>
            <Field label="Fallback approach" hint="What you do instead if the risk lands.">
              <textarea name="fallback" rows={2} defaultValue={entry.fallback} className="field" />
            </Field>
          </div>

          <fieldset>
            <legend className="label">AI used for</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {programme.lists.ai_use?.map((use) => (
                <label
                  key={use}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-sm text-ink-800 hover:bg-ink-100 has-checked:border-accent-500 has-checked:bg-accent-50"
                >
                  <input
                    type="checkbox"
                    name="aiUsedFor"
                    value={use}
                    defaultChecked={selectedAi.has(use)}
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
            <Link to={`/p/${programme.id}/targets`} className="btn-secondary">
              Pull from target bank
            </Link>
          </div>
        </form>
      </section>

      {/* Result — workbook columns P–U */}
      <section className="card p-6">
        <SectionTitle
          eyebrow="50–60 min"
          title="Result"
          description="Show what changed, then record it. Demonstrate rather than report where you can."
        />
        <form onSubmit={saveResult} className="space-y-5" key={`result-${entry.id}-${entry.updatedAt}`}>
          <Field label={`Result — "This now works…"`}>
            <textarea name="result" rows={3} defaultValue={entry.result} className="field" />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Evidence" hint="Link, screenshot, recording or commit.">
              <input name="evidence" defaultValue={entry.evidence} className="field" />
            </Field>
            <Field label="What changed">
              <textarea name="whatChanged" rows={2} defaultValue={entry.whatChanged} className="field" />
            </Field>
          </div>

          <Field label="Next possibility" hint="The obvious next sprint-sized step.">
            <textarea
              name="nextPossibility"
              rows={2}
              defaultValue={entry.nextPossibility}
              className="field"
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Status">
              <select name="status" defaultValue={entry.status} className="field">
                {programme.lists.status?.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Minutes over/under" hint="Negative if you finished early.">
              <input
                type="number"
                name="minutesDelta"
                defaultValue={entry.minutesDelta ?? ""}
                className="field"
              />
            </Field>
          </div>

          <button type="submit" className="btn-primary">
            Save result
          </button>
        </form>

        <div className="mt-6 border-t border-ink-200 pt-4">
          <button type="button" onClick={markAbsent} className="btn-ghost text-xs">
            Can&apos;t make this one — mark me absent
          </button>
        </div>
      </section>
    </div>
  );
}
