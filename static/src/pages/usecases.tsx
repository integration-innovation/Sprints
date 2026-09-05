import React from "react";
import { readPublicFile, type PublicCase } from "../../../src/lib/public-site";
import { STATUS_TONE } from "../model";
import { Link } from "../router";
import { SectionTitle } from "../ui";

const UNCATEGORISED = "Uncategorised";

function byline(c: PublicCase): string {
  // No name in the file means the author chose anonymity, and the page says so
  // rather than leaving the line blank as though something had gone missing.
  const named = [c.author, c.role].filter((s) => s && s.trim()).join(" · ");
  return named || (c.role ? `Anonymous · ${c.role}` : "Anonymous");
}

/**
 * Cases grouped by what kind of thing the hour produced.
 *
 * Groups are ordered by size, biggest first, because a reader scanning for
 * "what do people actually make in these hours" wants the common answer at the
 * top. The uncategorised group goes last whatever its size: it is the absence
 * of an answer, not one of them.
 */
function groupByCategory(cases: readonly PublicCase[]): [string, PublicCase[]][] {
  const groups = new Map<string, PublicCase[]>();
  for (const c of cases) {
    const key = c.category?.trim() || UNCATEGORISED;
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  return [...groups.entries()].sort(([a, as], [b, bs]) => {
    if (a === UNCATEGORISED) return 1;
    if (b === UNCATEGORISED) return -1;
    return bs.length - as.length || a.localeCompare(b);
  });
}

function Block({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  if (!value.trim()) return null;
  return (
    <div className="grid gap-1 sm:grid-cols-[7rem_1fr] sm:gap-4">
      <dt className="label pt-0.5">{label}</dt>
      <dd className={`text-sm leading-relaxed ${strong ? "text-ink-900" : "text-ink-700"}`}>{value}</dd>
    </div>
  );
}

/**
 * One case, given the whole width.
 *
 * The earlier two-column card grid made every case compete with its neighbour
 * for the eye, and cut each one down to fit. A case is an account of an hour;
 * it reads better as a page than a tile. What sits alone at the top because it
 * is the sentence the hour was for; why, how, outcome and next follow in the
 * order they were lived.
 */
function CasePanel({ c }: { c: PublicCase }) {
  const tone = STATUS_TONE[c.status] ?? "bg-slate-100 text-slate-600 ring-slate-200";
  return (
    <article className="card p-6 sm:p-7">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-xs text-ink-400">
          {c.programme ? `${c.programme} · ` : ""}
          Sprint {String(c.sprintNo).padStart(2, "0")} · {byline(c)}
        </p>
        {c.status ? (
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${tone}`}>
            {c.status}
          </span>
        ) : null}
      </header>

      <h3 className="mt-3 text-xl font-semibold leading-snug tracking-tight text-ink-900 text-balance">
        {c.what}
      </h3>

      <dl className="mt-5 space-y-3 border-t border-ink-200 pt-5">
        <Block label="Why" value={c.why} />
        <Block label="How" value={c.how} />
        <Block label="Outcome" value={c.outcome} strong />
        <Block label="Next" value={c.nextStep} />
      </dl>

      <footer className="mt-5 flex flex-wrap gap-x-4 gap-y-1 border-t border-ink-200 pt-4 text-xs text-ink-400">
        {c.tools ? <span>Tools: {c.tools}</span> : null}
        {c.aiUsedFor ? <span>AI used for: {c.aiUsedFor}</span> : null}
        {c.publishedAt ? (
          <span>
            Published{" "}
            {new Date(c.publishedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
          </span>
        ) : null}
      </footer>
    </article>
  );
}

/**
 * The public face of the programmes: what people did, why it mattered and how.
 *
 * Everything here arrived through the app's consent step *and* named a public
 * destination — the file is generated from the archive by `npm run
 * publish-cases`, which drops private-archive rows and withdrawn ones. The page
 * says that plainly, both because readers should know what they are looking at
 * and because it is the standard anything added later has to meet.
 */
export function UseCasesPage() {
  const [state, setState] = React.useState<"loading" | "ready" | "error">("loading");
  const [cases, setCases] = React.useState<PublicCase[]>([]);
  const [generatedAt, setGeneratedAt] = React.useState("");
  const [status, setStatus] = React.useState<string>("All");

  React.useEffect(() => {
    let live = true;
    fetch("./use-cases.json", { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: unknown) => {
        if (!live) return;
        setCases(readPublicFile(data));
        const when = (data as { generatedAt?: string })?.generatedAt;
        setGeneratedAt(typeof when === "string" ? when : "");
        setState("ready");
      })
      .catch(() => live && setState("error"));
    return () => {
      live = false;
    };
  }, []);

  // Only offer statuses that actually occur; a filter with nothing behind it is noise.
  const statuses = ["All", ...new Set(cases.map((c) => c.status).filter(Boolean))];
  const shown = status === "All" ? cases : cases.filter((c) => c.status === status);
  const groups = groupByCategory(shown);

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-14">
      <div>
        <Link to="/" className="text-sm text-ink-400 hover:text-ink-600">
          ← Back to start
        </Link>
        <SectionTitle
          eyebrow="Public"
          title="What an hour produces"
          description="Use cases from the sprint programmes: what someone set out to do, why it mattered, how they did it, and what came of it."
        />
        <p className="hint max-w-3xl">
          Every case here was published by the person who did the work, through a consent step in
          the app, having chosen a public destination. Anyone who asked to stay anonymous appears
          without a name, and no name was recorded. Emails, organisations, project names, evidence
          links and timings are never published, and the sprint logs themselves stay private to each
          programme.
        </p>
        {generatedAt ? (
          <p className="mt-2 text-xs text-ink-400">
            Last updated {new Date(generatedAt).toLocaleDateString(undefined, { dateStyle: "long" })} ·{" "}
            {cases.length} case{cases.length === 1 ? "" : "s"}
            {groups.length > 1 ? ` · ${groups.length} categories` : ""}
          </p>
        ) : null}
      </div>

      {state === "loading" ? <p className="text-sm text-ink-400">Loading…</p> : null}
      {state === "error" ? (
        <p className="text-sm text-ink-600">
          The published list could not be loaded. It may not be available offline.
        </p>
      ) : null}

      {state === "ready" && cases.length === 0 ? (
        <section className="card p-6">
          <p className="text-base font-semibold text-ink-900">Nothing published yet</p>
          <p className="mt-1 text-sm text-ink-600">
            Participants publish from their own programme, under{" "}
            <span className="font-semibold">Publish a use case</span>, choosing a public
            destination. A case appears here once the facilitator adds it to the site — which is a
            deliberate step, not an automatic one.
          </p>
        </section>
      ) : null}

      {statuses.length > 2 ? (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by status">
          {statuses.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              aria-pressed={status === s}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                status === s ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      {groups.map(([category, items]) => (
        <section key={category} className="space-y-4">
          <div className="flex items-baseline gap-3 border-b border-ink-200 pb-2">
            <h2 className="text-lg font-semibold tracking-tight text-ink-900">{category}</h2>
            <span className="text-sm tabular-nums text-ink-400">
              {items.length} case{items.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="space-y-4">
            {items.map((c) => (
              <CasePanel key={c.id} c={c} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
