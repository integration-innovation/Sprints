import React from "react";
import { downloadFile } from "../csv";
import { primaryProjectName, tally } from "../derive";
import type { SParticipant, SProgramme, ShareBundle } from "../model";
import {
  mergeBundle,
  participantBundle,
  setMe,
  setupPayload,
  updateParticipant,
} from "../store";
import { Chips, Field, Flash, SectionTitle, useFlash } from "../ui";
import { SheetPanel } from "./connect";

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

  function exportMine() {
    if (!me) return;
    const bundle = participantBundle(programme, me.id);
    downloadFile(
      `${slug(programme.name)}-${slug(me.name)}.json`,
      JSON.stringify(bundle, null, 2),
      "application/json",
    );
    showFlash("Exported your rows. Send the file to your facilitator.");
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
                  onClick={exportMine}
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
        {programme.remote ? (
          <p className="mt-5 border-t border-ink-200 pt-4 text-xs text-ink-400">
            Keeping a backup?{" "}
            <button type="button" onClick={exportMine} disabled={!me} className="underline">
              Export my rows as JSON
            </button>
            .
          </p>
        ) : null}
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
