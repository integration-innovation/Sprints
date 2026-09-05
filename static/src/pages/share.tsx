import React from "react";
import {
  consentStatement,
  disclaimersFor,
  EXCLUDED,
  buildSubmission,
  draftUseCase,
  isPublishable,
  scanForIdentifiers,
  toMarkdown,
  type Destination,
  type UseCaseDraft,
} from "../../../src/lib/use-case";
import { toRows } from "../../../src/lib/case-frame";
import type { SEntry, SParticipant, SProgramme } from "../model";
import { navigate } from "../router";
import { newCaseId, recordCases } from "../store";
import { CopyBlock, Field, SectionTitle } from "../ui";

/**
 * The two places a use case can go, and what each one honestly offers.
 *
 * Private is the default. It is the reversible choice: the words stay on an
 * access list somebody controls, and withdrawing one actually works. Public is
 * the door that only opens outwards, so it should be chosen on purpose rather
 * than arrived at by leaving a form alone.
 */
const DESTINATIONS: { value: Destination; label: string; hint: string }[] = [
  {
    value: "private-archive",
    label: "The programme's private archive",
    hint: "A private repository. Readable by the people the facilitator gives access to, and you can withdraw it later.",
  },
  {
    value: "public",
    label: "A public page",
    hint: "Anyone can read it, search engines index it, and it cannot be fully taken back.",
  },
];

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

  const [destination, setDestination] = React.useState<Destination>("private-archive");
  const [credited, setCredited] = React.useState(true);
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
    .map((n) => ({ ...drafts[n], author: credited ? author.trim() : "", role: role.trim() }))
    .filter(Boolean);

  const submission =
    agreed && cases.length
      ? buildSubmission({
          programmeName: programme.name,
          programmeTagline: programme.tagline,
          cases,
          agreedAt: new Date().toISOString(),
          destination,
        })
      : null;

  /**
   * Records the consented cases as frame rows on this device. Ids are minted
   * here and kept, so publishing the same sprint again updates that row rather
   * than adding a second account of the same hour.
   */
  function record() {
    if (!submission) return;
    recordCases(programme.id, toRows(submission, () => newCaseId(), new Date().toISOString()));
    navigate(`/p/${programme.id}/archive`);
  }

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
            {disclaimersFor(destination).map((line) => (
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
            <Field
              label="Where this goes"
              hint="Different places, different agreements. Choose before you read the sentence you are agreeing to."
            >
              <div className="space-y-2">
                {DESTINATIONS.map((choice) => (
                  <label
                    key={choice.value}
                    className={`flex cursor-pointer gap-2.5 rounded-lg border p-3 text-sm ${
                      destination === choice.value ? "border-accent-500 bg-accent-50" : "border-ink-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="destination"
                      checked={destination === choice.value}
                      onChange={() => {
                        setDestination(choice.value);
                        setAgreed(false);
                      }}
                      className="mt-0.5 size-4"
                    />
                    <span>
                      <span className="font-semibold text-ink-900">{choice.label}</span>
                      <span className="mt-0.5 block text-ink-600">{choice.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Attribution" hint="Yours to choose, and you can change it before agreeing.">
                <div className="space-y-1.5">
                  {[
                    { on: true, label: "Credit me" },
                    { on: false, label: "Publish anonymously" },
                  ].map((choice) => (
                    <label key={choice.label} className="flex items-center gap-2.5 text-sm text-ink-800">
                      <input
                        type="radio"
                        name="attribution"
                        checked={credited === choice.on}
                        onChange={() => {
                          setCredited(choice.on);
                          setAgreed(false);
                        }}
                        className="size-4"
                      />
                      {choice.label}
                    </label>
                  ))}
                  {credited ? (
                    <input
                      value={author}
                      onChange={(e) => {
                        setAuthor(e.target.value);
                        setAgreed(false);
                      }}
                      placeholder="How you want to be credited"
                      className="field mt-1"
                    />
                  ) : (
                    <p className="hint mt-1">No name is attached, and none is recorded.</p>
                  )}
                </div>
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
                      <Warnings draft={draft} by={`${credited ? author : ""} ${role}`} />
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
              <span className="text-sm text-ink-800">
                {consentStatement(credited && author.trim() !== "", destination)}
              </span>
            </label>
            {cases.length === 0 ? (
              <p className="text-sm text-ink-400">Choose at least one sprint first.</p>
            ) : null}

            {submission ? (
              <div className="space-y-4">
                <p className="text-sm text-ink-600">
                  {destination === "private-archive"
                    ? "Record it to add it to this programme's use case table, which the facilitator pushes to the private archive. Or hand over the file, if you are not on the facilitator's device."
                    : "Record it to add it to the table. Putting it on the public site is a separate step somebody does by hand, so nothing appears in public today."}
                </p>
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={record} className="btn-primary">
                    Record {cases.length === 1 ? "this case" : `these ${cases.length} cases`}
                  </button>
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
