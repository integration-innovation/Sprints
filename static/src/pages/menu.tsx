import React from "react";
import {
  DEFAULT_TARGET_FORMULA,
  GROUND_RULES,
  RUN_SHEET,
} from "../../../src/lib/defaults";
import { REFERENCE_NOTICES, REQUIRED_NOTICES } from "../../../src/lib/notices";
import { SHARED_SPREADSHEET_URL } from "../config";
import { Link } from "../router";

/**
 * Everything the start page used to say at you.
 *
 * The setup guide, the run sheet and the disclaimers are all things a
 * facilitator reads once and then knows. Leaving them stacked down the landing
 * page meant the two jobs that actually recur — start a programme, open an
 * existing one — sat below a page of reference material. They are here instead:
 * one tap away, and out of the way.
 */

const SECTIONS = [
  { id: "sheets", tab: "Sheets" },
  { id: "guide", tab: "Guide" },
  { id: "notices", tab: "Notices" },
] as const;

/**
 * Longer write-ups that live outside the app.
 *
 * Kept as links rather than copied in, so there is one place each subject is
 * explained and no second copy to drift. They open on claude.ai and are private
 * to the person who published them until shared from that page — so the app
 * says so, rather than handing someone a link that asks them to sign in.
 */
const READING = [
  {
    href: "https://claude.ai/code/artifact/8861fb38-9f93-476d-89ea-8ac677a99bf4",
    title: "From Hour to Spreadsheet",
    blurb:
      "The three routes into a Google Sheet, in order of setup — let the AI fill the row, paste " +
      "a snapshot, or connect a live sheet — with the failures that actually happen and how to " +
      "tell them apart.",
  },
  {
    href: "https://claude.ai/code/artifact/2aef8d5b-ccc2-42dc-b0ad-a0b9cdcb8bcd",
    title: "Sprint Case Register",
    blurb:
      "What the programme holds, a map of how the records relate, and where an hour's outcome " +
      "sits against the SIA Value Articulation Framework, the Blue Book stages and CORENET X.",
  },
] as const;

function Reading() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-ink-900">Longer reads</h2>
      <p className="mt-1.5 text-sm text-ink-600">
        The full write-ups, kept in one place so nothing here has to repeat them.
      </p>
      <ul className="mt-3 space-y-2">
        {READING.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              target="_blank"
              rel="noreferrer noopener"
              className="block rounded-lg border border-ink-200 p-3 transition hover:border-accent-500 hover:bg-accent-50"
            >
              <p className="text-sm font-semibold text-accent-700">{item.title} →</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-600">{item.blurb}</p>
            </a>
          </li>
        ))}
      </ul>
      <p className="hint mt-2">
        These open on claude.ai. They are private to whoever published them until shared from that
        page, so a participant may see a sign-in prompt rather than the page.
      </p>
    </div>
  );
}

type SectionId = (typeof SECTIONS)[number]["id"];

export function MenuButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label="Setup, guide and notices"
      className="btn-secondary shrink-0 gap-2.5 px-3"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      >
        <path d="M3 5.5h14M3 10h14M3 14.5h14" />
      </svg>
      <span className="hidden sm:inline">Setup &amp; guide</span>
    </button>
  );
}

