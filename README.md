# Structured Sprints

A small web app for running **bi-weekly build sprints**: every participant sets one
sprint-sized target before the hour starts, builds it, and records what became possible by
the end. It replaces the spreadsheet that usually holds this — the sprint log, the target
bank, the roster and the dashboard — with something a group can fill in together, live.

Modelled on the *AI Build Sprints* workbook, so the sheets map straight across:

| Workbook sheet | In the app |
| --- | --- |
| Overview | Programme overview — run sheet, ground rules, core principle |
| Sessions | Sprints tab, one page per sprint (facilitators can edit dates and prompts) |
| Participants | People tab |
| Projects | Projects tab |
| Sprint Log | My sprint (fill it in) and Sprint log (read the whole grid, export CSV) |
| Target Bank | Target bank — park a too-large idea with its sprint-sized version, pull it into a sprint |
| Dashboard | Dashboard — derived from the log, nothing entered by hand |
| Lists | Dropdown sources, seeded per programme |

## The shape of an hour

The forms follow the 60-minute run sheet. **Plan** (0–10 min) captures the target, why it
matters, an observable definition of done, the scope limit, tools, starting point, main risk,
fallback and what AI was used for. **Result** (50–60 min) captures what now works, the
evidence, what changed, the next possibility, a status and minutes over or under.

Every target is written to one formula:

> [Verb] [specific feature, workflow or test] using [tool or approach] so that [observable result].

### Three fields, not seventeen

The workbook has seventeen columns a participant fills in each sprint, and asking for all of
them in a ten-minute window is what makes a sprint log go blank by session three. The forms
ask for the three the dashboard actually reads — **target**, **result**, **status** — and fold
the other fourteen into an optional *Add detail* panel whose summary says how many are filled,
so nobody has to open it to check. Nothing is dropped: every field stays writable, stays in the
CSV and stays in the sheet.

Three things remove the rest of the typing:

- **Last sprint answers this one.** A blank row opens with the project, stage, tools and AI use
  carried from the participant's previous sprint, and with last sprint's result as this
  sprint's starting point. A row they have already touched is never overwritten.
- **The target is offered, never written.** Last sprint's *next possibility* and any unused
  target from the bank sit above the target field as one-tap starts — the one field the hour
  exists to decide is always theirs to type.
- **Status is a tap.** Complete, Partial and Blocked are buttons; the rest of the list stays a
  step behind them.
- **The AI that did the work fills the log.** One prompt out, one paste back, instead of
  copying seventeen answers across by hand.

### One paste out, one paste back

The answers to most of those seventeen fields already exist — in the AI conversation the
participant has just finished. *Fill this in from your AI chat* closes that loop in two copies:

1. **Copy the prompt.** It is built from the sprint being filled in — its number, date, session
   prompt and the target already on the row — and carries the programme's own status, stage and
   AI-use lists, so the reply comes back in words the log can store.
2. **Paste it into whatever platform they worked in**, at the end of the hour.
3. **Paste the reply back.** Every change is listed before anything moves.

Two things in the prompt are load-bearing. It tells the model that an empty field is a correct
answer, because the alternative is a log full of plausible sentences nobody earned. And it asks
for JSON, because a shape the parser can reject beats prose it has to guess at.

Nothing is trusted on the way back in. A status or stage outside the programme's list is
refused rather than written in, an AI use that is not on the list is dropped, minutes that are
not a whole number are skipped — and each of those says so rather than going quietly. Fields
the reply left empty are not changes. What remains is shown as a tick list: changes that fill
an empty field start ticked, and anything that would **replace what the participant wrote**
starts unticked and is marked, because an AI's account of an hour is a draft of the record, not
the record.

The prompt-building and reply-parsing live in `src/lib/ai-update.ts` and the panel in
`src/components/ai-update-panel.tsx`, both shared by the two builds. In the static build
applying saves straight away; in the server build it fills the fields in place and the
participant still presses Save, so the log only changes on a deliberate save. This panel is the
one part of the server build that needs JavaScript — without it the forms behave exactly as
before.

In the static build nothing needs saving: edits commit a beat after typing stops, on blur, when
the tab is hidden and when the sprint changes, with a *Saved 10:41* line next to the status. The
server build keeps its two Save buttons, since it renders without JavaScript.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

Optionally load the worked example from the source workbook — six sessions, four
participants, one project, a stocked target bank and the Sprint 01 example. It prints the
join code:

```bash
npm run seed
```

For production:

```bash
npm run build
npm start
```

To build the browser-local version that GitHub Pages serves:

```bash
npm run build:static     # writes dist-static/
npm run preview:static   # build, then serve it locally
```

## The first hour

