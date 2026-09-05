/**
 * Code.gs runs inside Google's environment, which nobody can reach from here —
 * so the parts a facilitator runs by hand are exercised against a stub instead.
 * A script that fails after being pasted in is very hard to debug from a phone.
 */
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const SOURCE = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "Code.gs"),
  "utf8",
);

class FakeSheet {
  constructor(name) {
    this.name = name;
    this.values = [];
    this.frozen = 0;
  }
  getRange() {
    const sheet = this;
    return {
      setValues(rows) {
        sheet.values = rows;
        return { setFontWeight: () => undefined };
      },
    };
  }
  setFrozenRows(n) { this.frozen = n; }
  getLastRow() { return this.values.length; }
  clear() { this.values = []; }
}

class FakeSpreadsheet {
  constructor(names) { this.sheets = names.map((n) => new FakeSheet(n)); }
  getSheetByName(name) { return this.sheets.find((s) => s.name === name) ?? null; }
  insertSheet(name) { const s = new FakeSheet(name); this.sheets.push(s); return s; }
  getSheets() { return this.sheets; }
  deleteSheet(sheet) { this.sheets = this.sheets.filter((s) => s !== sheet); }
  names() { return this.sheets.map((s) => s.name); }
}

function load(spreadsheet) {
  const logs = [];
  const context = {
    SpreadsheetApp: { getActiveSpreadsheet: () => spreadsheet },
    Logger: { log: (m) => logs.push(String(m)) },
    Utilities: { getUuid: () => "abcdefgh-0000" },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty: () => undefined }) },
    ContentService: { createTextOutput: (t) => ({ setMimeType: () => t }), MimeType: { JSON: "json" } },
  };
  vm.createContext(context);
  new vm.Script(SOURCE).runInContext(context);
  return { context, logs };
}

const EXPECTED = ["Programme", "Sessions", "Participants", "Projects", "Sprint Log", "Target Bank", "Lists"];

test("checkSetup turns a fresh spreadsheet into the seven tabs", () => {
  const ss = new FakeSpreadsheet(["Sheet1"]);
  const { context } = load(ss);
  const message = context.checkSetup();

  for (const name of EXPECTED) assert.ok(ss.getSheetByName(name), `missing tab ${name}`);
  assert.match(message, /The script can write to this sheet/);
  assert.match(message, /Created: Programme/);
});

test("the blank Sheet1 goes, so the sheet stops looking untouched", () => {
  const ss = new FakeSpreadsheet(["Sheet1"]);
  load(ss).context.checkSetup();
  assert.equal(ss.getSheetByName("Sheet1"), null);
  assert.deepEqual(ss.names().sort(), [...EXPECTED].sort());
});

test("a Sheet1 someone has typed in is left alone", () => {
  const ss = new FakeSpreadsheet(["Sheet1"]);
  ss.getSheetByName("Sheet1").values = [["someone's data"]];
  load(ss).context.checkSetup();
  assert.ok(ss.getSheetByName("Sheet1"), "a used Sheet1 must not be deleted");
});

test("running it twice changes nothing and says so", () => {
  const ss = new FakeSpreadsheet(["Sheet1"]);
  const { context } = load(ss);
  context.checkSetup();
  const before = ss.names();
  const second = context.checkSetup();
  assert.deepEqual(ss.names(), before, "a second run must not add tabs");
  assert.match(second, /All tabs were already here/);
});

test("every tab gets its header row frozen", () => {
  const ss = new FakeSpreadsheet(["Sheet1"]);
  load(ss).context.checkSetup();
  for (const name of EXPECTED) {
    const sheet = ss.getSheetByName(name);
    assert.equal(sheet.frozen, 1, `${name} header not frozen`);
    assert.ok(sheet.values.length === 1 && sheet.values[0].length > 0, `${name} has no header row`);
  }
});

test("the tabs match the names the app reads back", () => {
  const ss = new FakeSpreadsheet(["Sheet1"]);
  const { context } = load(ss);
  context.checkSetup();
  assert.deepEqual(Object.values(context.SHEETS).sort(), [...EXPECTED].sort());
});
