import React from "react";
import type { BuildModeId, OutcomeTypeId, TrackId } from "../../src/lib/framework";

/**
 * A participant's own plan for their six sprints: which track they are on, and
 * for each sprint what they are making and how. Kept on the device rather than
 * in the programme, for the same reason the guide's progress is — it is one
 * person's intent, changeable at any moment, and nobody else needs to see it.
 *
 * Nothing here is binding. The plan is what the app suggests on the day; the
 * sprint row is what actually happened.
 */

const KEY = "structured-sprints/plan/v1";

export type ParticipantPlan = {
  track: TrackId;
  /** Sprint number → the outcome type they chose, overriding the track. */
  types: Record<number, OutcomeTypeId>;
  /** Sprint number → building, co-building or rebuilding. */
  modes: Record<number, BuildModeId>;
};

const EMPTY: ParticipantPlan = { track: "ladder", types: {}, modes: {} };

type Stored = Record<string, ParticipantPlan>;

function read(): Stored {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Stored) : {};
  } catch {
    return {};
  }
}

const listeners = new Set<() => void>();
let cache: Stored | null = null;

function snapshot(): Stored {
  if (cache === null) cache = read();
  return cache;
}

function commit(next: Stored): void {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Site data blocked: the plan still works for this visit, it just forgets.
  }
  for (const listener of listeners) listener();
}

export function planKey(programmeId: string, participantId: string): string {
  return `${programmeId}:${participantId}`;
}

export function usePlan(key: string): ParticipantPlan {
  const subscribe = React.useCallback((fn: () => void) => {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  const store = React.useSyncExternalStore(subscribe, snapshot, snapshot);
  return store[key] ?? EMPTY;
}

export function setTrack(key: string, track: TrackId): void {
  const store = snapshot();
  const current = store[key] ?? EMPTY;
  // Changing track clears per-sprint outcome choices: they were answers to a
  // different question. Modes are kept — how you work does not change with it.
  commit({ ...store, [key]: { ...current, track, types: {} } });
}

export function setSprintType(key: string, sprintNo: number, type: OutcomeTypeId): void {
  const store = snapshot();
  const current = store[key] ?? EMPTY;
  commit({ ...store, [key]: { ...current, types: { ...current.types, [sprintNo]: type } } });
}

export function clearSprintType(key: string, sprintNo: number): void {
  const store = snapshot();
  const current = store[key] ?? EMPTY;
  const types = { ...current.types };
  delete types[sprintNo];
  commit({ ...store, [key]: { ...current, types } });
}

export function setSprintMode(key: string, sprintNo: number, mode: BuildModeId): void {
  const store = snapshot();
  const current = store[key] ?? EMPTY;
  commit({ ...store, [key]: { ...current, modes: { ...current.modes, [sprintNo]: mode } } });
}

export function modeFor(plan: ParticipantPlan, sprintNo: number): BuildModeId {
  return plan.modes[sprintNo] ?? "build";
}
