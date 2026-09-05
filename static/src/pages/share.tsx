import React from "react";
import {
  CONSENT_STATEMENT,
  DISCLAIMER,
  EXCLUDED,
  buildSubmission,
  draftUseCase,
  isPublishable,
  scanForIdentifiers,
  toMarkdown,
  type UseCaseDraft,
} from "../../../src/lib/use-case";
import type { SEntry, SParticipant, SProgramme } from "../model";
import { CopyBlock, Field, SectionTitle } from "../ui";

const REPO_ISSUE_URL =
  "https://github.com/integration-innovation/Sprints/issues/new?title=Use%20case%20submission";

function sourceFrom(entry: SEntry) {
  return {
    sprintNo: entry.sprintNo,
    target: entry.target,
    whyItMatters: entry.whyItMatters,
    definitionOfDone: entry.definitionOfDone,
    result: entry.result,
    whatChanged: entry.whatChanged,
    nextPossibility: entry.nextPossibility,
    tools: entry.tools,
    aiUsedFor: entry.aiUsedFor,
    status: entry.status,
  };
}

function Warnings({ draft, by }: { draft: UseCaseDraft; by: string }) {
  // The author credit and role are published too, so they are scanned like everything else.
  const text = [by, draft.what, draft.why, draft.how, draft.outcome, draft.nextStep].join(" ");
  const found = scanForIdentifiers(text);
  if (!found.length) return null;
  return (
    <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
      Check before publishing —{" "}
      {found.map((f) => `${f.kind} “${f.found}”`).join(", ")}. Edit it out if it should not be public.
    </p>
  );
}

/**
 * Publishing a use case.
 *
 * The programme's own record stays where it is. This page produces the public
 * account of an hour and nothing else, and it asks for consent at the point of
 * publishing, with the disclaimer on the same screen, rather than treating
 * agreement as something collected once and assumed thereafter.
 */
export function SharePage({ programme, me }: { programme: SProgramme; me: SParticipant }) {
  const mine = programme.entries
    .filter((e) => e.participantId === me.id)
    .sort((a, b) => a.sprintNo - b.sprintNo);

  const [author, setAuthor] = React.useState(me.name);
  const [role, setRole] = React.useState(me.role);
  const [drafts, setDrafts] = React.useState<Record<number, UseCaseDraft>>(() => {
    const by = { author: me.name, role: me.role };
    const initial: Record<number, UseCaseDraft> = {};
    for (const entry of mine) initial[entry.sprintNo] = draftUseCase(sourceFrom(entry), by);
    return initial;
  });
  const [chosen, setChosen] = React.useState<Set<number>>(new Set());
  const [agreed, setAgreed] = React.useState(false);

  const ready = mine.filter((e) =>
    isPublishable(drafts[e.sprintNo] ?? draftUseCase(sourceFrom(e), { author, role })),
  );
  const cases = [...chosen]
    .sort((a, b) => a - b)
    .map((n) => ({ ...drafts[n], author: author.trim(), role: role.trim() }))
    .filter(Boolean);

  const submission =
    agreed && cases.length
      ? buildSubmission({
          programmeName: programme.name,
          programmeTagline: programme.tagline,
          cases,
          agreedAt: new Date().toISOString(),
        })
      : null;

  function edit(sprintNo: number, patch: Partial<UseCaseDraft>) {
    setDrafts((d) => ({ ...d, [sprintNo]: { ...d[sprintNo], ...patch } }));
  }

  function download() {
    if (!submission) return;
    const blob = new Blob([JSON.stringify(submission, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `use-cases-${programme.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Optional"
        title="Publish a use case"
        description="Share what you did, why it mattered and how you did it, credited to you, so people outside the programme can see what an hour produces. Your sprint log itself is not published."
      />

      <section className="card space-y-4 p-6">
        <div>
          <p className="label">Before you publish</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-ink-700">
            {DISCLAIMER.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg bg-ink-100 px-4 py-3">
          <p className="label">Never published</p>
          <ul className="mt-1.5 space-y-1 text-sm text-ink-600">
            {EXCLUDED.map((x) => (
              <li key={x.field}>
                <span className="font-semibold text-ink-800">{x.field}</span> — {x.reason}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {ready.length === 0 ? (
        <section className="card p-6">
          <p className="text-sm text-ink-600">
            Nothing to publish yet. A sprint becomes publishable once it has both a target and a
            recorded result.
          </p>
        </section>
      ) : (
        <>
          <section className="card space-y-5 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Published as"
                hint="How you want to be credited. Leave it empty to publish without a credit."
              >
                <input
                  value={author}
                  onChange={(e) => {
                    setAuthor(e.target.value);
                    setAgreed(false);
                  }}
                  placeholder="No credit"
                  className="field"
                />
              </Field>
              <Field label="Role" hint="Generic, and yours to choose.">
                <input
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value);
                    setAgreed(false);
                  }}
                  placeholder="Architect"
                  className="field"
                />
              </Field>
            </div>

            {ready.map((entry) => {
              const draft = drafts[entry.sprintNo];
              const on = chosen.has(entry.sprintNo);
              return (
                <div
                  key={entry.sprintNo}
                  className={`rounded-xl border p-4 ${on ? "border-accent-500 bg-white" : "border-ink-200 bg-ink-50/40"}`}
                >
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) => {
                        const next = new Set(chosen);
                        if (e.target.checked) next.add(entry.sprintNo);
                        else next.delete(entry.sprintNo);
                        setChosen(next);
                        setAgreed(false);
                      }}
                      className="size-4"
                    />
                    <span className="font-semibold text-ink-900">
                      Sprint {String(entry.sprintNo).padStart(2, "0")}
                    </span>
                    <span className="text-sm text-ink-400">{draft.what}</span>
                  </label>

                  {on ? (
                    <div className="mt-4 space-y-3">
                      {(
                        [
                          ["what", "What you set out to do"],
                          ["why", "Why it mattered"],
                          ["how", "How you did it"],
                          ["outcome", "What came of it"],
                          ["nextStep", "What it opens up"],
                        ] as const
                      ).map(([key, label]) => (
                        <Field key={key} label={label}>
                          <textarea
                            rows={2}
                            value={draft[key]}
                            onChange={(e) => {
                              edit(entry.sprintNo, { [key]: e.target.value });
                              setAgreed(false);
                            }}
                            className="field"
                          />
                        </Field>
                      ))}
                      <p className="text-xs text-ink-400">
                        Also published: tools ({draft.tools || "none"}), AI used for (
                        {draft.aiUsedFor || "none"}), status ({draft.status || "none"}).
                      </p>
                      <Warnings draft={draft} by={`${author} ${role}`} />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </section>

          <section className="card space-y-4 p-6">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={agreed}
                disabled={cases.length === 0}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 size-4"
              />
              <span className="text-sm text-ink-800">{CONSENT_STATEMENT}</span>
            </label>
            {cases.length === 0 ? (
              <p className="text-sm text-ink-400">Choose at least one sprint first.</p>
            ) : null}

            {submission ? (
              <div className="space-y-4">
                <p className="text-sm text-ink-600">
                  Send this to the facilitator, or open an issue on the repository and paste it in.
                  Nothing is published until someone adds it to the site.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={download} className="btn-secondary">
                    Download JSON
                  </button>
                  <a href={REPO_ISSUE_URL} target="_blank" rel="noreferrer noopener" className="btn-ghost">
                    Open an issue on GitHub
                  </a>
                </div>
                <CopyBlock label="Use case — Markdown" text={toMarkdown(submission)} />
                <CopyBlock label="Use case — JSON" text={JSON.stringify(submission, null, 2)} />
              </div>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
