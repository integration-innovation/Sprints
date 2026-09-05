/**
 * The programme framework.
 *
 * Six hours, three months, one outcome each — but not one prescribed sequence.
 * Some participants will build six unrelated things. Some will build one thing
 * six times over. Some will work one practice concern all the way down. All three
 * are the programme working correctly, and GROUND_RULES already say so: own
 * target, own build, no compulsory project, and Sprint 02 need not continue
 * Sprint 01.
 *
 * So the structure is not a syllabus. It is three axes a participant chooses
 * from, and one spine that does not move:
 *
 *   WHAT   OUTCOME_TYPES — the kind of thing produced (7)
 *   WHERE  the six SPRINT_PLAYBOOKS — the practice concern it serves
 *   HOW    BUILD_MODES — building, co-building or rebuilding
 *
 *   SPINE  the run sheet, the target formula, the minute-25 cut, the
 *          participant's own definition of done, and the record.
 *
 * TRACKS are pre-made ways of spending six sprints across those axes, for people
 * who would rather start from a shape than a blank page. A track is a suggestion
 * the app makes and the participant overrides; nothing in the app requires one to
 * be followed, and changing track mid-programme costs nothing.
 *
 * The app runs this without a facilitator in the room, so everything a person
 * would otherwise be told out loud has to be written here.
 */

/* ------------------------------------------------------------------ WHAT */

export type OutcomeTypeId =
  | "task"
  | "plugin"
  | "asset"
  | "app"
  | "website"
  | "agent"
  | "integration";

export type OutcomeType = {
  id: OutcomeTypeId;
  name: string;
  /** What the participant walks away holding. One sentence, no jargon. */
  youWillHave: string;
  /** Who this suits, so someone can pick without reading all seven. */
  suits: string;
  /** Read before the clock starts. Three or four sentences. */
  briefing: string;
  /** Pasted into any assistant. {target} and {tool} are replaced. */
  firstInstruction: string;
  /** What must exist by minute 25, or the target is too big. */
  halfway: string;
  /** Checked at minute 50. Each answerable yes or no by looking. */
  doneChecks: string[];
  /** What goes on screen at minute 55. */
  evidence: string;
  /** The specific way this kind of build eats an hour. */
  timeTrap: string;
  /** Optional, never assumed, never required for the next sprint. */
  ownTime: string;
};

