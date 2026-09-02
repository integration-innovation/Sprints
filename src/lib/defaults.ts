/**
 * Defaults carried over from the "AI Build Sprints" workbook so a new
 * programme starts with the same run sheet, ground rules, session prompts
 * and dropdown lists.
 */

export const DEFAULT_CORE_PRINCIPLE =
  "Each hour must produce a meaningful outcome for the participant's own project. " +
  "Not measured: volume of AI content taught. Measured: what became possible during " +
  "the hour that was not possible beforehand.";

export const DEFAULT_TARGET_FORMULA =
  "[Verb] [specific feature, workflow or test] using [tool or approach] so that [observable result].";

export const RUN_SHEET = [
  { window: "0–5 min", phase: "Target", detail: "Confirm the intended outcome for the hour." },
  { window: "5–10 min", phase: "Share", detail: "Discuss the approach, AI method or blocker." },
  { window: "10–50 min", phase: "Build", detail: "Focused build." },
  { window: "50–55 min", phase: "Test", detail: "Verify that the result works against the definition of done." },
  { window: "55–60 min", phase: "Show and ship", detail: "Demonstrate the result; record what changed." },
];

export const GROUND_RULES = [
  { rule: "Own target", detail: "Each participant chooses the outcome that would make the hour worthwhile." },
  { rule: "Own build", detail: "No common tutorial or compulsory project." },
  { rule: "One-hour scope", detail: "Choose something small enough to complete or meaningfully advance." },
  {
    rule: "AI first",
    detail: "Use AI for research, coding, debugging, review and testing rather than solving everything manually.",
  },
  { rule: "Show, don't report", detail: "Whenever possible, demonstrate what changed." },
  {
    rule: "Blocked? Change approach",
    detail: "Reduce the scope, ask the group, try another AI approach or work on another useful target.",
  },
  {
    rule: "No homework dependency",
    detail: "Missing one sprint should not make the next sprint difficult to join.",
  },
];

export type SessionTemplate = {
  prompt: string;
  possible_targets: string;
  expected_outcome: string;
};

export const SESSION_TEMPLATES: SessionTemplate[] = [
  {
    prompt:
      "Choose one small, valuable problem in your current project. Define a result that can be completed or meaningfully advanced in ~40 minutes of building. Use AI for research, planning, building, debugging or testing. End with a visible improvement, working experiment or useful discovery.",
    possible_targets:
      "Start a prototype; fix a problem; build one feature; automate a repetitive task; deploy something; test an AI coding workflow",
    expected_outcome: "One visible improvement",
  },
  {
    prompt:
      "Review the current state of your project and select the next highest-value problem. It need not continue from Sprint 01. Define a small target, build it with the most appropriate tools and record what became possible by the end of the hour.",
    possible_targets:
      "Continue the previous project; change direction; replace an ineffective approach; test a new workflow; improve an existing feature; start a different project",
    expected_outcome: "One visible improvement",
  },
  {
    prompt:
      "Select one practical problem from your current project — AI, UI, data, geometry, BIM, IFC, automation, APIs, scripting, debugging, deployment or testing. Reduce it to one result that can be demonstrated within the session.",
    possible_targets:
      "AI; UI; data; geometry; BIM; IFC; automation; APIs; scripting; debugging; deployment; testing",
    expected_outcome: "One visible improvement",
  },
  {
    prompt:
      "Bring a real project requirement, workflow problem or user need. Avoid artificial exercises unless they are the fastest way to test an idea. Define one useful improvement, build it, test it and demonstrate the result.",
    possible_targets:
      "Solve a workflow bottleneck; test a user interaction; improve reliability; connect two tools; validate a technical assumption; turn a manual process into a repeatable workflow",
    expected_outcome: "One visible improvement",
  },
  {
    prompt:
      "Choose an advanced or experimental approach only if it helps solve a current project problem. Define the smallest useful test for the approach and demonstrate whether it works.",
    possible_targets: "AI agents; MCP; tool calling; automated checking; multi-step workflows; local AI; BIM automation",
    expected_outcome: "One visible improvement or clear technical finding",
  },
  {
    prompt:
      "Choose the most valuable remaining problem in your project — new feature, major bug fix, UX improvement, automation, test, deployment, integration, agentic workflow or something new. Build a demonstrable result and briefly review what changed across the six sessions.",
    possible_targets:
      "New feature; major bug fix; UX improvement; automation; testing; deployment; integration; agentic workflow; new experiment; final review or demonstration",
    expected_outcome: "One visible improvement and, where useful, a summary of progress",
  },
];

export const DEFAULT_LISTS: Record<string, string[]> = {
  status: ["Not started", "In progress", "Complete", "Partial", "Blocked", "Deferred", "Absent"],
  project_type: [
    "Application",
    "Workflow",
    "Research project",
    "Automation",
    "Model",
    "Service",
    "Experiment",
    "Plugin",
  ],
  stage: ["Idea", "Prototype", "Working system", "Production system", "Maintenance"],
  ai_use: [
    "Research",
    "Planning",
    "Coding",
    "Debugging",
    "Refactoring",
    "Testing",
    "Documentation",
    "Workflow design",
    "Tool calling",
    "Review",
  ],
  tool_category: [
    "AI assistant",
    "Coding environment",
    "Software",
    "API",
    "Dataset",
    "Workflow",
    "Testing",
    "Deployment",
    "Documentation",
  ],
};

/** Seed ideas for the Target Bank, showing the too-large → sprint-sized reduction. */
export const DEFAULT_TARGET_BANK = [
  {
    too_large_idea: "Build an AI BIM compliance checker.",
    sprint_target:
      "Configure AI to extract one required parameter from one IFC file so that the value appears in a table.",
  },
  {
    too_large_idea: "Create an AI architectural design platform.",
    sprint_target:
      "Enable push/pull to continue after the first extrusion without restarting so that a face can be pulled three times.",
  },
  {
    too_large_idea: "Build an MCP BIM agent.",
    sprint_target:
      "Expose one BIM command as an MCP tool and call it successfully once so that a model change appears in Blender.",
  },
];
