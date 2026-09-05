import {
  DEFAULT_CORE_PRINCIPLE,
  DEFAULT_LISTS,
  DEFAULT_TARGET_BANK,
  DEFAULT_TARGET_FORMULA,
  SESSION_TEMPLATES,
} from "../../src/lib/defaults";
import { addDays, addWeeks, todayIso, weekdayName } from "../../src/lib/dates";
import type { SEntry, SParticipant, SProgramme, SProject, STarget, ShareBundle } from "./model";
import { entryKey } from "./model";
import * as remote from "./remote";
import type { RemoteConfig, SheetState } from "./remote";
import { mergeRows, withdraw, type CaseRow } from "../../src/lib/case-frame";
import type { ArchiveConfig } from "../../src/lib/github";

const KEY = "structured-sprints/v1";

export type SyncState = {
  status: "idle" | "syncing" | "error";
  message?: string;
  lastSyncedAt?: string;
};

type Store = {
  programmes: Record<string, SProgramme>;
  /** Which participant this browser is, per programme. */
  meByProgramme: Record<string, string>;
  /** Per-programme sync status. Not persisted — it describes this session only. */
  sync: Record<string, SyncState>;
};

const EMPTY: Store = { programmes: {}, meByProgramme: {}, sync: {} };

/**
 * Why the store came back empty, when it did.
 *
 * "No programmes" and "your programmes could not be read" produce the same empty
 * screen, and they are not the same thing at all — one is a new browser, the
 * other is somebody's six sprints apparently gone. Reading the reason lets the
 * start page say which, and in the unreadable case hand back the raw text so the
 * rows can be rescued by hand rather than silently overwritten by the next save.
 */
export type StorageFault =
  | { kind: "none" }
  | { kind: "blocked" }
  | { kind: "unreadable"; raw: string };

let fault: StorageFault = { kind: "none" };

export function storageFault(): StorageFault {
  return fault;
}

/** localStorage can throw (private mode, blocked site data), so every access is guarded. */
function readStore(): Store {
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    // Private mode, or site data blocked. Nothing was lost; nothing can be kept.
    fault = { kind: "blocked" };
    return { ...EMPTY };
  }

  if (!raw) return { ...EMPTY };

  try {
    const parsed = JSON.parse(raw) as Store;
    return {
      programmes: parsed.programmes ?? {},
      meByProgramme: parsed.meByProgramme ?? {},
      sync: {},
    };
  } catch {
    // There is data here and it does not parse — a write cut short by a full
    // quota, most likely. Keep the text: it is the only copy.
    fault = { kind: "unreadable", raw };
    return { ...EMPTY };
  }
}

