import React from "react";
import { participantName, projectName } from "../derive";
import type { SParticipant, SProgramme } from "../model";
import { navigate } from "../router";
import { addTarget, pullTarget, updateTarget } from "../store";
import { EmptyState, Field, SectionTitle } from "../ui";

const TARGET_STATUSES = ["Open", "Used", "Deferred", "Dropped"];

export function TargetsPage({
  programme,
  me,
}: {
  programme: SProgramme;
  me: SParticipant | undefined;
}) {
  const open = programme.targets.filter((t) => t.status === "Open");
  const rest = programme.targets.filter((t) => t.status !== "Open");
  const myProjects = me ? programme.projects.filter((p) => p.ownerId === me.id) : [];

  function bank(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();
    addTarget(programme.id, {
      ownerId: me?.id ?? null,
      projectId: get("projectId") || null,
      tooLargeIdea: get("tooLargeIdea"),
      sprintTarget: get("sprintTarget"),
      suggestedSprint: get("suggestedSprint") ? Number(get("suggestedSprint")) : null,
      usedInSprint: null,
      status: "Open",
      notes: get("notes"),
    });
    event.currentTarget.reset();
  }

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Target bank"
        title="Too-large ideas, reduced to sprint size"
        description={programme.targetFormula}
      />

      {programme.targets.length === 0 ? (
        <EmptyState
          title="Nothing banked yet"
          body="Park ideas that are too large for one hour here, alongside the sprint-sized version you could actually finish."
        />
      ) : null}

      {[
        { heading: "Open", items: open },
        { heading: "Used, deferred and dropped", items: rest },
      ]
        .filter((group) => group.items.length > 0)
        .map((group) => (
          <section key={group.heading}>
            <h3 className="mb-3 text-sm font-semibold text-ink-600">{group.heading}</h3>
            <ul className="space-y-3">
              {group.items.map((t) => (
                <li key={t.id} className="card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <span className="font-mono text-xs text-ink-400">{t.id.slice(0, 8)}</span>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-ink-400">
                      <span>{t.ownerId ? participantName(programme, t.ownerId) : "unclaimed"}</span>
                      {projectName(programme, t.projectId) ? (
                        <span>· {projectName(programme, t.projectId)}</span>
                      ) : null}
                      {t.suggestedSprint ? <span>· suggested S{t.suggestedSprint}</span> : null}
                      {t.usedInSprint ? (
                        <span className="rounded-full bg-ink-100 px-2 py-0.5 font-semibold text-ink-600">
                          used in S{t.usedInSprint}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-4 lg:grid-cols-2">
                    <div>
                      <p className="label">Too large</p>
                      <p className="mt-1 text-sm text-ink-600 line-through decoration-ink-200">
                        {t.tooLargeIdea || "—"}
                      </p>
                    </div>
                    <div className="lg:border-l lg:border-ink-200 lg:pl-4">
                      <p className="label">Sprint-sized</p>
                      <p className="mt-1 text-sm font-medium text-ink-900">{t.sprintTarget}</p>
                    </div>
                  </div>

                  {me ? (
                    <div className="mt-4 flex flex-wrap items-end gap-4 border-t border-ink-200 pt-4">
                      <form
                        className="flex flex-wrap items-end gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const sprint = Number(
                            new FormData(event.currentTarget).get("sprintNo") ?? 1,
                          );
                          pullTarget(programme.id, t.id, sprint, me.id);
                          navigate(`/p/${programme.id}/me?sprint=${sprint}`);
                        }}
                      >
                        <label className="text-xs font-semibold uppercase tracking-wide text-ink-600">
                          Pull into
                          <select
                            name="sprintNo"
                            defaultValue={t.suggestedSprint ?? programme.sessions[0]?.sprintNo ?? 1}
                            className="field mt-1 w-36"
                          >
                            {programme.sessions.map((s) => (
                              <option key={s.sprintNo} value={s.sprintNo}>
                                Sprint {String(s.sprintNo).padStart(2, "0")}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button type="submit" className="btn-secondary">
                          Use as my target
                        </button>
                      </form>

                      <label className="text-xs font-semibold uppercase tracking-wide text-ink-600">
                        Status
                        <select
                          value={t.status}
                          onChange={(e) => updateTarget(programme.id, t.id, { status: e.target.value })}
                          className="field mt-1 w-32"
                        >
                          {TARGET_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}

      {me ? (
        <section className="card p-6">
          <SectionTitle title="Bank an idea" description="Write the too-large version, then reduce it." />
          <form onSubmit={bank} className="space-y-5">
            <Field label="Too-large idea">
              <textarea
                name="tooLargeIdea"
                rows={2}
                required
                placeholder="Build an AI BIM compliance checker."
                className="field"
              />
            </Field>
            <Field label="Sprint-sized target" hint={programme.targetFormula}>
              <textarea
                name="sprintTarget"
                rows={3}
                required
                placeholder="Configure AI to extract one required parameter from one IFC file so that the value appears in a table."
                className="field"
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Project">
                <select name="projectId" className="field">
                  <option value="">— none —</option>
                  {myProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Suggested sprint">
                <select name="suggestedSprint" className="field">
                  <option value="">— any —</option>
                  {programme.sessions.map((s) => (
                    <option key={s.sprintNo} value={s.sprintNo}>
                      Sprint {String(s.sprintNo).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Notes">
                <input name="notes" className="field" />
              </Field>
            </div>
            <button type="submit" className="btn-primary">
              Add to bank
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
