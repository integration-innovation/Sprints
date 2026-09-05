/**
 * One paste out, one paste back.
 *
 * Seventeen fields at the end of an hour is the thing people stop doing, and
 * the answers already exist — in the AI conversation they just finished. This
 * module builds a prompt a participant pastes into whatever platform they
 * worked in, and reads the reply back into the log, so the round trip costs two
 * copies instead of seventeen.
 *
 * Nothing here trusts the reply. A sprint log is a record of what somebody
 * actually did, so `parseUpdate` reports everything it could not use rather
 * than quietly dropping it, and `proposeChanges` marks anything that would
 * replace what the participant already wrote. Both builds show the changes for
 * review; neither writes to the log on its own.
 */

export type AiUpdateKey =
  | "target"
  | "whyItMatters"
  | "definitionOfDone"
  | "scopeLimit"
  | "tools"
  | "stageAtStart"
  | "startingPoint"
  | "mainRisk"
  | "fallback"
  | "aiUsedFor"
  | "result"
  | "evidence"
  | "whatChanged"
  | "nextPossibility"
  | "status"
  | "minutesDelta";

/** Which controlled list a field's value has to come from, if any. */
export type ListName = "status" | "stage" | "ai_use";

export type AiUpdateField = {
  key: AiUpdateKey;
  /** Matches the label on the form, so a review row reads like the field it fills. */
  label: string;
  half: "plan" | "result";
  /** What the prompt asks the AI for. Written in the participant's voice. */
  ask: string;
  list?: ListName;
  /** Semicolon-separated, like the rest of the workbook's multi-value fields. */
  multi?: boolean;
  numeric?: boolean;
};

export const AI_UPDATE_FIELDS: readonly AiUpdateField[] = [
  { key: "target", label: "Target", half: "plan",
    ask: "The one thing I set out to get done this hour, in a single sentence." },
  { key: "whyItMatters", label: "Why this matters", half: "plan",
    ask: "Why that target was worth the hour." },
  { key: "definitionOfDone", label: "Definition of done", half: "plan",
    ask: "The observable condition that would mean the target was met." },
  { key: "scopeLimit", label: "Scope limit", half: "plan",
    ask: "What I explicitly decided not to do this hour." },
  { key: "tools", label: "Tools", half: "plan", multi: true,
    ask: "The tools actually used, separated by semicolons." },
  { key: "stageAtStart", label: "Stage at start", half: "plan", list: "stage",
    ask: "Where the work stood when the hour began." },
  { key: "startingPoint", label: "Starting point", half: "plan",
    ask: "What already existed when the hour began." },
  { key: "mainRisk", label: "Main risk", half: "plan",
    ask: "The main thing that could have stopped this working." },
  { key: "fallback", label: "Fallback approach", half: "plan",
    ask: "What I would have done instead if that risk landed." },
  { key: "aiUsedFor", label: "AI used for", half: "plan", list: "ai_use", multi: true,
    ask: "What the AI was actually used for, separated by semicolons." },
  { key: "result", label: "Result", half: "result",
    ask: "What now works that did not work at the start of the hour." },
  { key: "evidence", label: "Evidence", half: "result",
    ask: "Where the result can be seen — a file, a page, a test, a commit. Only things that actually appear in this conversation." },
  { key: "whatChanged", label: "What changed", half: "result",
    ask: "What changed in my understanding or approach during the hour." },
  { key: "nextPossibility", label: "Next possibility", half: "result",
    ask: "The next sprint-sized step this opens up." },
  { key: "status", label: "Status", half: "result", list: "status",
    ask: "How the hour ended." },
  { key: "minutesDelta", label: "Minutes over or under", half: "result", numeric: true,
    ask: "Whole number of minutes over the hour (positive) or under it (negative). 0 if it took about an hour." },
];

export type UpdateVocabulary = {
  status: readonly string[];
  stage: readonly string[];
  ai_use: readonly string[];
};

export type UpdateContext = {
  sprintNo: number;
  /** Already formatted for reading, e.g. "5 September 2026". */
  date?: string;
  sessionPrompt?: string;
  /** The target already on the row, so the AI reports against it rather than inventing one. */
  currentTarget?: string;
  vocabulary: UpdateVocabulary;
};

/** Minutes over or under an hour beyond this are a misread, not a long sprint. */
const MINUTES_BOUND = 600;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * The prompt a participant pastes into the platform they just worked in.
 *
 * Two things in here are doing real work. It tells the model that an empty
 * field is a correct answer, because the alternative is a log full of plausible
 * sentences nobody actually earned. And it asks for JSON, because a shape the
 * parser can reject beats prose it has to guess at.
 */