function writeStore(store: Store): void {
  try {
    const { sync, ...persisted } = store;
    void sync;
    localStorage.setItem(KEY, JSON.stringify(persisted));
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
  /** Optional day-level rhythm; wins over cadenceWeeks when set. */
  cadenceDays?: number;
  sessionTime: string;
};

/** One cadence step, in days where a programme uses them and weeks otherwise. */
function stepFrom(from: string, steps: number, cadence: { cadenceWeeks: number; cadenceDays?: number }): string {
  return cadence.cadenceDays
    ? addDays(from, steps * cadence.cadenceDays)
    : addWeeks(from, steps * cadence.cadenceWeeks);
}

export function buildProgramme(input: NewProgrammeInput): SProgramme {
  const sessions = Array.from({ length: input.sprintCount }, (_, i) => {
    const date = stepFrom(input.startDate, i, input);
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
    cadenceDays: input.cadenceDays,
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

/**
 * Puts a programme back from a backup. The backup carries no sheet connection
 * by design, so whatever this browser already had is kept rather than cleared.
 */
export function restoreProgramme(programme: SProgramme): void {
  const store = snapshot();
  const existing = store.programmes[programme.id];
  commit({
    ...store,
    programmes: {
      ...store.programmes,
      [programme.id]: { ...programme, remote: programme.remote ?? existing?.remote },
    },
  });
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
  const created = getProgramme(programmeId)?.participants.find((p) => p.id === id);
  if (created) void push(programmeId, (config) => remote.pushParticipant(config, created));
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
  const saved = getProgramme(programmeId)?.participants.find((x) => x.id === participantId);
  if (saved) void push(programmeId, (config) => remote.pushParticipant(config, saved));
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
  schedulePush(programmeId, `entry:${sprintNo}:${participantId}`, (config) => {
    const programme = getProgramme(programmeId);
    const saved = programme && entryFor(programme, sprintNo, participantId);
    return saved ? remote.pushEntry(config, saved) : Promise.resolve(undefined);
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
  const saved = getProgramme(programmeId)?.sessions.find((s) => s.sprintNo === sprintNo);
  if (saved) void push(programmeId, (config) => remote.pushSession(config, saved));
}

/** Adds the next independent session so a programme can continue indefinitely. */
export function appendSession(programmeId: string): number | null {
  const programme = getProgramme(programmeId);
  if (!programme) return null;
  const last = programme.sessions[programme.sessions.length - 1];
  const sprintNo = Math.max(0, ...programme.sessions.map((s) => s.sprintNo)) + 1;
  const date = stepFrom(last?.date ?? todayIso(), 1, programme);
  update(programmeId, (p) => {
    p.sessions.push({
      sprintNo,
      date,
      day: weekdayName(date),
      time: p.sessionTime,
      prompt: "Bring your own current need. Choose a Playbook pattern or define your own safe, sprint-sized project. Build one observable result, test it, show it and record the next possibility.",
      possibleTargets: "App; plugin; website; workflow; automation; digital asset; research test",
      expectedOutcome: "One safe, demonstrable improvement owned by the participant",
      facilitatorNotes: "",
    });
    ensureEntries(p);
  });
  const saved = getProgramme(programmeId);
  const session = saved?.sessions.find((s) => s.sprintNo === sprintNo);
  if (session) void push(programmeId, (config) => remote.pushSession(config, session));
  for (const entry of saved?.entries.filter((e) => e.sprintNo === sprintNo) ?? []) {
    void push(programmeId, (config) => remote.pushEntry(config, entry));
  }
  return sprintNo;
}

export function addProject(
  programmeId: string,
  input: Omit<SProgramme["projects"][number], "id">,
): void {
  const id = uid("prj");
  update(programmeId, (p) => {
    if (input.isPrimary) {
      for (const existing of p.projects) {
        if (existing.ownerId === input.ownerId) existing.isPrimary = false;
      }
    }
    p.projects.push({ ...input, id });
  });
  const created = getProgramme(programmeId)?.projects.find((p) => p.id === id);
  if (created) void push(programmeId, (config) => remote.pushProject(config, created));
}

export function addTarget(
  programmeId: string,
  input: Omit<SProgramme["targets"][number], "id">,
): void {
  const id = uid("t");
  update(programmeId, (p) => p.targets.push({ ...input, id }));
  const created = getProgramme(programmeId)?.targets.find((t) => t.id === id);
  if (created) void push(programmeId, (config) => remote.pushTarget(config, created));
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
  const saved = getProgramme(programmeId)?.targets.find((t) => t.id === targetId);
  if (saved) void push(programmeId, (config) => remote.pushTarget(config, saved));
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

  const programme = getProgramme(programmeId);
  const savedEntry = programme && entryFor(programme, sprintNo, participantId);
  const savedTarget = programme?.targets.find((t) => t.id === targetId);
  if (savedEntry) void push(programmeId, (config) => remote.pushEntry(config, savedEntry));
  if (savedTarget) void push(programmeId, (config) => remote.pushTarget(config, savedTarget));
}

/**
 * Forgets a programme on this device.
 *
 * Local only, and the interface has to say which of two very different things
 * that means: for a sheet-backed programme the sheet still holds everything and
 * the setup link brings it back, while for a browser-only one this is the only
 * copy and the deletion is final. The `me` mapping and sync state go with it, so
 * re-joining later starts clean rather than pointing at a participant id that no
 * longer exists.
 */
export function deleteProgramme(programmeId: string): void {
  const store = snapshot();
  const programmes = { ...store.programmes };
  const meByProgramme = { ...store.meByProgramme };
  const sync = { ...store.sync };
  delete programmes[programmeId];
  delete meByProgramme[programmeId];
  delete sync[programmeId];
  commit({ programmes, meByProgramme, sync });
}

// --- sheet sync --------------------------------------------------------------

export function syncState(programmeId: string): SyncState {
  return snapshot().sync[programmeId] ?? { status: "idle" };
}

function setSync(programmeId: string, next: SyncState): void {
  const store = snapshot();
  commit({ ...store, sync: { ...store.sync, [programmeId]: next } });
}

export function remoteConfig(programmeId: string): RemoteConfig | undefined {
  return snapshot().programmes[programmeId]?.remote;
}

/** Replaces local rows with the sheet's, keeping this device's connection settings. */
function applyServerState(programmeId: string, state: SheetState): void {
  const store = snapshot();
  const current = store.programmes[programmeId];
  if (!current) return;
  const merged: SProgramme = {
    ...state,
    id: current.id,
    // Device-local, and never round-tripped through the sheet.
    remote: current.remote,
    archive: current.archive,
    cases: current.cases,
  };
  ensureEntries(merged);
  commit({
    ...store,
    programmes: { ...store.programmes, [programmeId]: merged },
    sync: {
      ...store.sync,
      [programmeId]: { status: "idle", lastSyncedAt: new Date().toISOString() },
    },
  });
}

/**
 * Runs a write against the sheet and adopts whatever comes back. Local state has
 * already been updated optimistically, so a failure leaves the edit in place and
 * only reports that it hasn't reached the sheet yet.
 */
async function push(
  programmeId: string,
  send: (config: RemoteConfig) => Promise<SheetState | undefined>,
): Promise<void> {
  const config = remoteConfig(programmeId);
  if (!config) return;

  setSync(programmeId, { status: "syncing" });
  try {
    const state = await send(config);
    if (state) applyServerState(programmeId, state);
    else setSync(programmeId, { status: "idle", lastSyncedAt: new Date().toISOString() });
  } catch (error) {
    setSync(programmeId, {
      status: "error",
      message: error instanceof Error ? error.message : "Couldn't reach the sheet.",
    });
  }
}

/**
 * Sheet writes for a row, coalesced. Entries autosave as someone types, so a
 * paragraph would otherwise be one Apps Script request per pause — and Google's
 * quotas are sized for a small team. The local copy is written immediately
 * either way; only the trip to the sheet waits.
 */
const queued = new Map<string, { timer: number; send: () => void }>();

function schedulePush(
  programmeId: string,
  key: string,
  send: (config: RemoteConfig) => Promise<SheetState | undefined>,
  delay = 2500,
): void {
  if (!remoteConfig(programmeId)) return;
  const pending = queued.get(key);
  if (pending) window.clearTimeout(pending.timer);

  const run = () => {
    queued.delete(key);
    void push(programmeId, send);
  };
  queued.set(key, { timer: window.setTimeout(run, delay), send: run });
}

/** Sends anything still waiting — a closing tab must not swallow the last edit. */
export function flushPushes(): void {
  for (const { timer, send } of [...queued.values()]) {
    window.clearTimeout(timer);
    send();
  }
}

if (typeof window !== "undefined") {
  // queueMicrotask, not a direct call: a form that flushes its draft on this
  // same event schedules its push from its own listener, which runs after
  // this one. Draining synchronously here would leave that last edit queued.
  window.addEventListener("pagehide", () => queueMicrotask(flushPushes));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") queueMicrotask(flushPushes);
  });
}

/** Pulls the sheet's current contents. */
export async function refresh(programmeId: string): Promise<void> {
  const config = remoteConfig(programmeId);
  if (!config) return;
  // A poll must never overwrite an edit that has not reached the sheet yet:
  // adopting the sheet now would lose it locally, and the queued push would
  // then write that loss back to the sheet.
  if (queued.size > 0) return;
  setSync(programmeId, { status: "syncing" });
  try {
    const state = await remote.fetchState(config);
    // ...including an edit typed while this pull was in flight.
    if (queued.size > 0) return;
    applyServerState(programmeId, state);
  } catch (error) {
    setSync(programmeId, {
      status: "error",
      message: error instanceof Error ? error.message : "Couldn't reach the sheet.",
    });
  }
}

/** Connects a local programme to a sheet and seeds it with what's already here. */
export async function connectSheet(
  programmeId: string,
  config: RemoteConfig,
): Promise<void> {
  const programme = getProgramme(programmeId);
  if (!programme) throw new Error("Programme not found.");

  await remote.ping(config);
  const { remote: _sheet, archive: _archive, cases: _cases, ...payload } = programme;
  const state = await remote.initSheet(config, payload);

  const store = snapshot();
  commit({
    ...store,
    programmes: {
      ...store.programmes,
      [programmeId]: { ...store.programmes[programmeId], remote: config },
    },
  });
  applyServerState(programmeId, state);
}

/** Joins a sheet someone else set up. */
export async function adoptSheet(config: RemoteConfig): Promise<string> {
  const state = await remote.fetchState(config);
  if (!state.id) throw new Error("That sheet has no programme set up yet.");

  const store = snapshot();
  const existing = store.programmes[state.id];
  const programme: SProgramme = {
    ...state,
    remote: config,
    entries: existing ? existing.entries : state.entries,
  };
  ensureEntries(programme);
  commit({ ...store, programmes: { ...store.programmes, [state.id]: programme } });
  applyServerState(state.id, state);
  return state.id;
}

export function disconnectSheet(programmeId: string): void {
  update(programmeId, (p) => {
    delete p.remote;
  });
}

// --- sharing -----------------------------------------------------------------

/**
 * What a facilitator shares. When a sheet is connected the link only needs to
 * carry the connection — the participant pulls everything else from the sheet,
 * which keeps the URL short enough to survive chat apps. Without a sheet the
 * link has to carry the whole programme skeleton.
 */
export type SetupPayload =
  | { mode: "sheet"; id: string; name: string; tagline: string; remote: RemoteConfig }
  | { mode: "local"; programme: SProgramme };

export function setupPayload(programme: SProgramme): string {
  if (programme.remote) {
    return encodePayload({
      mode: "sheet",
      id: programme.id,
      name: programme.name,
      tagline: programme.tagline,
      remote: programme.remote,
    } satisfies SetupPayload);
  }
  // The archive holds a GitHub write token and the cases are somebody else's
  // consented words; neither belongs in a link handed round a group chat.
  const { archive: _archive, cases: _cases, ...rest } = programme;
  const skeleton: SProgramme = {
    ...rest,
    participants: [],
    projects: [],
    entries: [],
    targets: programme.targets.filter((t) => t.ownerId === null),
  };
  return encodePayload({ mode: "local", programme: skeleton } satisfies SetupPayload);
}

/** Accepts both payload shapes, including links made before sheets existed. */
export function readSetupPayload(encoded: string): SetupPayload | null {
  const decoded = decodePayload<SetupPayload | SProgramme>(encoded);
  if (!decoded) return null;
  if ("mode" in decoded) return decoded;
  // Legacy: the whole programme, encoded directly.
  if (Array.isArray((decoded as SProgramme).sessions)) {
    return { mode: "local", programme: decoded as SProgramme };
  }
  return null;
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

// --- use cases and the private archive ---------------------------------------

/**
 * A fresh case id.
 *
 * Random, and derived from nothing. An id built from the participant — even
 * hashed — would be a stable per-person key, and in a programme of seven people
 * that is a name with extra steps. The cost is that ids must be kept rather
 * than recomputed, which is why they live on the programme.
 */
export function newCaseId(): string {
  return crypto.randomUUID();
}

export function caseRows(programmeId: string): CaseRow[] {
  return snapshot().programmes[programmeId]?.cases ?? [];
}

/** Folds newly consented rows in, newest per case_id winning. */
export function recordCases(programmeId: string, rows: readonly CaseRow[]): void {
  update(programmeId, (p) => {
    p.cases = mergeRows(p.cases ?? [], rows);
  });
}

/**
 * Withdraws one case on this device. The row stays and is emptied — see
 * `withdraw` — so the id can never be reissued and the next push carries the
 * withdrawal to the archive rather than silently leaving the old text there.
 */
export function withdrawCase(programmeId: string, caseId: string): void {
  update(programmeId, (p) => {
    p.cases = (p.cases ?? []).map((row) =>
      row.case_id === caseId ? withdraw(row, new Date().toISOString()) : row,
    );
  });
}

export function archiveConfig(programmeId: string): ArchiveConfig | undefined {
  return snapshot().programmes[programmeId]?.archive;
}

export function saveArchiveConfig(programmeId: string, config: ArchiveConfig): void {
  update(programmeId, (p) => {
    p.archive = config;
  });
}

export function disconnectArchive(programmeId: string): void {
  update(programmeId, (p) => {
    delete p.archive;
  });
}
