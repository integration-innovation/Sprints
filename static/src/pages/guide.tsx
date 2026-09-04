import React from "react";
import {
  CLOSING_NOTES,
  GUIDE_STEPS,
  PROMPT_CARDS,
  READINGS,
  SIZE_EXERCISE,
  TARGET_PARTS,
  TERMS,
  composeTarget,
  type StepKind,
  type TargetParts,
} from "../../../src/lib/guide";
import { recordId } from "../derive";
import {
  guideKey,
  resetHour,
  setStep,
  startHour,
  useElapsedMinutes,
  useGuide,
} from "../guide-state";
import type { SParticipant, SProgramme } from "../model";
import { Link, navigate } from "../router";
import { entryFor, nextSession, updateEntry } from "../store";
import { StatusBadge } from "../ui";

/** One instruction, big enough to read, with the copy button next to it. */
function CopyBlock({ text, label }: { text: string; label: string }) {
  const [state, setState] = React.useState<"idle" | "copied" | "manual">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      // A browser that refuses the clipboard should say so rather than lie:
      // the text is on screen either way.
      setState("manual");
    }
    window.setTimeout(() => setState("idle"), 4000);
  }
  return (
    <div className="rounded-xl border border-ink-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-ink-200 px-4 py-2.5">
        <span className="text-sm font-semibold text-ink-700">{label}</span>
        <button type="button" onClick={copy} className="btn-secondary text-sm">
          {state === "copied" ? "Copied" : "Copy"}
        </button>
      </div>
      {state === "manual" ? (
        <p className="border-b border-ink-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          This browser would not let the page copy for you. Select the text below and press
          Ctrl&nbsp;+&nbsp;C (⌘&nbsp;C on a Mac).
        </p>
      ) : null}
      <pre className="overflow-x-auto whitespace-pre-wrap px-4 py-3 font-sans text-base leading-relaxed text-ink-800">
        {text}
      </pre>
    </div>
  );
}

function StepHeader({
  index,
  total,
  window: windowLabel,
  title,
  lead,
  notes,
}: {
  index: number;
  total: number;
  window: string;
  title: string;
  lead: string;
  notes?: string[];
}) {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-widest text-accent-600">
        Step {index + 1} of {total} · {windowLabel}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink-900">{title}</h1>
      {lead ? <p className="mt-2 text-lg leading-relaxed text-ink-700">{lead}</p> : null}
      {notes?.map((note) => (
        <p key={note} className="mt-3 text-base leading-relaxed text-ink-600">
          {note}
        </p>
      ))}
    </div>
  );
}

/** Where the hour is, said gently: guidance, never a countdown. */
function Clock({ minutes, target }: { minutes: number | null; target: string }) {
  if (minutes === null) {
    return (
      <p className="text-sm text-ink-400">The clock starts when you write your target.</p>
    );
  }
  return (
    <p className="text-sm text-ink-500">
      <span className="font-semibold text-ink-700">{minutes} min</span> into your hour · this step
      usually runs {target}
    </p>
  );
}

