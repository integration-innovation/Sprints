---
name: sprint-hour
description: Run one Structured Sprint hour — set a sprint-sized target, screen the data, build, test against your own definition of done, and record the log row. Use when someone says "run my sprint", "start my hour", "sprint 3", or asks how to get one outcome out of the next hour.
---

# One sprint hour

Six sessions, three months, one outcome each. The hour must stand on its own: a
participant who does nothing between sessions still finishes something today.

## Before you start

Ask for exactly two things, and nothing else:

1. **Which sprint number** (1–6) — it selects the session prompt from
   `src/lib/defaults.ts` `SESSION_TEMPLATES`.
2. **What they want by the end of the hour**, in their own words, however vague.

Do not ask for scope, tools, stage, risk or definition of done. Those come out of the work
or they do not matter. The programme's whole complaint is that people were asked for
seventeen fields before they were allowed to build.

## Run the crew

| Minute | Agent | Output |
|---|---|---|
| 0–5 | `target-shaper` | One target in the formula, plus their definition of done |
| 5–10 | `data-guard` | Green light, or a synthetic stand-in for anything confidential |
| 10–50 | `sprint-builder` | Something that runs |
| 50–55 | `done-checker` | Complete / Partial / Blocked, with observed evidence |
| 55–60 | `sprint-recorder` | The log row and the next possibility |

Run them in that order. `data-guard` is not optional the moment any real project material
appears — a drawing, a model, a register, an email, a cost line.

Check in at **minute 25**: if the target will not land by 50, call `target-shaper` for a
cut. This is the single highest-value intervention in the hour.

## Choosing what to build

If the participant has no idea, offer the six playbooks in `static/src/playbooks.ts` by
their concern, not their title — project definition, design options, compliance checking,
coordination, contract administration, digital handover. Each carries a `starterTarget`
already sized for an hour.

## Own-time extension

Optional, and never assumed. If someone wants to carry a target past the hour, the hour's
result is still recorded as the hour's result — `sprint-recorder` keeps the two apart.
The next session must not require the extension to have happened.

## What good looks like

The measure is not how much AI was used. It is: **what became possible during the hour
that was not possible beforehand.** One visible improvement. Shown, not reported.
