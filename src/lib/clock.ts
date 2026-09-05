/**
 * The hour, as the run sheet divides it.
 *
 * The programme's shape is five windows — target, share, build, test, show —
 * and the interface wants to know, given a start time, which one we are in and
 * how it should look. Pure functions, no timers: a component asks "what is
 * minute 52?" and gets an answer it can render, and a test can ask the same
 * question without waiting fifty-two minutes.
 *
 * The windows mirror RUN_SHEET in defaults.ts. They are restated here as
 * numbers rather than parsed out of the "50–55 min" strings, because a display
 * string is the wrong thing to make arithmetic depend on.
 */

export type Phase = {
  id: "target" | "share" | "build" | "test" | "show" | "over";
  label: string;
  /** Minute this phase starts, inclusive. */
  from: number;
  /** Minute it ends, exclusive. `Infinity` for "over". */
  to: number;
  /** The one-line instruction from the run sheet. */
  cue: string;
};

export const HOUR_MINUTES = 60;

export const PHASES: readonly Phase[] = [
  { id: "target", label: "Target", from: 0, to: 5, cue: "Confirm the intended outcome for the hour." },
  { id: "share", label: "Share", from: 5, to: 10, cue: "Discuss the approach, AI method or blocker." },
  { id: "build", label: "Build", from: 10, to: 50, cue: "Focused build." },
  { id: "test", label: "Test", from: 50, to: 55, cue: "Verify the result against the definition of done." },
  { id: "show", label: "Show and ship", from: 55, to: 60, cue: "Demonstrate the result; record what changed." },
  { id: "over", label: "Over the hour", from: 60, to: Infinity, cue: "Record what you have. A partial result is a result." },
] as const;

/** Which phase a given elapsed time falls in. Negative elapsed is treated as minute 0. */
export function phaseAt(elapsedMs: number): Phase {
  const minute = Math.max(0, elapsedMs) / 60000;
  return PHASES.find((p) => minute >= p.from && minute < p.to) ?? PHASES[PHASES.length - 1];
}

/**
 * How the clock should read as the hour runs down.
 *
 * Three tones, not a gradient: a colour that changes continuously is one nobody
 * can name, and the point is to be able to glance and say "amber — test soon".
 * Green through the build, amber once testing should have started, red once
 * the hour is spent. The thresholds are the run sheet's own boundaries.
 */
export type Tone = "calm" | "closing" | "over";

export function toneAt(elapsedMs: number): Tone {
  const minute = Math.max(0, elapsedMs) / 60000;
  if (minute >= HOUR_MINUTES) return "over";
  if (minute >= 50) return "closing";
  return "calm";
}

/** Whole minutes and seconds remaining, clamped at zero, for a mm:ss display. */
export function remaining(elapsedMs: number): { minutes: number; seconds: number; text: string } {
  const left = Math.max(0, HOUR_MINUTES * 60000 - Math.max(0, elapsedMs));
  const minutes = Math.floor(left / 60000);
  const seconds = Math.floor((left % 60000) / 1000);
  return { minutes, seconds, text: `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}` };
}

/** The two moments worth interrupting someone for, from the run sheet. */
export const REMINDERS: readonly { atMinute: number; title: string; body: string }[] = [
  { atMinute: 50, title: "Ten minutes left — test it", body: "Check the result against your definition of done." },
  { atMinute: 55, title: "Five minutes left — show and ship", body: "Record what changed and what became possible." },
] as const;

/**
 * Milliseconds until each reminder that has not yet passed, from a given
 * elapsed time. A reminder in the past is not returned; nobody wants to be
 * told at minute 58 that minute 50 happened.
 */
export function pendingReminders(elapsedMs: number): { title: string; body: string; inMs: number }[] {
  return REMINDERS.filter((r) => r.atMinute * 60000 > elapsedMs).map((r) => ({
    title: r.title,
    body: r.body,
    inMs: r.atMinute * 60000 - Math.max(0, elapsedMs),
  }));
}