Someone joining their first session has never used GitHub, has never instructed an AI agent, and
is being asked to do both in an hour, on their own project, in front of colleagues. The **First
hour** tab is written for exactly that person — an architect of forty years who does not need to
become a programmer.

It is eight screens, one at a time, with the hour's clock beside them:

1. **Read this first** — five minutes: what the hour is, what an AI agent actually does and does
   not have authority to do, and what is safe to type into one. Then the six words that otherwise
   stop a first session dead — agent, prompt, repo, commit, pull request, GitHub — each with the
   thing in practice it already resembles. A pull request is a drawing sent for QP review; a
   commit is a revision issued with a note.
2. **How big is an hour?** — one question with two answers, because target size is most of what
   makes an hour work.
3. **Write your target** — four plain questions ("What will you do?", "To what, exactly?") that
   assemble into the target formula and save straight to the sprint row. The clock starts here.
4. **Give the first instruction** — a filled-in prompt, with their own target already in it, ready
   to copy into whichever assistant they use.
5. **Build it** — their target in front of them, and three copyable cards for when it goes wrong:
   it did the wrong thing, it is turning into a project, something errored.
6. **Check it against your own words** — their own definition of done, and three buttons.
7. **Record what now works** — one sentence, one optional link, one obvious next step.
8. **What you have now** — what they set out to do and what they ended with, side by side.

Everything it writes goes into the ordinary sprint row: there is no separate beginner's copy of
the data, and nobody has to be moved off the guide later. The server build carries the same
material as one page to read through (`/p/<code>/guide`), since it renders without JavaScript.

Two smaller things help the same person. The nav is three tabs — First hour, My sprint, Sprints —
with the other six behind **More**, rather than nine across the top. And **AA** in the header
switches the whole interface to larger type, remembered per device.

## How people take part

1. A facilitator creates a programme on the landing page, choosing the first session date,
   how many sprints and the cadence. Sessions, prompts and dropdown lists are pre-filled.
   The cadence is set in weeks or in days — bi-weekly is the default and what the programme
   is designed around; a shorter rhythm is there for anyone running it that way.
2. The app returns a six-character **join code**, shown in the header on every page.
3. Participants open `/join?code=XXXXXX`, enter their name, and get a sprint log row for
   every session in the programme. Returning participants pick their name from the roster.

There are no passwords. Identity is a signed, http-only cookie holding the participant id —
enough to own your own rows in a trusted group, and deliberately low-friction. Anyone with
the join code can join, so treat the code as the access boundary. Set a real secret in
production:

```bash
cp .env.example .env.local   # then set SPRINTS_SESSION_SECRET
```

Participants may edit their own entries; facilitators may also edit sessions and leave
facilitator notes on any row.

## Two builds, one codebase

The repository ships the app twice, sharing the session prompts, run sheet, ground rules and
date logic in `src/lib/defaults.ts` and `src/lib/dates.ts`, and the submission policy in
`src/lib/submission.ts` — so both builds ask a participant for the same three things:

| | Server build | Static build (GitHub Pages) |
| --- | --- | --- |
| Where data lives | SQLite on the server | Each person's browser, or a Google Sheet |
| Shared board | Yes, live for everyone with the join code | With a sheet: yes. Without: assembled by exchanging files |
| Needs a host | Yes, anything that runs Node | No — plain static files |
| Run it | `npm run dev` | `npm run build:static` |

The static build is what deploys to GitHub Pages. It is the same tabs and the same Sprint Log
columns; only the storage, the way people come together, and the shape of the first-hour guide
differ.

### Sharing through a Google Sheet

The static build can point at a Google Sheet, which then holds the programme and makes the
board live on every device — the closest thing to the server build without a server. The
facilitator pastes [`apps-script/Code.gs`](./apps-script/Code.gs) into the sheet's Apps
Script editor, deploys it as a web app, and connects it under **People → Connect sheet**;
[`apps-script/SETUP.md`](./apps-script/SETUP.md) walks through it.

After that, participants need only the setup link. Their entries write straight to the sheet,
the app polls every 20 seconds so the board updates during a session, and the facilitator ends
up with a spreadsheet whose tabs match the original workbook — `Sessions`, `Participants`,
`Projects`, `Sprint Log`, `Target Bank`, `Lists`.

Two things to be clear about. The web app must be readable by "anyone with the link" for
browsers to reach it, so the URL is the access boundary and the optional access key only stops
a bare URL being useful — it is not authentication, so keep the link private. And Google's
script quotas are sized for a small team, not a public app.

### Putting the log in a sheet without connecting one

**Sprint log → Copy for a Google Sheet** gives the whole log as tab-separated rows. Copy, open a
sheet, paste into A1, and the columns land in place — no script, no deployment, and it works from a
phone, where downloading a CSV and importing it does not.

