/**
 * Structured Sprints — Google Sheets backend.
 *
 * Deploy this as a Web App bound to a spreadsheet; the sheet becomes the shared
 * database for a programme. See SETUP.md.
 *
 * The sheet is laid out like the AI Build Sprints workbook it replaces — a title
 * and a line of explanation, headers on row 4, data from row 5, computed columns
 * in grey and an Overview and Dashboard tab — while remaining a database the app
 * can read and write. The app's own keys (participant ids, project ids, the
 * updated-at stamp) live in hidden columns at the right of each tab, so a person
 * reads names and formulas where the workbook had them.
 *
 * Requests are kept CORS-simple on purpose: GET with query parameters, and POST
 * with a text/plain body that we parse as JSON. Apps Script web apps cannot
 * answer a CORS preflight, so an application/json POST would be blocked by the
 * browser before it ever arrived.
 */

var HEADER_ROW = 4; // title, subtitle, blank, headers
var DATA_ROW = 5;

var SHEETS = {
  programme: 'Programme',
  overview: 'Overview',
  dashboard: 'Dashboard',
  entries: 'Sprint Log',
  sessions: 'Sessions',
  participants: 'Participants',
  projects: 'Projects',
  targets: 'Target Bank',
  lists: 'Lists',
};

/** Tab order, as the workbook has it. */
var TAB_ORDER = [SHEETS.overview, SHEETS.dashboard, SHEETS.entries, SHEETS.sessions,
  SHEETS.participants, SHEETS.projects, SHEETS.targets, SHEETS.lists, SHEETS.programme];

var YELLOW = '#fff8e1'; // fill in
var GREY = '#f1f3f5';   // formula, or written by the app

/**
 * One descriptor per column:
 *   header   the text on row 4
 *   key      the app's field name — the app owns this column
 *   formula  an A1 formula, {row} replaced with the row number — the sheet owns it
 *   machine  an app-owned column that is hidden: ids and stamps, not for reading
 *   list     a Lists category, offered as a dropdown
 */
var LAYOUT = {};

LAYOUT[SHEETS.entries] = {
  title: 'Sprint Log',
  subtitle: 'One row per participant per sprint. Fill the plan in the first ten minutes and the result in the last ten. Everything here appears in the app, and everything entered in the app appears here.',
  idField: 'id',
  columns: [
    { header: 'Record ID', key: 'id', readOnly: true, width: 90 },
    { header: 'Sprint', key: 'sprintNo', width: 60 },
    { header: 'Date', formula: '=IFERROR(VLOOKUP($B{row},Sessions!$A$5:$B,2,FALSE),"")', format: 'yyyy-mm-dd', width: 100 },
    { header: 'Participant', formula: '=IFERROR(VLOOKUP($W{row},Participants!$A$5:$B,2,FALSE),"")', width: 140 },
    { header: 'Project', formula: '=IF($X{row}="","",IFERROR(VLOOKUP($X{row},Projects!$A$5:$B,2,FALSE),""))', width: 180 },
    { header: 'Stage at start', key: 'stageAtStart', list: 'stage', width: 130 },
    { header: 'Today I will… (target)', key: 'target', width: 320 },
    { header: 'Why this matters', key: 'whyItMatters', width: 220 },
    { header: 'Definition of done (observable)', key: 'definitionOfDone', width: 260 },
    { header: 'Scope limit', key: 'scopeLimit', width: 200 },
    { header: 'Tools', key: 'tools', width: 180 },
    { header: 'Starting point', key: 'startingPoint', width: 200 },
    { header: 'Main risk', key: 'mainRisk', width: 200 },
    { header: 'Fallback approach', key: 'fallback', width: 200 },
    { header: 'AI used for', key: 'aiUsedFor', width: 200 },
    { header: 'Result — "This now works…"', key: 'result', width: 320 },
    { header: 'Evidence (link / screenshot / commit)', key: 'evidence', width: 220 },
    { header: 'What changed', key: 'whatChanged', width: 220 },
    { header: 'Next possibility', key: 'nextPossibility', width: 220 },
    { header: 'Status', key: 'status', list: 'status', width: 110 },
    { header: 'Minutes over/under', key: 'minutesDelta', width: 90 },
    { header: 'Facilitator notes', key: 'facilitatorNotes', width: 220 },
    { header: 'Participant ID', key: 'participantId', machine: true },
    { header: 'Project ID', key: 'projectId', machine: true },
    { header: 'Updated at', key: 'updatedAt', machine: true },
  ],
};

