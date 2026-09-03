/**
 * Structured Sprints — Google Sheets backend.
 *
 * Deploy this as a Web App bound to a spreadsheet; the sheet becomes the shared
 * database for a programme, with one tab per workbook sheet. See SETUP.md.
 *
 * Requests are kept CORS-simple on purpose: GET with query parameters, and POST
 * with a text/plain body that we parse as JSON. Apps Script web apps cannot
 * answer a CORS preflight, so an application/json POST would be blocked by the
 * browser before it ever arrived.
 */

var SHEETS = {
  programme: 'Programme',
  sessions: 'Sessions',
  participants: 'Participants',
  projects: 'Projects',
  entries: 'Sprint Log',
  targets: 'Target Bank',
  lists: 'Lists',
};

var COLUMNS = {
  Sessions: ['sprintNo', 'date', 'day', 'time', 'prompt', 'possibleTargets', 'expectedOutcome', 'facilitatorNotes'],
  Participants: ['id', 'name', 'role', 'organisation', 'preferredTools', 'email', 'notes', 'isFacilitator'],
  Projects: ['id', 'ownerId', 'name', 'type', 'stage', 'primaryUser', 'mainPurpose', 'priority1', 'priority2',
    'priority3', 'tools', 'constraints', 'successCondition', 'projectTest', 'demonstration', 'repoLink',
    'notes', 'isPrimary'],
  'Sprint Log': ['id', 'sprintNo', 'participantId', 'projectId', 'stageAtStart', 'target', 'whyItMatters',
    'definitionOfDone', 'scopeLimit', 'tools', 'startingPoint', 'mainRisk', 'fallback', 'aiUsedFor', 'result',
    'evidence', 'whatChanged', 'nextPossibility', 'status', 'minutesDelta', 'facilitatorNotes', 'updatedAt'],
  'Target Bank': ['id', 'ownerId', 'projectId', 'tooLargeIdea', 'sprintTarget', 'suggestedSprint',
    'usedInSprint', 'status', 'notes'],
  Lists: ['category', 'value', 'sortOrder'],
};

/** Human-readable headers for the Sprint Log, so the sheet reads like the workbook. */
var ENTRY_HEADERS = ['Record ID', 'Sprint', 'Participant ID', 'Project ID', 'Stage at start',
  'Today I will… (target)', 'Why this matters', 'Definition of done (observable)', 'Scope limit', 'Tools',
  'Starting point', 'Main risk', 'Fallback approach', 'AI used for', 'Result — "This now works…"',
  'Evidence (link / screenshot / commit)', 'What changed', 'Next possibility', 'Status',
  'Minutes over/under', 'Facilitator notes', 'Updated at'];

// --- HTTP -------------------------------------------------------------------

function doGet(e) {
  var params = (e && e.parameter) || {};
  try {
    requireKey(params.key);
    if (params.action === 'ping') return json({ ok: true, version: 1 });
    return json({ ok: true, state: buildState() });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json({ ok: false, error: 'Body was not valid JSON.' });
  }

  // One writer at a time: two people saving at once would otherwise race on the
  // same row and one edit would be silently lost.
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return json({ ok: false, error: 'The sheet is busy. Try saving again.' });
  }

  try {
    requireKey(body.key);
    handleAction(body);
    return json({ ok: true, state: buildState() });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}

function handleAction(body) {
  var action = body.action;
  var payload = body.payload || {};

  if (action === 'init') return initialiseSheet(payload);
  if (action === 'upsertParticipant') return upsert(SHEETS.participants, 'id', payload);
  if (action === 'upsertProject') return upsert(SHEETS.projects, 'id', payload);
  if (action === 'upsertTarget') return upsert(SHEETS.targets, 'id', payload);
  if (action === 'upsertSession') return upsert(SHEETS.sessions, 'sprintNo', payload);
  if (action === 'upsertEntry') return upsertEntry(payload);
  throw new Error('Unknown action: ' + action);
}

