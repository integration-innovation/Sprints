import React from "react";
import type { SProgramme } from "./model";
import { BoardPage, SprintPage } from "./pages/board";
import { DashboardPage } from "./pages/dashboard";
import { GuidePage } from "./pages/guide";
import { LogPage } from "./pages/log";
import { MySprintPage } from "./pages/mysprint";
import { OverviewPage } from "./pages/overview";
import { PlanPage } from "./pages/plan";
import { PeoplePage } from "./pages/people";
import { PlaybookPage } from "./pages/playbook";
import { ProjectsPage } from "./pages/projects";
import { SetupPage, StartPage } from "./pages/start";
import { TargetsPage } from "./pages/targets";
import { Link, navigate, useRoute } from "./router";
import { getProgramme, meIn, readSetupPayload, refresh, setMe, snapshot, subscribe } from "./store";
import { SyncBadge } from "./pages/connect";

/**
 * Nine tabs is a wall to someone on their first session. Three carry the hour;
 * everything else stays one click away under More, where a facilitator will
 * look for it and a first-timer will not trip over it.
 */
const TABS = [
  { slug: "guide", label: "First hour" },
  { slug: "plan", label: "My six" },
  { slug: "me", label: "My sprint" },
];

const MORE_TABS = [
  { slug: "", label: "Overview" },
  { slug: "board", label: "Sprints" },
  { slug: "playbook", label: "Playbook" },
  { slug: "targets", label: "Target bank" },
  { slug: "projects", label: "Projects" },
  { slug: "people", label: "People" },
  { slug: "dashboard", label: "Status report" },
  { slug: "log", label: "Sprint log" },
];

const TEXT_KEY = "structured-sprints/text-size";

/** Bigger type, remembered. A toggle beats asking people to zoom the browser. */
function TextSizeToggle() {
  const [large, setLarge] = React.useState(() => {
    try {
      return window.localStorage.getItem(TEXT_KEY) === "large";
    } catch {
      return false;
    }
  });
  React.useEffect(() => {
    document.documentElement.dataset.text = large ? "large" : "normal";
    try {
      window.localStorage.setItem(TEXT_KEY, large ? "large" : "normal");
    } catch {
      // Reading stays the size it is; nothing else breaks.
    }
  }, [large]);
  return (
    <button
      type="button"
      onClick={() => setLarge((value) => !value)}
      aria-pressed={large}
      title={large ? "Normal text size" : "Larger text"}
      className="btn-ghost px-2 py-1"
    >
      <span className="text-xs font-semibold">A</span>
      <span className="text-base font-semibold leading-none">A</span>
    </button>
  );
}

