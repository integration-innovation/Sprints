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

## How people take part

1. A facilitator creates a programme on the landing page, choosing the first session date,
   how many sprints and the cadence. Sessions, prompts and dropdown lists are pre-filled.
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
date logic in `src/lib/defaults.ts` and `src/lib/dates.ts`:

| | Server build | Static build (GitHub Pages) |
| --- | --- | --- |
| Where data lives | SQLite on the server | Each person's browser, or a Google Sheet |
| Shared board | Yes, live for everyone with the join code | With a sheet: yes. Without: assembled by exchanging files |
| Needs a host | Yes, anything that runs Node | No — plain static files |
| Run it | `npm run dev` | `npm run build:static` |

The static build is what deploys to GitHub Pages. It is the same eight tabs and the same
Sprint Log columns; only the storage and the way people come together differ.

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
    programme.ts                creating programmes, participants, sprint-log rows
    queries.ts                  reads, including the derived dashboard
    actions.ts                  server actions (all writes)
    session.ts                  signed participant cookie
static/                         the browser-local build served by GitHub Pages
  index.html  styles.css
  src/
    store.ts                    localStorage, sharing and merging
    model.ts  derive.ts  csv.ts
    remote.ts                   the Google Sheets client
    app.tsx   router.tsx        hash routing, so it works at any base path
    pages/                      the same eight tabs
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