function json(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

/**
 * Optional shared key. The web app has to be readable by "anyone with the link"
 * for the browser to reach it, so this only stops a bare URL from being useful —
 * it is not real authentication. Keep the URL private.
 */
function requireKey(provided) {
  var expected = PropertiesService.getScriptProperties().getProperty('ACCESS_KEY');
  if (!expected) return;
  if (String(provided || '') !== expected) throw new Error('Wrong or missing access key.');
}

// --- sheet helpers ----------------------------------------------------------

function book() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function sheetNamed(name, headers) {
  var ss = book();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

/** Reads a tab as objects, keyed by the COLUMNS order rather than the visible headers. */
function readTable(name) {
  var sheet = book().getSheetByName(name);
  if (!sheet) return [];
  var keys = COLUMNS[name];
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var values = sheet.getRange(2, 1, lastRow - 1, keys.length).getValues();
  var rows = [];
  for (var i = 0; i < values.length; i++) {
    var row = {};
    var blank = true;
    for (var c = 0; c < keys.length; c++) {
      var cell = values[i][c];
      if (cell !== '' && cell !== null) blank = false;
      row[keys[c]] = cell;
    }
    if (!blank) rows.push(row);
  }
  return rows;
}

function toRow(name, obj) {
  var keys = COLUMNS[name];
  var row = [];
  for (var i = 0; i < keys.length; i++) {
    var value = obj[keys[i]];
    if (value === null || value === undefined) value = '';
    if (value === true) value = 'TRUE';
    if (value === false) value = 'FALSE';
    row.push(value);
  }
  return row;
}

/** Inserts or replaces the row whose `idField` matches. */
function upsert(name, idField, obj) {
  var sheet = sheetNamed(name);
  var keys = COLUMNS[name];
  var idIndex = keys.indexOf(idField);
  var lastRow = sheet.getLastRow();
  var row = toRow(name, obj);

  if (lastRow >= 2) {
    var ids = sheet.getRange(2, idIndex + 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(obj[idField])) {
        sheet.getRange(i + 2, 1, 1, keys.length).setValues([row]);
        return;
      }
    }
  }
  sheet.getRange(lastRow + 1, 1, 1, keys.length).setValues([row]);
}

/** Sprint Log rows carry updatedAt, so a stale save can't overwrite newer work. */
function upsertEntry(entry) {
  var name = SHEETS.entries;
  var existing = readTable(name);
  for (var i = 0; i < existing.length; i++) {
    if (String(existing[i].id) === String(entry.id)) {
      var theirs = String(existing[i].updatedAt || '');
      var mine = String(entry.updatedAt || '');
      if (theirs && mine && theirs > mine) return; // sheet already has something newer
      break;
    }
  }
  upsert(name, 'id', entry);
}

// --- state ------------------------------------------------------------------

function readProgramme() {
  var sheet = book().getSheetByName(SHEETS.programme);
  if (!sheet || sheet.getLastRow() < 2) return {};
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  var out = {};
  for (var i = 0; i < values.length; i++) {
    if (values[i][0]) out[String(values[i][0])] = values[i][1];
  }
  return out;
}

function buildState() {
  var meta = readProgramme();
  var lists = {};
  var listRows = readTable(SHEETS.lists);
  for (var i = 0; i < listRows.length; i++) {
    var category = String(listRows[i].category);
    if (!category) continue;
    if (!lists[category]) lists[category] = [];
    lists[category].push({ value: String(listRows[i].value), sortOrder: Number(listRows[i].sortOrder) || 0 });
  }
  for (var key in lists) {
    lists[key].sort(function (a, b) { return a.sortOrder - b.sortOrder; });
    lists[key] = lists[key].map(function (x) { return x.value; });
  }

  return {
    id: String(meta.id || ''),
    name: String(meta.name || ''),
    tagline: String(meta.tagline || ''),
    corePrinciple: String(meta.corePrinciple || ''),
    targetFormula: String(meta.targetFormula || ''),
    cadenceWeeks: Number(meta.cadenceWeeks) || 2,
    sessionTime: String(meta.sessionTime || ''),
    createdAt: String(meta.createdAt || ''),
    sessions: readTable(SHEETS.sessions).map(normaliseSession),
    participants: readTable(SHEETS.participants).map(normaliseParticipant),
    projects: readTable(SHEETS.projects).map(normaliseProject),
    entries: readTable(SHEETS.entries).map(normaliseEntry),
    targets: readTable(SHEETS.targets).map(normaliseTarget),
    lists: lists,
  };
}

function text(value) {
  return value === null || value === undefined ? '' : String(value);
}

function bool(value) {
  return value === true || String(value).toUpperCase() === 'TRUE';
}

/** Dates come back as Date objects when the cell is date-formatted. */
function isoDate(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, book().getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  }
  return text(value);
}

function normaliseSession(row) {
  return {
    sprintNo: Number(row.sprintNo) || 0,
    date: isoDate(row.date),
    day: text(row.day),
    time: text(row.time),
    prompt: text(row.prompt),
    possibleTargets: text(row.possibleTargets),
    expectedOutcome: text(row.expectedOutcome),
    facilitatorNotes: text(row.facilitatorNotes),
  };
}

function normaliseParticipant(row) {
  return {
    id: text(row.id),
    name: text(row.name),
    role: text(row.role),
    organisation: text(row.organisation),
    preferredTools: text(row.preferredTools),
    email: text(row.email),
    notes: text(row.notes),
    isFacilitator: bool(row.isFacilitator),
  };
}

function normaliseProject(row) {
  return {
    id: text(row.id), ownerId: text(row.ownerId), name: text(row.name), type: text(row.type),
    stage: text(row.stage), primaryUser: text(row.primaryUser), mainPurpose: text(row.mainPurpose),
    priority1: text(row.priority1), priority2: text(row.priority2), priority3: text(row.priority3),
    tools: text(row.tools), constraints: text(row.constraints),
    successCondition: text(row.successCondition), projectTest: text(row.projectTest),
    demonstration: text(row.demonstration), repoLink: text(row.repoLink), notes: text(row.notes),
    isPrimary: bool(row.isPrimary),
  };
}