LAYOUT[SHEETS.sessions] = {
  title: 'Sessions',
  subtitle: 'One row per sprint. Dates and prompts feed the Sprint Log and the Dashboard. Edit a date here if a session moves.',
  idField: 'sprintNo',
  columns: [
    { header: 'Sprint', key: 'sprintNo', width: 60 },
    { header: 'Date', key: 'date', format: 'yyyy-mm-dd', width: 100 },
    { header: 'Day', key: 'day', width: 100 },
    { header: 'Time', key: 'time', width: 110 },
    { header: 'Session prompt', key: 'prompt', width: 420 },
    { header: 'Possible targets', key: 'possibleTargets', width: 320 },
    { header: 'Expected outcome', key: 'expectedOutcome', width: 200 },
    { header: 'Records logged', formula: "=COUNTIF('Sprint Log'!$B$5:$B,$A{row})", width: 110 },
    { header: 'Complete', formula: '=COUNTIFS(\'Sprint Log\'!$B$5:$B,$A{row},\'Sprint Log\'!$T$5:$T,"Complete")', width: 90 },
    { header: 'Partial', formula: '=COUNTIFS(\'Sprint Log\'!$B$5:$B,$A{row},\'Sprint Log\'!$T$5:$T,"Partial")', width: 90 },
    { header: 'Blocked', formula: '=COUNTIFS(\'Sprint Log\'!$B$5:$B,$A{row},\'Sprint Log\'!$T$5:$T,"Blocked")', width: 90 },
    { header: 'Facilitator notes', key: 'facilitatorNotes', width: 240 },
  ],
};

LAYOUT[SHEETS.participants] = {
  title: 'Participants',
  subtitle: 'One row per person. Names appear in the Sprint Log, the Projects tab and the Dashboard.',
  idField: 'id',
  columns: [
    { header: 'ID', key: 'id', readOnly: true, width: 70 },
    { header: 'Name', key: 'name', width: 160 },
    { header: 'Role', key: 'role', width: 160 },
    { header: 'Organisation', key: 'organisation', width: 160 },
    { header: 'Primary project', formula: '=IFERROR(INDEX(FILTER(Projects!$B$5:$B,Projects!$T$5:$T=$A{row},UPPER(TO_TEXT(Projects!$U$5:$U))="TRUE"),1),"")', width: 200 },
    { header: 'Preferred tools', key: 'preferredTools', width: 240 },
    { header: 'Email', key: 'email', width: 180 },
    { header: 'Sprints logged', formula: "=COUNTIF('Sprint Log'!$W$5:$W,$A{row})", width: 110 },
    { header: 'Complete', formula: '=COUNTIFS(\'Sprint Log\'!$W$5:$W,$A{row},\'Sprint Log\'!$T$5:$T,"Complete")', width: 90 },
    { header: 'Partial', formula: '=COUNTIFS(\'Sprint Log\'!$W$5:$W,$A{row},\'Sprint Log\'!$T$5:$T,"Partial")', width: 90 },
    { header: 'Blocked', formula: '=COUNTIFS(\'Sprint Log\'!$W$5:$W,$A{row},\'Sprint Log\'!$T$5:$T,"Blocked")', width: 90 },
    { header: 'Notes', key: 'notes', width: 240 },
    { header: 'Facilitator?', key: 'isFacilitator', machine: true },
  ],
};

LAYOUT[SHEETS.projects] = {
  title: 'Projects',
  subtitle: 'One row per project. A participant may have several; the primary one shows against their name on the Participants tab.',
  idField: 'id',
  columns: [
    { header: 'ID', key: 'id', readOnly: true, width: 80 },
    { header: 'Project name', key: 'name', width: 240 },
    { header: 'Owner', formula: '=IFERROR(VLOOKUP($T{row},Participants!$A$5:$B,2,FALSE),"")', width: 150 },
    { header: 'Type', key: 'type', list: 'project_type', width: 130 },
    { header: 'Current stage', key: 'stage', list: 'stage', width: 130 },
    { header: 'Primary user', key: 'primaryUser', width: 220 },
    { header: 'Main purpose', key: 'mainPurpose', width: 320 },
    { header: 'Priority 1', key: 'priority1', width: 220 },
    { header: 'Priority 2', key: 'priority2', width: 220 },
    { header: 'Priority 3', key: 'priority3', width: 220 },
    { header: 'Tools / environment', key: 'tools', width: 240 },
    { header: 'Constraints', key: 'constraints', width: 240 },
    { header: 'Project success condition', key: 'successCondition', width: 280 },
    { header: 'Project test', key: 'projectTest', width: 240 },
    { header: 'Project demonstration', key: 'demonstration', width: 240 },
    { header: 'Repo / link', key: 'repoLink', width: 200 },
    { header: 'Sprints logged', formula: "=COUNTIF('Sprint Log'!$X$5:$X,$A{row})", width: 110 },
    { header: 'Complete', formula: '=COUNTIFS(\'Sprint Log\'!$X$5:$X,$A{row},\'Sprint Log\'!$T$5:$T,"Complete")', width: 90 },
    { header: 'Notes', key: 'notes', width: 240 },
    { header: 'Owner ID', key: 'ownerId', machine: true },
    { header: 'Primary?', key: 'isPrimary', machine: true },
  ],
};

