"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavLink } from "./ui";

/**
 * Eight tabs is a wall to someone on their first session. Three carry the hour;
 * the rest stay one click away under More, where a facilitator will look for
 * them and a first-timer will not trip over them.
 */
const TABS = [
  { slug: "guide", label: "First hour" },
  { slug: "me", label: "My sprint" },
  { slug: "board", label: "Sprints" },
];

const MORE_TABS = [
  { slug: "", label: "Overview" },
  { slug: "targets", label: "Target bank" },
  { slug: "projects", label: "Projects" },
  { slug: "participants", label: "People" },
  { slug: "dashboard", label: "Dashboard" },
  { slug: "log", label: "Sprint log" },
];

export function ProgrammeNav({ code }: { code: string }) {
  const pathname = usePathname();
  const base = `/p/${code}`;
  const href = (slug: string) => (slug ? `${base}/${slug}` : base);
  const isActive = (slug: string) =>
    slug ? pathname === href(slug) || pathname.startsWith(`${href(slug)}/`) : pathname === base;
  const openTab = MORE_TABS.find((tab) => isActive(tab.slug));

  return (
    <nav className="flex flex-wrap items-center gap-1">
      {TABS.map((tab) => (
        <NavLink key={tab.slug} href={href(tab.slug)} active={isActive(tab.slug)}>
          {tab.label}
        </NavLink>
      ))}
      <details className="relative">
        <summary
          className={`flex cursor-pointer list-none items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition [&::-webkit-details-marker]:hidden ${
            openTab ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
          }`}
        >
          {openTab ? openTab.label : "More"}
          <span aria-hidden className="text-xs">
            ▾
          </span>
        </summary>
        <div className="absolute left-0 z-20 mt-1 w-52 rounded-lg border border-ink-200 bg-white p-1 shadow-lg">
          {MORE_TABS.map((tab) => (
            <Link
              key={tab.slug}
              href={href(tab.slug)}
              onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")}
              className={`block rounded-md px-3 py-2 text-sm ${
                isActive(tab.slug)
                  ? "bg-ink-100 font-semibold text-ink-900"
                  : "text-ink-700 hover:bg-ink-100"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </details>
    </nav>
  );
}