export function MenuDrawer({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = React.useState<SectionId>("sheets");
  const panel = React.useRef<HTMLDivElement>(null);

  // Escape closes it, and the panel takes focus so a keyboard lands inside the
  // drawer rather than continuing down the page behind it.
  React.useEffect(() => {
    panel.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink-900/40"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Setup, guide and notices"
        tabIndex={-1}
        className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl outline-none"
      >
        <header className="flex items-center justify-between gap-3 border-b border-ink-200 px-5 py-4">
          <p className="text-base font-semibold text-ink-900">Setup, guide and notices</p>
          <button type="button" onClick={onClose} className="btn-ghost px-2 py-1" aria-label="Close">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </header>

        <nav className="flex gap-1 border-b border-ink-200 px-3 py-2">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setOpen(section.id)}
              aria-current={open === section.id}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                open === section.id
                  ? "bg-ink-900 text-white"
                  : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
              }`}
            >
              {section.tab}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {open === "sheets" ? <SheetsSetup /> : null}
          {open === "guide" ? <Guide /> : null}
          {open === "notices" ? <Notices /> : null}
        </div>
      </div>
    </div>
  );
}

function SheetsSetup() {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-ink-900">Use Google Sheets as the shared dataset</h2>
        <p className="mt-1.5 text-sm text-ink-600">
          GitHub Pages hosts the app. Your Google Sheet stores the working dataset, and Apps Script
          connects the two. Do this once, as the facilitator, on the device that made the programme.
        </p>
      </div>

      <ol className="space-y-3">
        {[
          "Open your programme, then go to People → Connect sheet.",
          "Copy the script shown there into the sheet's Extensions → Apps Script editor, and save.",
          "Run → checkSetup, and approve the permission screen. Seven tabs should appear.",
          "Deploy → New deployment → Web app, with Execute as Me and Who has access Anyone.",
          "Paste the /exec URL back into the app, then send members the setup link.",
        ].map((step, index) => (
          <li key={step} className="flex gap-3 text-sm text-ink-700">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-600 text-xs font-semibold text-white">
              {index + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>

      <div className="rounded-xl border border-ink-200 bg-ink-50 p-4">
        <p className="text-sm font-semibold text-ink-900">After setup</p>
        <p className="mt-1.5 text-sm text-ink-600">
          Members open the setup link, enter their names, and write to the same dataset. Someone
          joining halfway starts at the current sprint, with the earlier rows there for context.
        </p>
        <a
          href={SHARED_SPREADSHEET_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="btn-secondary mt-3 w-full text-center"
        >
          Open the shared spreadsheet
        </a>
      </div>

      {/* The snapshot route, the troubleshooting and the comparison of the two
          used to be repeated here. They are in the linked write-up under Guide,
          which is now the one place they are explained. */}
      <p className="text-xs leading-relaxed text-ink-400">
        Not ready for a sheet, or stuck on a step? The full walkthrough — including the one-minute
        paste that needs no script at all — is under <span className="text-ink-600">Guide → Longer
        reads</span>.
      </p>
    </section>
  );
}

function Guide() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-ink-900">60-minute run sheet</h2>
        <p className="mt-1.5 text-sm text-ink-600">
          The app follows the same shape: plan first, build, then record the result.
        </p>
        <ol className="mt-3 space-y-2">
          {RUN_SHEET.map((step) => (
            <li key={step.window} className="rounded-lg border border-ink-200 p-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-semibold text-ink-900">{step.phase}</p>
                <p className="font-mono text-xs text-accent-600">{step.window}</p>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-600">{step.detail}</p>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-ink-900">Writing a target</h2>
        <p className="mt-2 rounded-lg bg-ink-100 px-3 py-2.5 font-mono text-xs leading-relaxed text-ink-800">
          {DEFAULT_TARGET_FORMULA}
        </p>
        <p className="mt-3 text-sm text-ink-600">
          Too large: <span className="italic">&ldquo;Build an AI BIM compliance checker.&rdquo;</span>
        </p>
        <p className="mt-1.5 text-sm text-ink-800">
          Sprint-sized:{" "}
          <span className="italic">
            &ldquo;Configure AI to extract one required parameter from one IFC file so that the
            value appears in a table.&rdquo;
          </span>
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-ink-900">Ground rules</h2>
        <dl className="mt-3 space-y-2.5">
          {GROUND_RULES.map((rule) => (
            <div key={rule.rule}>
              <dt className="text-sm font-semibold text-ink-900">{rule.rule}</dt>
              <dd className="text-sm text-ink-600">{rule.detail}</dd>
            </div>
          ))}
        </dl>
      </div>

      <Reading />

      <div className="rounded-xl border border-ink-200 bg-ink-50 p-4">
        <p className="text-sm font-semibold text-ink-900">Joining halfway is fine</p>
        <p className="mt-1.5 text-sm text-ink-600">
          Open the facilitator&apos;s setup link, add your name, read the earlier updates and start
          with the current sprint. Missing one sprint must not make the next one hard to join.
        </p>
      </div>
    </section>
  );
}

function Notices() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-ink-900">Before you start</h2>
        <p className="mt-1.5 text-sm text-ink-600">
          The two on the front page, in full — they are there because you would be entitled to be
          annoyed to find them out later.
        </p>
        <dl className="mt-3 space-y-3">
          {REQUIRED_NOTICES.map((notice) => (
            <div key={notice.title} className="rounded-lg border-l-2 border-amber-400 bg-amber-50 px-3 py-2.5">
              <dt className="text-sm font-semibold text-amber-900">{notice.title}</dt>
              <dd className="mt-0.5 text-sm leading-relaxed text-amber-900/90">{notice.body}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-ink-900">Worth knowing once</h2>
        <dl className="mt-3 space-y-3">
          {REFERENCE_NOTICES.map((notice) => (
            <div key={notice.title}>
              <dt className="text-sm font-semibold text-ink-900">{notice.title}</dt>
              <dd className="mt-0.5 text-sm leading-relaxed text-ink-600">{notice.body}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-xl border border-ink-200 bg-ink-50 p-4">
        <p className="text-sm font-semibold text-ink-900">Consent is asked for at the moment it matters</p>
        <p className="mt-1.5 text-sm text-ink-600">
          Nothing here collects an agreement in advance. Publishing a use case asks then, with the
          wording that matches where it is going and whether a name is attached — a private archive
          and a public page are different promises, so they are different sentences.
        </p>
        <Link to="/use-cases" className="btn-secondary mt-3 w-full text-center">
          See what has been published
        </Link>
      </div>
    </section>
  );
}
