import React from "react";
import { SHARED_SPREADSHEET_URL } from "../config";
import { connectSheet, disconnectSheet, refresh, syncState } from "../store";
import type { SParticipant, SProgramme } from "../model";
import { Field, SectionTitle } from "../ui";

/** Set by the single-file build used for shareable previews. */
const EMBEDDED =
  typeof window !== "undefined" &&
  Boolean((window as { __SPRINTS_EMBEDDED__?: boolean }).__SPRINTS_EMBEDDED__);

/** Facilitator-only: point a programme at a Google Sheet so everyone shares one board. */
export function SheetPanel({
  programme,
  me,
  onConnected,
}: {
  programme: SProgramme;
  me: SParticipant | undefined;
  onConnected: (message: string) => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const sync = syncState(programme.id);

  async function connect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const url = String(form.get("url") ?? "").trim();
    const key = String(form.get("key") ?? "").trim();
    const sheetUrl = String(form.get("sheetUrl") ?? "").trim();

    setBusy(true);
    setError(null);
    try {
      await connectSheet(programme.id, { url, key, sheetUrl });
      onConnected("Connected. The sheet now holds this programme — share the setup link.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't connect to that sheet.");
    } finally {
      setBusy(false);
    }
  }

  if (programme.remote) {
    return (
      <section className="card p-6">
        <SectionTitle
          eyebrow="Google Sheet"
          title="Connected"
          description="Everyone's entries are read from and written to this sheet, so the board is live on any device."
        />
        <dl className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-2">
            <dt className="font-semibold text-ink-800">Web app</dt>
            <dd className="min-w-0 flex-1 truncate font-mono text-xs text-ink-400">
              {programme.remote.url}
            </dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="font-semibold text-ink-800">Last synced</dt>
            <dd className="text-ink-600">
              {sync.lastSyncedAt ? new Date(sync.lastSyncedAt).toLocaleTimeString() : "not yet"}
            </dd>
          </div>
        </dl>
        {sync.status === "error" ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {sync.message}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="btn-secondary" onClick={() => void refresh(programme.id)}>
            Refresh now
          </button>
          <a
            href={programme.remote.sheetUrl || SHARED_SPREADSHEET_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="btn-ghost"
          >
            Open spreadsheet
          </a>
          {me?.isFacilitator ? (
            <button
              type="button"
              className="btn-ghost text-rose-700"
              onClick={() => {
                disconnectSheet(programme.id);
                onConnected("Disconnected. This device is back to browser-only storage.");
              }}
            >
              Disconnect this device
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  if (!me?.isFacilitator) return null;

  // Some hosts (the shared preview link) block outbound requests entirely, so
  // connecting could never succeed there. Explain rather than fail on submit.
  if (EMBEDDED) {
    return (
      <section className="card p-6">
        <SectionTitle
          eyebrow="Google Sheet"
          title="Not available in this preview"
          description="This copy runs in a sandbox that can't call out to Google, so the board stays in your browser."
        />
        <p className="text-sm text-ink-600">
          To share one live board across devices, run the app from its own address — GitHub Pages,
          Netlify or any static host — and connect a sheet there. The steps are in{" "}
          <span className="font-mono text-xs text-ink-800">apps-script/SETUP.md</span>.
        </p>
      </section>
    );
  }

  return (
    <section className="card p-6">
      <SectionTitle
        eyebrow="Google Sheet"
        title="Put the board in a spreadsheet"
        description="Optional. Connect a sheet and everyone shares one live board on any device — no more exporting and merging files."
      />
      <ol className="mb-5 space-y-1 text-sm text-ink-600">
        <li>
          1. Open the{" "}
          <a href={SHARED_SPREADSHEET_URL} target="_blank" rel="noreferrer noopener" className="font-semibold text-accent-600 underline">
            shared Sprints spreadsheet
          </a>{" "}
          and choose <span className="text-ink-800">Extensions → Apps Script</span>.
        </li>
        <li>
          2. Paste in <span className="font-mono text-xs text-ink-800">apps-script/Code.gs</span> from
          the repository and save.
        </li>
        <li>
          3. <span className="text-ink-800">Deploy → New deployment → Web app</span>, with Execute as{" "}
          <em>Me</em> and Who has access <em>Anyone</em>.
        </li>
        <li>4. Copy the web app URL and paste it below.</li>
      </ol>
      <form onSubmit={connect} className="space-y-4">
        <input type="hidden" name="sheetUrl" value={SHARED_SPREADSHEET_URL} />
        <Field label="Web app URL" hint="Ends in /exec — not the /dev URL.">
          <input
            name="url"
            required
            placeholder="https://script.google.com/macros/s/…/exec"
            className="field font-mono text-xs"
          />
        </Field>
        <Field
          label="Access key"
          hint="Only if you ran setAccessKey() in the script editor. Leave blank otherwise."
        >
          <input name="key" className="field" />
        </Field>
        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </p>
        ) : null}
        <p className="text-xs text-ink-400">
          Connecting writes this programme into the sheet, replacing anything already in its tabs.
        </p>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Connecting…" : "Connect sheet"}
        </button>
      </form>
    </section>
  );
}

/** Small header indicator so people can see whether their edit reached the sheet. */
export function SyncBadge({ programmeId }: { programmeId: string }) {
  const sync = syncState(programmeId);
  const tone =
    sync.status === "error"
      ? "bg-rose-50 text-rose-700 ring-rose-200"
      : sync.status === "syncing"
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : "bg-emerald-50 text-emerald-700 ring-emerald-200";
  const text =
    sync.status === "error" ? "Not synced" : sync.status === "syncing" ? "Syncing…" : "Synced";

  return (
    <span
      title={sync.status === "error" ? sync.message : "Shared via Google Sheets"}
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${tone}`}
    >
      {text}
    </span>
  );
}
