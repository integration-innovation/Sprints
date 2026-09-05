import React from "react";
import { COLUMNS, frameCsv, frameJsonl, frameTsv, type CaseRow } from "../../../src/lib/case-frame";
import { pushToArchive, fetchArchive, type PushResult } from "../../../src/lib/archive";
import { parseRepoRef, repoUrl, GitHubError, type ArchiveConfig } from "../../../src/lib/github";
import { rowsFromSubmission, readSubmissionFile } from "../../../src/lib/case-intake";
import { buildPublicFile, serialisePublicFile } from "../../../src/lib/public-site";
import { offerFile } from "../csv";
import type { SParticipant, SProgramme } from "../model";
import {
  archiveConfig,
  caseRows,
  disconnectArchive,
  recordCases,
  saveArchiveConfig,
  withdrawCase,
} from "../store";
import { CopyBlock, EmptyState, Field, Flash, SectionTitle, useFlash } from "../ui";

/** The columns worth showing on a phone. The frame keeps all of them. */
const VISIBLE: (keyof CaseRow)[] = ["sprint_no", "what", "outcome", "author", "destination", "record_status"];

function custodianOf(programme: SProgramme): string {
  const facilitator = programme.participants.find((p) => p.isFacilitator);
  return facilitator?.name ? `${facilitator.name} (${programme.name})` : programme.name;
}

function metaFor(programme: SProgramme, contact: string) {
  return {
    programme: programme.name,
    custodian: custodianOf(programme),
    contact: contact.trim() || "your facilitator",
    generatedAt: new Date().toISOString(),
  };
}

/**
 * The use case archive.
 *
 * Two things happen here and they are worth keeping apart. The frame is
 * everyone's: any participant can copy it into a spreadsheet of their own, with
 * no account and no permission, because it is a table of what the group agreed
 * to record. Pushing it to a private repository is the facilitator's, because it
 * needs a credential and someone has to answer for where the words end up.
 */
export function ArchivePage({ programme, me }: { programme: SProgramme; me: SParticipant }) {
  const rows = caseRows(programme.id);
  const config = archiveConfig(programme.id);
  const [flash, setFlash] = useFlash();
  const [error, setError] = React.useState<string | null>(null);

  const active = rows.filter((r) => r.record_status === "active");
  const priv = active.filter((r) => r.destination === "private-archive").length;

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="What / why / how / who"
        title="Use case archive"
        description="Every consented account as one row, with the consent that permits it. Copy it into a spreadsheet, download it for analysis, or push it to a private repository."
      />
      <Flash message={flash} />

      {rows.length === 0 ? (
        <EmptyState
          title="No cases yet"
          body="A case arrives here when someone finishes Publish a use case and agrees to record it. Nothing is added automatically."
        />
      ) : (
        <>
          <ShareBlock programme={programme} rows={rows} onFlash={setFlash} onError={setError} />
          <FrameTable programme={programme} rows={rows} onFlash={setFlash} />
        </>
      )}

      {me.isFacilitator ? (
        <>
          <ImportBlock programme={programme} onFlash={setFlash} />
          {config ? (
            <ConnectedArchive
              programme={programme}
              config={config}
              rows={rows}
              privateCount={priv}
              onFlash={setFlash}
            />
          ) : (
            <ConnectForm programme={programme} onFlash={setFlash} />
          )}
        </>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>
      ) : null}
    </div>
  );
}

