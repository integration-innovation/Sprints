import React from "react";
import {
  DEFAULT_CORE_PRINCIPLE,
  DEFAULT_TARGET_FORMULA,
  GROUND_RULES,
  RUN_SHEET,
} from "../../../src/lib/defaults";
import { formatDate, todayIso } from "../../../src/lib/dates";
import { navigate, Link } from "../router";
import {
  addParticipant,
  adoptSheet,
  allProgrammes,
  buildProgramme,
  ensureEntries,
  saveProgramme,
  setMe,
} from "../store";
import type { SetupPayload } from "../store";
import { Field, SectionTitle } from "../ui";
import { SHARED_SPREADSHEET_URL } from "../config";

export function StartPage() {
  const programmes = allProgrammes();
  const [name, setName] = React.useState("");
  const [tagline, setTagline] = React.useState("");
  const [startDate, setStartDate] = React.useState(todayIso());
  const [sprintCount, setSprintCount] = React.useState(6);
  const [cadenceWeeks, setCadenceWeeks] = React.useState(2);
  const [sessionTime, setSessionTime] = React.useState("12:30–13:30");
  const [facilitator, setFacilitator] = React.useState("");

  function create(event: React.FormEvent) {
    event.preventDefault();
    const programme = buildProgramme({
      name: name.trim(),
      tagline: tagline.trim(),
      startDate,
      sprintCount: Math.min(Math.max(sprintCount, 1), 24),
      cadenceWeeks: Math.min(Math.max(cadenceWeeks, 1), 8),
      sessionTime: sessionTime.trim() || "12:30–13:30",
    });
    ensureEntries(programme);
    saveProgramme(programme);
    const id = addParticipant(programme.id, {
      name: facilitator.trim(),
      role: "Facilitator / builder",
      organisation: "",
      preferredTools: "",
      email: "",
      notes: "",
      isFacilitator: true,
    });
    setMe(programme.id, id);
    navigate(`/p/${programme.id}`);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent-600">
          Structured Sprints
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
          Bi-weekly build sprints, one target per person.
        </h1>
        <p className="mt-4 text-lg text-ink-600">
          Every participant sets one sprint-sized target before the hour starts, builds it, and
          records what became possible by the end.
        </p>
        <p className="mt-4 rounded-lg border-l-2 border-accent-500 bg-white px-4 py-3 text-sm text-ink-800">
          {DEFAULT_CORE_PRINCIPLE}
        </p>
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong className="font-semibold">Your data stays in this browser.</strong> Nothing is
          uploaded. The facilitator shares a setup link so everyone starts from the same sessions,
          then collects each person&apos;s export to see the combined board.
        </p>
      </header>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-600">Small team</p>
          <h2 className="mt-2 font-semibold text-ink-900">Works well with 2–3 members</h2>
          <p className="mt-2 text-sm text-ink-600">Each person owns one sprint-sized target. The Dashboard combines everyone into a concise working-status report.</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-600">Flexible entry</p>
          <h2 className="mt-2 font-semibold text-ink-900">Join at any sprint</h2>
          <p className="mt-2 text-sm text-ink-600">Open the facilitator&apos;s setup link, add your name, read earlier updates, and start with the current sprint.</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-600">Shared source</p>
          <h2 className="mt-2 font-semibold text-ink-900">Google Sheets ready</h2>
          <p className="mt-2 text-sm text-ink-600">Connect the app once to keep every member and status update synchronized across devices.</p>
          <a href={SHARED_SPREADSHEET_URL} target="_blank" rel="noreferrer noopener" className="mt-3 inline-block text-sm font-semibold text-accent-600 underline">Open shared spreadsheet</a>
        </div>
      </section>

      {programmes.length > 0 ? (
        <section className="mt-12">
          <SectionTitle title="On this device" description="Programmes saved in this browser." />
          <ul className="grid gap-3 sm:grid-cols-2">
            {programmes.map((p) => (
              <li key={p.id}>
                <Link to={`/p/${p.id}`} className="card block p-5 transition hover:border-accent-500">
                  <p className="font-mono text-xs text-ink-400">{p.id}</p>
                  <p className="mt-1 text-base font-semibold text-ink-900">{p.name}</p>
                  <p className="mt-1 text-sm text-ink-600">
                    {p.sessions.length} sprints ·{" "}
                    {p.sessions.length > 0 ? formatDate(p.sessions[0].date) : "no dates"} ·{" "}
                    {p.participants.length} people
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="card mt-12 p-6">
        <SectionTitle
          eyebrow="Facilitators"
          title="Start a programme"
          description="Sessions, prompts and dropdown lists are pre-filled; edit anything later."
        />
        <form onSubmit={create} className="space-y-4">
          <Field label="Programme name">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bi-Weekly AI Build Sprints"
              className="field"
            />
          </Field>
          <Field label="Tagline" hint="Optional. Shown under the programme name.">
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Six independent 1-hour build sessions"
              className="field"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="First session">
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="field"
              />
            </Field>
            <Field label="Sprints">
              <input
                type="number"
                min={1}
                max={24}
                value={sprintCount}
                onChange={(e) => setSprintCount(Number(e.target.value))}
                className="field"
              />
            </Field>
            <Field label="Every (weeks)">
              <input
                type="number"
                min={1}
                max={8}
                value={cadenceWeeks}
                onChange={(e) => setCadenceWeeks(Number(e.target.value))}
                className="field"
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Session time">
              <input
                value={sessionTime}
                onChange={(e) => setSessionTime(e.target.value)}
                className="field"
              />
            </Field>
            <Field label="Your name">
              <input
                required
                value={facilitator}
                onChange={(e) => setFacilitator(e.target.value)}
                className="field"
              />
            </Field>
          </div>
          <button type="submit" className="btn-primary w-full">
            Create programme
          </button>
        </form>
      </section>

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
        </div>
      </section>
    </main>
  );
}

/**
 * Opens a shared setup link. A sheet-backed link connects to the sheet and pulls
 * the programme; a browser-only link carries the programme skeleton itself.
 */
export function SetupPage({ payload }: { payload: SetupPayload }) {
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const id = payload.mode === "sheet" ? payload.id : payload.programme.id;
  const title = payload.mode === "sheet" ? payload.name : payload.programme.name;
  const tagline = payload.mode === "sheet" ? payload.tagline : payload.programme.tagline;
  const existing = allProgrammes().find((p) => p.id === id);

  async function join(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let programmeId = id;

      if (payload.mode === "sheet") {
        programmeId = await adoptSheet(payload.remote);
      } else if (!existing) {
        const fresh = structuredClone(payload.programme);
        ensureEntries(fresh);
        saveProgramme(fresh);
      }

      const participantId = addParticipant(programmeId, {
        name: name.trim(),
        role: "Builder",
        organisation: "",
        preferredTools: "",
        email: "",
        notes: "",
        isFacilitator: false,
      });
      setMe(programmeId, participantId);
      navigate(`/p/${programmeId}/me`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't open that programme.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-600">
        Joining · {id}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink-900">{title}</h1>
      {tagline ? <p className="mt-2 text-ink-600">{tagline}</p> : null}

      {payload.mode === "sheet" ? (
        <p className="mt-3 rounded-lg border border-accent-100 bg-accent-50 px-4 py-3 text-sm text-ink-800">
          This programme is shared through a Google Sheet, so everyone sees the same board and you
          can use any device.
        </p>
      ) : (
        <p className="mt-3 text-sm text-ink-600">
          {payload.programme.sessions.length} sprints · every {payload.programme.cadenceWeeks} weeks
          ·{" "}
          {payload.programme.sessions.length > 0
            ? `${formatDate(payload.programme.sessions[0].date)} – ${formatDate(
                payload.programme.sessions[payload.programme.sessions.length - 1].date,
              )}`
            : "no sessions"}
        </p>
      )}

      <section className="card mt-8 p-6">
        <SectionTitle
          title="Who are you?"
          description={
            payload.mode === "sheet"
              ? "You'll get a sprint log row for every session, saved to the shared sheet."
              : "You'll get a sprint log row for every session. Your entries are saved in this browser only."
          }
        />
        <form onSubmit={join} className="space-y-4">
          <Field label="Your name">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="field"
              placeholder="Jane Tan"
            />
          </Field>
          {error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "Connecting…" : "Start"}
          </button>
        </form>
      </section>

      {existing ? (
        <p className="mt-6 text-sm text-ink-600">
          You already have this programme on this device.{" "}
          <Link to={`/p/${id}`} className="font-semibold text-accent-600">
            Open it instead →
          </Link>
        </p>
      ) : null}
    </main>
  );
}
