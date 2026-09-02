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
    schema.sql   db.ts          storage
    defaults.ts                 session prompts, run sheet, ground rules, lists
    programme.ts                creating programmes, participants, sprint-log rows
    queries.ts                  reads, including the derived dashboard
    actions.ts                  server actions (all writes)
    session.ts                  signed participant cookie
scripts/seed.ts                 the worked example from the workbook
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
