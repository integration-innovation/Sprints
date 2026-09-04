/**
 * The first hour, written for someone who has never used GitHub or an AI agent
 * and does not need to become a programmer — an architect of forty years who
 * wants one useful thing working by the end of the hour.
 *
 * Content only: no framework, no storage, so either build can render it. The
 * rule for every line here is that it survives being read aloud, once, by
 * someone who is slightly annoyed at having to learn this.
 */

export type Term = {
  word: string;
  plain: string;
  /** The thing in practice it already resembles. */
  likeIt: string;
};

/** The vocabulary that otherwise stops a first session dead. */
export const TERMS: Term[] = [
  {
    word: "AI agent",
    plain:
      "An assistant you instruct in plain English that can also act: write a file, run a check, read an error and try again.",
    likeIt:
      "A very fast graduate who has read everything, works literally, never tires — and whose work you still check before it goes out.",
  },
  {
    word: "Prompt",
    plain:
      "What you type to the assistant. The clearer the instruction and the constraint, the better the work — exactly as with a person.",
    likeIt: "A design instruction: what, for whom, by when, and what not to touch.",
  },
  {
    word: "Repository (repo)",
    plain: "A project folder that keeps every past version of every file in it.",
    likeIt: "A drawing set where every revision is retained and nothing is ever lost.",
  },
  {
    word: "Commit",
    plain: "Saving a version, with a short note saying what changed.",
    likeIt: "Issuing a revision: the cloud, the note, the date.",
  },
  {
    word: "Pull request",
    plain: "Proposing a change and asking someone to review it before it joins the main set.",
    likeIt: "Sending a drawing for QP review before it is issued for construction.",
  },
  {
    word: "GitHub",
    plain: "Where those project folders live so other people can see the same revisions.",
    likeIt: "A common data environment, with the revision history built in.",
  },
];

export type Reading = {
  id: string;
  minutes: number;
  title: string;
  body: string[];
  /** A single line worth remembering when the rest is forgotten. */
  keep?: string;
};

/** Five minutes of reading before the clock starts. Nothing else is required. */
export const READINGS: Reading[] = [
  {
    id: "what",
    minutes: 2,
    title: "What this hour is",
    body: [
      "One hour. One small thing that did not work before, working by the end — on your own project, not an exercise set by someone else.",
      "You are not being taught software. You are using an assistant to move your own work forward, and learning the tools by using them on something you actually care about.",
      "Nothing carries over. If you miss a session, the next one still works. There is no homework.",
    ],
    keep: "Measured: what became possible in the hour that was not possible before.",
  },
  {
    id: "agent",
    minutes: 2,
    title: "What an AI agent actually does",
    body: [
      "You describe the outcome you want. It proposes, writes, runs and corrects — and shows you each step. You keep every decision that matters.",
      "It is confident when it is wrong, so the instruction that matters most is the constraint: what it must not change, and how you will know it worked.",
      "It has no authority. Nothing it produces is an approval, a certification or a compliance check. You already know what a QP signature is worth; it is not that.",
    ],
    keep: "Say what done looks like, and it can tell you whether it got there.",
  },
  {
    id: "safe",
    minutes: 1,
    title: "What is safe to put in",
    body: [
      "Invented or clearly de-identified information only: a fictional project code, an approximate area, a generic room name, a public requirement.",
      "Not client identity, site address, fees, appointment terms, live submission models, correspondence or anything a client would recognise as theirs.",
      "If you would not put it on a slide at a public talk, do not put it here.",
    ],
    keep: "Synthetic in, useful out. The method transfers; the data does not have to.",
  },
];

/** Two targets, one of which fits an hour. Answering it teaches the whole idea. */
export const SIZE_EXERCISE = {
  question: "Which of these two could actually be finished in forty minutes?",
  options: [
    {
      id: "big",
      text: "Build an AI compliance checker for our BIM models.",
      correct: false,
      response:
        "This is a year of work, and by 10:45 you would have nothing to show. It is a good direction — it is not a target.",
    },
    {
      id: "small",
      text: "Pull one required property out of one IFC file so the value appears in a table.",
      correct: true,
      response:
        "Yes. Small enough to finish, real enough to be worth having, and you can see whether it worked. That is the whole trick.",
    },
  ],
  moral:
    "Every large ambition has a one-hour version hiding inside it. The hour is spent on the small version; the ambition survives.",
};

/** The four questions that assemble one target sentence. */
export const TARGET_PARTS = [
  {
    key: "verb",
    label: "What will you do?",
    hint: "One verb: build, fix, check, extract, connect, test, automate.",
    placeholder: "Extract",
  },
  {
    key: "thing",
    label: "To what, exactly?",
    hint: "One specific thing. Not 'our models' — one file, one sheet, one step.",
    placeholder: "one required property from one IFC file",
  },
  {
    key: "tool",
    label: "Using what?",
    hint: "The assistant, a spreadsheet, a script — whatever you have to hand.",
    placeholder: "an AI assistant",
  },
  {
    key: "result",
    label: "How will you know it worked?",
    hint: "Something you could point at on the screen and show someone.",
    placeholder: "the value appears in a table I can read",
  },
] as const;

