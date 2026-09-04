import React from "react";
import type { StepKind } from "../../src/lib/guide";

/**
 * Where someone is in their first hour, and when their hour started. Kept on
 * the device rather than in the programme: it is scaffolding for one person's
 * first session, not a record anybody else needs to see.
 */

const KEY = "structured-sprints/guide/v1";

export type GuideProgress = {
  step: StepKind;
  /** Epoch ms when they pressed Start, or undefined while they are still reading. */
  startedAt?: number;
  /** Steps they have finished, so returning does not start from nothing. */
  done: StepKind[];
};

const EMPTY: GuideProgress = { step: "read", done: [] };

type Stored = Record<string, GuideProgress>;

function read(): Stored {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Stored) : {};
  } catch {
    return {};
  }
}

function write(next: Stored): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // A browser with site data blocked still runs the hour; it just forgets it.
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
  write(next);
  for (const listener of listeners) listener();
}

export function guideKey(programmeId: string, participantId: string, sprintNo: number): string {
  return `${programmeId}:${participantId}:${sprintNo}`;
}

export function useGuide(key: string): GuideProgress {
  const subscribe = React.useCallback((fn: () => void) => {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  const store = React.useSyncExternalStore(subscribe, snapshot, snapshot);
  return store[key] ?? EMPTY;
}

export function setStep(key: string, step: StepKind): void {
  const store = snapshot();
  const current = store[key] ?? EMPTY;
  const done = current.done.includes(current.step) ? current.done : [...current.done, current.step];
  commit({ ...store, [key]: { ...current, step, done } });
}

export function startHour(key: string): void {
  const store = snapshot();
  const current = store[key] ?? EMPTY;
  if (current.startedAt) return;
  commit({ ...store, [key]: { ...current, startedAt: Date.now() } });
}

export function resetHour(key: string): void {
  const store = snapshot();
  commit({ ...store, [key]: { ...EMPTY } });
}

/** Whether this person has been through the guide for any sprint in a programme. */
export function hasUsedGuide(programmeId: string, participantId: string): boolean {
  const prefix = `${programmeId}:${participantId}:`;
  return Object.entries(snapshot()).some(
    ([key, value]) => key.startsWith(prefix) && value.done.length > 0,
  );
}

/** Minutes since the hour started, ticking once a minute. Null before it starts. */
export function useElapsedMinutes(startedAt: number | undefined): number | null {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!startedAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, [startedAt]);
  if (!startedAt) return null;
  return Math.max(0, Math.floor((now - startedAt) / 60000));
}
