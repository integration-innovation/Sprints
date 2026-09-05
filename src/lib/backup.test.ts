import assert from "node:assert/strict";
import test from "node:test";
import {
  BACKUP_KIND,
  backupFilename,
  countsOf,
  makeBackup,
  readBackup,
  type BackupProgramme,
} from "./backup.ts";

const PROGRAMME: BackupProgramme = {
  id: "55E552",
  name: "Architects AI Sprints",
  tagline: "Six hours, six working things",
  cadenceWeeks: 2,
  sessions: [{ sprintNo: 1 }, { sprintNo: 2 }],
  participants: [{ id: "p1" }],
  projects: [],
  entries: [{ id: "1:p1" }, { id: "2:p1" }],
  targets: [{ id: "t1" }],
  lists: { status: ["Complete"] },
};

const AT = "2026-09-05T10:00:00.000Z";
const roundTrip = (p: BackupProgramme) => readBackup(JSON.stringify(makeBackup(p, AT)));

test("a backup carries the whole programme, not one person's rows", () => {
  const b = makeBackup(PROGRAMME, AT);
  assert.equal(b.kind, BACKUP_KIND);
  assert.equal(b.programme.name, "Architects AI Sprints");
  // The things a share bundle lacks are exactly the things a rebuild needs.
  assert.equal(b.programme.sessions.length, 2);
  assert.equal(b.programme.cadenceWeeks, 2);
  assert.deepEqual(b.programme.lists, { status: ["Complete"] });
});

test("the sheet connection is left out, key and all", () => {
  const connected: BackupProgramme = {
    ...PROGRAMME,
    remote: { url: "https://script.google.com/macros/s/AKfy.../exec", key: "s3cret-write-key" },
  };
  const json = JSON.stringify(makeBackup(connected, AT));
  assert.ok(!json.includes("s3cret-write-key"), "a backup must not carry the write key");
  assert.ok(!json.includes("script.google.com"), "a backup must not carry the sheet URL");
  assert.equal("remote" in makeBackup(connected, AT).programme, false);
  // Everything else still survives.
  assert.equal(makeBackup(connected, AT).programme.entries.length, 2);
});

test("a backup reads back as what was written", () => {
  const r = roundTrip(PROGRAMME);
  assert.equal(r.error, null);
  assert.equal(r.backup?.programme.id, "55E552");
  assert.equal(r.backup?.takenAt, AT);
  assert.deepEqual(countsOf(r.backup!.programme), {
    sessions: 2, participants: 1, projects: 0, entries: 2, targets: 1,
  });
});

test("a share bundle is refused, and says where it does belong", () => {
  const bundle = JSON.stringify({ kind: "structured-sprints/participant", version: 1, entries: [] });
  const r = readBackup(bundle);
  assert.equal(r.backup, null);
  assert.match(r.error, /participant's share bundle/);
  assert.match(r.error, /People tab/);
});

test("anything a restore cannot vouch for is refused, with the reason", () => {
  assert.match(readBackup("").error ?? "", /empty/);
  assert.match(readBackup("not json at all").error ?? "", /not JSON/);
  assert.match(readBackup("[1,2,3]").error ?? "", /does not hold a backup/);
  assert.match(readBackup('{"kind":"something/else"}').error ?? "", /not a programme backup/);
  assert.match(
    readBackup(JSON.stringify({ kind: BACKUP_KIND, version: 9, programme: PROGRAMME })).error ?? "",
    /version 1 backups; that one is version 9/,
  );
  assert.match(readBackup(JSON.stringify({ kind: BACKUP_KIND, version: 1 })).error ?? "", /holds no programme/);
});

test("a backup missing a section is refused rather than restored short", () => {
  const { entries, ...withoutEntries } = PROGRAMME;
  void entries;
  const r = readBackup(JSON.stringify({ kind: BACKUP_KIND, version: 1, programme: withoutEntries }));
  assert.equal(r.backup, null);
  assert.match(r.error, /missing its entries, so restoring it would lose them/);
});

test("a backup with no id is refused, since there is nothing to restore into", () => {
  const r = readBackup(JSON.stringify({ kind: BACKUP_KIND, version: 1, programme: { ...PROGRAMME, id: "" } }));
  assert.match(r.error ?? "", /no programme id/);
});

test("the filename says which programme and when", () => {
  assert.equal(backupFilename(PROGRAMME, AT), "architects-ai-sprints-55E552-2026-09-05.json");
  assert.equal(backupFilename({ ...PROGRAMME, name: "!!!" }, AT), "programme-55E552-2026-09-05.json");
});
