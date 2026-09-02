import { notFound } from "next/navigation";
import { saveProfileAction } from "@/lib/actions";
import { programmeByCode } from "@/lib/programme";
import { dashboard } from "@/lib/queries";
import { participantIn } from "@/lib/session";
import { Chips, Field, SectionTitle } from "@/components/ui";

export default async function ParticipantsPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const programme = programmeByCode(code);
  if (!programme) notFound();

  const me = await participantIn(programme);
  const view = dashboard(programme);

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="People"
        title="Participants"
        description="Everyone builds their own project. Counts come straight from the sprint log."
      />

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[52rem] text-sm">
          <thead className="border-b border-ink-200 bg-ink-50 text-left">
            <tr className="text-xs font-semibold uppercase tracking-wide text-ink-600">
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Primary project</th>
              <th className="px-4 py-3">Preferred tools</th>
              <th className="px-4 py-3 text-right">Targets</th>
              <th className="px-4 py-3 text-right">Complete</th>
              <th className="px-4 py-3 text-right">Blocked</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-200">
            {view.byParticipant.map(({ participant, primaryProject, tally }) => (
              <tr key={participant.id} className={participant.id === me?.id ? "bg-accent-50/40" : ""}>
                <td className="px-4 py-3 font-mono text-xs text-ink-400">{participant.ref}</td>
                <td className="px-4 py-3 font-medium text-ink-900">
                  {participant.name}
                  {participant.is_facilitator ? (
                    <span className="ml-2 rounded bg-accent-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-700">
                      Facilitator
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-ink-600">{participant.role || "—"}</td>
                <td className="px-4 py-3 text-ink-600">{primaryProject ?? "—"}</td>
                <td className="px-4 py-3">
                  <Chips value={participant.preferred_tools} />
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-ink-900">{tally.targetsSet}</td>
                <td className="px-4 py-3 text-right tabular-nums text-emerald-700">{tally.complete}</td>
                <td className="px-4 py-3 text-right tabular-nums text-rose-700">{tally.blocked}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {me ? (
        <section className="card p-6">
          <SectionTitle title="My details" />
          <form action={saveProfileAction} className="space-y-5">
            <input type="hidden" name="code" value={programme.join_code} />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Name">
                <input name="name" defaultValue={me.name} required className="field" />
              </Field>
              <Field label="Role">
                <input name="role" defaultValue={me.role} className="field" />
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Organisation">
                <input name="organisation" defaultValue={me.organisation} className="field" />
              </Field>
              <Field label="Email">
                <input type="email" name="email" defaultValue={me.email} className="field" />
              </Field>
            </div>
            <Field label="Preferred tools" hint="Separate with semicolons.">
              <input name="preferred_tools" defaultValue={me.preferred_tools} className="field" />
            </Field>
            <Field label="Notes">
              <input name="notes" defaultValue={me.notes} className="field" />
            </Field>
            <button type="submit" className="btn-primary">
              Save details
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
