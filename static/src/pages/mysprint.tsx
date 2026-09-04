import React from "react";
import { formatDate } from "../../../src/lib/dates";
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
  type Carried,
} from "../../../src/lib/submission";
import { useDraft } from "../autosave";
import { recordId } from "../derive";
import type { SEntry, SParticipant, SProgramme } from "../model";
import { navigate } from "../router";
import { entryFor, nextSession, pullTarget, updateEntry } from "../store";
import {
  Chips,
  DetailPanel,
  Field,
  Flash,
  SaveIndicator,
  SectionTitle,
  StatusBadge,
  StatusChoice,
  useFlash,
} from "../ui";

/** The row as the form holds it: every value a string, so inputs stay simple. */
type EntryDraft = {
  projectId: string;
  stageAtStart: string;
  target: string;
  whyItMatters: string;
  definitionOfDone: string;
  scopeLimit: string;
  tools: string;
  startingPoint: string;
  mainRisk: string;
  fallback: string;
  aiUsedFor: string;
  result: string;
  evidence: string;
  whatChanged: string;
  nextPossibility: string;
  status: string;
  minutesDelta: string;
};

function draftFrom(entry: SEntry, carried: Carried | null): EntryDraft {
  const draft: EntryDraft = {
    projectId: entry.projectId ?? "",
    stageAtStart: entry.stageAtStart,
    target: entry.target,
    whyItMatters: entry.whyItMatters,
    definitionOfDone: entry.definitionOfDone,
    scopeLimit: entry.scopeLimit,
    tools: entry.tools,
    startingPoint: entry.startingPoint,
    mainRisk: entry.mainRisk,
    fallback: entry.fallback,
    aiUsedFor: entry.aiUsedFor,
    result: entry.result,
    evidence: entry.evidence,
    whatChanged: entry.whatChanged,
    nextPossibility: entry.nextPossibility,
    status: entry.status,
    minutesDelta: entry.minutesDelta === null ? "" : String(entry.minutesDelta),
  };
  if (!carried || touched(draft)) return draft;
  // A blank row starts from what last sprint already answered. The target is
  // never filled in for them — that is the one thing the hour is for.
  return {
    ...draft,
    projectId: draft.projectId || (carried.projectId ?? ""),
    stageAtStart: carried.stageAtStart,
    tools: carried.tools,
    aiUsedFor: carried.aiUsedFor,
    startingPoint: carried.startingPoint,
  };
}

/** True once the participant has typed anything into the row. */
function touched(draft: EntryDraft): boolean {
  const { status, ...rest } = draft;
  return !rowIsBlank(status, Object.values(rest));
}

