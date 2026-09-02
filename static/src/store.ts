import {
  DEFAULT_CORE_PRINCIPLE,
  DEFAULT_LISTS,
  DEFAULT_TARGET_BANK,
  DEFAULT_TARGET_FORMULA,
  SESSION_TEMPLATES,
} from "../../src/lib/defaults";
import { addWeeks, todayIso, weekdayName } from "../../src/lib/dates";
import type { SEntry, SParticipant, SProgramme, ShareBundle } from "./model";
import { entryKey } from "./model";

const KEY = "structured-sprints/v1";

type Store = {
  programmes: Record<string, SProgramme>;
  /** Which participant this browser is, per programme. */
  meByProgramme: Record<string, string>;
};

const EMPTY: Store = { programmes: {}, meByProgramme: {} };

/** localStorage can throw (private mode, blocked site data), so every access is guarded. */
function readStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Store;
    return {
      programmes: parsed.programmes ?? {},
      meByProgramme: parsed.meByProgramme ?? {},
    };
  } catch {
    return { ...EMPTY };
  }
}

function writeStore(store: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Out of quota or storage blocked — the in-memory copy still works for this session.
  }
}

const listeners = new Set<() => void>();
let cache: Store = readStore();

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function snapshot(): Store {
  return cache;
}

function commit(next: Store): void {
  cache = next;
  writeStore(next);
  for (const fn of listeners) fn();
}

/** Applies `mutate` to a copy of one programme and saves it. */
function update(programmeId: string, mutate: (p: SProgramme) => void): void {
  const store = snapshot();
  const current = store.programmes[programmeId];
  if (!current) return;
  const draft = structuredClone(current);
  mutate(draft);
  commit({ ...store, programmes: { ...store.programmes, [programmeId]: draft } });
}

// --- ids ---------------------------------------------------------------------

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1

export function randomCode(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

function uid(prefix: string): string {
  return `${prefix}-${randomCode(10).toLowerCase()}`;
}

// --- reads -------------------------------------------------------------------

export function allProgrammes(): SProgramme[] {
  return Object.values(snapshot().programmes).sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1,
  );
}

export function getProgramme(id: string): SProgramme | undefined {
  return snapshot().programmes[id];
}

export function meIn(programmeId: string): SParticipant | undefined {
  const store = snapshot();
  const meId = store.meByProgramme[programmeId];
  return store.programmes[programmeId]?.participants.find((p) => p.id === meId);
}

export function setMe(programmeId: string, participantId: string): void {
  const store = snapshot();
  commit({ ...store, meByProgramme: { ...store.meByProgramme, [programmeId]: participantId } });
}

export function entryFor(
  programme: SProgramme,
  sprintNo: number,
  participantId: string,
): SEntry | undefined {
  return programme.entries.find(
    (e) => e.sprintNo === sprintNo && e.participantId === participantId,
  );
}

/** The next session on or after today, else the last one. */
export function nextSession(programme: SProgramme) {
  const today = todayIso();
  return (
    programme.sessions.find((s) => s.date >= today) ??
    programme.sessions[programme.sessions.length - 1]
  );
}

// --- creation ----------------------------------------------------------------

export type NewProgrammeInput = {
  name: string;
  tagline: string;
  startDate: string;
  sprintCount: number;
  cadenceWeeks: number;
  sessionTime: string;
};

