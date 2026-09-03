import React from "react";
import type { SProgramme } from "./model";
import { BoardPage, SprintPage } from "./pages/board";
import { DashboardPage } from "./pages/dashboard";
import { LogPage } from "./pages/log";
import { MySprintPage } from "./pages/mysprint";
import { OverviewPage } from "./pages/overview";
import { PeoplePage } from "./pages/people";
import { ProjectsPage } from "./pages/projects";
import { SetupPage, StartPage } from "./pages/start";
import { TargetsPage } from "./pages/targets";
import { Link, navigate, useRoute } from "./router";
import { getProgramme, meIn, readSetupPayload, refresh, setMe, snapshot, subscribe } from "./store";
import { SyncBadge } from "./pages/connect";

const TABS = [
  { slug: "", label: "Overview" },
  { slug: "me", label: "My sprint" },
  { slug: "board", label: "Sprints" },
  { slug: "targets", label: "Target bank" },
  { slug: "projects", label: "Projects" },
  { slug: "people", label: "People" },
  { slug: "dashboard", label: "Dashboard" },
  { slug: "log", label: "Sprint log" },
];

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
              {programme.remote ? "Shared via Google Sheets" : "Saved in this browser"} ·{" "}
              <span className="font-mono font-semibold tracking-widest text-ink-600">
                {programme.id}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {programme.remote ? <SyncBadge programmeId={programme.id} /> : null}
            {me ? <span className="text-sm text-ink-600">{me.name}</span> : null}
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
                to={tab.slug ? `/p/${programme.id}/${tab.slug}` : `/p/${programme.id}`}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active === tab.slug
                    ? "bg-ink-900 text-white"
                    : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
                }`}
              >
                {tab.label}
              </Link>
            ))}
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
    case "me":
      body = me ? (
        <MySprintPage programme={programme} me={me} sprintNo={sprintNo} />
      ) : (
        <NotFound />
      );
      break;
    case "board":
      body = <BoardPage programme={programme} />;
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