export function buildUpdatePrompt(ctx: UpdateContext): string {
  const when = ctx.date ? `Sprint ${pad(ctx.sprintNo)}, ${ctx.date}.` : `Sprint ${pad(ctx.sprintNo)}.`;
  const lines: string[] = [];

  lines.push("Fill in my sprint log from this conversation.");
  lines.push("");
  lines.push(
    "I have just finished a one-hour AI-assisted work sprint with you, and I have to record what " +
      "happened. Read back over everything we did in this conversation and answer the fields below.",
  );
  lines.push("");
  lines.push("THE SPRINT");
  lines.push(when);
  if (ctx.sessionPrompt?.trim()) lines.push(`Session prompt: ${ctx.sessionPrompt.trim()}`);
  lines.push(
    ctx.currentTarget?.trim()
      ? `Target I set: ${ctx.currentTarget.trim()}`
      : "Target I set: not recorded — work it out from what we actually did.",
  );
  lines.push("");
  lines.push("HOW TO ANSWER");
  lines.push(
    "- Report only what this conversation actually shows. Where it shows nothing, return an empty " +
      "string. An empty field is a correct answer; a plausible guess is not.",
  );
  lines.push(
    "- Never invent evidence. Any file name, link, commit, test or number must be one that actually " +
      "appears above.",
  );
  lines.push("- One or two plain sentences per field. No markdown, no bullet points, no bold.");
  lines.push("- Write in the first person and the past tense for the result fields.");
  lines.push(
    "- Leave out anything identifying a real client, site, person or fee. Describe projects generically.",
  );
  lines.push("");
  lines.push("FIELDS");
  for (const f of AI_UPDATE_FIELDS) lines.push(`${f.key} — ${f.ask}`);
  lines.push("");
  lines.push("ALLOWED VALUES");
  lines.push(`status — exactly one of: ${ctx.vocabulary.status.join(", ")}`);
  lines.push(`stageAtStart — exactly one of: ${ctx.vocabulary.stage.join(", ")}`);
  lines.push(
    `aiUsedFor — any of these, separated by semicolons: ${ctx.vocabulary.ai_use.join(", ")}`,
  );
  lines.push("minutesDelta — a whole number. Anything else is dropped.");
  lines.push("");
  lines.push("REPLY WITH");
  lines.push("One JSON object and nothing else, inside a ```json code block:");
  lines.push("");
  lines.push("```json");
  lines.push("{");
  lines.push(
    AI_UPDATE_FIELDS.map((f) => `  ${JSON.stringify(f.key)}: ${f.numeric ? "0" : '""'}`).join(",\n"),
  );
  lines.push("}");
  lines.push("```");

  return lines.join("\n");
}

export type ParsedUpdate = {
  values: Partial<Record<AiUpdateKey, string>>;
  /** Everything the reply contained that could not be used, in the participant's words. */
  warnings: string[];
  /** Set when nothing could be read at all; `values` is then empty. */
  error: string | null;
};

