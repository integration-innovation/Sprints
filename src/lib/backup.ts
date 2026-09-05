/**
 * A whole programme, in one file, so a wipe is an inconvenience rather than a loss.
 *
 * The existing share bundle carries one participant's rows, which is the right
 * shape for handing work to a facilitator and the wrong shape for recovery: it
 * has no sessions, no cadence and no dropdown lists, so nothing can rebuild a
 * programme from it. A backup carries the programme entire.
 *
 * What it leaves out is the two connections. A backup gets emailed, committed
 * and passed around, and both connections hold a write credential — the sheet's
 * key and the archive's GitHub token. A file that restores your data should not
 * also hand over the ability to overwrite it, or to write into a private
 * repository. Reconnecting after a restore takes a moment and is the safer
 * default.
 */

export type BackupProgramme = {
  id: string;
  name: string;
  sessions: unknown[];
  participants: unknown[];
  projects: unknown[];
  entries: unknown[];
  targets: unknown[];
  [key: string]: unknown;
};

export type ProgrammeBackup = {
  kind: "structured-sprints/backup";
  version: 1;
  takenAt: string;
  programme: BackupProgramme;
};

export const BACKUP_KIND = "structured-sprints/backup";

/** The arrays a programme has to have for a restore to mean anything. */
const REQUIRED = ["sessions", "participants", "projects", "entries", "targets"] as const;

export function makeBackup(programme: BackupProgramme, takenAt: string): ProgrammeBackup {
  // The sheet's write key and the archive's GitHub token. Deliberately dropped.
  const { remote, archive, ...rest } = programme as BackupProgramme & {
    remote?: unknown;
    archive?: unknown;
  };
  void remote;
  void archive;
  return { kind: BACKUP_KIND, version: 1, takenAt, programme: rest as BackupProgramme };
}

export type BackupCounts = {
  sessions: number;
  participants: number;
  projects: number;
  entries: number;
  targets: number;
};

export function countsOf(programme: BackupProgramme): BackupCounts {
  return {
    sessions: programme.sessions.length,
    participants: programme.participants.length,
    projects: programme.projects.length,
    entries: programme.entries.length,
    targets: programme.targets.length,
  };
}

export type ReadResult =
  | { backup: ProgrammeBackup; error: null }
  | { backup: null; error: string };

/**
 * Reads a backup file. A restore overwrites a programme, so anything it cannot
 * vouch for is refused with a reason rather than half-applied.
 */
export function readBackup(text: string): ReadResult {
  if (!text.trim()) return { backup: null, error: "That file is empty." };

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { backup: null, error: "That file is not JSON. Choose a backup this app wrote." };
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { backup: null, error: "That file does not hold a backup." };
  }

  const file = raw as Record<string, unknown>;
  if (file.kind !== BACKUP_KIND) {
    return {
      backup: null,
      error:
        file.kind === "structured-sprints/participant"
          ? "That is a participant's share bundle, not a backup. Import it from the People tab instead."
          : "That file is not a programme backup.",
    };
  }
  if (file.version !== 1) {
    return { backup: null, error: `This app reads version 1 backups; that one is version ${String(file.version)}.` };
  }

  const programme = file.programme as BackupProgramme | undefined;
  if (!programme || typeof programme !== "object") {
    return { backup: null, error: "That backup holds no programme." };
  }
  if (typeof programme.id !== "string" || !programme.id.trim()) {
    return { backup: null, error: "That backup has no programme id, so there is nothing to restore into." };
  }
  for (const key of REQUIRED) {
    if (!Array.isArray(programme[key])) {
      return { backup: null, error: `That backup is missing its ${key}, so restoring it would lose them.` };
    }
  }

  return {
    backup: {
      kind: BACKUP_KIND,
      version: 1,
      takenAt: typeof file.takenAt === "string" ? file.takenAt : "",
      programme,
    },
    error: null,
  };
}

/** A filename that says what it holds and when it was taken. */
export function backupFilename(programme: BackupProgramme, takenAt: string): string {
  const slug = String(programme.name || "programme")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `${slug || "programme"}-${programme.id}-${takenAt.slice(0, 10)}.json`;
}