export type TargetParts = Record<(typeof TARGET_PARTS)[number]["key"], string>;

/** Assembles the workbook's target formula from the four answers. */
export function composeTarget(parts: Partial<TargetParts>): string {
  const verb = (parts.verb ?? "").trim();
  const thing = (parts.thing ?? "").trim();
  const tool = (parts.tool ?? "").trim();
  const result = (parts.result ?? "").trim();
  if (!verb && !thing && !tool && !result) return "";
  const head = [verb, thing].filter(Boolean).join(" ");
  const middle = tool ? ` using ${tool}` : "";
  const tail = result ? ` so that ${result}` : "";
  return `${head}${middle}${tail}`.replace(/\s+/g, " ").trim();
}

export type PromptCard = {
  id: string;
  when: string;
  title: string;
  /** {target} is replaced with the participant's own target. */
  body: string;
};

/** The first instruction, and the three that unstick a session. */
export const PROMPT_CARDS: PromptCard[] = [
  {
    id: "first",
    when: "To begin",
    title: "The first instruction",
    body:
      "I am an architect, not a programmer. Here is what I want by the end of the hour:\n\n{target}\n\n" +
      "Constraints: use only invented or de-identified data; change as little as possible; explain each step in plain English before you do it.\n\n" +
      "Before you start, ask me up to three questions if anything is unclear. Then do the first step only, and show me the result.",
  },
  {
    id: "wrong",
    when: "It did something you did not ask for",
    title: "Point at what you can see",
    body:
      "That is not what I asked for. What I see on my screen is: [describe exactly what you see].\n\n" +
      "What I wanted is: [one sentence].\n\nMake one change to fix that, and nothing else.",
  },
  {
    id: "big",
    when: "It is turning into a project",
    title: "Cut it down",
    body:
      "Stop. This is too large for the time I have. Reduce it to the smallest version that still shows the result — one file, one case, one check — and do that first.",
  },
  {
    id: "broken",
    when: "Something errored",
    title: "Hand over the error, whole",
    body:
      "This is the error, exactly as it appeared:\n\n[paste it all — every line, even the ugly parts]\n\n" +
      "What is the most likely cause, and what is the smallest change that would test it?",
  },
];

export type StepKind = "read" | "size" | "target" | "prompt" | "build" | "test" | "record" | "done";

export type GuideStep = {
  id: StepKind;
  /** Where the hour should be — guidance, never a deadline. */
  window: string;
  minutes: number;
  title: string;
  lead: string;
  /** Shown under the heading, before whatever the step asks for. */
  notes?: string[];
};

export const GUIDE_STEPS: GuideStep[] = [
  {
    id: "read",
    window: "Before the clock",
    minutes: 5,
    title: "Read this first",
    lead: "Five minutes, once. You will not need it again.",
  },
  {
    id: "size",
    window: "Before the clock",
    minutes: 2,
    title: "How big is an hour?",
    lead: "One question. Getting this right is most of what makes the hour work.",
  },
  {
    id: "target",
    window: "0–10 min",
    minutes: 10,
    title: "Write your target",
    lead: "Four short answers become one sentence. That sentence is the whole plan.",
    notes: [
      "Pick something from your own current work — something mildly annoying that you have put up with for months is ideal.",
    ],
  },
  {
    id: "prompt",
    window: "10–15 min",
    minutes: 5,
    title: "Give the first instruction",
    lead: "Copy the card, paste it into the assistant, and read what it asks you.",
    notes: [
      "Answer its questions in ordinary sentences. You are briefing, not programming.",
    ],
  },
  {
    id: "build",
    window: "15–50 min",
    minutes: 35,
    title: "Build it",
    lead: "Work in small steps and look at the screen after each one.",
    notes: [
      "Every ten minutes, ask yourself one question: can I see it working yet? If not, make the next step smaller.",
      "Being stuck is normal and is not a failure of yours. The cards below are what to say when it happens.",
    ],
  },
  {
    id: "test",
    window: "50–55 min",
    minutes: 5,
    title: "Check it against your own words",
    lead: "You wrote how you would know it worked. Look at the screen and answer honestly.",
  },
  {
    id: "record",
    window: "55–60 min",
    minutes: 5,
    title: "Record what now works",
    lead: "One sentence, one tap. This is the whole of the paperwork.",
    notes: [
      "Partial and blocked are useful answers. A sprint that failed for a clear reason is worth more than one that is quietly left blank.",
    ],
  },
  {
    id: "done",
    window: "After",
    minutes: 0,
    title: "What you have now",
    lead: "",
  },
];

/** What to do when the target is met early, or the hour ends without it. */
export const CLOSING_NOTES = [
  {
    title: "If it worked",
    body: "Write the next sprint-sized step into 'next possibility' while it is still obvious. Next session opens with it offered as your target — one tap and you carry on.",
  },
  {
    title: "If it did not",
    body: "Record what you learned as the result and mark it Partial or Blocked. Knowing that an approach does not work is a real outcome, and the next hour starts better informed.",
  },
  {
    title: "If you finished early",
    body: "Do not start something large. Test it once more the way someone else would, then write down what surprised you.",
  },
];
