import React from "react";
import { DEFAULT_CORE_PRINCIPLE } from "../../../src/lib/defaults";
import { REQUIRED_NOTICES } from "../../../src/lib/notices";
import { formatDate, todayIso } from "../../../src/lib/dates";
import { backupFilename, countsOf, makeBackup, readBackup } from "../../../src/lib/backup";
import { cadenceLabel, programmeProgress } from "../derive";
import { offerFile } from "../csv";
import { durability, requestPersistence, isApple, UNKNOWN, type StorageHealth } from "../persist";
import { MenuButton, MenuDrawer } from "./menu";
import { navigate, Link } from "../router";
import {
  addParticipant,
  adoptSheet,
  allProgrammes,
  backedUpAt,
  buildProgramme,
  deleteProgramme,
  ensureEntries,
  noteBackup,
  restoreProgramme,
  saveProgramme,
  setMe,
  storageFault,
} from "../store";
import type { SetupPayload } from "../store";
import type { SProgramme } from "../model";
import { Bar, Field, Flash, SectionTitle, useFlash } from "../ui";

/**
 * One programme in the list, with the way out of it.
 *
 * Deleting is offered here rather than buried inside the programme, because the
 * reason to delete one is usually that it is clutter in this list. What the
 * confirmation says depends on what is actually at stake: a sheet-backed
 * programme survives in the sheet and comes back from the setup link, so
 * removing it here is tidying. A browser-only one has no other copy, and the
 * panel offers a backup before it offers the button.
 */