export function buildProgramme(input: NewProgrammeInput): SProgramme {
  const sessions = Array.from({ length: input.sprintCount }, (_, i) => {
    const date = addWeeks(input.startDate, i * input.cadenceWeeks);
    const tpl = SESSION_TEMPLATES[i % SESSION_TEMPLATES.length];
    return {
      sprintNo: i + 1,
      date,
      day: weekdayName(date),
      time: input.sessionTime,
      prompt: tpl.prompt,
      possibleTargets: tpl.possible_targets,
      expectedOutcome: tpl.expected_outcome,
      facilitatorNotes: "",
    };
  });

  return {
    id: randomCode(),
    name: input.name,
    tagline: input.tagline,
    corePrinciple: DEFAULT_CORE_PRINCIPLE,
    targetFormula: DEFAULT_TARGET_FORMULA,
    cadenceWeeks: input.cadenceWeeks,
    sessionTime: input.sessionTime,
    createdAt: new Date().toISOString(),
    sessions,
    participants: [],
    projects: [],
    entries: [],
    targets: DEFAULT_TARGET_BANK.map((t) => ({
      id: uid("t"),
      ownerId: null,
      projectId: null,
      tooLargeIdea: t.too_large_idea,
      sprintTarget: t.sprint_target,
      suggestedSprint: null,
      usedInSprint: null,
      status: "Open",
      notes: "",
    })),
    lists: structuredClone(DEFAULT_LISTS),
  };
}

export function saveProgramme(programme: SProgramme): void {
  const store = snapshot();
  commit({
    ...store,
    programmes: { ...store.programmes, [programme.id]: programme },
  });
}

function blankEntry(sprintNo: number, participantId: string): SEntry {
  return {
    id: entryKey(sprintNo, participantId),
    sprintNo,
    participantId,
    projectId: null,
    stageAtStart: "",
    target: "",
    whyItMatters: "",
    definitionOfDone: "",
    scopeLimit: "",
    tools: "",
    startingPoint: "",
    mainRisk: "",
    fallback: "",
    aiUsedFor: "",
    result: "",
    evidence: "",
    whatChanged: "",
    nextPossibility: "",
    status: "Not started",
    minutesDelta: null,
    facilitatorNotes: "",
    updatedAt: new Date().toISOString(),
  };
}

/** One sprint-log row per participant per session — the workbook's pre-seeded grid. */
export function ensureEntries(programme: SProgramme): void {
  const seen = new Set(programme.entries.map((e) => e.id));
  for (const session of programme.sessions) {
    for (const participant of programme.participants) {
      const id = entryKey(session.sprintNo, participant.id);
      if (!seen.has(id)) {
        programme.entries.push(blankEntry(session.sprintNo, participant.id));
        seen.add(id);
      }
    }
  }
}

export function addParticipant(
  programmeId: string,
  input: Omit<SParticipant, "id">,
): string {
  const id = uid("p");
  update(programmeId, (p) => {
    p.participants.push({ ...input, id });
    ensureEntries(p);
  });
  return id;
}

export function updateParticipant(
  programmeId: string,
  participantId: string,
  patch: Partial<SParticipant>,
): void {
  update(programmeId, (p) => {
    const target = p.participants.find((x) => x.id === participantId);
    if (target) Object.assign(target, patch);
  });
}

export function updateEntry(
  programmeId: string,
  sprintNo: number,
  participantId: string,
  patch: Partial<SEntry>,
): void {
  update(programmeId, (p) => {
    let entry = entryFor(p, sprintNo, participantId);
    if (!entry) {
      entry = blankEntry(sprintNo, participantId);
      p.entries.push(entry);
    }
    Object.assign(entry, patch, { updatedAt: new Date().toISOString() });
  });
}

export function updateSession(
  programmeId: string,
  sprintNo: number,
  patch: Partial<SProgramme["sessions"][number]>,
): void {
  update(programmeId, (p) => {
    const session = p.sessions.find((s) => s.sprintNo === sprintNo);
    if (session) Object.assign(session, patch);
  });
}

export function addProject(
  programmeId: string,
  input: Omit<SProgramme["projects"][number], "id">,
): void {
  update(programmeId, (p) => {
    if (input.isPrimary) {
      for (const existing of p.projects) {
        if (existing.ownerId === input.ownerId) existing.isPrimary = false;
      }
    }
    p.projects.push({ ...input, id: uid("prj") });
  });
}

export function addTarget(
  programmeId: string,
  input: Omit<SProgramme["targets"][number], "id">,
): void {
  update(programmeId, (p) => p.targets.push({ ...input, id: uid("t") }));
}