export const OUTCOME_TYPES: OutcomeType[] = [
  {
    id: "task",
    name: "Task-based solution",
    youWillHave: "One file you can run again next week that does a job you currently do by eye.",
    suits: "A first sprint, or any hour where you want certainty that something will work.",
    briefing:
      "You are not learning to program. You are describing a job you already do, precisely enough that a machine can repeat it. The precision is the architecture: an assistant told to check the drawings does nothing useful, and one told to list every row where the fire rating column is empty does exactly the right thing. Pick a job you have done more than three times.",
    firstInstruction:
      "I am an architect, not a programmer. I want to do this in the next 40 minutes:\n\n{target}\n\nBefore you write anything: generate the sample data yourself — it must be invented, not from a real project. Then write me one file I can run, and tell me the exact command to run it. Explain what it does in the language of my profession, not in programming terms. Do the simplest version that works before improving anything.",
    halfway: "The script runs without error on the sample data, even if the output is ugly and half the checks are missing.",
    doneChecks: [
      "I ran it myself and saw output.",
      "The output answers the question in my target, not a different one.",
      "I know the command to run it again.",
      "The data it used is invented.",
    ],
    evidence: "Run the command on screen and read the first three lines of output aloud.",
    timeTrap: "Widening the job mid-hour. The second check is a new target, not this one.",
    ownTime: "Point it at a second set of invented data. That is the test of whether you built a tool or a one-off.",
  },
  {
    id: "plugin",
    name: "Plugin or command",
    youWillHave: "One command that runs inside a tool you already have open.",
    suits: "Anyone whose last build is not getting used because it lives in the wrong place.",
    briefing:
      "A plugin is a script with a doorway. The script is the easy part; the doorway is twenty lines of registration the tool's own documentation describes. Build one command. Not two, not a panel of settings — one command, on a menu, that does one thing when clicked.",
    firstInstruction:
      "I am an architect, not a programmer. I use {tool}. In the next 40 minutes I want:\n\n{target}\n\nShow me the smallest possible plugin that registers ONE command and does nothing else, and tell me exactly where to put the file and how to load it. Get an empty command appearing on the menu first, and only then make it do the work — I want to see it appear before we make it useful.",
    halfway: "An empty command already appears in the tool's menu and pops up a message when clicked.",
    doneChecks: [
      "The command appears in the tool's own interface.",
      "Clicking it did something I could see.",
      "I know how to load it again after restarting the tool.",
      "Nothing from a live project was opened while testing.",
    ],
    evidence: "Open the tool, show the menu, click the command.",
    timeTrap: "Fighting the tool's installation path. If it is not on the menu by minute 25, that is the whole problem — change tool or change approach.",
    ownTime: "Give the command one option. That is the step from a command to a tool.",
  },
  {
    id: "asset",
    name: "Digital asset",
    youWillHave: "A register, schema or rule set in an open format, plus the check that proves it is complete.",
    suits: "Knowledge that currently lives in one person's head, or in a document nobody can query.",
    briefing:
      "Rules-as-data is the whole idea: the requirement lives in a spreadsheet or a JSON file, cited to its source and version, and the code only reads it. When the mapping file changes next quarter, someone edits a row instead of finding a programmer. Cite every rule to where it came from — a rule with no source is an opinion.",
    firstInstruction:
      "I am an architect, not a programmer. In the next 40 minutes I want:\n\n{target}\n\nPut the rules in an open format I can edit by hand — CSV, JSON or Markdown — with a column for the source and version each rule came from. Keep the checking code separate and as small as possible: it should read the rules, not contain them. Invent the data being checked. Show me the file first so I can correct a rule before you write any code.",
    halfway: "The rules file exists with real content in it, even if nothing reads it yet.",
    doneChecks: [
      "I can open the file and read it without help.",
      "Every rule names its source and version.",
      "Changing a rule in the file changes the result, without touching code.",
      "The material being checked is invented.",
    ],
    evidence: "Show the file, change one value, re-run, show the result change.",
    timeTrap: "Writing thirty rules. Five cited rules that run beat thirty that do not.",
    ownTime: "Add a sixth rule without help. If you can, it is genuinely reviewable by a colleague.",
  },
  {
    id: "app",
    name: "App — one screen",
    youWillHave: "A page that opens in a browser, with no server and no login, that does something useful.",
    suits: "Anything that needs to be used by someone who is not you.",
    briefing:
      "Local-first: it opens from a file, keeps its state in the browser, has no accounts and no backend. That constraint is what lets you finish in an hour and what keeps a practice's data off somebody else's server. One screen. If a second screen seems necessary, the target is too big — cut it.",
    firstInstruction:
      "I am an architect, not a programmer. In the next 40 minutes I want:\n\n{target}\n\nMake it a single HTML file that opens in a browser by double-clicking it. No server, no build step, no accounts, no installing anything. Get one ugly working screen before you make it look like anything. Use invented data. Tell me the file to open when it is ready.",
    halfway: "The page opens and shows the data, even unstyled and with the interaction not working yet.",
    doneChecks: [
      "It opens by double-clicking the file.",
      "The one job in my target actually works when I use it.",
      "Nothing breaks if I reload.",
      "No live project data is in it.",
    ],
    evidence: "Open the file, use the one interaction, show what changes.",
    timeTrap: "Styling before it works, and adding a second screen.",
    ownTime: "Give it to a colleague with no explanation and watch where they hesitate. That is your next target.",
  },
  {
    id: "website",
    name: "Website — published",
    youWillHave: "A live URL you can send to a colleague or a client.",
    suits: "Work that is finished but stuck on your machine, or anything you need to explain to others.",
    briefing:
      "Static and public: no server, no database, no login. Everything on the page is visible to anyone with the link, so it must contain only invented or already-public material — this is where the data rule matters most. One page with real content beats five pages of placeholder.",
    firstInstruction:
      "I am an architect, not a programmer. In the next 40 minutes I want:\n\n{target}\n\nEverything on this page will be public, so first tell me anything in what I have that must not be published, and replace it with invented equivalents. Then walk me through publishing it step by step — I have not done this before. Get a nearly empty page live first so we know publishing works, then put the real content on it.",
    halfway: "A page with one word on it is already live at a URL. Publishing first, content second.",
    doneChecks: [
      "The URL opens on a device I did not build it on.",
      "Everything on the page is invented or already public.",
      "The page says what it does not claim, where that matters.",
      "I know how to change it and republish.",
    ],
    evidence: "Open the URL on your phone in front of the group.",
    timeTrap: "Writing the content before proving you can publish at all.",
    ownTime: "Send the link to one colleague and ask what they thought it was for. Free user research.",
  },
  {
    id: "agent",
    name: "AI model or agent",
    youWillHave: "A configured assistant that does one job the same way every time.",
    suits: "A judgement-shaped job — classifying, drafting, reviewing — that a script cannot express.",
    briefing:
      "You are not training a model; you are constraining one. The work is in the instruction, the examples and the refusals: what it must do, what it must never decide, and what it should hand back to a person. A model that will not say I do not know is not finished. Where the output touches compliance, certification or entitlement, the boundary is not a nicety — write it into the instruction.",
    firstInstruction:
      "I am an architect, not a programmer. In the next 40 minutes I want:\n\n{target}\n\nWrite it as a reusable instruction I can save, not a one-off conversation. Include: what it does, what it must never decide on its own, and what it should hand back to a human. Give me three invented test cases including one it should refuse or escalate. Run all three and show me the results before we call it finished.",
    halfway: "The instruction exists and has been run once against one invented case.",
    doneChecks: [
      "It gave the same answer twice on the same input.",
      "It handled the case it was supposed to refuse or escalate.",
      "The instruction says where a human decides.",
      "The test cases are invented.",
    ],
    evidence: "Run the two easy cases and the hard one, in that order.",
    timeTrap: "Chasing a wrong answer with a longer prompt. Add an example instead of a paragraph.",
    ownTime: "Collect the real cases it got wrong over a fortnight. That list is worth more than the instruction.",
  },
  {
    id: "integration",
    name: "Integration",
    youWillHave: "Two things you already have, working together, with nothing copied by hand.",
    suits: "A later sprint, once you have pieces worth joining.",
    briefing:
      "The value is in the join. Find the smallest join that would prove it works — one record passing from one side to the other — and build only that. A join that carries one record correctly is finished; a join that carries all of them badly is not.",
    firstInstruction:
      "I am an architect, not a programmer. I have two pieces I will describe. In the next 40 minutes I want:\n\n{target}\n\nBefore building anything, tell me the smallest join that would prove this works, and start there. Keep using invented data. Tell me plainly if the two pieces cannot be joined in the time we have, and what the alternative is.",
    halfway: "One record has passed from one side to the other, even if the result is wrong.",
    doneChecks: [
      "It works without anything being copied by hand.",
      "I can run the whole thing from one starting point.",
      "I know which side fails first when it fails.",
      "Invented data throughout.",
    ],
    evidence: "Run it end to end from one command or one click.",
    timeTrap: "Rebuilding one of the two pieces because the join exposed a flaw. Note it; do not fix it today.",
    ownTime: "Break it deliberately and see whether the error message tells you which side failed.",
  },
];

