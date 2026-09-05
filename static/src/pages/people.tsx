import React from "react";
import { backupFilename, countsOf, makeBackup, readBackup } from "../../../src/lib/backup";
import { offerFile } from "../csv";
import { primaryProjectName, tally } from "../derive";
import type { SParticipant, SProgramme, ShareBundle } from "../model";
import { navigate } from "../router";
import {
  mergeBundle,
  participantBundle,
  restoreProgramme,
  setMe,
  setupPayload,
  updateParticipant,
} from "../store";
import { Chips, Field, Flash, SectionTitle, useFlash } from "../ui";
import { SheetPanel } from "./connect";
import { SHARED_SPREADSHEET_URL } from "../config";

function slug(text: string): string {
  return text.replace(/[^a-z0-9]+/gi, "-").toLowerCase().replace(/^-|-$/g, "");
}

export function PeoplePage({
  programme,
  me,
}: {
  programme: SProgramme;
  me: SParticipant | undefined;
}) {
  const [flash, showFlash] = useFlash();
  const [error, setError] = React.useState<string | null>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);
  const restoreInput = React.useRef<HTMLInputElement>(null);

  const setupLink = React.useMemo(() => {
    const base = `${window.location.origin}${window.location.pathname}`;
    return `${base}#/setup?d=${setupPayload(programme)}`;
  }, [programme]);

  async function copySetupLink() {
    try {
      await navigator.clipboard.writeText(setupLink);
      showFlash("Setup link copied. Send it to your participants.");
    } catch {
      setError("Couldn't copy automatically — select the link below and copy it manually.");
    }
  }

  async function exportMine() {
    if (!me) return;
    setError(null);
    const bundle = participantBundle(programme, me.id);
    try {
      const outcome = await offerFile(
        `${slug(programme.name)}-${slug(me.name)}.json`,
        JSON.stringify(bundle, null, 2),
        "application/json",
      );
      if (outcome !== "declined") {
        showFlash("Exported your rows. Send the file to your facilitator.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't export your rows.");
    }
  }

  async function backupProgramme() {
    setError(null);
    const takenAt = new Date().toISOString();
    const backup = makeBackup(programme, takenAt);
    const c = countsOf(backup.programme);
    try {
      const outcome = await offerFile(
        backupFilename(backup.programme, takenAt),
        JSON.stringify(backup, null, 2),
        "application/json",
      );
      if (outcome !== "declined") {
        showFlash(
          `Backed up ${c.sessions} sprints, ${c.participants} people and ${c.entries} rows. ` +
            "The sheet connection is not in the file.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't write the backup.");
    }
  }

  async function restoreFromBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);

    const { backup, error } = readBackup(await file.text());
    if (!backup) {
      setError(`${file.name}: ${error}`);
      return;
    }
    const c = countsOf(backup.programme);
    const taken = backup.takenAt ? backup.takenAt.slice(0, 10) : "an unknown date";
    const replacing = backup.programme.id === programme.id ? `"${programme.name}"` : "another programme";
    if (
      !window.confirm(
        `Restore ${replacing} from a backup taken ${taken}?\n\n` +
          `It holds ${c.sessions} sprints, ${c.participants} people, ${c.entries} rows and ` +
          `${c.targets} targets, and replaces what is in this browser now.`,
      )
    ) {
      return;
    }
    restoreProgramme(backup.programme as unknown as SProgramme);
    showFlash(`Restored from the backup taken ${taken}.`);
    navigate(`/p/${backup.programme.id}`);
  }

  async function importBundle(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    setError(null);

    const names: string[] = [];
    for (const file of files) {
      let bundle: ShareBundle;
      try {
        bundle = JSON.parse(await file.text()) as ShareBundle;
      } catch {
        setError(`${file.name} isn't valid JSON.`);
        return;
      }
      if (bundle.kind !== "structured-sprints/participant") {
        setError(`${file.name} isn't a Structured Sprints export.`);
        return;
      }
      if (bundle.programmeId !== programme.id) {
        setError(
          `${file.name} belongs to a different programme (${bundle.programmeName}). ` +
            "Everyone must start from the same setup link.",
        );
        return;
      }
      const result = mergeBundle(programme.id, bundle);
      names.push(`${result.participants.join(", ")} (${result.added} new, ${result.updated} updated)`);
    }
    showFlash(`Merged: ${names.join(" · ")}`);
  }

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="People"
        title="Participants"
        description={
          programme.remote
            ? "Everyone writing to the shared sheet."
            : "Counts come from the rows held on this device."
        }
      />

      <Flash message={flash} />
      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[46rem] text-sm">
          <thead className="border-b border-ink-200 bg-ink-50 text-left">
            <tr className="text-xs font-semibold uppercase tracking-wide text-ink-600">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Primary project</th>
              <th className="px-4 py-3">Preferred tools</th>
              <th className="px-4 py-3 text-right">Targets</th>
              <th className="px-4 py-3 text-right">Complete</th>
              <th className="px-4 py-3 text-right">Blocked</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-200">
            {programme.participants.map((person) => {
              const t = tally(programme.entries.filter((e) => e.participantId === person.id));
              return (
                <tr key={person.id} className={person.id === me?.id ? "bg-accent-50/40" : ""}>
                  <td className="px-4 py-3 font-medium text-ink-900">
                    {person.name}
                    {person.isFacilitator ? (
                      <span className="ml-2 rounded bg-accent-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-700">
                        Facilitator
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-ink-600">{person.role || "—"}</td>
                  <td className="px-4 py-3 text-ink-600">
                    {primaryProjectName(programme, person.id) ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Chips value={person.preferredTools} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{t.targetsSet}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-700">{t.complete}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-rose-700">{t.blocked}</td>
                  <td className="px-4 py-3 text-right">
                    {person.id === me?.id ? (
                      <span className="text-xs text-ink-400">you</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setMe(programme.id, person.id)}
                        className="text-xs font-semibold text-accent-600 hover:text-accent-700"
                      >
                        Switch to
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <SheetPanel programme={programme} me={me} onConnected={showFlash} />

      <section className="card border-accent-200 bg-accent-50/40 p-6">
        <SectionTitle
          eyebrow="Join halfway"
          title="A new member can start at the current sprint"
          description="Earlier sprints stay in the report for context; nobody has to recreate missed work or wait for a new programme."
        />
        <ol className="grid gap-4 sm:grid-cols-3">
          <li className="rounded-lg bg-white p-4 ring-1 ring-ink-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-600">1 · Invite</p>
            <p className="mt-2 text-sm text-ink-700">Send the setup link below. The new member opens it and enters their name.</p>
          </li>
          <li className="rounded-lg bg-white p-4 ring-1 ring-ink-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-600">2 · Catch up</p>
            <p className="mt-2 text-sm text-ink-700">They review the Dashboard and Sprint board, then open <strong>My sprint</strong> for the current session.</p>
          </li>
          <li className="rounded-lg bg-white p-4 ring-1 ring-ink-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-600">3 · Participate</p>
            <p className="mt-2 text-sm text-ink-700">They set one target and update status, result and next action. Their row appears in the shared report.</p>
          </li>
        </ol>
        <p className="mt-4 text-sm text-ink-600">
          Working directly in Google Sheets?{" "}
          <a href={SHARED_SPREADSHEET_URL} target="_blank" rel="noreferrer noopener" className="font-semibold text-accent-600 underline">
            Open the shared spreadsheet
          </a>
          .
        </p>
      </section>

      <section className="card p-6">
        <SectionTitle
          eyebrow="Sharing"
          title={
            programme.remote
              ? "Inviting people to the board"
              : "Getting everyone on the same board"
          }
          description={
            programme.remote
              ? "One link is all anyone needs — their entries go straight into the sheet."
              : "Data lives in each person's browser, so the board is assembled by exchanging files."
          }
        />
        <ol className="space-y-5">
          <li>
            <p className="text-sm font-semibold text-ink-900">
              {programme.remote ? "Send the setup link" : "1. Facilitator sends the setup link"}
            </p>
            <p className="mt-1 text-sm text-ink-600">
              {programme.remote
                ? "It connects them to this sheet. They enter their name once and start filling in their rows — on any device."
                : "It carries the sessions, prompts and target bank, so everyone starts from an identical programme — that shared id is what makes merging work later."}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button type="button" onClick={copySetupLink} className="btn-primary">
                Copy setup link
              </button>
              <input readOnly value={setupLink} className="field min-w-0 flex-1 font-mono text-xs" />
            </div>
          </li>

          {programme.remote ? null : (
            <>
              <li>
                <p className="text-sm font-semibold text-ink-900">2. Each participant exports</p>
                <p className="mt-1 text-sm text-ink-600">
                  After a session, send the facilitator your file — your rows only, nothing of
                  anyone else&apos;s.
                </p>
                <button
                  type="button"
                  onClick={() => void exportMine()}
                  disabled={!me}
                  className="btn-secondary mt-3"
                >
                  Export my rows (JSON)
                </button>
              </li>
              <li>
                <p className="text-sm font-semibold text-ink-900">3. Facilitator merges</p>
                <p className="mt-1 text-sm text-ink-600">
                  Import the files to build the combined dashboard and sprint log. Re-importing is
                  safe: rows are matched by id and the newer version wins, so older files
                  can&apos;t overwrite newer work.
                </p>
                <input
                  ref={fileInput}
                  type="file"
                  accept="application/json,.json"
                  multiple
                  onChange={importBundle}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="btn-secondary mt-3"
                >
                  Import participant files
                </button>
              </li>
            </>
          )}
        </ol>
      </section>

      <section className="card space-y-4 p-6">
        <SectionTitle
          title="Back up this programme"
          description="One file holding the whole programme — sprints, people, projects, rows, targets and lists — so it can be put back if the sheet or this browser loses it."
        />
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => void backupProgramme()} className="btn-secondary">
            Download backup
          </button>
          <input
            ref={restoreInput}
            type="file"
            accept="application/json,.json"
            onChange={restoreFromBackup}
            className="hidden"
          />
          <button type="button" onClick={() => restoreInput.current?.click()} className="btn-ghost">
            Restore from a backup
          </button>
        </div>
        <p className="hint">
          The sheet connection is left out of the file on purpose: it holds a key that can write to
          your sheet, and a backup gets emailed and copied around. Reconnect under Connect sheet
          after restoring. Restoring replaces what is in this browser, and asks first.
        </p>
      </section>

      {me ? (
        <section className="card p-6">
          <SectionTitle title="My details" />
          <form
            key={me.id}
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const get = (k: string) => String(form.get(k) ?? "").trim();
              updateParticipant(programme.id, me.id, {
                name: get("name") || me.name,
                role: get("role"),
                organisation: get("organisation"),
                preferredTools: get("preferredTools"),
                email: get("email"),
                notes: get("notes"),
              });
              showFlash("Details saved.");
            }}
            className="space-y-5"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Name">
                <input name="name" defaultValue={me.name} required className="field" />
              </Field>
              <Field label="Role">
                <input name="role" defaultValue={me.role} className="field" />
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Organisation">
                <input name="organisation" defaultValue={me.organisation} className="field" />
              </Field>
              <Field label="Email">
                <input type="email" name="email" defaultValue={me.email} className="field" />
              </Field>
            </div>
            <Field label="Preferred tools" hint="Separate with semicolons.">
              <input name="preferredTools" defaultValue={me.preferredTools} className="field" />
            </Field>
            <Field label="Notes">
              <input name="notes" defaultValue={me.notes} className="field" />
            </Field>
            <button type="submit" className="btn-primary">
              Save details
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
