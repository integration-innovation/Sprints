/**
 * Submission policy, shared by both builds.
 *
 * The workbook asks a participant for seventeen fields a sprint. Asking for all
 * of them, every sprint, is what makes people stop filling the log in — so the
 * forms ask for the three the dashboard actually reads (target, result, status)
 * and keep the other fourteen as optional detail, prefilled wherever the
 * previous sprint already answered them.
 *
 * Nothing here is a validation rule: every field stays writable and stays in the
 * CSV. It only decides what a participant is asked for up front.
 */

/** Plan fields beyond the target — optional, and shown behind a disclosure. */
export const PLAN_DETAIL_FIELDS = [
  "projectId",
  "stageAtStart",
  "whyItMatters",
  "definitionOfDone",
  "scopeLimit",
  "tools",
  "startingPoint",
  "mainRisk",
  "fallback",
  "aiUsedFor",
] as const;

/** Result fields beyond "this now works" and the status. */
export const RESULT_DETAIL_FIELDS = [
  "evidence",
  "whatChanged",
  "nextPossibility",
  "minutesDelta",
] as const;

/** The statuses worth a single tap at the end of an hour. */
export const QUICK_STATUSES = ["Complete", "Partial", "Blocked"] as const;

export const COPY = {
  planLead: "One target is all this needs. Everything else is optional.",
  resultLead: "What now works, and how it went. Two fields, then you are done.",
  detailSummary: "Add planning detail",
  resultDetailSummary: "Add result detail",
  carried: "Carried over from your last sprint — change anything that has moved on.",
} as const;

export type DetailValues = Record<string, string | number | null | undefined>;

/** How many of `fields` the participant has actually answered. */
export function detailsFilled(values: DetailValues, fields: readonly string[]): number {
  let filled = 0;
  for (const field of fields) {
    const value = values[field];
    if (value === null || value === undefined) continue;
    if (typeof value === "number") {
      filled++;
      continue;
    }
    if (String(value).trim() !== "") filled++;
  }
  return filled;
}

/** "Add planning detail" / "Planning detail · 3 of 10" for a disclosure summary. */
export function detailLabel(base: string, filled: number, total: number): string {
  return filled === 0 ? `${base} (optional)` : `${base} · ${filled} of ${total} filled`;
}

/** The half of a sprint-log row that is worth carrying into the next sprint. */
export type CarrySource = {
  sprintNo: number;
  projectId: string | null;
  stageAtStart: string;
  tools: string;
  aiUsedFor: string;
  result: string;
  nextPossibility: string;
};

export type Carried = {
  fromSprint: number;
  projectId: string | null;
  stageAtStart: string;
  tools: string;
  aiUsedFor: string;
  /** Last sprint's result: where this sprint starts from. */
  startingPoint: string;
  /** Last sprint's next possibility, offered as a target — never written for them. */
  suggestedTarget: string;
};

function hasContent(source: CarrySource): boolean {
  return (
    source.projectId !== null ||
    source.stageAtStart.trim() !== "" ||
    source.tools.trim() !== "" ||
    source.aiUsedFor.trim() !== "" ||
    source.result.trim() !== "" ||
    source.nextPossibility.trim() !== ""
  );
}

/**
 * What the sprint before `sprintNo` already answered. Project, stage, tools and
 * AI use rarely change between sprints; last sprint's result is this sprint's
 * starting point; last sprint's next possibility is a candidate target.
 */
export function carryForwardFrom(rows: CarrySource[], sprintNo: number): Carried | null {
  const previous = rows
    .filter((row) => row.sprintNo < sprintNo && hasContent(row))
    .sort((a, b) => b.sprintNo - a.sprintNo)[0];
  if (!previous) return null;
  return {
    fromSprint: previous.sprintNo,
    projectId: previous.projectId,
    stageAtStart: previous.stageAtStart,
    tools: previous.tools,
    aiUsedFor: previous.aiUsedFor,
    startingPoint: previous.result,
    suggestedTarget: previous.nextPossibility,
  };
}

/**
 * True while a row holds nothing the participant typed, so prefilling it with
 * last sprint's answers cannot overwrite anything.
 */
export function rowIsBlank(
  status: string,
  values: (string | number | null | undefined)[],
): boolean {
  if (status !== "" && status !== "Not started") return false;
  return values.every((value) => value === null || value === undefined || String(value).trim() === "");
}