LAYOUT[SHEETS.targets] = {
  title: 'Target Bank',
  subtitle: 'Parking lot for sprint-sized ideas. Formula: [Verb] [specific feature, workflow or test] using [tool] so that [observable result].',
  idField: 'id',
  columns: [
    { header: 'ID', key: 'id', readOnly: true, width: 70 },
    { header: 'Owner', formula: '=IF($J{row}="","",IFERROR(VLOOKUP($J{row},Participants!$A$5:$B,2,FALSE),""))', width: 150 },
    { header: 'Project', formula: '=IF($K{row}="","",IFERROR(VLOOKUP($K{row},Projects!$A$5:$B,2,FALSE),""))', width: 200 },
    { header: 'Too-large idea', key: 'tooLargeIdea', width: 280 },
    { header: 'Sprint-sized target', key: 'sprintTarget', width: 420 },
    { header: 'Suggested sprint', key: 'suggestedSprint', list: 'sprint', width: 110 },
    { header: 'Used in sprint', key: 'usedInSprint', list: 'sprint', width: 110 },
    { header: 'Status', key: 'status', width: 100 },
    { header: 'Notes', key: 'notes', width: 240 },
    { header: 'Owner ID', key: 'ownerId', machine: true },
    { header: 'Project ID', key: 'projectId', machine: true },
  ],
};

/** The Lists tab is columnar, like the workbook: one category per column. */
var LIST_COLUMNS = [
  { header: 'Status', key: 'status' },
  { header: 'Project type', key: 'project_type' },
  { header: 'Stage', key: 'stage' },
  { header: 'AI use', key: 'ai_use' },
  { header: 'Tool category', key: 'tool_category' },
  { header: 'Sprint', key: 'sprint' },
  { header: 'Yes/No', key: 'yes_no' },
];

// --- HTTP -------------------------------------------------------------------