function normaliseEntry(row) {
  return {
    id: text(row.id),
    sprintNo: Number(row.sprintNo) || 0,
    participantId: text(row.participantId),
    projectId: text(row.projectId) || null,
    stageAtStart: text(row.stageAtStart), target: text(row.target),
    whyItMatters: text(row.whyItMatters), definitionOfDone: text(row.definitionOfDone),
    scopeLimit: text(row.scopeLimit), tools: text(row.tools), startingPoint: text(row.startingPoint),
    mainRisk: text(row.mainRisk), fallback: text(row.fallback), aiUsedFor: text(row.aiUsedFor),
    result: text(row.result), evidence: text(row.evidence), whatChanged: text(row.whatChanged),
    nextPossibility: text(row.nextPossibility), status: text(row.status) || 'Not started',
    minutesDelta: row.minutesDelta === '' || row.minutesDelta === null ? null : Number(row.minutesDelta),
    facilitatorNotes: text(row.facilitatorNotes),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : text(row.updatedAt),
  };
}

function normaliseTarget(row) {
  return {
    id: text(row.id), ownerId: text(row.ownerId) || null, projectId: text(row.projectId) || null,
    tooLargeIdea: text(row.tooLargeIdea), sprintTarget: text(row.sprintTarget),
    suggestedSprint: row.suggestedSprint === '' ? null : Number(row.suggestedSprint) || null,
    usedInSprint: row.usedInSprint === '' ? null : Number(row.usedInSprint) || null,
    status: text(row.status) || 'Open', notes: text(row.notes),
  };
}

// --- first run --------------------------------------------------------------

/** Creates the tabs and writes the programme the facilitator set up in the app. */
function initialiseSheet(programme) {
  var ss = book();

  var meta = sheetNamed(SHEETS.programme, ['Setting', 'Value']);
  meta.clear();
  var metaRows = [['Setting', 'Value']];
  var fields = ['id', 'name', 'tagline', 'corePrinciple', 'targetFormula', 'cadenceWeeks',
    'sessionTime', 'createdAt'];
  for (var i = 0; i < fields.length; i++) {
    metaRows.push([fields[i], programme[fields[i]] === undefined ? '' : programme[fields[i]]]);
  }
  meta.getRange(1, 1, metaRows.length, 2).setValues(metaRows);
  meta.getRange(1, 1, 1, 2).setFontWeight('bold');
  meta.setFrozenRows(1);

  seedTable(SHEETS.sessions,
    ['Sprint', 'Date', 'Day', 'Time', 'Session prompt', 'Possible targets', 'Expected outcome', 'Facilitator notes'],
    programme.sessions || []);
  seedTable(SHEETS.participants,
    ['ID', 'Name', 'Role', 'Organisation', 'Preferred tools', 'Email', 'Notes', 'Facilitator?'],
    programme.participants || []);
  seedTable(SHEETS.projects,
    ['ID', 'Owner ID', 'Project name', 'Type', 'Current stage', 'Primary user', 'Main purpose',
      'Priority 1', 'Priority 2', 'Priority 3', 'Tools / environment', 'Constraints',
      'Project success condition', 'Project test', 'Project demonstration', 'Repo / link', 'Notes', 'Primary?'],
    programme.projects || []);
  seedTable(SHEETS.entries, ENTRY_HEADERS, programme.entries || []);
  seedTable(SHEETS.targets,
    ['ID', 'Owner ID', 'Project ID', 'Too-large idea', 'Sprint-sized target', 'Suggested sprint',
      'Used in sprint', 'Status', 'Notes'],
    programme.targets || []);

  var listRows = [];
  var lists = programme.lists || {};
  for (var category in lists) {
    for (var j = 0; j < lists[category].length; j++) {
      listRows.push({ category: category, value: lists[category][j], sortOrder: j });
    }
  }
  seedTable(SHEETS.lists, ['Category', 'Value', 'Sort order'], listRows);

  var blank = ss.getSheetByName('Sheet1');
  if (blank && ss.getSheets().length > 1) ss.deleteSheet(blank);
}

function seedTable(name, headers, rows) {
  var sheet = sheetNamed(name, headers);
  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  if (!rows.length) return;

  var values = [];
  for (var i = 0; i < rows.length; i++) values.push(toRow(name, rows[i]));
  sheet.getRange(2, 1, values.length, COLUMNS[name].length).setValues(values);
}

/** Run once from the editor to require a key on every request. */
function setAccessKey() {
  var key = Utilities.getUuid().slice(0, 8);
  PropertiesService.getScriptProperties().setProperty('ACCESS_KEY', key);
  Logger.log('Access key: ' + key);
}
