import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RUN_SHEET } from "@/lib/defaults";
import {
  CLOSING_NOTES,
  PROMPT_CARDS,
  READINGS,
  SIZE_EXERCISE,
  TARGET_PARTS,
  TERMS,
} from "@/lib/guide";
import { programmeByCode } from "@/lib/programme";
import { entryFor, nextSession, sessionByNo, sessionsFor } from "@/lib/queries";
import { participantIn } from "@/lib/session";
import { DetailPanel, SectionTitle } from "@/components/ui";

/**
 * The first hour, read straight through. The static build walks the same
 * content one step at a time; here it is one page, because this build renders
 * without JavaScript and a page you can scroll and print is the honest version
 * of that. The exercises live in the sprint form, one tab across.
 */
export default async function GuidePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const programme = programmeByCode(code);
  if (!programme) notFound();

  const me = await participantIn(programme);
  if (!me) redirect(`/join?code=${programme.join_code}`);

  const sessions = sessionsFor(programme.id);
  const sprintNo = nextSession(programme.id)?.sprint_no ?? sessions[0]?.sprint_no;
  const session = sprintNo ? sessionByNo(programme.id, sprintNo) : undefined;
  const entry = session ? entryFor(session.id, me.id) : undefined;
  const target = entry?.target.trim() ?? "";
  const first = PROMPT_CARDS[0];

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-accent-600">
          Start here · about five minutes of reading
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink-900">Your first hour</h1>
        <p className="mt-2 text-lg leading-relaxed text-ink-700">
          Everything you need for one session, in the order you need it. No prior knowledge is
          assumed, and nothing here has to be remembered.
        </p>
      </div>

      {READINGS.map((reading) => (
        <article key={reading.id} className="card p-6">
          <h2 className="text-xl font-semibold text-ink-900">{reading.title}</h2>
          {reading.body.map((paragraph) => (
            <p key={paragraph} className="mt-3 text-base leading-relaxed text-ink-700">
              {paragraph}
            </p>
          ))}
          {reading.keep ? (
            <p className="mt-4 border-l-2 border-accent-500 pl-3 text-base font-medium text-ink-800">
              {reading.keep}
            </p>
          ) : null}
        </article>
      ))}

      <section className="card p-6">
        <h2 className="text-xl font-semibold text-ink-900">The words you will hear</h2>
        <p className="mt-1 text-base text-ink-600">
          Nobody will explain these. They are simpler than they sound.
        </p>
        <dl className="mt-4 space-y-4">
          {TERMS.map((term) => (
            <div key={term.word} className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <dt className="text-base font-semibold text-ink-900">{term.word}</dt>
              <dd className="text-base leading-relaxed text-ink-700">
                {term.plain}
                <span className="mt-1 block text-ink-500">Much like: {term.likeIt}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card p-6">
        <h2 className="text-xl font-semibold text-ink-900">How big is an hour?</h2>
        <p className="mt-1 text-base text-ink-700">{SIZE_EXERCISE.question}</p>
        <p className="mt-1 text-sm text-ink-500">Decide before you open either answer.</p>
        <div className="mt-4 space-y-3">
          {SIZE_EXERCISE.options.map((option) => (
            <DetailPanel key={option.id} summary={option.text}>
              <p className="text-base leading-relaxed text-ink-700">{option.response}</p>
            </DetailPanel>
          ))}
        </div>
        <p className="mt-4 text-base leading-relaxed text-ink-600">{SIZE_EXERCISE.moral}</p>
      </section>

      <section className="card p-6">
        <SectionTitle
          eyebrow="0–10 min"
          title="Write your target"
          description={programme.target_formula}
        />
        <p className="text-base leading-relaxed text-ink-700">
          Four short answers make the sentence. Write them straight into the target box on{" "}
          <Link href={`/p/${programme.join_code}/me`} className="font-semibold underline">
            My sprint
          </Link>
          .
        </p>
        <ol className="mt-4 space-y-3">
          {TARGET_PARTS.map((part, i) => (
            <li key={part.key} className="flex gap-3">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-600">
                {i + 1}
              </span>
              <span className="text-base leading-relaxed text-ink-800">
                <strong className="font-semibold text-ink-900">{part.label}</strong>{" "}
                <span className="text-ink-600">{part.hint}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="card p-6">
        <SectionTitle
          eyebrow="10–15 min"
          title="Give the first instruction"
          description="Paste this into whichever assistant you are using, then read what it asks you."
        />
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-ink-200 bg-ink-50/70 px-4 py-3 font-sans text-base leading-relaxed text-ink-800">
          {first.body.replace("{target}", target || "[your target]")}
        </pre>
        <p className="mt-3 text-sm text-ink-500">
          Select the text and copy it. It will probably ask you two or three questions — answer them
          in ordinary sentences, the way you would brief someone in the office.
        </p>
      </section>

      <section className="card p-6">
        <SectionTitle
          eyebrow="15–50 min"
          title="When it goes wrong"
          description="It will, two or three times an hour. Say one of these; do not start again."
        />
        <div className="space-y-4">
          {PROMPT_CARDS.slice(1).map((card) => (
            <div key={card.id}>
              <p className="text-base font-semibold text-ink-900">
                {card.when} — {card.title}
              </p>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg border border-ink-200 bg-ink-50/70 px-4 py-3 font-sans text-base leading-relaxed text-ink-800">
                {card.body}
              </pre>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-xl font-semibold text-ink-900">The shape of the hour</h2>
        <dl className="mt-4 space-y-2">
          {RUN_SHEET.map((row) => (
            <div key={row.window} className="grid gap-1 sm:grid-cols-[7rem_6rem_1fr] sm:gap-4">
              <dt className="text-base font-semibold text-ink-900">{row.window}</dt>
              <dd className="text-base font-medium text-accent-700">{row.phase}</dd>
              <dd className="text-base text-ink-700">{row.detail}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {CLOSING_NOTES.map((note) => (
          <div key={note.title} className="card p-5">
            <p className="text-base font-semibold text-ink-900">{note.title}</p>
            <p className="mt-1.5 text-base leading-relaxed text-ink-600">{note.body}</p>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href={`/p/${programme.join_code}/me`} className="btn-primary px-5 py-3 text-base">
          Open my sprint and write the target
        </Link>
        <Link href={`/p/${programme.join_code}/board`} className="btn-secondary px-5 py-3 text-base">
          See what everyone is building
        </Link>
      </div>
    </div>
  );
}
