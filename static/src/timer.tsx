import React from "react";
import { pendingReminders, phaseAt, remaining, toneAt, type Tone } from "../../src/lib/clock";

/**
 * The hour, on the page where the hour happens.
 *
 * The run sheet says what minute 52 is for; this puts that next to the fields
 * being filled in, so nobody has to remember. One clock per programme: you run
 * one sprint at a time, and a clock keyed to the sprint would survive a switch
 * of sprint number mid-hour and count the wrong thing.
 *
 * The start time is kept in localStorage, not React state, so a reload during
 * the build phase — which is when reloads happen — does not reset the clock.
 *
 * Reminders use the Notifications API where it exists and is permitted, and an
 * in-page banner otherwise. Both fire from a timer in this tab, which means
 * both fall silent when the tab is closed. The label says "while this tab is
 * open" for that reason; a promise of a background alarm would be a lie on
 * every browser this app targets.
 */

const KEY = "structured-sprints/clock";

type Clocks = Record<string, { startedAt: string; remind: boolean }>;

function readClocks(): Clocks {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Clocks;
  } catch {
    return {};
  }
}

function writeClocks(clocks: Clocks): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(clocks));
  } catch {
    // Storage blocked: the clock still runs for this page's lifetime.
  }
}

const TONE_CLASS: Record<Tone, string> = {
  calm: "border-emerald-200 bg-emerald-50 text-emerald-900",
  closing: "border-amber-300 bg-amber-50 text-amber-900",
  over: "border-rose-300 bg-rose-50 text-rose-900",
};

function canNotify(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function SprintClock({ programmeId }: { programmeId: string }) {
  const [startedAt, setStartedAt] = React.useState<string | null>(() => readClocks()[programmeId]?.startedAt ?? null);
  const [remind, setRemind] = React.useState<boolean>(() => readClocks()[programmeId]?.remind ?? false);
  const [now, setNow] = React.useState(() => Date.now());
  const [banner, setBanner] = React.useState<string | null>(null);

  // Tick once a second while running. A closed tab stops the tick and that is fine:
  // the start time is what is stored, so reopening shows the true elapsed time.
  React.useEffect(() => {
    if (!startedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);

  // Schedule whichever reminders are still ahead, from the real elapsed time —
  // so a page reloaded at minute 30 still gets the minute-50 reminder.
  React.useEffect(() => {
    if (!startedAt || !remind) return;
    const elapsed = Date.now() - new Date(startedAt).getTime();
    const timers = pendingReminders(elapsed).map((r) =>
      window.setTimeout(() => {
        setBanner(`${r.title} — ${r.body}`);
        if (canNotify() && Notification.permission === "granted") {
          try {
            new Notification(r.title, { body: r.body, tag: `sprint-${r.title}` });
          } catch {
            // Some browsers only allow notifications from a worker; the banner already showed.
          }
        }
      }, r.inMs),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [startedAt, remind]);

  function persist(next: { startedAt: string | null; remind: boolean }) {
    const clocks = readClocks();
    if (next.startedAt) clocks[programmeId] = { startedAt: next.startedAt, remind: next.remind };
    else delete clocks[programmeId];
    writeClocks(clocks);
  }

  function start() {
    const at = new Date().toISOString();
    setStartedAt(at);
    setBanner(null);
    setNow(Date.now());
    persist({ startedAt: at, remind });
  }

  function stop() {
    setStartedAt(null);
    setBanner(null);
    persist({ startedAt: null, remind });
  }

  async function toggleRemind() {
    const next = !remind;
    if (next && canNotify() && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {
        // Denied or unavailable: the in-page banner still works.
      }
    }
    setRemind(next);
    persist({ startedAt, remind: next });
  }

  if (!startedAt) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-ink-900">Start the hour</p>
          <p className="text-xs text-ink-600">
            A 60-minute clock that names the phase you are in — target, share, build, test, show.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={start}>
          Start the clock
        </button>
      </div>
    );
  }

  const elapsed = now - new Date(startedAt).getTime();
  const phase = phaseAt(elapsed);
  const tone = toneAt(elapsed);
  const left = remaining(elapsed);

  return (
    <div className={`rounded-xl border px-4 py-3 ${TONE_CLASS[tone]}`} role="timer" aria-live="off">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
            {phase.from}–{Number.isFinite(phase.to) ? phase.to : "…"} min · {phase.label}
          </p>
          <p className="text-sm">{phase.cue}</p>
        </div>
        <p className="font-mono text-3xl font-semibold tabular-nums" aria-label={`${left.minutes} minutes ${left.seconds} seconds remaining`}>
          {left.text}
        </p>
      </div>
      {banner ? (
        <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-sm font-semibold">{banner}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={remind} onChange={() => void toggleRemind()} className="size-3.5" />
          Remind me at 50 and 55 minutes, while this tab is open
        </label>
        <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={stop}>
          Stop the clock
        </button>
      </div>
    </div>
  );
}
