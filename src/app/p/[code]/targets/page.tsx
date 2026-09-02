import Link from "next/link";
import { notFound } from "next/navigation";
import { pullTargetAction, saveTargetAction, setTargetStatusAction } from "@/lib/actions";
import { programmeByCode } from "@/lib/programme";
import { projectsOwnedBy, sessionsFor, targetsFor } from "@/lib/queries";
import { participantIn } from "@/lib/session";
import { EmptyState, Field, SectionTitle } from "@/components/ui";

const TARGET_STATUSES = ["Open", "Used", "Deferred", "Dropped"];

export default async function TargetBankPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const programme = programmeByCode(code);
  if (!programme) notFound();

  const me = await participantIn(programme);
  const targets = targetsFor(programme.id);
  const sessions = sessionsFor(programme.id);
  const myProjects = me ? projectsOwnedBy(me.id) : [];

  const open = targets.filter((t) => t.status === "Open");
  const rest = targets.filter((t) => t.status !== "Open");

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Target bank"
        title="Too-large ideas, reduced to sprint size"
        description={programme.target_formula}
      />

      {targets.length === 0 ? (
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
                    <span className="font-mono text-xs text-ink-400">{t.ref}</span>
                    <div className="flex items-center gap-2 text-xs text-ink-400">
                      {t.owner_name ? <span>{t.owner_name}</span> : <span>unclaimed</span>}
                      {t.project_name ? <span>· {t.project_name}</span> : null}
                      {t.suggested_sprint ? <span>· suggested S{t.suggested_sprint}</span> : null}
                      {t.used_in_sprint ? (
                        <span className="rounded-full bg-ink-100 px-2 py-0.5 font-semibold text-ink-600">
                          used in S{t.used_in_sprint}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-4 lg:grid-cols-2">
                    <div>
                      <p className="label">Too large</p>
                      <p className="mt-1 text-sm text-ink-600 line-through decoration-ink-200">
                        {t.too_large_idea || "—"}
                      </p>
                    </div>
                    <div className="lg:border-l lg:border-ink-200 lg:pl-4">
                      <p className="label">Sprint-sized</p>
                      <p className="mt-1 text-sm font-medium text-ink-900">{t.sprint_target}</p>
                    </div>
                  </div>

                  {me ? (
                    <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-ink-200 pt-4">
                      <form action={pullTargetAction} className="flex flex-wrap items-end gap-2">
                        <input type="hidden" name="code" value={programme.join_code} />
                        <input type="hidden" name="target_id" value={t.id} />
                        <label className="text-xs font-semibold uppercase tracking-wide text-ink-600">
                          Pull into
                          <select
                            name="sprint_no"
                            defaultValue={t.suggested_sprint ?? sessions[0]?.sprint_no ?? 1}
                            className="field mt-1 w-36"
                          >
                            {sessions.map((s) => (
                              <option key={s.id} value={s.sprint_no}>
                                Sprint {String(s.sprint_no).padStart(2, "0")}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button type="submit" className="btn-secondary">
                          Use as my target
                        </button>
                      </form>

                      <form action={setTargetStatusAction} className="flex items-end gap-2">
                        <input type="hidden" name="code" value={programme.join_code} />
                        <input type="hidden" name="target_id" value={t.id} />
                        <label className="text-xs font-semibold uppercase tracking-wide text-ink-600">
                          Status
                          <select name="status" defaultValue={t.status} className="field mt-1 w-32">
                            {TARGET_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button type="submit" className="btn-ghost">
                          Update
                        </button>
                      </form>
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
          <form action={saveTargetAction} className="space-y-5">
            <input type="hidden" name="code" value={programme.join_code} />
            <Field label="Too-large idea">
              <textarea
                name="too_large_idea"
                rows={2}
                required
                placeholder="Build an AI BIM compliance checker."
                className="field"
              />
            </Field>
            <Field label="Sprint-sized target" hint={programme.target_formula}>
              <textarea
                name="sprint_target"
                rows={3}
                required
                placeholder="Configure AI to extract one required parameter from one IFC file so that the value appears in a table."
                className="field"
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Project">
                <select name="project_id" className="field">
                  <option value="">— none —</option>
                  {myProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Suggested sprint">
                <select name="suggested_sprint" className="field">
                  <option value="">— any —</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.sprint_no}>
                      Sprint {String(s.sprint_no).padStart(2, "0")}
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
      ) : (
        <p className="text-sm text-ink-600">
          <Link href={`/join?code=${programme.join_code}`} className="font-semibold text-accent-600">
            Join the programme
          </Link>{" "}
          to bank ideas and pull them into a sprint.
        </p>
      )}
    </div>
  );
}
