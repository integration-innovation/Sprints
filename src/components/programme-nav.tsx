"use client";

import { usePathname } from "next/navigation";
import { NavLink } from "./ui";

const TABS = [
  { slug: "", label: "Overview" },
  { slug: "me", label: "My sprint" },
  { slug: "board", label: "Sprints" },
  { slug: "targets", label: "Target bank" },
  { slug: "projects", label: "Projects" },
  { slug: "participants", label: "People" },
  { slug: "dashboard", label: "Dashboard" },
  { slug: "log", label: "Sprint log" },
];

export function ProgrammeNav({ code }: { code: string }) {
  const pathname = usePathname();
  const base = `/p/${code}`;

  return (
    <nav className="flex flex-wrap items-center gap-1">
      {TABS.map((tab) => {
        const href = tab.slug ? `${base}/${tab.slug}` : base;
        const active = tab.slug
          ? pathname === href || pathname.startsWith(`${href}/`)
          : pathname === base;
        return (
          <NavLink key={tab.slug} href={href} active={active}>
            {tab.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