export function outcomeType(id: OutcomeTypeId): OutcomeType {
  const found = OUTCOME_TYPES.find((type) => type.id === id);
  if (!found) throw new Error(`Unknown outcome type: ${id}`);
  return found;
}

/* -------------------------------------------------------------------- HOW */

export type BuildModeId = "build" | "cobuild" | "rebuild";

export type BuildMode = {
  id: BuildModeId;
  name: string;
  /** When this is the honest description of the hour. */
  whenItApplies: string;
  /** What changes about how the hour runs. */
  howTheHourChanges: string;
  /** The question to answer at minute 5, in addition to the target. */
  extraQuestion: string;
  /** What makes this mode fail, specifically. */
  failureMode: string;
};

export const BUILD_MODES: BuildMode[] = [
  {
    id: "build",
    name: "Build",
    whenItApplies: "Nothing like this exists yet — yours or anyone else's that you can reach.",
    howTheHourChanges:
      "Get an end-to-end path working before improving any part of it. Input to observable output, however crude, by minute 25.",
    extraQuestion: "What is the smallest version of this that would still be worth having?",
    failureMode: "Building the good version first. There is no good version at minute 60 of the first attempt.",
  },
  {
    id: "cobuild",
    name: "Co-build",
    whenItApplies:
      "You are building with someone — a colleague, another participant, or an AI agent doing the parts you cannot.",
    howTheHourChanges:
      "The interface between you is the target. Agree at minute 5 who owns which half and what passes between them, then build the two halves separately and join them at minute 40. Do not both edit the same thing.",
    extraQuestion: "What exactly passes between us, and in what shape?",
    failureMode:
      "Discovering at minute 45 that you assumed different shapes for the thing passing between you. Write it down at minute 5, in one line, and both look at it.",
  },
  {
    id: "rebuild",
    name: "Re-build",
    whenItApplies:
      "Something already does this — a manual process, a spreadsheet, an old script, or your own build from a previous sprint.",
    howTheHourChanges:
      "Start from what the existing thing gets right, not from a blank page. Capture its current behaviour as two or three examples first; those become the test that the new one is not worse.",
    extraQuestion: "What does the current way get right that I must not lose?",
    failureMode:
      "Replacing something that worked with something that is newer and worse, and only noticing in a fortnight. The examples you captured at minute 10 are the whole defence against this.",
  },
];

