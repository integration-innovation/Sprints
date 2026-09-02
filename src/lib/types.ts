export type Programme = {
  id: number;
  name: string;
  tagline: string;
  core_principle: string;
  target_formula: string;
  join_code: string;
  admin_code: string;
  cadence_weeks: number;
  session_day: string;
  session_time: string;
  created_at: string;
};

export type Session = {
  id: number;
  programme_id: number;
  sprint_no: number;
  date: string;
  day: string;
  time: string;
  prompt: string;
  possible_targets: string;
  expected_outcome: string;
  facilitator_notes: string;
};

export type Participant = {
  id: number;
  programme_id: number;
  ref: string;
  name: string;
  role: string;
  organisation: string;
  preferred_tools: string;
  email: string;
  notes: string;
  is_facilitator: number;
  created_at: string;
};

export type Project = {
  id: number;
  programme_id: number;
  ref: string;
  name: string;
  owner_id: number | null;
  type: string;
  stage: string;
  primary_user: string;
  main_purpose: string;
  priority_1: string;
  priority_2: string;
  priority_3: string;
  tools: string;
  constraints: string;
  success_condition: string;
  project_test: string;
  demonstration: string;
  repo_link: string;
  notes: string;
  is_primary: number;
};

export type Entry = {
  id: number;
  programme_id: number;
  record_id: string;
  session_id: number;
  participant_id: number;
  project_id: number | null;
  stage_at_start: string;
  target: string;
  why_it_matters: string;
  definition_of_done: string;
  scope_limit: string;
  tools: string;
  starting_point: string;
  main_risk: string;
  fallback: string;
  ai_used_for: string;
  result: string;
  evidence: string;
  what_changed: string;
  next_possibility: string;
  status: string;
  minutes_delta: number | null;
  facilitator_notes: string;
  plan_submitted_at: string | null;
  result_submitted_at: string | null;
  updated_at: string;
};

export type EntryRow = Entry & {
  participant_name: string;
  participant_ref: string;
  project_name: string | null;
  sprint_no: number;
  date: string;
};

export type Target = {
  id: number;
  programme_id: number;
  ref: string;
  owner_id: number | null;
  project_id: number | null;
  too_large_idea: string;
  sprint_target: string;
  suggested_sprint: number | null;
  used_in_sprint: number | null;
  status: string;
  notes: string;
  created_at: string;
};

export type TargetRow = Target & {
  owner_name: string | null;
  project_name: string | null;
};

/** Statuses that count as a target having been set for the sprint. */
export const TARGET_SET_STATUSES = ["In progress", "Complete", "Partial", "Blocked", "Deferred"];

export const STATUS_TONE: Record<string, string> = {
  "Not started": "bg-slate-100 text-slate-600 ring-slate-200",
  "In progress": "bg-sky-50 text-sky-700 ring-sky-200",
  Complete: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Partial: "bg-amber-50 text-amber-700 ring-amber-200",
  Blocked: "bg-rose-50 text-rose-700 ring-rose-200",
  Deferred: "bg-violet-50 text-violet-700 ring-violet-200",
  Absent: "bg-slate-100 text-slate-500 ring-slate-200",
};
