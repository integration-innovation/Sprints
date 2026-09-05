import { createRoot } from "react-dom/client";
import { App } from "./app";
import { requestPersistence } from "./persist";

// Styles are built separately by the Tailwind CLI into assets/app.css.
const container = document.getElementById("root");
if (container) createRoot(container).render(<App />);

// Ask the browser to keep what it stores, on every load and whatever page is
// open. It belongs here rather than in a component: the request is the thing
// that protects a programme, and it must not depend on somebody reaching the
// page that happens to report the answer.
void requestPersistence();

// Installable + offline. Registered after load so it never delays first paint,
// and skipped for the single-file build, which has no separate worker to fetch.
const EMBEDDED = Boolean((window as { __SPRINTS_EMBEDDED__?: boolean }).__SPRINTS_EMBEDDED__);
if (!EMBEDDED && "serviceWorker" in navigator) {
  const updatingExistingApp = Boolean(navigator.serviceWorker.controller);
  let reloadingForUpdate = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (updatingExistingApp && !reloadingForUpdate) {
      reloadingForUpdate = true;
      window.location.reload();
    }
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((registration) => registration.update())
      .catch(() => {
        // No service worker (file://, private mode, unsupported browser) just
        // means no offline support — the app itself still works.
      });
  });
}
