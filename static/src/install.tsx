import React from "react";
import { installed, isApple } from "./persist";

/**
 * An install prompt the person can actually find.
 *
 * Chromium browsers fire `beforeinstallprompt` and then show a small icon in
 * the address bar that most people never notice. Capturing the event lets the
 * app offer the same prompt from a button with words on it, at the moment it
 * makes sense — on the start page, next to the programmes that installing
 * would keep safe.
 *
 * Safari never fires the event, on any platform. There the only route is the
 * share sheet, so the chip says that instead of pretending a button could do
 * it. Nothing is shown once the app is already installed.
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function useInstallPrompt(): {
  canPrompt: boolean;
  prompt: () => Promise<"accepted" | "dismissed" | "unavailable">;
} {
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null);

  React.useEffect(() => {
    function onPrompt(event: Event) {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setDeferred(null);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function prompt() {
    if (!deferred) return "unavailable" as const;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    return outcome;
  }

  return { canPrompt: deferred !== null, prompt };
}

export function InstallChip({ onDone }: { onDone?: (message: string) => void }) {
  const { canPrompt, prompt } = useInstallPrompt();
  const [showApple, setShowApple] = React.useState(false);

  if (installed()) return null;

  if (canPrompt) {
    return (
      <button
        type="button"
        className="btn-secondary shrink-0"
        onClick={() =>
          void prompt().then((outcome) => {
            if (outcome === "accepted") onDone?.("Installed. Open it from your home screen from now on.");
          })
        }
      >
        Install app
      </button>
    );
  }

  if (isApple()) {
    return (
      <div className="relative shrink-0">
        <button type="button" className="btn-secondary" onClick={() => setShowApple((v) => !v)} aria-expanded={showApple}>
          Add to Home Screen
        </button>
        {showApple ? (
          <p className="absolute right-0 z-10 mt-1 w-64 rounded-lg border border-ink-200 bg-white p-3 text-xs text-ink-700 shadow-lg">
            In Safari: tap <span className="font-semibold">Share</span>, then{" "}
            <span className="font-semibold">Add to Home Screen</span>. Installed, the app keeps your
            programmes rather than clearing them after a week away.
          </p>
        ) : null}
      </div>
    );
  }

  return null;
}