/** Pulls the JSON object out of a reply that may be fenced, prefaced or both. */
function extractJson(raw: string): string | null {
  const fenced = raw.match(/```(?:json|JSON)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : raw;
  const open = body.indexOf("{");
  const close = body.lastIndexOf("}");
  if (open < 0 || close <= open) return null;
  return body.slice(open, close + 1);
}

/** Flattens whatever the model sent into one line of plain text. */
function asText(value: unknown): string | null {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    const parts = value.map(asText).filter((p): p is string => p !== null && p !== "");
    return parts.join("; ");
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value !== "string") return null;
  return value
    .split(/\r?\n/)
    // Models reach for bullets even when told not to; drop the marker, keep the text.
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Case-insensitive match against a controlled list, returning the list's own spelling. */
function matchChoice(value: string, choices: readonly string[]): string | null {
  const wanted = value.trim().toLowerCase();
  for (const choice of choices) if (choice.toLowerCase() === wanted) return choice;
  return null;
}

function splitList(value: string): string[] {
  return value
    .split(/[;,\n]/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function parseUpdate(text: string, vocabulary: UpdateVocabulary): ParsedUpdate {
  const empty: ParsedUpdate = { values: {}, warnings: [], error: null };
  if (!text.trim()) return { ...empty, error: "Nothing pasted yet." };

  const json = extractJson(text);
  if (!json) {
    return {
      ...empty,
      error:
        "No JSON object found in that reply. Copy the whole answer, including the { and } braces, " +
        "and paste it again.",
    };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return {
      ...empty,
      error:
        "That reply is not valid JSON. Ask your AI to send the same answer again as a single JSON " +
        "object, with nothing after it.",
    };
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ...empty, error: "That reply is JSON, but not an object of fields." };
  }

  const source = raw as Record<string, unknown>;
  const values: Partial<Record<AiUpdateKey, string>> = {};
  const warnings: string[] = [];
  const lists: Record<ListName, readonly string[]> = {
    status: vocabulary.status,
    stage: vocabulary.stage,
    ai_use: vocabulary.ai_use,
  };

  for (const field of AI_UPDATE_FIELDS) {
    if (!(field.key in source)) continue;
    const text = asText(source[field.key]);
    if (text === null) {
      warnings.push(`${field.label}: the reply held something that is not text, so it was skipped.`);
      continue;
    }
    if (text === "") continue;

    if (field.numeric) {
      const n = Number(text.replace(/^\+/, ""));
      if (!Number.isFinite(n) || !Number.isInteger(n)) {
        warnings.push(`${field.label}: "${text}" is not a whole number, so it was skipped.`);
        continue;
      }
      if (Math.abs(n) > MINUTES_BOUND) {
        warnings.push(`${field.label}: ${n} is too far outside an hour to be right, so it was skipped.`);
        continue;
      }
      values[field.key] = String(n);
      continue;
    }

    if (field.list && field.multi) {
      const choices = lists[field.list];
      const kept: string[] = [];
      const dropped: string[] = [];
      for (const part of splitList(text)) {
        const match = matchChoice(part, choices);
        if (match) {
          if (!kept.includes(match)) kept.push(match);
        } else {
          dropped.push(part);
        }
      }
      if (dropped.length) {
        warnings.push(
          `${field.label}: ${dropped.map((d) => `"${d}"`).join(", ")} ` +
            `${dropped.length === 1 ? "is not one of" : "are not among"} the allowed values, so ` +
            `${dropped.length === 1 ? "it was" : "they were"} left out.`,
        );
      }
      if (kept.length) values[field.key] = kept.join("; ");
      continue;
    }

    if (field.list) {
      const match = matchChoice(text, lists[field.list]);
      if (!match) {
        warnings.push(`${field.label}: "${text}" is not one of the allowed values, so it was skipped.`);
        continue;
      }
      values[field.key] = match;
      continue;
    }

    if (field.multi) {
      const parts: string[] = [];
      for (const part of splitList(text)) if (!parts.includes(part)) parts.push(part);
      if (parts.length) values[field.key] = parts.join("; ");
      continue;
    }

    values[field.key] = text;
  }

  const known = new Set<string>(AI_UPDATE_FIELDS.map((f) => f.key));
  const extra = Object.keys(source).filter((k) => !known.has(k));
  if (extra.length) {
    warnings.push(
      `The reply also held ${extra.map((k) => `"${k}"`).join(", ")}, which the sprint log has no field for.`,
    );
  }

  if (!Object.keys(values).length && !warnings.length) {
    return { ...empty, error: "That reply had the right shape but every field was empty." };
  }
  return { values, warnings, error: null };
}

export type ProposedChange = {
  key: AiUpdateKey;
  label: string;
  half: "plan" | "result";
  current: string;
  next: string;
  /** True when applying this would replace something already written. */
  overwrites: boolean;
};

/**
 * What applying the reply would actually change. Fields the reply left empty,
 * and fields it agrees with, are not changes and are left out.
 */
export function proposeChanges(
  current: Partial<Record<AiUpdateKey, string>>,
  parsed: Partial<Record<AiUpdateKey, string>>,
): ProposedChange[] {
  const changes: ProposedChange[] = [];
  for (const field of AI_UPDATE_FIELDS) {
    const next = (parsed[field.key] ?? "").trim();
    if (!next) continue;
    const now = (current[field.key] ?? "").trim();
    if (now === next) continue;
    changes.push({
      key: field.key,
      label: field.label,
      half: field.half,
      current: now,
      next,
      overwrites: now !== "",
    });
  }
  return changes;
}

/**
 * Which changes to tick for the participant: the ones that fill a gap. Anything
 * that would replace their own words starts unticked, so nothing they wrote
 * disappears because they pressed Apply without reading.
 */
export function defaultSelection(changes: readonly ProposedChange[]): Set<AiUpdateKey> {
  return new Set(changes.filter((c) => !c.overwrites).map((c) => c.key));
}