It is a snapshot rather than a link: nothing updates it afterwards, and other participants do not
write into it. Connecting a sheet is what makes it live. Line breaks inside an answer become " · ",
because a spreadsheet paste splits rows on newlines and CSV quoting is ignored on the clipboard —
the loss is stated on the page rather than left to be discovered.

### The use case frame, and a private archive

A published use case is prose. **Use case archive** is the same material as a table — one row per
case, `what`, `why`, `how` and who wrote it, with the consent that permits the row sitting in the
row. That table is the thing to share: **Copy for a Google Sheet** pastes it at cell A1, or
download it as CSV for `pd.read_csv` and Excel. Neither needs an account, a script or a login.

Three decisions are worth knowing about.

**Where it goes is part of what is agreed to.** Publishing offers two destinations, and they carry
different sentences. *The programme's private archive* is a private repository: readable by the
people the facilitator gives access to, and withdrawable, because it was never public. *A public
page* is the door that only opens outwards. An author who agreed to the first has not agreed to the
second, so `destination` travels in every row and a push is refused outright if the repository
turns out to be public. Private is the default.

**Anonymous is structural.** An anonymous row holds no name, no participant id, and no key derived
from one — `case_id` comes from a random draw or from the case's own text. There is nothing in the
table to join back to a person, which matters more than it sounds: with seven people in a
programme, any stable per-person key is a name however it is hashed.

**Withdrawal empties the row and keeps the id**, so the id can never be reissued, and the next push
carries the withdrawal rather than quietly leaving the old text in place.

The archive is five files, rewritten as a set on every push: `cases.jsonl` is the record and the
only file read back in; `cases.csv` and `cases.tsv` are regenerated views; `README.md` is the
column reference; and `NOTICE.md` is generated from the rows themselves, so it can never claim the
archive is all private while a public row sits below it. It covers consent, attribution, who owns
the words, the trade marks named in them, personal data and how to withdraw — a careful default
that says plainly it has not been near a lawyer.

### Pushing it to a private repository

**Use case archive → Push to a private GitHub repository**, facilitator-side and once per device.
Make a private repository, mint a fine-grained token scoped to *only that repository* with
`Contents: Read and write` and an expiry, and paste both. After that every push is one tap.

The token is the honest cost, and it is treated like the sheet's write key: kept in this browser
only, stripped from backups, stripped from setup links, and gone the moment you disconnect. This is
why participants do not get one — a token that can rewrite the whole archive is a bad trade for a
fortnightly import. They publish on their own device, hand over the JSON file, and the facilitator
takes it in from the same page.

If you would rather no token existed at all, do it on your own machine instead:

```bash
npm run archive -- ./submissions ../my-private-repo/use-cases \
  --programme "Sprints 2026" --custodian "Your team" --contact "you@example.com"
```

Same five files, same merge rules, no credential anywhere — then commit and push yourself. Ids
there are derived from each case's own text, so running it twice updates rows instead of
duplicating them.

### Backing up a programme

**People → Back up this programme** writes the whole thing to one file: sprints, people, projects,
every row, targets and the dropdown lists. **Restore from a backup** reads it back, after saying
what it holds and asking first, because restoring replaces what the browser has.

This is a different thing from the participant share bundle above. A share bundle carries one
person's rows, which is right for handing work to a facilitator and useless for recovery — it has
no sessions, no cadence and no lists, so nothing can rebuild a programme from it.

Two decisions worth knowing:

- **The sheet connection is left out of the file.** It holds a key that can write to the sheet, and
  a backup gets emailed, committed and copied around; a file that restores your data should not also
  hand over the ability to overwrite it. Restoring keeps whatever connection the browser already had,
  so a restore in place does not disconnect anything.
- **A backup that cannot be vouched for is refused, with the reason.** Wrong file type, wrong
  version, no programme id, or a missing section — each is named rather than half-applied. A share
  bundle offered here is refused and pointed at the tab where it does belong.

A backup holds every participant's rows, names included. It is a recovery file, not something to
publish: committing one to a public repository makes all of it public.

### Publishing a use case

The sprint log is the programme's working record and stays in the programme's Google Sheet. A
**use case** is the part worth showing strangers — what someone set out to do, why it mattered,
how they did it, what came of it, and who did it — and it is published only when the person who did
the work chooses to publish it. Sharing outcomes publicly is optional; running a programme never requires it.

Under **Publish a use case**, a participant picks which of their sprints to share, edits the draft,
reads the disclaimer and ticks a consent statement. That produces JSON and Markdown to send to the
facilitator or paste into a GitHub issue. Published cases appear at `#/use-cases`, read from
`static/use-cases.json`, which is edited by hand from submissions.

Three things make the consent real rather than decorative:

