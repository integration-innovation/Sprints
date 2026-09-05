import Link from "next/link";
import { createProgrammeAction } from "@/lib/actions";
import {
  DEFAULT_CORE_PRINCIPLE,
  DEFAULT_TARGET_FORMULA,
  GROUND_RULES,
  RUN_SHEET,
} from "@/lib/defaults";
import { Field, SectionTitle } from "@/components/ui";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent-600">
          Structured Sprints
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
          Bi-weekly build sprints.
        </h1>
        <p className="mt-4 text-lg text-ink-600">
          Every participant sets one sprint-sized target before the hour starts, builds it, and
          records what became possible by the end. The programme keeps the log, the target bank and
          the dashboard in one place.
        </p>
        <p className="mt-4 rounded-lg border-l-2 border-accent-500 bg-white px-4 py-3 text-sm text-ink-800">
          {DEFAULT_CORE_PRINCIPLE}
        </p>
      </header>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <SectionTitle
            eyebrow="Participants"
            title="Join a programme"
            description="Enter the join code your facilitator shared."
          />
          <form action="/join" method="get" className="space-y-4">
            <Field label="Join code">
              <input
                name="code"
                required
                maxLength={12}
                autoCapitalize="characters"
                placeholder="e.g. K7M2QP"
                className="field font-mono text-lg uppercase tracking-[0.2em]"
              />
            </Field>
            <button type="submit" className="btn-primary w-full">
              Continue
            </button>
          </form>
        </section>

        <section className="card p-6">
          <SectionTitle
            eyebrow="Facilitators"
            title="Start a programme"
            description="Sessions, prompts and dropdown lists are pre-filled; edit anything later."
          />
          <form action={createProgrammeAction} className="space-y-4">
            <Field label="Programme name">
              <input
                name="name"
                required
                placeholder="Bi-Weekly AI Build Sprints"
                className="field"
              />
            </Field>
            <Field label="Tagline" hint="Optional. Shown under the programme name.">
              <input
                name="tagline"
                placeholder="Six independent 1-hour build sessions"
                className="field"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="First session">
                <input type="date" name="start_date" required className="field" />
              </Field>
              <Field label="Sprints">
                <input
                  type="number"
                  name="sprint_count"
                  min={1}
                  max={24}
                  defaultValue={6}
                  className="field"
                />
              </Field>
              <Field label="Every (weeks)">
                <input
                  type="number"
                  name="cadence_weeks"
                  min={1}
                  max={8}
                  defaultValue={2}
                  className="field"
                />
              </Field>
            </div>
            <Field label="Session time">
              <input name="session_time" defaultValue="12:30–13:30" className="field" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Your name">
                <input name="facilitator_name" required className="field" />
              </Field>
              <Field label="Your email" hint="Optional.">
                <input type="email" name="facilitator_email" className="field" />
              </Field>
            </div>
            <button type="submit" className="btn-primary w-full">
              Create programme
            </button>
          </form>
        </section>
      </div>

      <section className="mt-14">
        <SectionTitle
          eyebrow="How an hour runs"
          title="60-minute run sheet"
          description="The app follows the same shape: plan first, build, then record the result."
        />
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {RUN_SHEET.map((step) => (
            <li key={step.window} className="card p-4">
              <p className="font-mono text-xs text-accent-600">{step.window}</p>
              <p className="mt-1 text-sm font-semibold text-ink-900">{step.phase}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-600">{step.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <SectionTitle title="Ground rules" />
          <dl className="space-y-3">
            {GROUND_RULES.map((r) => (
              <div key={r.rule} className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-4">
                <dt className="text-sm font-semibold text-ink-900">{r.rule}</dt>
                <dd className="text-sm text-ink-600">{r.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="card p-6">
          <SectionTitle title="Writing a target" description="Every target follows one formula." />
          <p className="rounded-lg bg-ink-100 px-4 py-3 font-mono text-sm text-ink-800">
            {DEFAULT_TARGET_FORMULA}
          </p>
          <p className="mt-4 text-sm text-ink-600">
            Too large: <span className="italic">&ldquo;Build an AI BIM compliance checker.&rdquo;</span>
          </p>
          <p className="mt-2 text-sm text-ink-800">
            Sprint-sized:{" "}
            <span className="italic">
              &ldquo;Configure AI to extract one required parameter from one IFC file so that the
              value appears in a table.&rdquo;
            </span>
          </p>
          <p className="mt-4 text-sm text-ink-600">
            Ideas that are still too large go in the{" "}
            <span className="font-semibold text-ink-800">Target Bank</span> with their sprint-sized
            version, ready to pull into a sprint when its turn comes.
          </p>
        </div>
      </section>

      <footer className="mt-14 border-t border-ink-200 pt-6 text-sm text-ink-400">
        <Link href="/join" className="hover:text-ink-600">
          Already have a code? Join a programme →
        </Link>
      </footer>
    </main>
  );
}
