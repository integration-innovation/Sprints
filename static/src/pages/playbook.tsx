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

  function chooseCustom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!me) return;
    const form = new FormData(event.currentTarget);
    const get = (key: string) => String(form.get(key) ?? "").trim();
    updateEntry(programme.id, activeSprint, me.id, {
      target: get("target"),
      whyItMatters: `Problem: ${get("problem")} Objective: ${get("objective")} Expected outcome: ${get("outcome")}`,
      definitionOfDone: get("done"),
      scopeLimit: `Approved/safe data: ${get("safeData") || "Synthetic or explicitly approved de-identified data only."}`,
      tools: get("tools"),
      startingPoint: `Strategy: ${get("strategy")} Methods: ${get("methods")}`,
      mainRisk: get("risk") || "Sensitive data, unclear ownership, or an output being mistaken for professional approval.",
      fallback: get("fallback") || "Reduce to one safe input, one method and one observable result.",
      aiUsedFor: "Research; Planning; Building; Testing; Documentation; Review",
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

      <section className="card p-6">
        <SectionTitle eyebrow="Programme objective" title="Build while learning, without taking ownership away" description="Participants bring their own needs, own their repositories and outputs, and share only safe progress and evidence. Every session is independent and repeatable." />
        <div className="grid gap-3 sm:grid-cols-5">
          {[['0–5 min','Problem + objective'],['5–10 min','Target + strategy'],['10–45 min','Build with chosen tools'],['45–55 min','Test against done'],['55–60 min','Show + next outcome']].map(([when, what]) => <div key={when} className="rounded-lg bg-ink-50 p-3"><p className="font-mono text-xs text-accent-600">{when}</p><p className="mt-1 text-xs font-semibold text-ink-800">{what}</p></div>)}
        </div>
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

      <section className="card p-6">
        <SectionTitle eyebrow="Bring your own need" title="Define my own project" description="Use this when none of the suggested patterns fits. Your project, tools, repository and continuation remain yours." />
        <form onSubmit={chooseCustom} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Text name="problem" label="Problem" placeholder="What recurring or important difficulty needs attention?" />
            <Text name="objective" label="Objective" placeholder="What capability or improvement do you want to create?" />
          </div>
          <Text name="target" label="One-hour target" placeholder="[Verb] [specific feature/test] using [tool/method] so that [observable result]." />
          <div className="grid gap-5 sm:grid-cols-2">
            <Text name="strategy" label="Strategy" placeholder="How will you reduce and approach the problem?" />
            <Text name="methods" label="Methods" placeholder="Research; prototype; rules-as-data; user test; comparison…" />
            <Text name="tools" label="Tools" placeholder="GitHub; coding environment; BIM tool; spreadsheet; AI assistant…" />
            <Text name="outcome" label="Expected outcome" placeholder="What should become possible by the end?" />
            <Text name="done" label="Definition of done" placeholder="What can another participant observe or verify?" />
            <Text name="safeData" label="Approved data" placeholder="Synthetic/public inputs and permitted host." />
            <Text name="risk" label="Main consideration or risk" placeholder="Privacy, reliability, professional boundary, dependency…" />
            <Text name="fallback" label="Fallback strategy" placeholder="What smaller useful result will you attempt if blocked?" />
          </div>
          <button type="submit" className="btn-primary" disabled={!me}>{me ? `Use my project for Sprint ${String(activeSprint).padStart(2, "0")}` : "Join this programme to define a project"}</button>
        </form>
      </section>

      <p className="text-xs leading-relaxed text-ink-400">
        References: SIA Value Articulation Framework; CORENET X Code of Practice and IFC+SG Resource Kit; buildingSMART IFC, IDS and BCF standards. Always check the latest official requirements before project use.
      </p>
    </div>
  );
}

function Text({ name, label, placeholder }: { name: string; label: string; placeholder: string }) {
  return <label><span className="label">{label}</span><textarea required name={name} rows={2} placeholder={placeholder} className="field mt-2" /></label>;
}

function List({ title, items, numbered = false }: { title: string; items: string[]; numbered?: boolean }) {
  const Tag = numbered ? "ol" : "ul";
  return <div><p className="label">{title}</p><Tag className={`mt-2 space-y-1 text-sm text-ink-700 ${numbered ? "list-decimal" : "list-disc"} pl-5`}>{items.map((item) => <li key={item}>{item}</li>)}</Tag></div>;
}