function carrySources(programme: SProgramme, participantId: string): CarrySource[] {
  return programme.entries
    .filter((e) => e.participantId === participantId)
    .map((e) => ({
      sprintNo: e.sprintNo,
      projectId: e.projectId,
      stageAtStart: e.stageAtStart,
      tools: e.tools,
      aiUsedFor: e.aiUsedFor,
      result: e.result,
      nextPossibility: e.nextPossibility,
    }));
}

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

  const carried = session ? carryForwardFrom(carrySources(programme, me.id), active) : null;

  const draft = useDraft<EntryDraft>({
    key: `${programme.id}:${active}:${me.id}`,
    initial: () => (entry ? draftFrom(entry, carried) : blankDraft()),
    save: (value) => {
      updateEntry(programme.id, active, me.id, {
        projectId: value.projectId || null,
        stageAtStart: value.stageAtStart,
        target: value.target.trim(),
        whyItMatters: value.whyItMatters.trim(),
        definitionOfDone: value.definitionOfDone.trim(),
        scopeLimit: value.scopeLimit.trim(),
        tools: value.tools.trim(),
        startingPoint: value.startingPoint.trim(),
        mainRisk: value.mainRisk.trim(),
        fallback: value.fallback.trim(),
        aiUsedFor: value.aiUsedFor,
        result: value.result.trim(),
        evidence: value.evidence.trim(),
        whatChanged: value.whatChanged.trim(),
        nextPossibility: value.nextPossibility.trim(),
        status:
          value.status === "Not started" && value.target.trim() !== "" ? "In progress" : value.status,
        minutesDelta: value.minutesDelta.trim() === "" ? null : Number(value.minutesDelta),
      });
    },
  });

  if (!session || !entry) {
    return <p className="text-sm text-ink-600">This programme has no sessions yet.</p>;
  }

  const { value, set, flush } = draft;
  const myEntries = programme.entries
    .filter((e) => e.participantId === me.id)
    .sort((a, b) => a.sprintNo - b.sprintNo);
  const myProjects = programme.projects.filter((p) => p.ownerId === me.id);
  const selectedAi = new Set(value.aiUsedFor.split(";").map((s) => s.trim()).filter(Boolean));
  const bankTargets = programme.targets.filter(
    (t) => t.usedInSprint === null && (t.ownerId === null || t.ownerId === me.id) && t.sprintTarget.trim() !== "",
  );

  const planFilled = detailsFilled(value, PLAN_DETAIL_FIELDS);
  const resultFilled = detailsFilled(value, RESULT_DETAIL_FIELDS);
  const statuses = programme.lists.status ?? [];
  const otherStatuses = statuses.filter((s) => !QUICK_STATUSES.includes(s as never));

  function toggleAi(use: string, on: boolean) {
    const next = new Set(selectedAi);
    if (on) next.add(use);
    else next.delete(use);
    set({ aiUsedFor: [...next].join("; ") });
  }

  function useSuggestedTarget() {
    if (!carried?.suggestedTarget) return;
    set({ target: carried.suggestedTarget });
    flush();
    showFlash(`Target taken from Sprint ${String(carried.fromSprint).padStart(2, "0")}. Edit it to fit today.`);
  }

  function pullFromBank(targetId: string) {
    const target = programme.targets.find((t) => t.id === targetId);
    if (!target) return;
    pullTarget(programme.id, targetId, active, me.id);
    set({
      target: target.sprintTarget,
      projectId: value.projectId || (target.projectId ?? ""),
      status: value.status === "Not started" ? "In progress" : value.status,
    });
    flush();
    showFlash("Target pulled from the bank. Edit it to fit today.");
  }

  function markAbsent() {
    set({ status: "Absent" });
    flush();
    showFlash("Marked absent for this sprint.");
  }

  return (
    <div className="space-y-8">
      <div>
        <SectionTitle
          eyebrow={me.name}
          title="My sprint"
          description="Set one target before you build. Record what now works at the end."
        />
        <div className="flex flex-wrap gap-2">
          {myEntries.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => {
                flush();
                navigate(`/p/${programme.id}/me?sprint=${e.sprintNo}`);
              }}
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
            <p className="font-mono text-xs text-ink-400">{recordId(programme, active, me.id)}</p>
            <h2 className="mt-0.5 text-xl font-semibold text-ink-900">
              Sprint {String(session.sprintNo).padStart(2, "0")} · {formatDate(session.date)}
            </h2>
            <p className="mt-0.5 text-sm text-ink-600">
              {session.day} · {session.time}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <StatusBadge status={value.status} />
            <SaveIndicator status={draft.status} savedAt={draft.savedAt} />
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-ink-800">{session.prompt}</p>
        <div className="mt-4">
          <p className="label">Possible targets</p>
          <div className="mt-2">
            <Chips value={session.possibleTargets} />
          </div>
        </div>
      </section>

      {/* Plan — workbook columns E–O. One required field; the rest fold away. */}
      <section className="card p-6" onBlur={flush}>
        <SectionTitle eyebrow="0–10 min" title="Plan" description={programme.targetFormula} />

        <div className="space-y-5">
          <Field label="Today I will… (target)" hint={COPY.planLead}>
            <textarea
              name="target"
              rows={3}
              value={value.target}
              onChange={(e) => set({ target: e.target.value })}
              placeholder="Verb + specific feature, workflow or test + tool + observable result"
              className="field"
            />
          </Field>

          <div className="flex flex-wrap items-center gap-2">
            {carried?.suggestedTarget ? (
              <button type="button" onClick={useSuggestedTarget} className="btn-secondary text-xs">
                Continue Sprint {String(carried.fromSprint).padStart(2, "0")}: “
                {truncate(carried.suggestedTarget, 60)}”
              </button>
            ) : null}
            {bankTargets.length > 0 ? (
              <label className="inline-flex items-center gap-2 text-xs text-ink-600">
                <span className="font-medium">From the target bank</span>
                <select
                  value=""
                  onChange={(e) => e.target.value && pullFromBank(e.target.value)}
                  className="field w-auto py-1.5 text-xs"
                >
                  <option value="">— pick one —</option>
                  {bankTargets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {truncate(t.sprintTarget, 70)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          <DetailPanel
            summary={detailLabel(COPY.detailSummary, planFilled, PLAN_DETAIL_FIELDS.length)}
            defaultOpen={false}
          >
            {carried ? (
              <p className="rounded-md bg-white px-3 py-2 text-xs text-ink-600">
                {COPY.carried} (Sprint {String(carried.fromSprint).padStart(2, "0")})
              </p>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Project" hint="Add projects on the Projects tab.">
                <select
                  value={value.projectId}
                  onChange={(e) => set({ projectId: e.target.value })}
                  className="field"
                >
                  <option value="">— none —</option>
                  {myProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Stage at start">
                <select
                  value={value.stageAtStart}
                  onChange={(e) => set({ stageAtStart: e.target.value })}
                  className="field"
                >
                  <option value="">— select —</option>
                  {programme.lists.stage?.map((s) => (
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
                  rows={3}
                  value={value.whyItMatters}
                  onChange={(e) => set({ whyItMatters: e.target.value })}
                  className="field"
                />
              </Field>
              <Field
                label="Definition of done (observable)"
                hint="What someone else could watch you demonstrate."
              >
                <textarea
                  rows={3}
                  value={value.definitionOfDone}
                  onChange={(e) => set({ definitionOfDone: e.target.value })}
                  className="field"
                />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Scope limit" hint="What you are explicitly not doing this hour.">
                <textarea
                  rows={2}
                  value={value.scopeLimit}
                  onChange={(e) => set({ scopeLimit: e.target.value })}
                  className="field"
                />
              </Field>
              <Field label="Tools" hint="Separate with semicolons.">
                <input
                  value={value.tools}
                  onChange={(e) => set({ tools: e.target.value })}
                  className="field"
                />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Starting point">
                <textarea
                  rows={2}
                  value={value.startingPoint}
                  onChange={(e) => set({ startingPoint: e.target.value })}
                  className="field"
                />
              </Field>
              <Field label="Main risk">
                <textarea
                  rows={2}
                  value={value.mainRisk}
                  onChange={(e) => set({ mainRisk: e.target.value })}
                  className="field"
                />
              </Field>
              <Field label="Fallback approach" hint="What you do instead if the risk lands.">
                <textarea
                  rows={2}
                  value={value.fallback}
                  onChange={(e) => set({ fallback: e.target.value })}
                  className="field"
                />
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
                      checked={selectedAi.has(use)}
                      onChange={(e) => toggleAi(use, e.target.checked)}
                      className="accent-accent-500"
                    />
                    {use}
                  </label>
                ))}
              </div>
            </fieldset>
          </DetailPanel>
        </div>
      </section>

      {/* Result — workbook columns P–U. */}
      <section className="card p-6" onBlur={flush}>
        <SectionTitle
          eyebrow="50–60 min"
          title="Result"
          description="Show what changed, then record it. Demonstrate rather than report where you can."
        />

        <div className="space-y-5">
          <Field label={`Result — "This now works…"`} hint={COPY.resultLead}>
            <textarea
              rows={3}
              value={value.result}
              onChange={(e) => set({ result: e.target.value })}
              className="field"
            />
          </Field>

          <div>
            <p className="label">How did it go?</p>
            <div className="mt-2">
              <StatusChoice
                primary={QUICK_STATUSES}
                secondary={otherStatuses}
                value={value.status}
                onChange={(status) => {
                  set({ status });
                  flush();
                }}
              />
            </div>
          </div>

          <DetailPanel
            summary={detailLabel(COPY.resultDetailSummary, resultFilled, RESULT_DETAIL_FIELDS.length)}
            defaultOpen={false}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Evidence" hint="Link, screenshot, recording or commit.">
                <input
                  value={value.evidence}
                  onChange={(e) => set({ evidence: e.target.value })}
                  className="field"
                />
              </Field>
              <Field label="What changed">
                <textarea
                  rows={2}
                  value={value.whatChanged}
                  onChange={(e) => set({ whatChanged: e.target.value })}
                  className="field"
                />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Next possibility" hint="Offered as next sprint's target.">
                <textarea
                  rows={2}
                  value={value.nextPossibility}
                  onChange={(e) => set({ nextPossibility: e.target.value })}
                  className="field"
                />
              </Field>
              <Field label="Minutes over/under" hint="Negative if you finished early.">
                <input
                  type="number"
                  value={value.minutesDelta}
                  onChange={(e) => set({ minutesDelta: e.target.value })}
                  className="field"
                />
              </Field>
            </div>
          </DetailPanel>
        </div>

        <div className="mt-6 border-t border-ink-200 pt-4">
          <button type="button" onClick={markAbsent} className="btn-ghost text-xs">
            Can&apos;t make this one — mark me absent
          </button>
        </div>
      </section>
    </div>
  );
}

function truncate(text: string, max: number): string {
  const clean = text.trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function blankDraft(): EntryDraft {
  return {
    projectId: "",
    stageAtStart: "",
    target: "",
    whyItMatters: "",
    definitionOfDone: "",
    scopeLimit: "",
    tools: "",
    startingPoint: "",
    mainRisk: "",
    fallback: "",
    aiUsedFor: "",
    result: "",
    evidence: "",
    whatChanged: "",
    nextPossibility: "",
    status: "Not started",
    minutesDelta: "",
  };
}
