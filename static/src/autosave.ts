import React from "react";

/**
 * A debounced draft. Editing writes to local state; the value is committed a
 * short pause later, on blur, when the tab is hidden and when the row changes —
 * so a participant never has to press Save to keep their work, and closing the
 * laptop mid-sentence does not lose the sentence.
 */

export type SaveStatus = "idle" | "pending" | "saved";

export type Draft<T> = {
  value: T;
  status: SaveStatus;
  savedAt: Date | null;
  /** Merge a patch into the draft and schedule a save. */
  set: (patch: Partial<T>) => void;
  /** Commit anything outstanding now (blur, submit, navigation). */
  flush: () => void;
};

export function useDraft<T extends object>(options: {
  /** Identifies the row being edited: changing it commits and starts a new draft. */
  key: string;
  initial: () => T;
  save: (value: T) => void;
  delay?: number;
}): Draft<T> {
  const { key, initial, save, delay = 700 } = options;

  const [value, setValue] = React.useState<T>(initial);

  // The value as of this instant, so a set() followed by an immediate flush()
  // commits the edit rather than whatever React last rendered.
  const latest = React.useRef(value);
  latest.current = value;
  const [status, setStatus] = React.useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = React.useState<Date | null>(null);

  // The save belonging to the row currently on screen.
  const saveRef = React.useRef(save);
  saveRef.current = save;

  // The uncommitted value, paired with the save it belongs to — so a pending
  // edit to sprint 3 is never written to sprint 4 after switching rows.
  const pending = React.useRef<{ value: T; save: (value: T) => void } | null>(null);
  const timer = React.useRef<number | null>(null);

  const flush = React.useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    const outstanding = pending.current;
    if (!outstanding) return;
    pending.current = null;
    outstanding.save(outstanding.value);
    setStatus("saved");
    setSavedAt(new Date());
  }, []);

  // Switching rows: adopt the new row's values, then commit the old row's.
  const seen = React.useRef(key);
  if (seen.current !== key) {
    seen.current = key;
    setValue(initial());
    setStatus("idle");
    setSavedAt(null);
  }
  React.useEffect(() => flush(), [key, flush]);

  const set = React.useCallback(
    (patch: Partial<T>) => {
      const next = { ...latest.current, ...patch };
      latest.current = next;
      pending.current = { value: next, save: saveRef.current };
      setValue(next);
      setStatus("pending");
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, delay);
    },
    [delay, flush],
  );

  // A closing tab, a backgrounded phone, or leaving the page.
  React.useEffect(() => {
    const commit = () => flush();
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("beforeunload", commit);
    window.addEventListener("pagehide", commit);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", commit);
      window.removeEventListener("pagehide", commit);
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, [flush]);

  return { value, status, savedAt, set, flush };
}
