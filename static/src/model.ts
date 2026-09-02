/**
 * Data model for the browser-local build. Everything lives in one JSON blob per
 * programme in localStorage, so ids must be unique across devices: two people
 * filling in the same programme on their own laptops have to be mergeable.
 */

export type SSession = {
  sprintNo: number;
  date: string;
  day: string;
  time: string;
  prompt: string;
  possibleTargets: string;
  expectedOutcome: string;
  facilitatorNotes: string;
};

export type SParticipant = {
  id: string;
  name: string;
  role: string;
  organisation: string;
  preferredTools: string;
  email: string;
  notes: string;
  isFacilitator: boolean;
};

export type SProject = {
  id: string;
  ownerId: string;
  name: string;
  type: string;
  stage: string;
  primaryUser: string;
  mainPurpose: string;
  priority1: string;
  priority2: string;
  priority3: string;
  tools: string;
  constraints: string;
  successCondition: string;
  projectTest: string;
  demonstration: string;
  repoLink: string;
  notes: string;
  isPrimary: boolean;
};

export type SEntry = {
  id: string;
  sprintNo: number;
  participantId: string;
  projectId: string | null;
  stageAtStart: string;
  target: string;
  whyItMatters: string;
  definitionOfDone: string;
  scopeLimit: string;
  tools: string;
  startingPoint: string;
  mainRisk: string;
  fallback: string;
  aiUsedFor: string;
  result: string;
  evidence: string;
  whatChanged: string;
  nextPossibility: string;
  status: string;
  minutesDelta: number | null;
  facilitatorNotes: string;
  updatedAt: string;
};

export type STarget = {
  id: string;
  ownerId: string | null;
  projectId: string | null;
  tooLargeIdea: string;
  sprintTarget: string;
  suggestedSprint: number | null;
  usedInSprint: number | null;
  status: string;
  notes: string;
};

export type SProgramme = {
  id: string;
  name: string;
  tagline: string;
  corePrinciple: string;
  targetFormula: string;
  cadenceWeeks: number;
  sessionTime: string;
  createdAt: string;
  sessions: SSession[];
  participants: SParticipant[];
  projects: SProject[];
  entries: SEntry[];
  targets: STarget[];
  lists: Record<string, string[]>;
};

/** What a participant hands to the facilitator: their rows, not the whole programme. */
export type ShareBundle = {
  kind: "structured-sprints/participant";
  version: 1;
  programmeId: string;
  programmeName: string;
  exportedAt: string;
  participants: SParticipant[];
  projects: SProject[];
  entries: SEntry[];
  targets: STarget[];
};

export const STATUS_TONE: Record<string, string> = {
  "Not started": "bg-slate-100 text-slate-600 ring-slate-200",
  "In progress": "bg-sky-50 text-sky-700 ring-sky-200",
  Complete: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Partial: "bg-amber-50 text-amber-700 ring-amber-200",
  Blocked: "bg-rose-50 text-rose-700 ring-rose-200",
  Deferred: "bg-violet-50 text-violet-700 ring-violet-200",
  Absent: "bg-slate-100 text-slate-500 ring-slate-200",
};

export function entryKey(sprintNo: number, participantId: string): string {
  return `${sprintNo}:${participantId}`;
}
