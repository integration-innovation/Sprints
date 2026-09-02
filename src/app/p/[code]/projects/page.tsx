import { notFound } from "next/navigation";
import { saveProjectAction } from "@/lib/actions";
import { programmeByCode } from "@/lib/programme";
import { entriesForProgramme, listValues, projectsFor } from "@/lib/queries";
import { participantIn } from "@/lib/session";
import { Chips, EmptyState, Field, SectionTitle } from "@/components/ui";

export default async function ProjectsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const programme = programmeByCode(code);
  if (!programme) notFound();

  const me = await participantIn(programme);
  const projects = projectsFor(programme.id);
  const entries = entriesForProgramme(programme.id);
  const types = listValues(programme.id, "project_type");
  const stages = listValues(programme.id, "stage");

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Projects"
        title="What each sprint feeds into"
        description="A participant may have several. Sprint targets attach to one of them."
      />

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          body="Describe the project your sprints will advance — its purpose, its top three priorities and how you'd demonstrate success."
        />
      ) : (
        <ul className="space-y-4">
          {projects.map((p) => {
            const logged = entries.filter((e) => e.project_id === p.id);
            const complete = logged.filter((e) => e.status === "Complete").length;
            return (
              <li key={p.id} className="card p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-xs text-ink-400">{p.ref}</span>
                    <h3 className="mt-0.5 text-lg font-semibold text-ink-900">{p.name}</h3>
                    <p className="mt-0.5 text-sm text-ink-600">
                      {p.owner_name ?? "unowned"}
                      {p.type ? ` · ${p.type}` : ""}
                      {p.stage ? ` · ${p.stage}` : ""}
                    </p>
                  </div>
                  <p className="text-xs tabular-nums text-ink-400">
                    {logged.length} sprints logged · {complete} complete
                  </p>
                </div>

                {p.main_purpose ? (
                  <p className="mt-4 text-sm leading-relaxed text-ink-800">{p.main_purpose}</p>
                ) : null}

                <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ["Primary user", p.primary_user],
                    ["Priority 1", p.priority_1],
                    ["Priority 2", p.priority_2],
                    ["Priority 3", p.priority_3],
                    ["Constraints", p.constraints],
                    ["Success condition", p.success_condition],
                    ["Project test", p.project_test],
                    ["Demonstration", p.demonstration],
                    ["Repo / link", p.repo_link],
                  ]
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
          <SectionTitle title="Add a project" description="Only the name is required — fill the rest as it becomes clear." />
          <form action={saveProjectAction} className="space-y-5">
            <input type="hidden" name="code" value={programme.join_code} />
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Project name">
                <input name="name" required className="field" />
              </Field>
              <Field label="Type">
                <select name="type" className="field">
                  <option value="">— select —</option>
                  {types.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Current stage">
                <select name="stage" className="field">
                  <option value="">— select —</option>
                  {stages.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Main purpose">
              <textarea name="main_purpose" rows={2} className="field" />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Primary user">
                <input name="primary_user" className="field" />
              </Field>
              <Field label="Tools / environment" hint="Separate with semicolons.">
                <input name="tools" className="field" />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Priority 1">
                <input name="priority_1" className="field" />
              </Field>
              <Field label="Priority 2">
                <input name="priority_2" className="field" />
              </Field>
              <Field label="Priority 3">
                <input name="priority_3" className="field" />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Constraints">
                <textarea name="constraints" rows={2} className="field" />
              </Field>
              <Field label="Project success condition">
                <textarea name="success_condition" rows={2} className="field" />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Project test">
                <input name="project_test" className="field" />
              </Field>
              <Field label="Project demonstration">
                <input name="demonstration" className="field" />
              </Field>
              <Field label="Repo / link">
                <input name="repo_link" className="field" />
              </Field>
            </div>

            <Field label="Notes">
              <input name="notes" className="field" />
            </Field>

            <label className="flex items-center gap-2 text-sm text-ink-800">
              <input type="checkbox" name="is_primary" value="1" className="accent-accent-500" />
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
