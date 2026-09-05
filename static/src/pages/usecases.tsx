import React from "react";
import type { UseCaseDraft } from "../../../src/lib/use-case";
import { Link } from "../router";
import { SectionTitle } from "../ui";

type PublishedFile = {
  cases: (UseCaseDraft & { programme?: string })[];
};

/**
 * The public face of the programmes: what people did, why it mattered and how.
 *
 * Everything here arrived through the app's consent step, so the page says so
 * plainly — both because readers should know what they are looking at, and
 * because it is the standard anything added later has to meet.
 */
export function UseCasesPage() {
  const [state, setState] = React.useState<"loading" | "ready" | "error">("loading");
  const [cases, setCases] = React.useState<PublishedFile["cases"]>([]);

  React.useEffect(() => {
    let live = true;
    fetch("./use-cases.json", { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: PublishedFile) => {
        if (!live) return;
        setCases(Array.isArray(data.cases) ? data.cases : []);
        setState("ready");
      })
      .catch(() => live && setState("error"));
    return () => {
      live = false;
    };
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-6 py-14 space-y-8">
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
          the app. Names, organisations, project names, evidence links and timings are never
          published. The sprint logs themselves stay private to each programme.
        </p>
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
            Participants can publish a use case from their programme, under{" "}
            <span className="font-semibold">Publish a use case</span>. It appears here once a
            submission is added to the site.
          </p>
        </section>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {cases.map((c, i) => (
          <article key={`${c.sprintNo}-${i}`} className="card space-y-3 p-5">
            <p className="text-xs text-ink-400">
              {c.role || "Participant"}
              {c.programme ? ` · ${c.programme}` : ""}
            </p>
            <p className="text-base font-semibold text-ink-900">{c.what}</p>
            {c.why ? (
              <p className="text-sm text-ink-600">
                <span className="label">Why</span> {c.why}
              </p>
            ) : null}
            {c.how ? (
              <p className="text-sm text-ink-600">
                <span className="label">How</span> {c.how}
              </p>
            ) : null}
            {c.outcome ? (
              <p className="text-sm text-ink-800">
                <span className="label">Outcome</span> {c.outcome}
              </p>
            ) : null}
            {c.nextStep ? (
              <p className="text-sm text-ink-600">
                <span className="label">Next</span> {c.nextStep}
              </p>
            ) : null}
            <p className="text-xs text-ink-400">
              {[c.tools && `Tools: ${c.tools}`, c.aiUsedFor && `AI: ${c.aiUsedFor}`, c.status]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </article>
        ))}
      </div>
    </main>
  );
}