function ProgrammeCard({
  programme,
  onDeleted,
}: {
  programme: SProgramme;
  onDeleted: (message: string) => void;
}) {
  const [confirming, setConfirming] = React.useState(false);
  const progress = programmeProgress(programme);
  const shared = Boolean(programme.remote);

  const lastBackup = backedUpAt(programme.id);

  async function backup() {
    const takenAt = new Date().toISOString();
    const file = makeBackup(programme as never, takenAt);
    const outcome = await offerFile(
      backupFilename(file.programme, takenAt),
      JSON.stringify(file, null, 2),
      "application/json",
    );
    // Only claim a backup exists if one actually left the browser.
    if (outcome !== "declined") noteBackup(programme.id, takenAt);
  }

  return (
    <li className="card overflow-hidden">
      <Link to={`/p/${programme.id}`} className="block p-5 transition hover:bg-ink-50">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-mono text-xs text-ink-400">{programme.id}</p>
          <p className="text-xs text-ink-400">
            {shared ? "Shared · Google Sheet" : "Private draft · this browser"}
          </p>
        </div>
        <p className="mt-1 text-base font-semibold text-ink-900">{programme.name}</p>

        <p className="mt-2 text-sm font-semibold text-ink-800 tabular-nums">
          {progress.logged} of {progress.total} sprints logged
          <span className="ml-2 font-normal text-ink-400">
            {progress.people} {progress.people === 1 ? "person" : "people"}
          </span>
        </p>
        <div className="mt-2">
          <Bar
            complete={progress.complete}
            partial={progress.partial}
            blocked={progress.blocked}
            total={Math.max(progress.targetsSet, 1)}
          />
        </div>
        <p className="mt-2 text-xs text-ink-600 tabular-nums">
          {progress.targetsSet === 0
            ? "No targets set yet"
            : `${progress.complete} complete · ${progress.partial} partial · ${progress.blocked} blocked · of ${progress.targetsSet} targets set`}
        </p>

        <p className="mt-3 text-sm text-accent-600">
          {progress.nextSprintNo === null
            ? "All sprints logged"
            : `Continue at Sprint ${String(progress.nextSprintNo).padStart(2, "0")}${
                progress.nextDate ? ` · ${formatDate(progress.nextDate)}` : ""
              }`}
        </p>
      </Link>

      {/* Never backed up is worth saying on the card, because the moment it
          matters is the moment the card is no longer there to say it. */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-200 px-4 py-2 text-xs">
        {shared ? (
          <span className="text-ink-400">Kept in the sheet</span>
        ) : lastBackup ? (
          <span className="text-ink-400">Backed up {formatDate(lastBackup.slice(0, 10))}</span>
        ) : (
          <span className="font-semibold text-amber-700">No backup yet</span>
        )}
        <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => void backup()}>
          Back up
        </button>
      </div>

      {confirming ? (
        <div className="border-t border-ink-200 bg-ink-50 p-4">
          <p className="text-sm font-semibold text-ink-900">
            Remove {programme.name} from this browser?
          </p>
          <p className="mt-1 text-sm text-ink-600">
            {shared ? (
              <>
                The Google Sheet keeps everything. This only forgets it here, and the setup link
                brings it back.
              </>
            ) : (
              <>
                This browser holds the only copy — {progress.logged} logged{" "}
                {progress.logged === 1 ? "sprint" : "sprints"} across {progress.people}{" "}
                {progress.people === 1 ? "person" : "people"}. Nothing can restore it afterwards
                except a backup file.
              </>
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {shared ? null : (
              <button type="button" className="btn-secondary text-sm" onClick={() => void backup()}>
                Download a backup first
              </button>
            )}
            <button
              type="button"
              className="btn text-sm bg-rose-600 text-white hover:bg-rose-700"
              onClick={() => {
                deleteProgramme(programme.id);
                onDeleted(
                  shared
                    ? `${programme.name} removed from this browser. The sheet still has it.`
                    : `${programme.name} deleted.`,
                );
              }}
            >
              {shared ? "Remove from this browser" : "Delete permanently"}
            </button>
            <button type="button" className="btn-ghost text-sm" onClick={() => setConfirming(false)}>
              Keep it
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end border-t border-ink-200 px-4 py-2">
          <button
            type="button"
            className="btn-ghost px-2 py-1 text-xs text-ink-400 hover:text-rose-700"
            onClick={() => setConfirming(true)}
          >
            Delete
          </button>
        </div>
      )}
    </li>
  );
}

/**
 * The way back to a programme that isn't listed.
 *
 * Restoring from a backup used to live inside a programme, on the People tab —
 * which is exactly where you cannot reach it when the thing you have lost is the
 * programme itself. It belongs here, next to the empty space where the
 * programme should have been, along with the other two honest answers: it is on
 * another device, or it is in a sheet this browser has never been told about.
 */
/**
 * Whether this browser will still have the programme next fortnight.
 *
 * The failure that prompted this is specific: run an hour, come back later,
 * find nothing. Browsers evict localStorage — Safari after about a week without
 * a visit, others under pressure — and none of them mention it. So the app asks
 * for persistent storage on every load, and says plainly what it was granted,
 * because a warning that costs one tap is cheaper than a programme that costs
 * an afternoon.
 */
function StorageHealthNote() {
  const [health, setHealth] = React.useState<StorageHealth>(UNKNOWN);
  const [asked, setAsked] = React.useState(false);

  React.useEffect(() => {
    let live = true;
    void requestPersistence().then((result) => {
      if (!live) return;
      setHealth(result);
      setAsked(true);
    });
    return () => {
      live = false;
    };
  }, []);

  if (!asked) return null;
  const state = durability(health);

  if (state === "persisted" || state === "installed") {
    return (
      <p className="mt-3 text-xs text-emerald-700">
        {state === "installed"
          ? "Installed as an app, so this browser keeps your programmes."
          : "This browser has agreed to keep your programmes rather than clear them."}{" "}
        <span className="text-ink-400">A backup is still the only copy that survives the device.</span>
      </p>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
      <p>
        <strong className="font-semibold">This browser may clear your programmes on its own.</strong>{" "}
        Storage like this is evicted after a stretch of not visiting — about a week on iPhone and
        iPad — with no warning and no way to get it back. It is the reason a programme you used
        once can be missing when you return.
      </p>
      <p className="mt-1.5">
        Three things stop it, strongest first: <strong className="font-semibold">connect a Google
        Sheet</strong>, so the programme lives outside the browser;{" "}
        <strong className="font-semibold">install this app</strong>
        {isApple() ? " (Share → Add to Home Screen)" : " from your browser's menu"}, which exempts it
        from eviction; or <strong className="font-semibold">back up</strong> each programme to a file
        you keep.
      </p>
    </div>
  );
}

function FindProgramme({ onRestored }: { onRestored: (message: string) => void }) {
  const fileInput = React.useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const fault = storageFault();

  async function restore(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);

    const { backup, error: problem } = readBackup(await file.text());
    if (!backup) {
      setError(problem);
      return;
    }
    const counts = countsOf(backup.programme);
    const taken = backup.takenAt ? backup.takenAt.slice(0, 10) : "an unknown date";
    const existing = allProgrammes().some((p) => p.id === backup.programme.id);
    if (
      !window.confirm(
        `Restore "${String(backup.programme.name)}" from the backup taken ${taken}?\n\n` +
          `${counts.entries} sprint rows · ${counts.participants} people · ${counts.projects} projects` +
          (existing ? "\n\nThis replaces the copy already in this browser." : ""),
      )
    ) {
      return;
    }
    restoreProgramme(backup.programme as unknown as SProgramme);
    onRestored(`Restored "${String(backup.programme.name)}" from the backup taken ${taken}.`);
  }

  async function reconnect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const id = await adoptSheet({
        url: String(form.get("url") ?? "").trim(),
        key: String(form.get("key") ?? "").trim(),
      });
      onRestored("Reconnected. The sheet's programme is on this device again.");
      navigate(`/p/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't reach that sheet.");
    } finally {
      setBusy(false);
    }
  }

  return (
    // Closed by default: this is the answer to something having gone wrong, so
    // it should be findable without sitting between a facilitator and the
    // Create button. A storage fault opens it, because then something has.
    <details open={fault.kind !== "none"} className="card mt-6 p-6">
      <summary className="cursor-pointer list-none text-sm font-semibold text-ink-800 [&::-webkit-details-marker]:hidden">
        Don&apos;t see a programme you made?{" "}
        <span className="font-normal text-ink-400">Restore a backup, or reconnect a sheet →</span>
      </summary>
      <p className="mt-3 text-sm text-ink-600">
        Programmes are stored per browser, so one made on another device, in another browser, or in
        a private window will not appear here. These three routes bring it back.
      </p>
      <div className="mt-5">
      {fault.kind === "blocked" ? (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          <strong className="font-semibold">This browser is not letting the app store anything.</strong>{" "}
          That is usually a private window, or site data blocked for this address. Nothing has been
          lost — but nothing can be saved either, so open the app in a normal window before you
          start a sprint.
        </p>
      ) : null}

      {fault.kind === "unreadable" ? (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          <p>
            <strong className="font-semibold">There is saved data here that could not be read.</strong>{" "}
            Most likely a save cut short when the browser ran out of room. Your programmes are not
            listed because the app could not parse them — not because they were deleted.
          </p>
          <button
            type="button"
            className="btn-secondary mt-2 text-sm"
            onClick={() =>
              void offerFile("sprints-unreadable-storage.json", fault.raw, "application/json")
            }
          >
            Download the raw data before anything overwrites it
          </button>
        </div>
      ) : null}

      <div className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-ink-900">1 · Restore from a backup</p>
          <p className="mt-1 text-sm text-ink-600">
            If you took one from <span className="font-semibold">People → Back up this programme</span>,
            it holds the whole thing: sprints, people, projects, every row.
          </p>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={restore}
          />
          <button type="button" className="btn-secondary mt-2" onClick={() => fileInput.current?.click()}>
            Choose a backup file
          </button>
        </div>

        <div className="border-t border-ink-200 pt-5">
          <p className="text-sm font-semibold text-ink-900">2 · Reconnect a Google Sheet</p>
          <p className="mt-1 text-sm text-ink-600">
            If the programme was connected to a sheet, the sheet still has everything. Paste the web
            app URL to pull it onto this device — no setup link needed.
          </p>
          <form onSubmit={reconnect} className="mt-3 space-y-3">
            <Field label="Web app URL" hint="Ends in /exec.">
              <input
                name="url"
                required
                placeholder="https://script.google.com/macros/s/…/exec"
                className="field font-mono text-xs"
              />
            </Field>
            <Field label="Access key" hint="Only if the script was given one.">
              <input name="key" className="field" />
            </Field>
            <button type="submit" className="btn-secondary" disabled={busy}>
              {busy ? "Connecting…" : "Reconnect"}
            </button>
          </form>
        </div>

        <div className="border-t border-ink-200 pt-5">
          <p className="text-sm font-semibold text-ink-900">3 · Open the setup link again</p>
          <p className="mt-1 text-sm text-ink-600">
            The link the facilitator sent still works, and opening it on this device puts the
            programme back. A browser-only programme carries no data in the link, so this gives you
            the sessions rather than the rows — a backup is the only thing that returns those.
          </p>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}
      </div>
    </details>
  );
}

export function StartPage() {
  const programmes = allProgrammes();
  const [flash, showFlash] = useFlash();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [tagline, setTagline] = React.useState("");
  const [startDate, setStartDate] = React.useState(todayIso());
  const [sprintCount, setSprintCount] = React.useState(6);
  const [cadenceEvery, setCadenceEvery] = React.useState(2);
  const [cadenceUnit, setCadenceUnit] = React.useState<"weeks" | "days">("weeks");
  const [sessionTime, setSessionTime] = React.useState("12:30–13:30");
  const [facilitator, setFacilitator] = React.useState("");

  function create(event: React.FormEvent) {
    event.preventDefault();
    const programme = buildProgramme({
      name: name.trim(),
      tagline: tagline.trim(),
      startDate,
      sprintCount: Math.min(Math.max(sprintCount, 1), 24),
      cadenceWeeks:
        cadenceUnit === "weeks"
          ? Math.min(Math.max(cadenceEvery, 1), 8)
          : Math.max(1, Math.round(Math.min(Math.max(cadenceEvery, 1), 60) / 7)),
      cadenceDays: cadenceUnit === "days" ? Math.min(Math.max(cadenceEvery, 1), 60) : undefined,
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
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Flash message={flash} />
      {menuOpen ? <MenuDrawer onClose={() => setMenuOpen(false)} /> : null}

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-600">
            Structured Sprints
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            Bi-weekly build sprints.
          </h1>
          <p className="mt-3 text-ink-600">
            Set an hourly goal, build it, record it, and track the development.
          </p>
        </div>
        <MenuButton onOpen={() => setMenuOpen(true)} />
      </header>

      <p className="mt-5 rounded-lg border-l-2 border-accent-500 bg-white px-4 py-3 text-sm text-ink-800">
        {DEFAULT_CORE_PRINCIPLE}
      </p>

      {/* The two things somebody would rightly be annoyed to discover later. The
          rest of the disclaimers are a tap away, under Setup & guide. */}
      <section className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <dl className="space-y-2">
          {REQUIRED_NOTICES.map((notice) => (
            <div key={notice.title} className="text-sm text-amber-900">
              <dt className="inline font-semibold">{notice.title}.</dt>{" "}
              <dd className="inline">{notice.body}</dd>
            </div>
          ))}
        </dl>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="mt-2 text-xs font-semibold text-amber-900 underline underline-offset-2"
        >
          Read the rest of the notices
        </button>
      </section>

      <StorageHealthNote />

      {programmes.length > 0 ? (
        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <SectionTitle
              title="Your programmes"
              description="Open one to carry on where it stopped."
            />
            <Link to="/use-cases" className="btn-ghost mb-4 text-sm">
              Published use cases
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {programmes.map((p) => (
              <ProgrammeCard key={p.id} programme={p} onDeleted={showFlash} />
            ))}
          </ul>
        </section>
      ) : null}

      <section className="card mt-6 p-6">
        <SectionTitle
          eyebrow="Facilitators"
          title="Create a programme"
          description="Sets up the sessions and puts you in as facilitator. Connecting it to Google Sheets comes later, from People."
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
            <Field label="Every">
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={cadenceUnit === "weeks" ? 8 : 60}
                  value={cadenceEvery}
                  onChange={(e) => setCadenceEvery(Number(e.target.value))}
                  className="field"
                />
                <select
                  value={cadenceUnit}
                  onChange={(e) => setCadenceUnit(e.target.value as "weeks" | "days")}
                  className="field w-auto"
                  aria-label="Cadence unit"
                >
                  <option value="weeks">weeks</option>
                  <option value="days">days</option>
                </select>
              </div>
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

      {programmes.length === 0 ? (
        // Under the form, not above it: a placeholder that says "create one"
        // has no business occupying the space above the thing that creates one.
        <section className="card mt-6 border-dashed p-8 text-center">
          <p className="text-sm font-semibold text-ink-800">No programmes in this browser yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-600">
            Create one above, or open the setup link a facilitator sent you. If you made one
            already and it is not here, it is in another browser — the section below finds it.
          </p>
        </section>
      ) : null}

      <FindProgramme onRestored={showFlash} />

      <footer className="mt-10 border-t border-ink-200 pt-5">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="text-sm font-semibold text-accent-600 underline underline-offset-2"
        >
          Google Sheets setup, the run sheet and the full notices
        </button>
      </footer>
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
      navigate(`/p/${programmeId}/guide`);
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
          {payload.programme.sessions.length} sprints · {cadenceLabel(payload.programme)}
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