- **Subtraction, not redaction.** `draftUseCase` builds the public account by naming what goes in,
  so email, organisation, project name, evidence links, facilitator notes, timings and the join code
  are structurally incapable of travelling. The page lists what is held back, and why. The author
  credit is the one personal field that can travel, because a use case is somebody's work — and it
  is a choice: **Credit me**, with the name written however the author wants it, or **Publish
  anonymously**, where no name is attached and none is recorded.
- **Consent is an act, not a stored flag.** It is given at the moment of publishing, with the
  disclaimer on the same screen, and stamped into the artefact with its version. Editing a draft —
  or changing the attribution — clears the tick, because agreement was to the words that were read.
  The consent sentence follows the choice: someone publishing anonymously agrees to publish "with no
  name attached to it", never to a credit they did not want.
- **The author has the last word.** No rule can tell that a sentence names a client, so the draft is
  editable and a blunt scan flags emails, links and long numbers — including in the role field,
  which is published too. It does not detect names and does not claim to.

### How a group uses the static build without a sheet

With no sheet connected, nothing is uploaded and the shared board is assembled deliberately:

1. **The facilitator sends the setup link** (People tab → *Copy setup link*). It carries the
   sessions, prompts and target bank, so everyone starts from an identical programme — and
   from the same programme id, which is what makes merging work.
2. **Each participant fills in their own rows** during the hour, then exports a JSON file of
   just their rows (People tab → *Export my rows*).
3. **The facilitator imports those files** to build the combined dashboard and sprint log.
   Re-importing is safe: rows are matched by id and the newer `updatedAt` wins, so an older
   file cannot overwrite newer work.

Two consequences worth knowing before you rely on this mode: participants do not see each
other's targets live, and clearing browser data — or switching device or browser — loses that
person's entries. Export after each session and keep the files. Connecting a sheet removes
both problems.

### Installing it as an app

The static build is a PWA: a web manifest, maskable icons and a service worker that precaches
the app shell. On a real address it installs to the home screen, opens full-screen and works
with no connection — entries are saved locally and pushed to the sheet next time it can reach
one. Requests to the Apps Script backend are never cached, so the board is never quietly
stale; only the shell is.

### Deploying

`.github/workflows/pages.yml` builds `dist-static/` and publishes it. Enable it once, in
**Settings → Pages → Build and deployment → Source: GitHub Actions**; every later push to the
default branch redeploys. Assets are referenced relatively and routing is hash-based, so the
build works at whatever base path Pages serves it from, with no configuration.

## Stack

Next.js 15 (App Router, server actions), React 19, TypeScript, Tailwind CSS v4 and SQLite via
`better-sqlite3`. The database is a single file at `data/sprints.db`
(override with `SPRINTS_DB_PATH`); the schema in `src/lib/schema.sql` is applied on first
connection, so there is no migration step.

```
src/
  app/
    page.tsx                    landing: join or create a programme
    join/                       join by code
    p/[code]/                   programme: overview, me, board, sprint/[n],
                                targets, projects, participants, dashboard, log
  lib/
    schema.sql   db.ts          storage (server build)
    defaults.ts                 session prompts, run sheet, ground rules, lists
    submission.ts               what a sprint asks for, and what carries forward
    guide.ts                    the first hour: readings, words, exercises, prompts
    programme.ts                creating programmes, participants, sprint-log rows
    queries.ts                  reads, including the derived dashboard
    actions.ts                  server actions (all writes)
    session.ts                  signed participant cookie
static/                         the browser-local build served by GitHub Pages
  index.html  styles.css
  src/
    store.ts                    localStorage, sharing and merging
    autosave.ts                 debounced drafts, so nothing needs a Save button
    guide-state.ts              which step of the first hour, and when it started
    model.ts  derive.ts  csv.ts
    remote.ts                   the Google Sheets client
    app.tsx   router.tsx        hash routing, so it works at any base path
    pages/                      the same tabs, plus the guided first hour
apps-script/
  Code.gs                       the Google Sheets backend
  SETUP.md                      how to deploy and connect it
scripts/
  seed.ts                       the worked example from the workbook
  build-static.mjs              esbuild + Tailwind CLI -> dist-static/
```

## Notes

- Sprint log rows are materialised for every participant × session, the same pre-seeded grid
  the workbook uses, so the dashboard can count who has and hasn't set a target.
- "Targets set" counts rows whose target field is filled in; the completion rate is
  complete ÷ targets set, matching the workbook's formula.
- A programme with more sprints than the six template prompts cycles through them; edit any
  session's prompt from its sprint page.
- `Download CSV` on the Sprint log tab exports the grid, column for column, with a UTF-8 BOM
  so Excel opens it cleanly.
