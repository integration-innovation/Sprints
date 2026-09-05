"use client";

import React from "react";
import { AiUpdatePanel } from "./ai-update-panel";
import type { AiUpdateKey, UpdateContext } from "../lib/ai-update";

/** Log key → the input name the plan and result server actions read. */
const INPUT_NAME: Record<AiUpdateKey, string> = {
  target: "target",
  whyItMatters: "why_it_matters",
  definitionOfDone: "definition_of_done",
  scopeLimit: "scope_limit",
  tools: "tools",
  stageAtStart: "stage_at_start",
  startingPoint: "starting_point",
  mainRisk: "main_risk",
  fallback: "fallback",
  aiUsedFor: "ai_used_for",
  result: "result",
  evidence: "evidence",
  whatChanged: "what_changed",
  nextPossibility: "next_possibility",
  status: "status",
  minutesDelta: "minutes_delta",
};

type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/** The entry forms on this page, and only those. */
function entryForms(): HTMLFormElement[] {
  return Array.from(document.querySelectorAll("form")).filter((form) =>
    form.querySelector('input[name="entry_id"]'),
  );
}

/**
 * Controls the participant can see. Hidden inputs are skipped deliberately:
 * the "use last sprint's target" form carries a hidden `target` too, and
 * writing to it would arm that button with the wrong value.
 */
function controlsNamed(name: string): Control[] {
  const found: Control[] = [];
  for (const form of entryForms()) {
    for (const el of Array.from(form.querySelectorAll<Control>(`[name="${name}"]`))) {
      if (el instanceof HTMLInputElement && el.type === "hidden") continue;
      found.push(el);
    }
  }
  return found;
}

/**
 * Writes through React's own value setter so a controlled input notices. The
 * forms here are uncontrolled, but this keeps the fill working if that changes.
 */
function setValue(el: Control, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function setChecked(el: HTMLInputElement, checked: boolean) {
  if (el.checked === checked) return;
  el.checked = checked;
  el.dispatchEvent(new Event("click", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

/** A filled field inside a closed disclosure is a field nobody reviews. */
function reveal(el: HTMLElement) {
  let node: HTMLElement | null = el;
  while (node) {
    if (node instanceof HTMLDetailsElement) node.open = true;
    node = node.parentElement;
  }
}

function applyToForms(values: Partial<Record<AiUpdateKey, string>>) {
  let first: HTMLElement | null = null;

  for (const [key, value] of Object.entries(values) as [AiUpdateKey, string][]) {
    const controls = controlsNamed(INPUT_NAME[key]);
    if (!controls.length) continue;

    const radios = controls.filter(
      (el): el is HTMLInputElement => el instanceof HTMLInputElement && el.type === "radio",
    );
    const boxes = controls.filter(
      (el): el is HTMLInputElement => el instanceof HTMLInputElement && el.type === "checkbox",
    );

    if (boxes.length) {
      const wanted = new Set(value.split(";").map((s) => s.trim()).filter(Boolean));
      for (const box of boxes) setChecked(box, wanted.has(box.value));
    } else if (radios.length) {
      const match = radios.find((r) => r.value === value);
      if (match) setChecked(match, true);
    } else {
      for (const el of controls) setValue(el, value);
    }

    const anchor = controls[0];
    reveal(anchor);
    first = first ?? anchor;
  }

  first?.scrollIntoView({ behavior: "smooth", block: "center" });
}

/**
 * The panel, wired to a page whose forms post to server actions. Applying fills
 * the fields in place; the participant still presses Save on each half, so the
 * AI's account never reaches the log without a deliberate save.
 */
export function AiUpdateFill({
  context,
  current,
}: {
  context: UpdateContext;
  current: Partial<Record<AiUpdateKey, string>>;
}) {
  return (
    <AiUpdatePanel
      context={context}
      current={current}
      applyNote="Check them below, then press Save on each half to keep them."
      onApply={applyToForms}
    />
  );
}