function doGet(e) {
  var params = (e && e.parameter) || {};
  try {
    requireKey(params.key);
    if (params.action === 'ping') return json({ ok: true, version: 2 });
    return json({ ok: true, state: buildState() });
  } catch (error) {
    return json({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (error) {
    return json({ ok: false, error: 'Body was not JSON.' });
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (error) {
    return json({ ok: false, error: 'The sheet is busy — try again.' });
  }

  try {
    requireKey(body.key);
    var result = handleAction(body);
    return json({ ok: true, state: result === undefined ? buildState() : result });
  } catch (error) {
    return json({ ok: false, error: String(error && error.message ? error.message : error) });
  } finally {
    lock.releaseLock();
  }
}

function handleAction(body) {
  var action = String(body.action || '');
  var payload = body.payload;

  if (action === 'init') return initialiseSheet(payload) || undefined;
  if (action === 'upsertEntry') return upsertEntry(payload);
  if (action === 'upsertParticipant') return upsert(SHEETS.participants, payload);
  if (action === 'upsertProject') return upsert(SHEETS.projects, payload);
  if (action === 'upsertTarget') return upsert(SHEETS.targets, payload);
  if (action === 'upsertSession') return upsert(SHEETS.sessions, payload);
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

function columnLetter(index) {
  var letter = '';
  var n = index;
  while (n > 0) {
    var remainder = (n - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    n = Math.floor((n - remainder - 1) / 26);
  }
  return letter;
}

/**
 * Where the headers are. A sheet built by an earlier version of this script has
 * them on row 1; one built by this version has them on row 4. Finding them by
 * content rather than by position means an existing programme keeps working.
 */
function headerRowOf(sheet, layout) {
  var wanted = {};
  for (var i = 0; i < layout.columns.length; i++) wanted[layout.columns[i].header] = true;
  var rows = Math.min(sheet.getLastRow(), HEADER_ROW + 2);
  if (rows < 1) return HEADER_ROW;
  var width = Math.max(sheet.getLastColumn(), 1);
  var values = sheet.getRange(1, 1, rows, width).getValues();
  for (var r = 0; r < values.length; r++) {
    for (var c = 0; c < values[r].length; c++) {
      if (wanted[String(values[r][c])]) return r + 1;
    }
  }
  return HEADER_ROW;
}

/** key -> 1-based column number, read from whatever the header row actually says. */
function columnIndex(sheet, layout, headerRow) {
  var width = Math.max(sheet.getLastColumn(), layout.columns.length);
  var headers = sheet.getRange(headerRow, 1, 1, width).getValues()[0];
  var byHeader = {};
  for (var c = 0; c < headers.length; c++) {
    var header = String(headers[c]);
    if (header && byHeader[header] === undefined) byHeader[header] = c + 1;
  }
  var index = {};
  for (var i = 0; i < layout.columns.length; i++) {
    var column = layout.columns[i];
    if (!column.key) continue;
    // Fall back to the layout position for a sheet that predates a column.
    if (byHeader[column.header]) index[column.key] = byHeader[column.header];
  }
  return index;
}

function sheetFor(name) {
  var ss = book();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    writeHeader(sheet, LAYOUT[name]);
  }
  return sheet;
}

/** Reads a tab as objects, mapping columns by their header text. */
function readTable(name) {
  var sheet = book().getSheetByName(name);
  var layout = LAYOUT[name];
  if (!sheet || !layout) return [];
  var headerRow = headerRowOf(sheet, layout);
  var index = columnIndex(sheet, layout, headerRow);
  var firstRow = headerRow + 1;
  var lastRow = sheet.getLastRow();
  if (lastRow < firstRow) return [];

  var width = Math.max(sheet.getLastColumn(), 1);
  var values = sheet.getRange(firstRow, 1, lastRow - firstRow + 1, width).getValues();
  var rows = [];
  for (var i = 0; i < values.length; i++) {
    var row = {};
    var blank = true;
    for (var key in index) {
      var cell = values[i][index[key] - 1];
      if (cell === undefined) cell = '';
      if (cell !== '' && cell !== null) blank = false;
      row[key] = cell;
    }
    if (!blank) rows.push(row);
  }
  return rows;
}

/**
 * The values for one row: the app's fields where it owns a column, this row's
 * formula where the sheet owns one, and whatever is already there otherwise —
 * so a column somebody added by hand survives a save from the app.
 */
function rowValues(name, obj, rowNumber, existing) {
  var layout = LAYOUT[name];
  var values = [];
  for (var i = 0; i < layout.columns.length; i++) {
    var column = layout.columns[i];
    if (column.formula) {
      values.push(column.formula.replace(/\{row\}/g, String(rowNumber)));
      continue;
    }
    var value = obj[column.key];
    if (value === null || value === undefined) value = '';
    values.push(value);
  }
  if (existing) {
    for (var c = values.length; c < existing.length; c++) values.push(existing[c]);
  }
  return values;
}

/** Inserts or replaces the row whose id matches, leaving the formulas intact. */
function upsert(name, obj) {
  var layout = LAYOUT[name];
  var sheet = sheetFor(name);
  var headerRow = headerRowOf(sheet, layout);
  var index = columnIndex(sheet, layout, headerRow);
  var idColumn = index[layout.idField];
  if (!idColumn) throw new Error('The ' + name + ' tab has no ' + layout.idField + ' column.');

  var firstRow = headerRow + 1;
  var lastRow = sheet.getLastRow();
  var target = 0;
  if (lastRow >= firstRow) {
    var ids = sheet.getRange(firstRow, idColumn, lastRow - firstRow + 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(obj[layout.idField])) {
        target = firstRow + i;
        break;
      }
    }
  }

  var width = Math.max(sheet.getLastColumn(), layout.columns.length);
  if (target) {
    var existing = sheet.getRange(target, 1, 1, width).getValues()[0];
    sheet.getRange(target, 1, 1, width).setValues([patchRow(name, obj, target, index, existing)]);
    return;
  }
  var appended = Math.max(lastRow + 1, firstRow);
  var blanks = [];
  for (var b = 0; b < width; b++) blanks.push('');
  sheet.getRange(appended, 1, 1, width).setValues([patchRow(name, obj, appended, index, blanks)]);
  formatDataRow(sheet, name, appended);
}

/** Writes the app's fields and this row's formulas into an existing row of cells. */
function patchRow(name, obj, rowNumber, index, existing) {
  var layout = LAYOUT[name];
  var row = existing.slice();
  for (var i = 0; i < layout.columns.length; i++) {
    var column = layout.columns[i];
    if (column.formula) {
      row[i] = column.formula.replace(/\{row\}/g, String(rowNumber));
      continue;
    }
    var at = index[column.key];
    if (!at) continue;
    var value = obj[column.key];
    if (value === null || value === undefined) value = '';
    row[at - 1] = value;
  }
  return row;
}

/** Sprint Log rows carry updatedAt, so a stale save can't overwrite newer work. */
function upsertEntry(entry) {
  var existing = readTable(SHEETS.entries);
  for (var i = 0; i < existing.length; i++) {
    if (String(existing[i].id) === String(entry.id)) {
      var theirs = stamp(existing[i].updatedAt);
      var mine = stamp(entry.updatedAt);
      if (theirs && mine && theirs > mine) return; // the sheet already has something newer
      break;
    }
  }
  upsert(SHEETS.entries, entry);
}

function stamp(value) {
  return value instanceof Date ? value.toISOString() : String(value || '');
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

/** Reads the Lists tab, columnar like the workbook, or row-based if it is older. */
function readLists() {
  var sheet = book().getSheetByName(SHEETS.lists);
  if (!sheet || sheet.getLastRow() < 2) return {};
  var width = Math.max(sheet.getLastColumn(), 1);
  var values = sheet.getRange(1, 1, sheet.getLastRow(), width).getValues();

  var headerRow = -1;
  for (var r = 0; r < Math.min(values.length, HEADER_ROW + 2); r++) {
    for (var c = 0; c < values[r].length; c++) {
      var cell = String(values[r][c]);
      if (cell === 'Category' || cell === 'Status') { headerRow = r; break; }
    }
    if (headerRow >= 0) break;
  }
  if (headerRow < 0) return {};

  var headers = values[headerRow].map(function (h) { return String(h); });
  if (headers.indexOf('Category') >= 0) return readListsAsRows(values, headerRow, headers);

  var lists = {};
  for (var col = 0; col < headers.length; col++) {
    var key = listKey(headers[col]);
    if (!key) continue;
    var items = [];
    for (var row = headerRow + 1; row < values.length; row++) {
      var value = values[row][col];
      if (value === '' || value === null || value === undefined) continue;
      items.push(String(value));
    }
    if (items.length) lists[key] = items;
  }
  return lists;
}

/** The Category / Value / Sort order shape written by earlier versions. */
function readListsAsRows(values, headerRow, headers) {
  var at = {
    category: headers.indexOf('Category'),
    value: headers.indexOf('Value'),
    sortOrder: headers.indexOf('Sort order'),
  };
  var collected = {};
  for (var row = headerRow + 1; row < values.length; row++) {
    var category = String(values[row][at.category] || '');
    if (!category) continue;
    if (!collected[category]) collected[category] = [];
    collected[category].push({
      value: String(values[row][at.value]),
      sortOrder: at.sortOrder >= 0 ? Number(values[row][at.sortOrder]) || 0 : 0,
    });
  }
  var lists = {};
  for (var key in collected) {
    collected[key].sort(function (a, b) { return a.sortOrder - b.sortOrder; });
    lists[key] = collected[key].map(function (x) { return x.value; });
  }
  return lists;
}

/** "Project type" -> project_type, so a category added by hand still reaches the app. */
function listKey(header) {
  for (var i = 0; i < LIST_COLUMNS.length; i++) {
    if (LIST_COLUMNS[i].header === header) return LIST_COLUMNS[i].key;
  }
  var slug = String(header).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return slug || '';
}

function buildState() {
  var meta = readProgramme();
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
    lists: readLists(),
  };
}

function text(value) {
  return value === null || value === undefined ? '' : String(value);
}

function bool(value) {
  var v = String(value).toUpperCase();
  return value === true || v === 'TRUE' || v === 'YES';
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
    minutesDelta: row.minutesDelta === '' || row.minutesDelta === null || row.minutesDelta === undefined
      ? null
      : Number(row.minutesDelta),
    facilitatorNotes: text(row.facilitatorNotes),
    updatedAt: stamp(row.updatedAt),
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

  writeMeta(programme);
  writeLists(programme); // before the tables: their dropdowns read from it
  seedTable(SHEETS.entries, programme.entries || []);
  seedTable(SHEETS.sessions, programme.sessions || []);
  seedTable(SHEETS.participants, programme.participants || []);
  seedTable(SHEETS.projects, programme.projects || []);
  seedTable(SHEETS.targets, programme.targets || []);
  writeOverview(programme);
  writeDashboard(programme);

  var blank = ss.getSheetByName('Sheet1');
  if (blank && ss.getSheets().length > 1) ss.deleteSheet(blank);

  for (var i = 0; i < TAB_ORDER.length; i++) {
    var sheet = ss.getSheetByName(TAB_ORDER[i]);
    if (!sheet) continue;
    ss.setActiveSheet(sheet);
    ss.moveActiveSheet(i + 1);
  }
  var overview = ss.getSheetByName(SHEETS.overview);
  if (overview) ss.setActiveSheet(overview);
}

function writeMeta(programme) {
  var sheet = sheetOrCreate(SHEETS.programme);
  sheet.clear();
  var rows = [['Setting', 'Value']];
  var fields = ['id', 'name', 'tagline', 'corePrinciple', 'targetFormula', 'cadenceWeeks',
    'sessionTime', 'createdAt'];
  for (var i = 0; i < fields.length; i++) {
    rows.push([fields[i], programme[fields[i]] === undefined ? '' : programme[fields[i]]]);
  }
  sheet.getRange(1, 1, rows.length, 2).setValues(rows);
  sheet.getRange(1, 1, 1, 2).setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 130);
  sheet.setColumnWidth(2, 420);
  sheet.hideSheet();
}

function sheetOrCreate(name) {
  var ss = book();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

/** Title, explanation, headers, widths — the frame every data tab shares. */
function writeHeader(sheet, layout) {
  var columns = layout.columns;
  sheet.getRange(1, 1).setValue(layout.title).setFontSize(14).setFontWeight('bold');
  sheet.getRange(2, 1).setValue(layout.subtitle).setFontColor('#6c757d').setFontStyle('italic');

  var headers = [];
  for (var i = 0; i < columns.length; i++) headers.push(columns[i].header);
  sheet.getRange(HEADER_ROW, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setBackground('#e9ecef')
    .setWrap(true)
    .setVerticalAlignment('bottom');
  sheet.setFrozenRows(HEADER_ROW);
  sheet.setFrozenColumns(1);

  for (var c = 0; c < columns.length; c++) {
    if (columns[c].width) sheet.setColumnWidth(c + 1, columns[c].width);
    if (columns[c].machine) sheet.hideColumns(c + 1);
  }
}

function seedTable(name, rows) {
  var layout = LAYOUT[name];
  var sheet = sheetOrCreate(name);
  sheet.clear();
  sheet.clearConditionalFormatRules();
  // clear() leaves data validation behind, so a rebuild would keep stale dropdowns.
  sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).clearDataValidations();
  writeHeader(sheet, layout);
  if (!rows.length) return;

  var values = [];
  for (var i = 0; i < rows.length; i++) values.push(rowValues(name, rows[i], DATA_ROW + i));
  sheet.getRange(DATA_ROW, 1, values.length, layout.columns.length).setValues(values);
  formatDataRange(sheet, name, DATA_ROW, values.length);
}

/** Yellow where a person types, grey where the sheet or the app fills it in. */
function formatDataRange(sheet, name, firstRow, rowCount) {
  var layout = LAYOUT[name];
  if (rowCount < 1) return;
  for (var i = 0; i < layout.columns.length; i++) {
    var column = layout.columns[i];
    var range = sheet.getRange(firstRow, i + 1, rowCount, 1);
    range.setBackground(column.formula || column.readOnly ? GREY : YELLOW);
    range.setVerticalAlignment('top');
    if (column.format) range.setNumberFormat(column.format);
    if (column.list) applyList(sheet, range, column.list);
  }
  sheet.getRange(firstRow, 1, rowCount, layout.columns.length).setWrap(true);
}

function formatDataRow(sheet, name, row) {
  formatDataRange(sheet, name, row, 1);
}

/** A dropdown reading down one column of the Lists tab, as the workbook does. */
function applyList(sheet, range, key) {
  var lists = book().getSheetByName(SHEETS.lists);
  if (!lists) return;
  var column = 0;
  for (var i = 0; i < LIST_COLUMNS.length; i++) {
    if (LIST_COLUMNS[i].key === key) { column = i + 1; break; }
  }
  if (!column) return;
  var source = lists.getRange(DATA_ROW, column, Math.max(lists.getMaxRows() - DATA_ROW, 1), 1);
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(source, true)
    .setAllowInvalid(true) // the app must always be able to write, dropdown or not
    .build();
  range.setDataValidation(rule);
}

function writeLists(programme) {
  var sheet = sheetOrCreate(SHEETS.lists);
  sheet.clear();
  var lists = programme.lists || {};

  // Two dropdown sources the app has no need of, but the sheet does.
  var sprints = [];
  var sessions = programme.sessions || [];
  for (var i = 0; i < sessions.length; i++) sprints.push(String(sessions[i].sprintNo));
  if (!sprints.length) sprints = ['1', '2', '3', '4', '5', '6'];

  var columns = [];
  var headers = [];
  for (var c = 0; c < LIST_COLUMNS.length; c++) {
    var key = LIST_COLUMNS[c].key;
    headers.push(LIST_COLUMNS[c].header);
    if (key === 'sprint') columns.push(sprints);
    else if (key === 'yes_no') columns.push(['Yes', 'No']);
    else columns.push(lists[key] || []);
  }

  sheet.getRange(1, 1).setValue('Lists').setFontSize(14).setFontWeight('bold');
  sheet.getRange(2, 1)
    .setValue('Dropdown sources. Add items at the bottom of a column; the dropdowns pick them up automatically.')
    .setFontColor('#6c757d').setFontStyle('italic');
  sheet.getRange(HEADER_ROW, 1, 1, headers.length)
    .setValues([headers]).setFontWeight('bold').setBackground('#e9ecef');
  sheet.setFrozenRows(HEADER_ROW);

  var height = 0;
  for (var h = 0; h < columns.length; h++) height = Math.max(height, columns[h].length);
  if (!height) return;
  var values = [];
  for (var r = 0; r < height; r++) {
    var row = [];
    for (var col = 0; col < columns.length; col++) row.push(columns[col][r] === undefined ? '' : columns[col][r]);
    values.push(row);
  }
  sheet.getRange(DATA_ROW, 1, height, columns.length).setValues(values).setBackground(YELLOW);
  for (var w = 0; w < headers.length; w++) sheet.setColumnWidth(w + 1, 150);
}

var DEFAULT_RUN_SHEET = [
  { window: '0–5 min', phase: 'Target', detail: 'Confirm the intended outcome for the hour.' },
  { window: '5–10 min', phase: 'Share', detail: 'Discuss the approach, AI method or blocker.' },
  { window: '10–50 min', phase: 'Build', detail: 'Focused build.' },
  { window: '50–55 min', phase: 'Test', detail: 'Verify that the result works against the definition of done.' },
  { window: '55–60 min', phase: 'Show and ship', detail: 'Demonstrate the result; record what changed.' },
];

function writeOverview(programme) {
  var sheet = sheetOrCreate(SHEETS.overview);
  sheet.clear();
  var rows = [];
  var bold = [];
  var muted = [];

  function line(a, b) { rows.push([a, b === undefined ? '' : b]); }
  function heading(a) { bold.push(rows.length + 1); line(a, ''); }

  rows.push([programme.name || 'Structured Sprints', '']);
  muted.push(rows.length + 1);
  line(programme.tagline || '', '');
  line('', '');

  heading('How this sheet works');
  line('Sprint Log', 'The database. One row per participant per sprint. The plan columns are filled before building, the result columns after.');
  line('Sessions', 'Dates and prompts. Edit a date here if a session moves; the Sprint Log and Dashboard follow.');
  line('Participants / Projects', 'Reference tables. Names here become the names shown everywhere else.');
  line('Target Bank', 'Ideas that are too large, and their sprint-sized versions. Pull one into a sprint when its turn comes.');
  line('Dashboard', 'Formulas only. Counts targets set, complete, partial and blocked per sprint and per participant.');
  line('Lists', 'Dropdown values. Add a status, stage or tool category at the bottom of its column.');
  line('', '');

  heading('Legend');
  line('Yellow cell', 'Fill in — here or in the app, whichever suits.');
  line('Grey cell', 'Formula, or written by the app. Leave alone.');
  line('Hidden columns', 'At the right of each tab: the ids the app uses to join the tabs together. Leave them alone too.');
  line('', '');

  heading('This sheet and the app');
  line('Shared', 'This spreadsheet is the shared database. Anyone with the app link sees the same rows.');
  line('Live', 'The app polls every 20 seconds, so an edit made here shows up there during a session, and the other way round.');
  line('', '');

  if (programme.corePrinciple) { line('Core principle', programme.corePrinciple); }
  if (programme.targetFormula) { line('Target formula', programme.targetFormula); }
  line('', '');

  heading('60-minute run sheet');
  var runSheet = programme.runSheet && programme.runSheet.length ? programme.runSheet : DEFAULT_RUN_SHEET;
  for (var i = 0; i < runSheet.length; i++) {
    line(runSheet[i].window + ' · ' + runSheet[i].phase, runSheet[i].detail);
  }

  var groundRules = programme.groundRules || [];
  if (groundRules.length) {
    line('', '');
    heading('Ground rules');
    for (var g = 0; g < groundRules.length; g++) line(groundRules[g].rule, groundRules[g].detail);
  }

  sheet.getRange(1, 1, rows.length, 2).setValues(rows).setVerticalAlignment('top').setWrap(true);
  sheet.getRange(1, 1).setFontSize(16).setFontWeight('bold');
  for (var m = 0; m < muted.length; m++) {
    sheet.getRange(muted[m], 1).setFontColor('#6c757d').setFontStyle('italic');
  }
  for (var b = 0; b < bold.length; b++) {
    sheet.getRange(bold[b], 1, 1, 2).setFontWeight('bold').setBackground('#e9ecef');
  }
  sheet.setColumnWidth(1, 220);
  sheet.setColumnWidth(2, 720);
}

function writeDashboard(programme) {
  var sheet = sheetOrCreate(SHEETS.dashboard);
  sheet.clear();
  var log = "'Sprint Log'!";
  var rows = [];
  var bold = [];
  var headers = [];

  rows.push(['Dashboard', '', '', '', '', '', '', '']);
  rows.push(['All cells are formulas — nothing to edit here.', '', '', '', '', '', '', '']);
  rows.push(['', '', '', '', '', '', '', '']);

  bold.push(rows.length + 1);
  rows.push(['Programme totals', '', '', '', '', '', '', '']);
  rows.push(['Targets set', '=COUNTIF(' + log + '$G$5:$G,"<>")', '', '', '', '', '', '']);
  rows.push(['Complete', '=COUNTIF(' + log + '$T$5:$T,"Complete")', '', '', '', '', '', '']);
  rows.push(['Partial', '=COUNTIF(' + log + '$T$5:$T,"Partial")', '', '', '', '', '', '']);
  rows.push(['Blocked', '=COUNTIF(' + log + '$T$5:$T,"Blocked")', '', '', '', '', '', '']);
  rows.push(['Absent', '=COUNTIF(' + log + '$T$5:$T,"Absent")', '', '', '', '', '', '']);
  var completeRow = rows.length - 3;
  var targetsRow = rows.length - 4;
  rows.push(['Completion rate (complete ÷ targets set)',
    '=IFERROR($B$' + completeRow + '/$B$' + targetsRow + ',0)', '', '', '', '', '', '']);
  rows.push(['Sessions run to date', '=COUNTIF(Sessions!$B$5:$B,"<"&TODAY())', '', '', '', '', '', '']);
  rows.push(['Next session',
    '=IFERROR(MIN(FILTER(Sessions!$B$5:$B,Sessions!$B$5:$B>=TODAY())),"")', '', '', '', '', '', '']);
  rows.push(['', '', '', '', '', '', '', '']);

  bold.push(rows.length + 1);
  rows.push(['By sprint', '', '', '', '', '', '', '']);
  headers.push(rows.length + 1);
  rows.push(['Sprint', 'Date', 'Targets set', 'Complete', 'Partial', 'Blocked', 'Absent', 'Completion rate']);
  var sessions = (programme.sessions || []).length;
  var sprintRows = Math.max(sessions, 1) + 6; // room for sprints added later
  for (var s = 0; s < sprintRows; s++) {
    var from = DATA_ROW + s;
    var row = rows.length + 1;
    rows.push([
      '=IFERROR(IF(Sessions!$A' + from + '="","",Sessions!$A' + from + '),"")',
      '=IFERROR(IF(Sessions!$A' + from + '="","",Sessions!$B' + from + '),"")',
      '=IF($A' + row + '="","",COUNTIFS(' + log + '$B$5:$B,$A' + row + ',' + log + '$G$5:$G,"<>"))',
      '=IF($A' + row + '="","",COUNTIFS(' + log + '$B$5:$B,$A' + row + ',' + log + '$T$5:$T,"Complete"))',
      '=IF($A' + row + '="","",COUNTIFS(' + log + '$B$5:$B,$A' + row + ',' + log + '$T$5:$T,"Partial"))',
      '=IF($A' + row + '="","",COUNTIFS(' + log + '$B$5:$B,$A' + row + ',' + log + '$T$5:$T,"Blocked"))',
      '=IF($A' + row + '="","",COUNTIFS(' + log + '$B$5:$B,$A' + row + ',' + log + '$T$5:$T,"Absent"))',
      '=IF($A' + row + '="","",IFERROR($D' + row + '/$C' + row + ',0))',
    ]);
  }
  rows.push(['', '', '', '', '', '', '', '']);

  bold.push(rows.length + 1);
  rows.push(['By participant', '', '', '', '', '', '', '']);
  headers.push(rows.length + 1);
  rows.push(['Participant', 'Primary project', 'Targets set', 'Complete', 'Partial', 'Blocked', 'Absent', 'Completion rate']);
  var people = (programme.participants || []).length;
  var peopleRows = Math.max(people, 1) + 8; // room for people who join later
  for (var p = 0; p < peopleRows; p++) {
    var at = DATA_ROW + p;
    var line = rows.length + 1;
    // Shown by name; counted by the id in the hidden Sprint Log column.
    var who = 'Participants!$A' + at;
    rows.push([
      '=IFERROR(IF(' + who + '="","",Participants!$B' + at + '),"")',
      '=IFERROR(IF(' + who + '="","",Participants!$E' + at + '),"")',
      '=IF(' + who + '="","",COUNTIFS(' + log + '$W$5:$W,' + who + ',' + log + '$G$5:$G,"<>"))',
      '=IF(' + who + '="","",COUNTIFS(' + log + '$W$5:$W,' + who + ',' + log + '$T$5:$T,"Complete"))',
      '=IF(' + who + '="","",COUNTIFS(' + log + '$W$5:$W,' + who + ',' + log + '$T$5:$T,"Partial"))',
      '=IF(' + who + '="","",COUNTIFS(' + log + '$W$5:$W,' + who + ',' + log + '$T$5:$T,"Blocked"))',
      '=IF(' + who + '="","",COUNTIFS(' + log + '$W$5:$W,' + who + ',' + log + '$T$5:$T,"Absent"))',
      '=IF($A' + line + '="","",IFERROR($D' + line + '/$C' + line + ',0))',
    ]);
  }

  sheet.getRange(1, 1, rows.length, 8).setValues(rows);
  sheet.getRange(1, 1).setFontSize(14).setFontWeight('bold');
  sheet.getRange(2, 1).setFontColor('#6c757d').setFontStyle('italic');
  for (var b2 = 0; b2 < bold.length; b2++) sheet.getRange(bold[b2], 1, 1, 8).setFontWeight('bold');
  for (var h = 0; h < headers.length; h++) {
    sheet.getRange(headers[h], 1, 1, 8).setFontWeight('bold').setBackground('#e9ecef');
  }
  sheet.setColumnWidth(1, 260);
  sheet.setColumnWidth(2, 220);
}

/** Run once from the editor to require a key on every request. */
function setAccessKey() {
  var key = Utilities.getUuid().slice(0, 8);
  PropertiesService.getScriptProperties().setProperty('ACCESS_KEY', key);
  Logger.log('Access key: ' + key);
}
