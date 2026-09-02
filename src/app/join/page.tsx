import Link from "next/link";
import { redirect } from "next/navigation";
import { joinProgrammeAction } from "@/lib/actions";
import { formatDate, programmeByCode } from "@/lib/programme";
import { participantsFor, sessionsFor } from "@/lib/queries";
import { currentParticipant } from "@/lib/session";
import { Field, SectionTitle } from "@/components/ui";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const programme = code ? programmeByCode(code) : undefined;

  if (code && !programme) {
    return (
      <main className="mx-auto max-w-lg px-6 py-20">
        <div className="card p-8 text-center">
          <h1 className="text-lg font-semibold text-ink-900">No programme with that code</h1>
          <p className="mt-2 text-sm text-ink-600">
            Check the code with your facilitator — codes are six characters, letters and digits.
          </p>
          <Link href="/" className="btn-secondary mt-6">
            Try again
          </Link>
        </div>
      </main>
    );
  }

  if (!programme) redirect("/");

  const me = await currentParticipant();
  if (me && me.programme_id === programme.id) redirect(`/p/${programme.join_code}/me`);

  const sessions = sessionsFor(programme.id);
  const roster = participantsFor(programme.id);

  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-600">
        Joining · {programme.join_code}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink-900">{programme.name}</h1>
      {programme.tagline ? <p className="mt-2 text-ink-600">{programme.tagline}</p> : null}
      <p className="mt-3 text-sm text-ink-600">
        {sessions.length} sprints · every {programme.cadence_weeks} weeks ·{" "}
        {sessions.length > 0
          ? `${formatDate(sessions[0].date)} – ${formatDate(sessions[sessions.length - 1].date)}`
          : "no sessions yet"}{" "}
        · {programme.session_time}
      </p>

      {roster.length > 0 ? (
        <section className="card mt-8 p-6">
          <SectionTitle
            title="Already on the roster?"
            description="Pick your name to pick up where you left off."
          />
          <div className="flex flex-wrap gap-2">
            {roster.map((p) => (
              <form key={p.id} action={joinProgrammeAction}>
                <input type="hidden" name="code" value={programme.join_code} />
                <input type="hidden" name="participant_id" value={p.id} />
                <button type="submit" className="btn-secondary">
                  {p.name}
                  {p.is_facilitator ? (
                    <span className="text-xs font-normal text-ink-400">facilitator</span>
                  ) : null}
                </button>
              </form>
            ))}
          </div>
        </section>
      ) : null}

      <section className="card mt-6 p-6">
        <SectionTitle
          title="New here"
          description="You'll get a Sprint Log row for every session in the programme."
        />
        <form action={joinProgrammeAction} className="space-y-4">
          <input type="hidden" name="code" value={programme.join_code} />
          <Field label="Your name">
            <input name="name" required className="field" placeholder="Jane Tan" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Role" hint="How you'll take part.">
              <input name="role" defaultValue="Builder" className="field" />
            </Field>
            <Field label="Organisation" hint="Optional.">
              <input name="organisation" className="field" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" hint="Optional. Used only to identify you here.">
              <input type="email" name="email" className="field" />
            </Field>
            <Field label="Preferred tools" hint="Separate with semicolons.">
              <input
                name="preferred_tools"
                placeholder="Blender; Claude Code; Python"
                className="field"
              />
            </Field>
          </div>
          <button type="submit" className="btn-primary w-full">
            Join programme
          </button>
        </form>
      </section>
    </main>
  );
}