function MoreMenu({ programmeId, active }: { programmeId: string; active: string }) {
  const current = MORE_TABS.find((tab) => tab.slug === active);
  return (
    <details className="group relative">
      <summary className={`flex cursor-pointer list-none items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition [&::-webkit-details-marker]:hidden ${
        current ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
      }`}>
        {current ? current.label : "More"}
        <span aria-hidden className="text-xs">▾</span>
      </summary>
      <div className="absolute left-0 z-20 mt-1 w-52 rounded-lg border border-ink-200 bg-white p-1 shadow-lg">
        {MORE_TABS.map((tab) => (
          <Link
            key={tab.slug}
            to={tab.slug ? `/p/${programmeId}/${tab.slug}` : `/p/${programmeId}`}
            onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")}
            className={`block rounded-md px-3 py-2 text-sm ${
              tab.slug === active ? "bg-ink-100 font-semibold text-ink-900" : "text-ink-700 hover:bg-ink-100"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </details>
  );
}

function useStore(): void {
  React.useSyncExternalStore(subscribe, snapshot, snapshot);
}

/** Keeps a sheet-backed programme fresh so the board updates during a session. */
function useSheetPolling(programmeId: string | undefined, connected: boolean): void {
  React.useEffect(() => {
    if (!programmeId || !connected) return;
    void refresh(programmeId);

    const tick = () => {
      if (document.visibilityState === "visible") void refresh(programmeId);
    };
    const timer = window.setInterval(tick, 20000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [programmeId, connected]);
}

function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold text-ink-900">Not found</h1>
      <p className="mt-2 text-sm text-ink-600">
        That programme isn&apos;t saved in this browser. Programmes live on the device that
        created them — open your setup link, or start a new one.
      </p>
      <Link to="/" className="btn-secondary mt-6">
        Back to start
      </Link>
    </main>
  );
}

function ProgrammeShell({
  programme,
  active,
  children,
}: {
  programme: SProgramme;
  active: string;
  children: React.ReactNode;
}) {
  const me = meIn(programme.id);
  return (
    <div className="min-h-screen">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="min-w-0">
            <Link to={`/p/${programme.id}`} className="block truncate">
              <span className="text-base font-semibold text-ink-900">{programme.name}</span>
            </Link>
            <p className="mt-0.5 text-xs text-ink-400">
              {programme.remote ? "Shared dataset · Google Sheets" : "Private draft · connect Google Sheets to share"} ·{" "}
              <span className="font-mono font-semibold tracking-widest text-ink-600">
                {programme.id}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {programme.remote ? <SyncBadge programmeId={programme.id} /> : null}
            {me ? <span className="text-sm text-ink-600">{me.name}</span> : null}
            <TextSizeToggle />
            <Link to="/" className="btn-ghost">
              All programmes
            </Link>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-6 pb-3">
          <nav className="flex flex-wrap items-center gap-1">
            {TABS.map((tab) => (
              <Link
                key={tab.slug}
                to={`/p/${programme.id}/${tab.slug}`}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active === tab.slug
                    ? "bg-ink-900 text-white"
                    : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
                }`}
              >
                {tab.label}
              </Link>
            ))}
            <MoreMenu programmeId={programme.id} active={active} />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}

export function App() {
  useStore();
  const route = useRoute();
  const routedProgramme = route.path[0] === "p" ? getProgramme(route.path[1] ?? "") : undefined;
  useSheetPolling(routedProgramme?.id, Boolean(routedProgramme?.remote));

  if (route.path[0] === "setup") {
    const encoded = route.query.get("d");
    const payload = encoded ? readSetupPayload(encoded) : null;
    if (!payload) {
      return (
        <main className="mx-auto max-w-lg px-6 py-24 text-center">
          <h1 className="text-2xl font-semibold text-ink-900">That setup link is damaged</h1>
          <p className="mt-2 text-sm text-ink-600">
            Links can be truncated by chat apps and email clients. Ask your facilitator to send it
            again, unbroken.
          </p>
          <Link to="/" className="btn-secondary mt-6">
            Back to start
          </Link>
        </main>
      );
    }
    return <SetupPage payload={payload} />;
  }

  if (route.path[0] !== "p") return <StartPage />;

  const programme = routedProgramme;
  if (!programme) return <NotFound />;

  const me = meIn(programme.id);
  const section = route.path[2] ?? "";

  // Every tab but the overview needs to know who you are.
  if (!me && section !== "") {
    return (
      <ProgrammeShell programme={programme} active="">
        <div className="card p-8 text-center">
          <p className="text-sm font-semibold text-ink-800">Who are you in this programme?</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-600">
            Pick your name to start filling in your rows.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {programme.participants.map((p) => (
              <button
                key={p.id}
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setMe(programme.id, p.id);
                  navigate(`/p/${programme.id}/${section}`);
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </ProgrammeShell>
    );
  }

  const sprintParam = route.query.get("sprint");
  const sprintNo = sprintParam ? Number(sprintParam) : null;

  let body: React.ReactNode;
  let active = section;

  switch (section) {
    case "":
      body = <OverviewPage programme={programme} />;
      break;
    case "guide":
      body = me ? <GuidePage programme={programme} me={me} /> : <NotFound />;
      break;
    case "plan":
      body = me ? <PlanPage programme={programme} me={me} /> : <NotFound />;
      break;
    case "me":
      body = me ? (
        <MySprintPage programme={programme} me={me} sprintNo={sprintNo} />
      ) : (
        <NotFound />
      );
      break;
    case "playbook":
      body = <PlaybookPage programme={programme} me={me} />;
      break;
    case "board":
      body = <BoardPage programme={programme} me={me} />;
      break;
    case "sprint":
      active = "board";
      body = <SprintPage programme={programme} me={me} sprintNo={Number(route.path[3] ?? 1)} />;
      break;
    case "targets":
      body = <TargetsPage programme={programme} me={me} />;
      break;
    case "projects":
      body = <ProjectsPage programme={programme} me={me} />;
      break;
    case "people":
      body = <PeoplePage programme={programme} me={me} />;
      break;
    case "dashboard":
      body = <DashboardPage programme={programme} />;
      break;
    case "log":
      body = <LogPage programme={programme} />;
      break;
    default:
      body = <NotFound />;
  }

  return (
    <ProgrammeShell programme={programme} active={active}>
      {body}
    </ProgrammeShell>
  );
}
