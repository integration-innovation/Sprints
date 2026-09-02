import React from "react";
import { participantName } from "../derive";
import type { SParticipant, SProgramme } from "../model";
import { addProject } from "../store";
import { Chips, EmptyState, Field, SectionTitle } from "../ui";

export function ProjectsPage({
  programme,
  me,
}: {
  programme: SProgramme;
  me: SParticipant | undefined;
}) {
  function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!me) return;
    const form = new FormData(event.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();
    addProject(programme.id, {
      ownerId: me.id,
      name: get("name"),
      type: get("type"),
      stage: get("stage"),
      primaryUser: get("primaryUser"),
      mainPurpose: get("mainPurpose"),
      priority1: get("priority1"),
      priority2: get("priority2"),
      priority3: get("priority3"),
      tools: get("tools"),
      constraints: get("constraints"),
      successCondition: get("successCondition"),
      projectTest: get("projectTest"),
      demonstration: get("demonstration"),
      repoLink: get("repoLink"),
      notes: get("notes"),
      isPrimary: form.get("isPrimary") !== null,
    });
    event.currentTarget.reset();
  }

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Projects"
        title="What each sprint feeds into"
        description="A participant may have several. Sprint targets attach to one of them."
      />

      {programme.projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          body="Describe the project your sprints will advance — its purpose, its top three priorities and how you'd demonstrate success."
        />
      ) : (
        <ul className="space-y-4">
          {programme.projects.map((p) => {
            const logged = programme.entries.filter((e) => e.projectId === p.id);
            const complete = logged.filter((e) => e.status === "Complete").length;
            return (
              <li key={p.id} className="card p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-ink-900">{p.name}</h3>
                    <p className="mt-0.5 text-sm text-ink-600">
                      {participantName(programme, p.ownerId)}
                      {p.type ? ` · ${p.type}` : ""}
                      {p.stage ? ` · ${p.stage}` : ""}
                      {p.isPrimary ? " · primary" : ""}
                    </p>
                  </div>
                  <p className="text-xs tabular-nums text-ink-400">
                    {logged.length} sprints logged · {complete} complete
                  </p>
                </div>

                {p.mainPurpose ? (
                  <p className="mt-4 text-sm leading-relaxed text-ink-800">{p.mainPurpose}</p>
                ) : null}

                <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {(
                    [
                      ["Primary user", p.primaryUser],
                      ["Priority 1", p.priority1],
                      ["Priority 2", p.priority2],
                      ["Priority 3", p.priority3],
                      ["Constraints", p.constraints],
                      ["Success condition", p.successCondition],
                      ["Project test", p.projectTest],
                      ["Demonstration", p.demonstration],
                      ["Repo / link", p.repoLink],
                    ] as [string, string][]
                  )
                    .filter(([, value]) => value)
                    .map(([label, value]) => (
                      <div key={label}>
                        <dt className="label">{label}</dt>
                        <dd className="mt-1 text-sm text-ink-600">{value}</dd>
                      </div>
                    ))}
                </dl>

                {p.tools ? (
                  <div className="mt-4">
                    <p className="label">Tools / environment</p>
                    <div className="mt-1.5">
                      <Chips value={p.tools} />
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {me ? (
        <section className="card p-6">
          <SectionTitle
            title="Add a project"
            description="Only the name is required — fill the rest as it becomes clear."
          />
          <form onSubmit={add} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Project name">
                <input name="name" required className="field" />
              </Field>
              <Field label="Type">
                <select name="type" className="field">
                  <option value="">— select —</option>
                  {programme.lists.project_type?.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Current stage">
                <select name="stage" className="field">
                  <option value="">— select —</option>
                  {programme.lists.stage?.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Main purpose">
              <textarea name="mainPurpose" rows={2} className="field" />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Primary user">
                <input name="primaryUser" className="field" />
              </Field>
              <Field label="Tools / environment" hint="Separate with semicolons.">
                <input name="tools" className="field" />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Priority 1">
                <input name="priority1" className="field" />
              </Field>
              <Field label="Priority 2">
                <input name="priority2" className="field" />
              </Field>
              <Field label="Priority 3">
                <input name="priority3" className="field" />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Constraints">
                <textarea name="constraints" rows={2} className="field" />
              </Field>
              <Field label="Project success condition">
                <textarea name="successCondition" rows={2} className="field" />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Project test">
                <input name="projectTest" className="field" />
              </Field>
              <Field label="Project demonstration">
                <input name="demonstration" className="field" />
              </Field>
              <Field label="Repo / link">
                <input name="repoLink" className="field" />
              </Field>
            </div>

            <Field label="Notes">
              <input name="notes" className="field" />
            </Field>

            <label className="flex items-center gap-2 text-sm text-ink-800">
              <input type="checkbox" name="isPrimary" className="accent-accent-500" />
              This is my primary project
            </label>

            <button type="submit" className="btn-primary">
              Add project
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