export function updateTarget(
  programmeId: string,
  targetId: string,
  patch: Partial<SProgramme["targets"][number]>,
): void {
  update(programmeId, (p) => {
    const target = p.targets.find((t) => t.id === targetId);
    if (target) Object.assign(target, patch);
  });
}

/** Copies a banked target into a participant's row for a sprint. */
export function pullTarget(
  programmeId: string,
  targetId: string,
  sprintNo: number,
  participantId: string,
): void {
  update(programmeId, (p) => {
    const target = p.targets.find((t) => t.id === targetId);
    if (!target) return;
    let entry = entryFor(p, sprintNo, participantId);
    if (!entry) {
      entry = blankEntry(sprintNo, participantId);
      p.entries.push(entry);
    }
    entry.target = target.sprintTarget;
    entry.projectId = entry.projectId ?? target.projectId;
    if (entry.status === "Not started") entry.status = "In progress";
    entry.updatedAt = new Date().toISOString();
    target.usedInSprint = sprintNo;
    target.status = "Used";
  });
}

export function deleteProgramme(programmeId: string): void {
  const store = snapshot();
  const programmes = { ...store.programmes };
  const meByProgramme = { ...store.meByProgramme };
  delete programmes[programmeId];
  delete meByProgramme[programmeId];
  commit({ programmes, meByProgramme });
}

// --- sharing -----------------------------------------------------------------

/** The programme skeleton a facilitator shares: sessions and prompts, no one's rows. */
export function setupPayload(programme: SProgramme): string {
  const skeleton: SProgramme = {
    ...programme,
    participants: [],
    projects: [],
    entries: [],
    targets: programme.targets.filter((t) => t.ownerId === null),
  };
  return encodePayload(skeleton);
}

export function participantBundle(
  programme: SProgramme,
  participantId: string,
): ShareBundle {
  return {
    kind: "structured-sprints/participant",
    version: 1,
    programmeId: programme.id,
    programmeName: programme.name,
    exportedAt: new Date().toISOString(),
    participants: programme.participants.filter((p) => p.id === participantId),
    projects: programme.projects.filter((p) => p.ownerId === participantId),
    entries: programme.entries.filter((e) => e.participantId === participantId),
    targets: programme.targets.filter((t) => t.ownerId === participantId),
  };
}

export type MergeResult = { added: number; updated: number; participants: string[] };

/**
 * Folds another participant's export into this programme. Rows are matched by id
 * and the newer `updatedAt` wins, so re-importing an older file cannot clobber
 * newer work.
 */
export function mergeBundle(programmeId: string, bundle: ShareBundle): MergeResult {
  const result: MergeResult = { added: 0, updated: 0, participants: [] };

  update(programmeId, (p) => {
    for (const incoming of bundle.participants) {
      const existing = p.participants.find((x) => x.id === incoming.id);
      if (existing) Object.assign(existing, incoming);
      else p.participants.push(incoming);
      result.participants.push(incoming.name);
    }

    for (const incoming of bundle.projects) {
      const index = p.projects.findIndex((x) => x.id === incoming.id);
      if (index >= 0) p.projects[index] = incoming;
      else p.projects.push(incoming);
    }

    for (const incoming of bundle.targets) {
      const index = p.targets.findIndex((x) => x.id === incoming.id);
      if (index >= 0) p.targets[index] = incoming;
      else p.targets.push(incoming);
    }

    for (const incoming of bundle.entries) {
      const index = p.entries.findIndex((x) => x.id === incoming.id);
      if (index < 0) {
        p.entries.push(incoming);
        result.added++;
      } else if (incoming.updatedAt >= p.entries[index].updatedAt) {
        p.entries[index] = incoming;
        result.updated++;
      }
    }

    ensureEntries(p);
  });

  return result;
}

export function encodePayload(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function decodePayload<T>(encoded: string): T | null {
  try {
    const padded = encoded.replaceAll("-", "+").replaceAll("_", "/");
    const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    return null;
  }
}
