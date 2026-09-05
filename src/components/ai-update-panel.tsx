"use client";

import React from "react";
import {
  buildUpdatePrompt,
  defaultSelection,
  parseUpdate,
  proposeChanges,
  type AiUpdateKey,
  type ProposedChange,
  type UpdateContext,
} from "../lib/ai-update";

type ReadState = {
  error: string | null;
  changes: ProposedChange[];
  warnings: string[];
};

function CopyPrompt({ text }: { text: string }) {
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
        <span className="text-sm font-semibold text-ink-700">Prompt for your AI</span>
        <button type="button" onClick={copy} className="btn-secondary text-sm">
          {state === "copied" ? "Copied" : "Copy prompt"}
        </button>
      </div>
      {state === "manual" ? (
        <p className="border-b border-ink-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          This browser would not let the page copy for you. Select the text below and press
          Ctrl&nbsp;+&nbsp;C (⌘&nbsp;C on a Mac).
        </p>
      ) : null}
      <pre className="max-h-56 overflow-auto whitespace-pre-wrap px-4 py-3 font-sans text-sm leading-relaxed text-ink-700">
        {text}
      </pre>
    </div>
  );
}

function ChangeRow({
  change,
  checked,
  onToggle,
}: {
  change: ProposedChange;
  checked: boolean;
  onToggle: (on: boolean) => void;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${
        change.overwrites ? "border-amber-300 bg-amber-50/60" : "border-ink-200 bg-white"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onToggle(e.target.checked)}
        className="mt-1 size-4 shrink-0"
      />
      <span className="min-w-0 space-y-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-ink-900">{change.label}</span>
          {change.overwrites ? (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900">
              replaces what you wrote
            </span>
          ) : null}
        </span>
        {change.overwrites ? (
          <span className="block text-xs text-ink-400 line-through">{change.current}</span>
        ) : null}
        <span className="block text-sm text-ink-800">{change.next}</span>
      </span>
    </label>
  );
}

/**
 * The two-paste round trip: copy a prompt into whatever AI platform you worked
 * in, paste its reply back here.
 *
 * Applying is always a decision. Every change is listed before anything moves,
 * and one that would replace the participant's own words starts unticked — an
 * AI's account of an hour is a draft of the record, not the record.
 */
export function AiUpdatePanel({
  context,
  current,
  onApply,
  applyNote,
}: {
  context: UpdateContext;
  current: Partial<Record<AiUpdateKey, string>>;
  onApply: (values: Partial<Record<AiUpdateKey, string>>) => void;
  /** What happens once Apply is pressed — the two builds save differently. */
  applyNote: string;
}) {
  const [reply, setReply] = React.useState("");
  const [read, setRead] = React.useState<ReadState | null>(null);
  const [selected, setSelected] = React.useState<Set<AiUpdateKey>>(new Set());
  const [applied, setApplied] = React.useState<string | null>(null);

  const prompt = buildUpdatePrompt(context);

  function readReply() {
    setApplied(null);
    const parsed = parseUpdate(reply, context.vocabulary);
    if (parsed.error) {
      setRead({ error: parsed.error, changes: [], warnings: [] });
      return;
    }
    const changes = proposeChanges(current, parsed.values);
    setRead({ error: null, changes, warnings: parsed.warnings });
    setSelected(defaultSelection(changes));
  }

  function apply() {
    if (!read) return;
    const values: Partial<Record<AiUpdateKey, string>> = {};
    for (const change of read.changes) {
      if (selected.has(change.key)) values[change.key] = change.next;
    }
    const count = Object.keys(values).length;
    if (!count) return;
    onApply(values);
    setApplied(`${count} ${count === 1 ? "field" : "fields"} filled in. ${applyNote}`);
    setRead(null);
    setReply("");
  }

  const plan = read?.changes.filter((c) => c.half === "plan") ?? [];
  const result = read?.changes.filter((c) => c.half === "result") ?? [];
  const chosen = read?.changes.filter((c) => selected.has(c.key)).length ?? 0;

  return (
    <section className="card space-y-5 p-6">
      <div>
        <p className="label">Fill this in from your AI chat</p>
        <p className="hint mt-1">
          Rather than copying field by field, hand your AI one prompt at the end of the hour and
          paste its answer back here. Nothing is saved until you have looked at it.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-ink-800">1 · Copy this into the AI you worked in</p>
        <CopyPrompt text={prompt} />
      </div>

      <div className="space-y-2">
        <label htmlFor="ai-reply" className="block text-sm font-semibold text-ink-800">
          2 · Paste its reply here
        </label>
        <textarea
          id="ai-reply"
          rows={4}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Paste the whole answer, including the { } braces."
          className="field font-mono text-sm"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={readReply} disabled={!reply.trim()} className="btn-secondary">
            Read reply
          </button>
          {reply.trim() ? (
            <button
              type="button"
              onClick={() => {
                setReply("");
                setRead(null);
              }}
              className="btn-ghost text-sm"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {applied ? (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{applied}</p>
      ) : null}

      {read?.error ? (
        <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-900">{read.error}</p>
      ) : null}

      {read && !read.error ? (
        <div className="space-y-4">
          {read.warnings.length ? (
            <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">Some of that reply was not used</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {read.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {read.changes.length === 0 ? (
            <p className="text-sm text-ink-600">
              Nothing to change — your log already says what that reply says.
            </p>
          ) : (
            <>
              <p className="text-sm font-semibold text-ink-800">
                3 · Choose what to keep
                <span className="ml-2 font-normal text-ink-400">
                  Ticked ones fill an empty field. Anything that would replace your own words is
                  left unticked.
                </span>
              </p>

              {[
                { title: "Plan", rows: plan },
                { title: "Result", rows: result },
              ]
                .filter((group) => group.rows.length > 0)
                .map((group) => (
                  <fieldset key={group.title} className="space-y-2">
                    <legend className="label">{group.title}</legend>
                    {group.rows.map((change) => (
                      <ChangeRow
                        key={change.key}
                        change={change}
                        checked={selected.has(change.key)}
                        onToggle={(on) => {
                          const next = new Set(selected);
                          if (on) next.add(change.key);
                          else next.delete(change.key);
                          setSelected(next);
                        }}
                      />
                    ))}
                  </fieldset>
                ))}

              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={apply} disabled={chosen === 0} className="btn-primary">
                  {chosen === 0
                    ? "Nothing ticked"
                    : `Apply ${chosen} ${chosen === 1 ? "field" : "fields"}`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRead(null);
                    setReply("");
                  }}
                  className="btn-ghost text-sm"
                >
                  Discard this reply
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
