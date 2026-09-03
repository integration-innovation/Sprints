import React from "react";
import { SPRINT_PLAYBOOKS } from "../playbooks";
import type { SParticipant, SProgramme } from "../model";
import { navigate } from "../router";
import { nextSession, updateEntry } from "../store";
import { SectionTitle } from "../ui";

export function PlaybookPage({ programme, me }: { programme: SProgramme; me: SParticipant | undefined }) {
  const [open, setOpen] = React.useState(SPRINT_PLAYBOOKS[0].id);
  const activeSprint = nextSession(programme)?.sprintNo ?? programme.sessions[0]?.sprintNo ?? 1;

  function choose(id: string) {
    if (!me) return;
    const item = SPRINT_PLAYBOOKS.find((p) => p.id === id);
    if (!item) return;
    updateEntry(programme.id, activeSprint, me.id, {
      target: item.starterTarget,
      whyItMatters: item.outcome,
      definitionOfDone: item.done.join("; "),
      scopeLimit: `Use only: ${item.safeData} Do not use: ${item.avoid}`,
      tools: item.tools.join("; "),
      startingPoint: item.prompt,
      mainRisk: "Sensitive data, uncited requirements, or an output being mistaken for professional approval.",
      fallback: "Reduce to one synthetic dataset, one check and one observable result.",
      aiUsedFor: "Research; Planning; Coding; Testing; Documentation; Review",
      status: "In progress",
    });
    navigate(`/p/${programme.id}/me?sprint=${activeSprint}`);
  }

  return (
    <div className="space-y-8">
      <SectionTitle eyebrow="Learn by doing" title="Architect delivery sprint playbook" description="Choose a safe, one-hour starting point. Build, test and show it now; then use the follow-on path to grow it into a governed firm capability." />

      <section className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
        <strong>Professional boundary:</strong> readiness support only—not authority validation, statutory approval, professional certification, contractual determination or a substitute for QP review. Use synthetic or explicitly approved de-identified data.
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SPRINT_PLAYBOOKS.map((item, index) => (
          <article key={item.id} className={`card flex flex-col p-5 ${open === item.id ? "border-accent-500 ring-2 ring-accent-100" : ""}`}>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent-600">Option {index + 1}</p>
            <h2 className="mt-2 text-lg font-semibold text-ink-900">{item.title}</h2>
            <p className="mt-1 text-sm text-ink-600">{item.concern}</p>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-700">{item.outcome}</p>
            <button type="button" onClick={() => setOpen(item.id)} className="btn-secondary mt-4 w-full">View template</button>
          </article>
        ))}
      </div>

      {SPRINT_PLAYBOOKS.filter((item) => item.id === open).map((item) => (
        <article key={item.id} className="card overflow-hidden">
          <header className="border-b border-ink-200 bg-ink-50 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent-600">Selected template</p>
            <h2 className="mt-1 text-2xl font-semibold text-ink-900">{item.title}</h2>
            <p className="mt-2 text-sm text-ink-600"><strong>VAF:</strong> {item.vaf}</p>
            <p className="mt-1 text-sm text-ink-600"><strong>CORENET X:</strong> {item.gateway}</p>
          </header>
          <div className="space-y-7 px-6 py-6">
            <div><p className="label">Reusable prompt</p><p className="mt-2 rounded-lg bg-ink-100 p-4 text-sm leading-relaxed text-ink-800">{item.prompt}</p></div>
            <div><p className="label">One-hour starter target</p><p className="mt-2 text-sm font-medium text-ink-900">{item.starterTarget}</p></div>
            <div className="grid gap-6 lg:grid-cols-2">
              <List title="Tools" items={item.tools} />
              <List title="Methods" items={item.methods} />
              <List title="Build phases" items={item.phases} numbered />
              <List title="Data hosts" items={item.hosts} />
              <List title="Definition of done" items={item.done} />
              <div><p className="label">Follow on while learning</p><p className="mt-2 text-sm leading-relaxed text-ink-700">{item.followOn}</p></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Safe to use</p><p className="mt-2 text-sm text-emerald-900">{item.safeData}</p></div>
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Do not use</p><p className="mt-2 text-sm text-rose-900">{item.avoid}</p></div>
            </div>
            <button type="button" className="btn-primary" disabled={!me} onClick={() => choose(item.id)}>
              {me ? `Use for Sprint ${String(activeSprint).padStart(2, "0")}` : "Join this programme to use a template"}
            </button>
          </div>
        </article>
      ))}

      <p className="text-xs leading-relaxed text-ink-400">
        References: SIA Value Articulation Framework; CORENET X Code of Practice and IFC+SG Resource Kit; buildingSMART IFC, IDS and BCF standards. Always check the latest official requirements before project use.
      </p>
    </div>
  );
}

function List({ title, items, numbered = false }: { title: string; items: string[]; numbered?: boolean }) {
  const Tag = numbered ? "ol" : "ul";
  return <div><p className="label">{title}</p><Tag className={`mt-2 space-y-1 text-sm text-ink-700 ${numbered ? "list-decimal" : "list-disc"} pl-5`}>{items.map((item) => <li key={item}>{item}</li>)}</Tag></div>;
}
