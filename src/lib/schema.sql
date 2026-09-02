-- Structured Sprints — schema.
-- Mirrors the "AI Build Sprints" workbook: Sessions, Participants, Projects,
-- Sprint Log, Target Bank and Lists. The Dashboard is derived, not stored.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS programmes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  tagline       TEXT NOT NULL DEFAULT '',
  core_principle TEXT NOT NULL DEFAULT '',
  target_formula TEXT NOT NULL DEFAULT '',
  join_code     TEXT NOT NULL UNIQUE,
  admin_code    TEXT NOT NULL,
  cadence_weeks INTEGER NOT NULL DEFAULT 2,
  session_day   TEXT NOT NULL DEFAULT 'Monday',
  session_time  TEXT NOT NULL DEFAULT '12:30-13:30',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sessions sheet: one row per sprint.
CREATE TABLE IF NOT EXISTS sessions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  programme_id      INTEGER NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
  sprint_no         INTEGER NOT NULL,
  date              TEXT NOT NULL,               -- ISO yyyy-mm-dd
  day               TEXT NOT NULL DEFAULT '',
  time              TEXT NOT NULL DEFAULT '',
  prompt            TEXT NOT NULL DEFAULT '',
  possible_targets  TEXT NOT NULL DEFAULT '',    -- semicolon separated
  expected_outcome  TEXT NOT NULL DEFAULT '',
  facilitator_notes TEXT NOT NULL DEFAULT '',
  UNIQUE (programme_id, sprint_no)
);

-- Participants sheet.
CREATE TABLE IF NOT EXISTS participants (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  programme_id    INTEGER NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
  ref             TEXT NOT NULL,                 -- P1, P2, ...
  name            TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT '',
  organisation    TEXT NOT NULL DEFAULT '',
  preferred_tools TEXT NOT NULL DEFAULT '',
  email           TEXT NOT NULL DEFAULT '',
  notes           TEXT NOT NULL DEFAULT '',
  is_facilitator  INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (programme_id, ref)
);

-- Projects sheet. A participant may own several.
CREATE TABLE IF NOT EXISTS projects (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  programme_id      INTEGER NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
  ref               TEXT NOT NULL,               -- PRJ-01, ...
  name              TEXT NOT NULL,
  owner_id          INTEGER REFERENCES participants(id) ON DELETE SET NULL,
  type              TEXT NOT NULL DEFAULT '',
  stage             TEXT NOT NULL DEFAULT '',
  primary_user      TEXT NOT NULL DEFAULT '',
  main_purpose      TEXT NOT NULL DEFAULT '',
  priority_1        TEXT NOT NULL DEFAULT '',
  priority_2        TEXT NOT NULL DEFAULT '',
  priority_3        TEXT NOT NULL DEFAULT '',
  tools             TEXT NOT NULL DEFAULT '',
  constraints       TEXT NOT NULL DEFAULT '',
  success_condition TEXT NOT NULL DEFAULT '',
  project_test      TEXT NOT NULL DEFAULT '',
  demonstration     TEXT NOT NULL DEFAULT '',
  repo_link         TEXT NOT NULL DEFAULT '',
  notes             TEXT NOT NULL DEFAULT '',
  is_primary        INTEGER NOT NULL DEFAULT 0,
  UNIQUE (programme_id, ref)
);

-- Sprint Log sheet: one row per participant per sprint.
-- Plan columns (G-O) are filled in the first 10 minutes,
-- result columns (P-T) in the last 10.
CREATE TABLE IF NOT EXISTS entries (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  programme_id       INTEGER NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
  record_id          TEXT NOT NULL,              -- S01-P1
  session_id         INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id     INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  project_id         INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  stage_at_start     TEXT NOT NULL DEFAULT '',
  -- plan
  target             TEXT NOT NULL DEFAULT '',
  why_it_matters     TEXT NOT NULL DEFAULT '',
  definition_of_done TEXT NOT NULL DEFAULT '',
  scope_limit        TEXT NOT NULL DEFAULT '',
  tools              TEXT NOT NULL DEFAULT '',
  starting_point     TEXT NOT NULL DEFAULT '',
  main_risk          TEXT NOT NULL DEFAULT '',
  fallback           TEXT NOT NULL DEFAULT '',
  ai_used_for        TEXT NOT NULL DEFAULT '',   -- semicolon separated
  -- result
  result             TEXT NOT NULL DEFAULT '',
  evidence           TEXT NOT NULL DEFAULT '',
  what_changed       TEXT NOT NULL DEFAULT '',
  next_possibility   TEXT NOT NULL DEFAULT '',
  status             TEXT NOT NULL DEFAULT 'Not started',
  minutes_delta      INTEGER,
  facilitator_notes  TEXT NOT NULL DEFAULT '',
  plan_submitted_at   TEXT,
  result_submitted_at TEXT,
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (session_id, participant_id)
);

-- Target Bank sheet: parking lot for too-large ideas and their sprint-sized versions.
CREATE TABLE IF NOT EXISTS targets (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  programme_id    INTEGER NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
  ref             TEXT NOT NULL,                 -- T-01, ...
  owner_id        INTEGER REFERENCES participants(id) ON DELETE SET NULL,
  project_id      INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  too_large_idea  TEXT NOT NULL DEFAULT '',
  sprint_target   TEXT NOT NULL DEFAULT '',
  suggested_sprint INTEGER,
  used_in_sprint  INTEGER,
  status          TEXT NOT NULL DEFAULT 'Open',
  notes           TEXT NOT NULL DEFAULT '',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (programme_id, ref)
);

-- Lists sheet: dropdown sources.
CREATE TABLE IF NOT EXISTS lists (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  programme_id INTEGER NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
  category     TEXT NOT NULL,                    -- status | project_type | stage | ai_use | tool_category
  value        TEXT NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  UNIQUE (programme_id, category, value)
);

CREATE INDEX IF NOT EXISTS idx_entries_session ON entries(session_id);
CREATE INDEX IF NOT EXISTS idx_entries_participant ON entries(participant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_programme ON sessions(programme_id, sprint_no);
CREATE INDEX IF NOT EXISTS idx_lists_lookup ON lists(programme_id, category, sort_order);