/** The part that needs no account: the frame, in the three shapes people ask for. */
function ShareBlock({
  programme,
  rows,
  onFlash,
  onError,
}: {
  programme: SProgramme;
  rows: CaseRow[];
  onFlash: (m: string) => void;
  onError: (m: string | null) => void;
}) {
  const slug = programme.id.toLowerCase();

  async function save(name: string, contents: string, type: string) {
    onError(null);
    try {
      const outcome = await offerFile(name, contents, type);
      if (outcome !== "declined") onFlash(`${name} saved.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Couldn't save that file.");
    }
  }

  return (
    <section className="card space-y-4 p-6">
      <SectionTitle
        eyebrow="Shareable"
        title="Take the table with you"
        description="The same rows in three shapes. None of this needs a GitHub account, a script or a login — it is yours to put wherever you keep things."
      />
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-secondary" onClick={() => void save(`use-cases-${slug}.csv`, frameCsv(rows), "text/csv")}>
          Download CSV
        </button>
        <button type="button" className="btn-ghost" onClick={() => void save(`use-cases-${slug}.jsonl`, frameJsonl(rows), "application/x-ndjson")}>
          Download JSONL
        </button>
      </div>
      <PublicFeed rows={rows} onSave={save} />
      <CopyBlock label="Copy for a Google Sheet" text={frameTsv(rows)} clamp />
      <p className="hint">
        Copy this, open a sheet and paste into cell A1 — the columns land in place. Line breaks
        inside an answer become “ · ”, because a spreadsheet paste splits rows on them; the CSV
        keeps them intact for anything that reads a file rather than a clipboard.
      </p>
    </section>
  );
}

/**
 * The file that makes something public.
 *
 * Kept visibly separate from the other two downloads, because it is the only
 * one that leaves the programme. It is a download and then a commit somebody
 * reads, rather than a button that publishes: the step where words reach the
 * internet should be one a person takes deliberately, and can see the diff of.
 */
function PublicFeed({
  rows,
  onSave,
}: {
  rows: CaseRow[];
  onSave: (name: string, contents: string, type: string) => Promise<void>;
}) {
  const file = buildPublicFile(rows, new Date().toISOString());
  const held = rows.filter((r) => r.record_status === "active").length;

  return (
    <div className="rounded-lg border border-ink-200 bg-ink-50/60 p-4">
      <p className="text-sm font-semibold text-ink-900">For the public site</p>
      <p className="mt-1 text-sm text-ink-600">
        {file.cases.length === 0 ? (
          <>
            None of these {held} case{held === 1 ? "" : "s"} was agreed for publication, so there is
            nothing to put on the site. Publishing one means asking its author again, against the
            public wording.
          </>
        ) : (
          <>
            {file.cases.length} of {held} chose a public destination. The rest — private-archive and
            withdrawn — are left out of this file by construction.
          </>
        )}
      </p>
      {file.cases.length > 0 ? (
        <>
          <ul className="mt-3 space-y-1 text-sm text-ink-700">
            {file.cases.map((c) => (
              <li key={c.id}>
                <span className="font-semibold text-ink-900">
                  Sprint {String(c.sprintNo).padStart(2, "0")}
                </span>{" "}
                · {c.author ?? "anonymous"} · {c.what}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn-secondary mt-3"
            onClick={() => void onSave("use-cases.json", serialisePublicFile(file), "application/json")}
          >
            Download use-cases.json
          </button>
          <p className="hint mt-2">
            Replace <span className="font-mono text-xs">static/use-cases.json</span> in the site
            repository with this and commit it. Nothing is public until that commit deploys — read
            the diff first. On your own machine,{" "}
            <span className="font-mono text-xs">npm run publish-cases -- &lt;archive-dir&gt;</span>{" "}
            does the same from the archive.
          </p>
        </>
      ) : null}
    </div>
  );
}

function FrameTable({
  programme,
  rows,
  onFlash,
}: {
  programme: SProgramme;
  rows: CaseRow[];
  onFlash: (m: string) => void;
}) {
  return (
    <section className="space-y-3">
      <p className="text-xs text-ink-400 sm:hidden">Swipe the table sideways to see every column.</p>
      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-ink-200 bg-ink-50 text-left">
            <tr className="text-xs font-semibold uppercase tracking-wide text-ink-600">
              {VISIBLE.map((key) => (
                <th key={key} className={`px-3 py-3 ${key === "what" || key === "outcome" ? "min-w-64" : "min-w-24"}`}>
                  {key.replaceAll("_", " ")}
                </th>
              ))}
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-200 align-top">
            {rows.map((row) => (
              <tr key={row.case_id} className={row.record_status === "withdrawn" ? "text-ink-400" : ""}>
                {VISIBLE.map((key) => (
                  <td key={key} className="px-3 py-3">
                    {key === "author" && row.author_mode === "anonymous" ? (
                      <span className="text-ink-400">anonymous</span>
                    ) : (
                      String(row[key] ?? "")
                    )}
                  </td>
                ))}
                <td className="px-3 py-3">
                  {row.record_status === "active" ? (
                    <button
                      type="button"
                      className="btn-ghost px-2 py-1 text-xs text-rose-700"
                      onClick={() => {
                        if (!window.confirm("Withdraw this case? Everything the author wrote is emptied. The next push carries the withdrawal to the archive.")) return;
                        withdrawCase(programme.id, row.case_id);
                        onFlash("Withdrawn. Push to carry it to the archive.");
                      }}
                    >
                      Withdraw
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint">
        {COLUMNS.length} columns in the frame; {VISIBLE.length} shown. The rest — consent statement,
        version, timestamps, tools, AI use — travel in the exports.
      </p>
    </section>
  );
}

/** A participant's submission JSON, folded into the frame on the facilitator's device. */
function ImportBlock({ programme, onFlash }: { programme: SProgramme; onFlash: (m: string) => void }) {
  const [error, setError] = React.useState<string | null>(null);

  async function take(file: File) {
    setError(null);
    const result = readSubmissionFile(await file.text());
    if (!result.submission) {
      setError(result.error);
      return;
    }
    const rows = rowsFromSubmission(result.submission, () => crypto.randomUUID(), new Date().toISOString());
    recordCases(programme.id, rows);
    onFlash(`Added ${rows.length} case${rows.length === 1 ? "" : "s"} from that file.`);
  }

  return (
    <section className="card space-y-3 p-6">
      <SectionTitle
        eyebrow="Facilitator"
        title="Take in a submission"
        description="A participant who published on their own device hands you the JSON file. This folds it into the frame; their consent comes with it."
      />
      <input
        type="file"
        accept="application/json,.json"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void take(file);
          e.target.value = "";
        }}
        className="field"
      />
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </section>
  );
}

function ConnectForm({ programme, onFlash }: { programme: SProgramme; onFlash: (m: string) => void }) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ref = parseRepoRef(String(form.get("repo") ?? ""));
    if (!ref) {
      setError("That isn't a repository. Paste its GitHub URL, or type owner/repo.");
      return;
    }
    const config: ArchiveConfig = {
      ...ref,
      branch: String(form.get("branch") ?? "main").trim() || "main",
      dir: String(form.get("dir") ?? "use-cases").trim().replace(/^\/+|\/+$/g, ""),
      token: String(form.get("token") ?? "").trim(),
    };
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        const { rows } = await fetchArchive(config);
        saveArchiveConfig(programme.id, config);
        onFlash(
          rows.length
            ? `Connected. That folder already holds ${rows.length} case${rows.length === 1 ? "" : "s"}.`
            : "Connected. Nothing there yet — push to create the files.",
        );
      } catch (err) {
        setError(err instanceof GitHubError || err instanceof Error ? err.message : "Couldn't reach GitHub.");
      } finally {
        setBusy(false);
      }
    })();
  }

  return (
    <section className="card space-y-5 p-6">
      <SectionTitle
        eyebrow="Facilitator · optional"
        title="Push to a private GitHub repository"
        description="Somewhere durable that is yours, with a history, and no third party in the middle. Set up once, on this device."
      />
      <ol className="space-y-1 text-sm text-ink-600">
        <li>1. Make a <span className="text-ink-800">private</span> repository. Empty is fine.</li>
        <li>
          2. <span className="text-ink-800">Settings → Developer settings → Personal access tokens →
          Fine-grained tokens.</span> Grant it <em>only this repository</em>, with{" "}
          <span className="text-ink-800">Contents: Read and write</span>, and set an expiry.
        </li>
        <li>3. Paste both below.</li>
      </ol>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Repository" hint="Its URL, or owner/repo.">
          <input name="repo" required placeholder="your-name/sprint-use-cases" className="field font-mono text-xs" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Branch">
            <input name="branch" defaultValue="main" className="field font-mono text-xs" />
          </Field>
          <Field label="Folder" hint="Created if it isn't there.">
            <input name="dir" defaultValue="use-cases" className="field font-mono text-xs" />
          </Field>
        </div>
        <Field label="Fine-grained token" hint="Stored in this browser only. Never in a backup, never in a setup link.">
          <input name="token" type="password" autoComplete="off" required placeholder="github_pat_…" className="field font-mono text-xs" />
        </Field>
        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>
        ) : null}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Checking…" : "Connect repository"}
        </button>
      </form>
      <p className="hint">
        Be clear-eyed about the token. It sits in this browser&apos;s storage, so anyone with this
        unlocked device can write to that repository — which is why it is scoped to one repository,
        to contents only, and given an expiry. It is deliberately kept out of backups and setup
        links, and a repository is refused if it turns out to be public.
      </p>
    </section>
  );
}

function ConnectedArchive({
  programme,
  config,
  rows,
  privateCount,
  onFlash,
}: {
  programme: SProgramme;
  config: ArchiveConfig;
  rows: CaseRow[];
  privateCount: number;
  onFlash: (m: string) => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<PushResult | null>(null);
  const [contact, setContact] = React.useState("");

  function push() {
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        const pushed = await pushToArchive(config, rows, metaFor(programme, contact));
        setResult(pushed);
        onFlash(`Pushed. The archive holds ${pushed.total} case${pushed.total === 1 ? "" : "s"}.`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't write to GitHub.");
      } finally {
        setBusy(false);
      }
    })();
  }

  return (
    <section className="card space-y-4 p-6">
      <SectionTitle
        eyebrow="Private archive"
        title={`${config.owner}/${config.repo}`}
        description={`Writing to ${config.dir || "the repository root"} on ${config.branch}. Five files: the record, a CSV, a TSV, a column reference and a notice.`}
      />
      <Field label="Contact for questions and withdrawals" hint="Goes into NOTICE.md, so a reader knows who to ask.">
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="the facilitator's name, or a shared inbox"
          className="field"
        />
      </Field>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-primary" onClick={push} disabled={busy || rows.length === 0}>
          {busy ? "Pushing…" : `Push ${rows.length} row${rows.length === 1 ? "" : "s"}`}
        </button>
        <a href={repoUrl(config)} target="_blank" rel="noreferrer noopener" className="btn-ghost">
          Open on GitHub
        </a>
        <button
          type="button"
          className="btn-ghost text-rose-700"
          onClick={() => {
            disconnectArchive(programme.id);
            onFlash("Disconnected. The token is gone from this browser; the repository is untouched.");
          }}
        >
          Disconnect
        </button>
      </div>
      {privateCount > 0 ? (
        <p className="rounded-lg bg-ink-100 px-3 py-2 text-sm text-ink-600">
          {privateCount} of these were consented to as <span className="font-semibold text-ink-800">private-archive</span>.
          The push is refused outright if that repository turns out to be public.
        </p>
      ) : null}
      {result ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {result.added} added, {result.updated} updated, {result.total} in the archive.
          {result.skippedLines > 0
            ? ` ${result.skippedLines} line${result.skippedLines === 1 ? "" : "s"} in cases.jsonl couldn't be read and ${result.skippedLines === 1 ? "was" : "were"} left out — check it by hand.`
            : ""}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>
      ) : null}
    </section>
  );
}
