import React from "react";
import { readPublicFile, type PublicCase } from "../../../src/lib/public-site";
import { Link } from "../router";
import { SectionTitle } from "../ui";

function byline(c: PublicCase): string {
  // No name in the file means the author chose anonymity, and the page says so
  // rather than leaving the line blank as though something had gone missing.
  const named = [c.author, c.role].filter((s) => s && s.trim()).join(" · ");
  return named || (c.role ? `Anonymous · ${c.role}` : "Anonymous");
}

function Line({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <p className="text-sm text-ink-600">
      <span className="label">{label}</span> {value}
    </p>
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

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-14">
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

      <div className="grid gap-4 sm:grid-cols-2">
        {cases.map((c) => (
          <article key={c.id} className="card space-y-3 p-5">
            <p className="text-xs text-ink-400">
              {byline(c)}
              {c.programme ? ` · ${c.programme}` : ""}
              {c.sprintNo ? ` · Sprint ${String(c.sprintNo).padStart(2, "0")}` : ""}
            </p>
            <p className="text-base font-semibold text-ink-900">{c.what}</p>
            <Line label="Why" value={c.why} />
            <Line label="How" value={c.how} />
            {c.outcome.trim() ? (
              <p className="text-sm text-ink-800">
                <span className="label">Outcome</span> {c.outcome}
              </p>
            ) : null}
            <Line label="Next" value={c.nextStep} />
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
