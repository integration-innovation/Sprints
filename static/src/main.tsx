import { createRoot } from "react-dom/client";
import { App } from "./app";

// Styles are built separately by the Tailwind CLI into assets/app.css.
const container = document.getElementById("root");
if (container) createRoot(container).render(<App />);

// Installable + offline. Registered after load so it never delays first paint,
// and skipped for the single-file build, which has no separate worker to fetch.
const EMBEDDED = Boolean((window as { __SPRINTS_EMBEDDED__?: boolean }).__SPRINTS_EMBEDDED__);
if (!EMBEDDED && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // No service worker (file://, private mode, unsupported browser) just
      // means no offline support — the app itself still works.
    });
  });
}