export function buildMode(id: BuildModeId): BuildMode {
  const found = BUILD_MODES.find((mode) => mode.id === id);
  if (!found) throw new Error(`Unknown build mode: ${id}`);
  return found;
}

/* ----------------------------------------------------------------- TRACKS */

export type TrackId = "ladder" | "product" | "portfolio" | "domain" | "open";

export type Track = {
  id: TrackId;
  name: string;
  /** The one-line pitch on the chooser. */
  pitch: string;
  /** Who should pick this, honestly — including who should not. */
  suits: string;
  /**
   * The suggested outcome type per sprint, or null where the participant
   * decides. Six entries, index 0 = Sprint 01.
   */
  shape: (OutcomeTypeId | null)[];
  /** How to choose each sprint's target within this track. */
  strategy: string;
  /** The risk this track carries that the others do not. */
  watchFor: string;
};

export const TRACKS: Track[] = [
  {
    id: "ladder",
    name: "The ladder",
    pitch: "Six rising rungs: a script, a command, a rule set, a screen, a published page, a join.",
    suits:
      "Anyone who has not built software before and wants each hour to be a little harder than the last. Not for someone with one specific thing they need to exist.",
    shape: ["task", "plugin", "asset", "app", "website", "integration"],
    strategy:
      "Each rung is chosen to make the next one easier, and each hour stands alone. Keep the same subject matter across all six if you can — the same register, the same rules, the same project — so that by Sprint 06 the pieces are joinable. If a rung does not suit your work, swap its outcome type and keep the position.",
    watchFor:
      "Treating it as a course to complete. The rung is a suggestion; the outcome is the point. A participant who spends all six sprints on one rung and ends with something real has done better than one who ticked six boxes.",
  },
  {
    id: "product",
    name: "One thing, six times",
    pitch: "One build, taken from a rough first version to something a colleague uses.",
    suits:
      "Anyone who arrives already knowing what they need. Not for someone still deciding — six sprints on the wrong thing is an expensive way to find out.",
    shape: [null, null, null, null, null, "integration"],
    strategy:
      "Sprint 01 makes the crudest version that does anything at all. Every sprint after it fixes the single thing that most stops someone else using it — which you find by giving it to someone, not by thinking about it. Choose the outcome type each sprint from what the thing now needs: a screen, a rule set, a published page.",
    watchFor:
      "Polishing. By Sprint 03 the honest question is whether anyone other than you has used it. If not, the next target is about them, not the build.",
  },
  {
    id: "portfolio",
    name: "Six different things",
    pitch: "Six unrelated outcomes, one per hour, chosen fresh each time.",
    suits:
      "Anyone finding out what is possible before committing, and anyone whose work does not have one big problem in it. Genuinely the right answer for many people.",
    shape: [null, null, null, null, null, null],
    strategy:
      "Choose each sprint on the morning of the sprint, from what is actually annoying you that week. Vary the outcome type deliberately: six scripts teaches you less than a script, a plugin, a rule set and a page. Keep a note of which hour felt best — that is the signal you came for.",
    watchFor:
      "Six half-things. Each hour must still end with something that runs, and the record still says Complete, Partial or Blocked. Breadth is not an excuse for not finishing.",
  },
  {
    id: "domain",
    name: "One practice concern, all the way down",
    pitch: "Six sprints inside one area — compliance, coordination, contract administration, handover.",
    suits:
      "Anyone who owns a part of the practice and wants to leave the programme with that part genuinely improved.",
    shape: ["asset", "task", "agent", "app", "website", "integration"],
    strategy:
      "Pick one of the six playbooks and stay in it. Start with the rules or the register — the knowledge — because everything else in that concern reads from it. Then automate a check against it, then put judgement where the rules cannot reach, then a screen, then publish the method, then join it up. The order matters here more than in any other track.",
    watchFor:
      "Drifting into real project data as the work gets more useful. The more valuable this becomes, the more tempting it is — the boundary in the playbook is not decoration.",
  },
  {
    id: "open",
    name: "No track",
    pitch: "Decide each sprint with no shape suggested at all.",
    suits: "Anyone who finds the other four constraining. The framework still applies; only the suggestions go away.",
    shape: [null, null, null, null, null, null],
    strategy:
      "The spine is unchanged: one target in the formula, the cut at minute 25, your own definition of done, the record at minute 55. You are choosing to supply the structure the other tracks supply for you.",
    watchFor:
      "The blank page at minute 0. If you have not decided what the hour is for by minute 5, take a starter target from any playbook and start — deciding is not building.",
  },
];