export function GuidePage({
  programme,
  me,
}: {
  programme: SProgramme;
  me: SParticipant;
}) {
  const sprintNo = nextSession(programme)?.sprintNo ?? programme.sessions[0]?.sprintNo ?? 1;
  const entry = entryFor(programme, sprintNo, me.id);
  const key = guideKey(programme.id, me.id, sprintNo);
  const progress = useGuide(key);
  const elapsed = useElapsedMinutes(progress.startedAt);

  const index = Math.max(0, GUIDE_STEPS.findIndex((s) => s.id === progress.step));
  const step = GUIDE_STEPS[index];
  const go = (id: StepKind) => {
    setStep(key, id);
    window.scrollTo(0, 0);
  };
  const next = () => {
    const following = GUIDE_STEPS[index + 1];
    if (following) go(following.id);
  };

  if (!entry) {
    return <p className="text-base text-ink-600">This programme has no sessions yet.</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-ink-500">
            {me.name} · Sprint {String(sprintNo).padStart(2, "0")} · {recordId(programme, sprintNo, me.id)}
          </p>
          <Clock minutes={elapsed} target={step.window} />
        </div>
        <div className="flex items-center gap-2">
          {progress.done.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Start the guide again from the first page?")) resetHour(key);
              }}
              className="btn-ghost text-sm"
            >
              Start again
            </button>
          ) : null}
          <Link to={`/p/${programme.id}/me`} className="btn-ghost text-sm">
            Skip to the form
          </Link>
        </div>
      </div>

      {/* The rail: where you are, and everywhere you have been. */}
      <ol className="flex flex-wrap gap-1.5">
        {GUIDE_STEPS.map((s, i) => {
          const visited = progress.done.includes(s.id) || i <= index;
          return (
            <li key={s.id}>
              <button
                type="button"
                disabled={!visited}
                onClick={() => go(s.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  s.id === step.id
                    ? "bg-ink-900 text-white"
                    : visited
                      ? "bg-ink-100 text-ink-600 hover:bg-ink-200"
                      : "bg-ink-50 text-ink-300"
                }`}
              >
                {i + 1}. {s.title}
              </button>
            </li>
          );
        })}
      </ol>

      <section className="card p-8">
        <StepHeader
          index={index}
          total={GUIDE_STEPS.length}
          window={step.window}
          title={step.title}
          lead={step.lead}
          notes={step.notes}
        />

        <div className="mt-8">
          {step.id === "read" ? <ReadStep onNext={next} /> : null}
          {step.id === "size" ? <SizeStep onNext={next} /> : null}
          {step.id === "target" ? (
            <TargetStep
              programme={programme}
              me={me}
              sprintNo={sprintNo}
              existing={entry.target}
              onNext={() => {
                startHour(key);
                next();
              }}
            />
          ) : null}
          {step.id === "prompt" ? <PromptStep target={entry.target} onNext={next} /> : null}
          {step.id === "build" ? <BuildStep target={entry.target} onNext={next} /> : null}
          {step.id === "test" ? (
            <TestStep
              programme={programme}
              me={me}
              sprintNo={sprintNo}
              definitionOfDone={entry.definitionOfDone}
              onNext={next}
            />
          ) : null}
          {step.id === "record" ? (
            <RecordStep programme={programme} me={me} sprintNo={sprintNo} onNext={next} />
          ) : null}
          {step.id === "done" ? (
            <DoneStep programme={programme} me={me} sprintNo={sprintNo} />
          ) : null}
        </div>
      </section>

      {index > 0 ? (
        <button
          type="button"
          onClick={() => go(GUIDE_STEPS[index - 1].id)}
          className="btn-ghost text-sm"
        >
          ← Back to {GUIDE_STEPS[index - 1].title.toLowerCase()}
        </button>
      ) : null}
    </div>
  );
}

function NextButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className="btn-primary mt-8 px-6 py-3 text-base">
      {label}
    </button>
  );
}

function ReadStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-6">
      {READINGS.map((reading) => (
        <article key={reading.id} className="rounded-xl border border-ink-200 bg-ink-50/60 p-5">
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

      <div className="rounded-xl border border-ink-200 p-5">
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
      </div>

      <NextButton onClick={onNext} label="Read it — next" />
    </div>
  );
}

function SizeStep({ onNext }: { onNext: () => void }) {
  const [picked, setPicked] = React.useState<string | null>(null);
  const chosen = SIZE_EXERCISE.options.find((o) => o.id === picked);
  return (
    <div className="space-y-5">
      <p className="text-lg text-ink-800">{SIZE_EXERCISE.question}</p>
      <div className="grid gap-3">
        {SIZE_EXERCISE.options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setPicked(option.id)}
            className={`rounded-xl border p-5 text-left text-base leading-relaxed transition ${
              picked === option.id
                ? option.correct
                  ? "border-emerald-400 bg-emerald-50 text-ink-900"
                  : "border-amber-400 bg-amber-50 text-ink-900"
                : "border-ink-200 bg-white text-ink-800 hover:bg-ink-100"
            }`}
          >
            {option.text}
          </button>
        ))}
      </div>
      {chosen ? (
        <div className="rounded-xl border border-ink-200 bg-ink-50/60 p-5">
          <p className="text-base leading-relaxed text-ink-800">{chosen.response}</p>
          {chosen.correct ? (
            <p className="mt-3 text-base leading-relaxed text-ink-600">{SIZE_EXERCISE.moral}</p>
          ) : null}
        </div>
      ) : null}
      {picked ? <NextButton onClick={onNext} label="Now write your own — next" /> : null}
    </div>
  );
}

function TargetStep({
  programme,
  me,
  sprintNo,
  existing,
  onNext,
}: {
  programme: SProgramme;
  me: SParticipant;
  sprintNo: number;
  existing: string;
  onNext: () => void;
}) {
  const [parts, setParts] = React.useState<Partial<TargetParts>>({});
  const composed = composeTarget(parts);
  const enough = Boolean((parts.verb ?? "").trim() && (parts.thing ?? "").trim());

  function save() {
    updateEntry(programme.id, sprintNo, me.id, {
      target: composed,
      definitionOfDone: (parts.result ?? "").trim(),
      tools: (parts.tool ?? "").trim(),
      status: "In progress",
    });
    onNext();
  }

  return (
    <div className="space-y-6">
      {existing.trim() ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-base text-emerald-900">
          You already have a target for this sprint: “{existing}”. Write a new one below, or carry
          on with that.
        </p>
      ) : null}

      <div className="grid gap-5">
        {TARGET_PARTS.map((part) => (
          <label key={part.key} className="block">
            <span className="text-base font-semibold text-ink-900">{part.label}</span>
            <span className="mt-0.5 block text-sm text-ink-500">{part.hint}</span>
            <input
              value={parts[part.key] ?? ""}
              onChange={(e) => setParts((p) => ({ ...p, [part.key]: e.target.value }))}
              placeholder={part.placeholder}
              className="field mt-2 px-4 py-3 text-base"
            />
          </label>
        ))}
      </div>

      <div className="rounded-xl border border-ink-200 bg-ink-50/60 p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-ink-500">Your target</p>
        <p className="mt-2 text-lg leading-relaxed text-ink-900">
          {composed || "It will appear here as you fill in the boxes above."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!enough}
          onClick={save}
          className="btn-primary px-6 py-3 text-base"
        >
          This is my target — start the hour
        </button>
        {existing.trim() && !enough ? (
          <button type="button" onClick={onNext} className="btn-secondary px-5 py-3 text-base">
            Keep the target I have
          </button>
        ) : null}
      </div>
      <p className="text-sm text-ink-500">
        Saved to your sprint row the moment you press it. You can rewrite it at any time.
      </p>
    </div>
  );
}

function fill(body: string, target: string): string {
  return body.replace("{target}", target.trim() || "[your target]");
}

function PromptStep({ target, onNext }: { target: string; onNext: () => void }) {
  const first = PROMPT_CARDS[0];
  return (
    <div className="space-y-6">
      <CopyBlock label={first.title} text={fill(first.body, target)} />
      <div className="rounded-xl border border-ink-200 bg-ink-50/60 p-5 text-base leading-relaxed text-ink-700">
        <p className="font-semibold text-ink-900">Where does this go?</p>
        <p className="mt-2">
          Into whichever assistant you are using — the chat box is the whole interface. Paste it,
          send it, and read what comes back before doing anything else.
        </p>
        <p className="mt-2">
          It will probably ask you two or three questions. Answer them in ordinary sentences, the
          way you would brief someone in the office. That is the job.
        </p>
      </div>
      <NextButton onClick={onNext} label="Pasted it — start building" />
    </div>
  );
}

function BuildStep({ target, onNext }: { target: string; onNext: () => void }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-ink-200 bg-white p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-ink-500">
          What you are building
        </p>
        <p className="mt-2 text-lg leading-relaxed text-ink-900">
          {target.trim() || "No target written yet — go back a step and write one."}
        </p>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-ink-900">When it goes wrong</h2>
        <p className="mt-1 text-base text-ink-600">
          It will, two or three times an hour. Say one of these; do not start again.
        </p>
        <div className="mt-4 space-y-4">
          {PROMPT_CARDS.slice(1).map((card) => (
            <div key={card.id}>
              <p className="text-base font-semibold text-ink-800">{card.when}</p>
              <div className="mt-2">
                <CopyBlock label={card.title} text={card.body} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <NextButton onClick={onNext} label="I have something to check" />
    </div>
  );
}

function TestStep({
  programme,
  me,
  sprintNo,
  definitionOfDone,
  onNext,
}: {
  programme: SProgramme;
  me: SParticipant;
  sprintNo: number;
  definitionOfDone: string;
  onNext: () => void;
}) {
  const answers = [
    { label: "Yes — I can see it", status: "Complete", tone: "border-emerald-300 bg-emerald-50" },
    { label: "Partly", status: "Partial", tone: "border-amber-300 bg-amber-50" },
    { label: "Not yet", status: "Blocked", tone: "border-rose-300 bg-rose-50" },
  ];
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-ink-200 bg-ink-50/60 p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-ink-500">
          You said you would know it worked when
        </p>
        <p className="mt-2 text-lg leading-relaxed text-ink-900">
          {definitionOfDone.trim() || "…you could see the result on screen."}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {answers.map((answer) => (
          <button
            key={answer.status}
            type="button"
            onClick={() => {
              updateEntry(programme.id, sprintNo, me.id, { status: answer.status });
              onNext();
            }}
            className={`rounded-xl border p-5 text-base font-semibold text-ink-900 transition hover:brightness-95 ${answer.tone}`}
          >
            {answer.label}
          </button>
        ))}
      </div>
      <p className="text-base text-ink-600">
        Partly and not yet are ordinary answers. Both are worth more than a blank row.
      </p>
    </div>
  );
}

function RecordStep({
  programme,
  me,
  sprintNo,
  onNext,
}: {
  programme: SProgramme;
  me: SParticipant;
  sprintNo: number;
  onNext: () => void;
}) {
  const entry = entryFor(programme, sprintNo, me.id);
  const [result, setResult] = React.useState(entry?.result ?? "");
  const [evidence, setEvidence] = React.useState(entry?.evidence ?? "");
  const [nextStep, setNextStep] = React.useState(entry?.nextPossibility ?? "");

  function save() {
    updateEntry(programme.id, sprintNo, me.id, {
      result: result.trim(),
      evidence: evidence.trim(),
      nextPossibility: nextStep.trim(),
    });
    onNext();
  }

  return (
    <div className="space-y-5">
      <label className="block">
        <span className="text-base font-semibold text-ink-900">This now works…</span>
        <span className="mt-0.5 block text-sm text-ink-500">
          One sentence. What can be done now that could not be done at ten o'clock?
        </span>
        <textarea
          rows={3}
          value={result}
          onChange={(e) => setResult(e.target.value)}
          className="field mt-2 px-4 py-3 text-base"
        />
      </label>

      <label className="block">
        <span className="text-base font-semibold text-ink-900">Evidence (optional)</span>
        <span className="mt-0.5 block text-sm text-ink-500">
          A link, a file name, a screenshot you took — anything that lets you find it again.
        </span>
        <input
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          className="field mt-2 px-4 py-3 text-base"
        />
      </label>

      <label className="block">
        <span className="text-base font-semibold text-ink-900">The obvious next step (optional)</span>
        <span className="mt-0.5 block text-sm text-ink-500">
          Write it now while it is obvious. Next sprint offers it back to you as your target.
        </span>
        <textarea
          rows={2}
          value={nextStep}
          onChange={(e) => setNextStep(e.target.value)}
          className="field mt-2 px-4 py-3 text-base"
        />
      </label>

      <button type="button" onClick={save} className="btn-primary px-6 py-3 text-base">
        Record it — that is the hour
      </button>
    </div>
  );
}

function DoneStep({
  programme,
  me,
  sprintNo,
}: {
  programme: SProgramme;
  me: SParticipant;
  sprintNo: number;
}) {
  const entry = entryFor(programme, sprintNo, me.id);
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-ink-200 bg-ink-50/60 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-ink-500">
            Sprint {String(sprintNo).padStart(2, "0")} · {recordId(programme, sprintNo, me.id)}
          </p>
          {entry ? <StatusBadge status={entry.status} /> : null}
        </div>
        <p className="mt-3 text-base text-ink-600">You set out to:</p>
        <p className="text-lg leading-relaxed text-ink-900">{entry?.target || "—"}</p>
        <p className="mt-3 text-base text-ink-600">And by the end:</p>
        <p className="text-lg leading-relaxed text-ink-900">{entry?.result || "—"}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {CLOSING_NOTES.map((note) => (
          <div key={note.title} className="rounded-xl border border-ink-200 p-4">
            <p className="text-base font-semibold text-ink-900">{note.title}</p>
            <p className="mt-1.5 text-base leading-relaxed text-ink-600">{note.body}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => navigate(`/p/${programme.id}/board`)}
          className="btn-primary px-5 py-3 text-base"
        >
          See what everyone built
        </button>
        <Link to={`/p/${programme.id}/me`} className="btn-secondary px-5 py-3 text-base">
          Open my full sprint row
        </Link>
      </div>

      <p className="text-base leading-relaxed text-ink-600">
        Next session you will not need this guide. Go straight to <strong>My sprint</strong>, write
        one target, build, and record what changed — that is the whole of it.
      </p>
    </div>
  );
}