export function track(id: TrackId): Track {
  const found = TRACKS.find((t) => t.id === id);
  if (!found) throw new Error(`Unknown track: ${id}`);
  return found;
}

/** What the app suggests for a sprint, given a track. Null means the participant chooses. */
export function suggestedOutcome(trackId: TrackId, sprintNo: number): OutcomeType | null {
  const id = track(trackId).shape[sprintNo - 1] ?? null;
  return id ? outcomeType(id) : null;
}

/* ------------------------------------------------------------------ SPINE */

/**
 * What does not change, whichever track, type and mode were chosen. This is the
 * whole of the structure; everything above only decides what fills it.
 */
export const SPINE = [
  {
    window: "0–5 min",
    name: "Target",
    instruction:
      "Write one target in the formula: verb, specific thing, tool, observable result. Write your own definition of done in one sentence. Nothing else is asked of you.",
  },
  {
    window: "5–10 min",
    name: "Set up",
    instruction:
      "Check what you are about to use: anything from a live project is replaced with an invented equivalent before it reaches an assistant. Paste the first instruction. Start the clock.",
  },
  {
    window: "10–25 min",
    name: "Rough path",
    instruction:
      "Get from input to observable output however crudely. The halfway marker for your outcome type says what should exist by 25.",
  },
  {
    window: "25 min",
    name: "The cut",
    instruction:
      "The single most valuable minute in the hour. If it will not land by 50, cut now: one case instead of all cases, hard-coded instead of configurable, printed output instead of a screen. Put what you dropped in the target bank.",
  },
  {
    window: "25–50 min",
    name: "Build",
    instruction:
      "Make it work. Two failed attempts at the same approach is the signal to change approach, not to try harder.",
  },
  {
    window: "50–55 min",
    name: "Test",
    instruction:
      "Run it. Check it against your own words from minute 5, and against the done checks for your outcome type. Complete, Partial or Blocked — all three are real results.",
  },
  {
    window: "55–60 min",
    name: "Show and record",
    instruction:
      "Show the evidence. Record target, result and status, and one next possibility written as a target. That is the whole record.",
  },
] as const;

/** The instruction to paste, with the participant's own target and tool in it. */
export function firstInstruction(
  type: OutcomeType,
  target: string,
  tool = "the tool I use",
): string {
  return type.firstInstruction
    .replace("{target}", target.trim() || "(write your target first)")
    .replace("{tool}", tool.trim() || "the tool I use");
}

/**
 * Every sprint gets the same scaffolding, assembled from what the participant
 * chose. This is what the app shows on the day, with no facilitator present.
 */
export type SprintPlan = {
  sprintNo: number;
  type: OutcomeType;
  mode: BuildMode;
  trackNote: string;
};

export function planSprint(
  trackId: TrackId,
  sprintNo: number,
  chosenType: OutcomeTypeId | null,
  modeId: BuildModeId,
): SprintPlan | null {
  const suggested = suggestedOutcome(trackId, sprintNo);
  const type = chosenType ? outcomeType(chosenType) : suggested;
  if (!type) return null;
  return {
    sprintNo,
    type,
    mode: buildMode(modeId),
    trackNote: track(trackId).strategy,
  };
}
