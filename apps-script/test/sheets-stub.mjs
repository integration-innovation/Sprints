/**
 * A very small in-memory stand-in for the parts of the Sheets API that Code.gs
 * uses. Formulas are stored as the strings they are written as — nothing here
 * evaluates them — so the tests check where a formula lands and what it refers
 * to, not what it would compute.
 */
export function makeSpreadsheetApp() {
  const sheets = [];

  class Range {
    constructor(sheet, row, col, rows, cols) {
      Object.assign(this, { sheet, row, col, rows, cols });
    }
    setValues(values) {
      for (let r = 0; r < this.rows; r++)
        for (let c = 0; c < this.cols; c++) this.sheet.set(this.row + r, this.col + c, values[r][c]);
      return this;
    }
    getValues() {
      const out = [];
      for (let r = 0; r < this.rows; r++) {
        const row = [];
        for (let c = 0; c < this.cols; c++) row.push(this.sheet.get(this.row + r, this.col + c));
        out.push(row);
      }
      return out;
    }
    setValue(v) { this.sheet.set(this.row, this.col, v); return this; }
    getValue() { return this.sheet.get(this.row, this.col); }
    setFontWeight() { return this; }
    setFontSize() { return this; }
    setFontColor() { return this; }
    setFontStyle() { return this; }
    setBackground(colour) {
      for (let r = 0; r < this.rows; r++)
        for (let c = 0; c < this.cols; c++) this.sheet.background.set(`${this.row + r}:${this.col + c}`, colour);
      return this;
    }
    setWrap() { return this; }
    setVerticalAlignment() { return this; }
    setNumberFormat(f) {
      for (let r = 0; r < this.rows; r++) this.sheet.formats.set(`${this.row + r}:${this.col}`, f);
      return this;
    }
    clearDataValidations() {
      for (let r = 0; r < this.rows; r++)
        for (let c = 0; c < this.cols; c++) this.sheet.validation.delete(`${this.row + r}:${this.col + c}`);
      return this;
    }
    setDataValidation(rule) {
      for (let r = 0; r < this.rows; r++) this.sheet.validation.set(`${this.row + r}:${this.col}`, rule);
      return this;
    }
  }

  class Sheet {
    constructor(name) {
      this.name = name;
      this.cells = new Map();
      this.background = new Map();
      this.formats = new Map();
      this.validation = new Map();
      this.hiddenColumns = new Set();
      this.frozenRows = 0;
      this.widths = new Map();
      this.hidden = false;
    }
    key(r, c) { return `${r}:${c}`; }
    set(r, c, v) { this.cells.set(this.key(r, c), v === undefined ? "" : v); }
    get(r, c) { const v = this.cells.get(this.key(r, c)); return v === undefined ? "" : v; }
    getName() { return this.name; }
    getRange(row, col, rows = 1, cols = 1) { return new Range(this, row, col, rows, cols); }
    clear() { this.cells.clear(); this.background.clear(); return this; }
    clearConditionalFormatRules() { return this; }
    setFrozenRows(n) { this.frozenRows = n; return this; }
    setFrozenColumns() { return this; }
    setColumnWidth(c, w) { this.widths.set(c, w); return this; }
    hideColumns(c) { this.hiddenColumns.add(c); return this; }
    hideSheet() { this.hidden = true; return this; }
    getMaxRows() { return Math.max(this.getLastRow(), 1000); }
    getMaxColumns() { return Math.max(this.getLastColumn(), 26); }
    getLastRow() {
      let last = 0;
      for (const [key, value] of this.cells) {
        if (value === "" || value === null) continue;
        last = Math.max(last, Number(key.split(":")[0]));
      }
      return last;
    }
    getLastColumn() {
      let last = 0;
      for (const [key, value] of this.cells) {
        if (value === "" || value === null) continue;
        last = Math.max(last, Number(key.split(":")[1]));
      }
      return last;
    }
  }

  const spreadsheet = {
    getSheetByName: (name) => sheets.find((s) => s.name === name) || null,
    insertSheet(name) { const s = new Sheet(name); sheets.push(s); return s; },
    getSheets: () => sheets.slice(),
    deleteSheet(sheet) { const i = sheets.indexOf(sheet); if (i >= 0) sheets.splice(i, 1); },
    setActiveSheet(sheet) { this.active = sheet; return sheet; },
    moveActiveSheet(position) {
      const i = sheets.indexOf(this.active);
      if (i >= 0) { sheets.splice(i, 1); sheets.splice(position - 1, 0, this.active); }
    },
    getSpreadsheetTimeZone: () => "Asia/Singapore",
    sheets,
  };

  const SpreadsheetApp = {
    getActiveSpreadsheet: () => spreadsheet,
    newDataValidation: () => ({
      requireValueInRange(range) { this.range = range; return this; },
      setAllowInvalid(v) { this.allowInvalid = v; return this; },
      build() { return { range: this.range, allowInvalid: this.allowInvalid }; },
    }),
  };

  return { SpreadsheetApp, spreadsheet };
}

export const stubs = {
  ContentService: {
    MimeType: { JSON: "JSON" },
    createTextOutput: (text) => ({ text, setMimeType() { return this; } }),
  },
  PropertiesService: {
    getScriptProperties: () => ({ getProperty: () => null, setProperty: () => {} }),
  },
  Utilities: {
    getUuid: () => "test-uuid",
    formatDate: (date) => date.toISOString().slice(0, 10),
  },
  LockService: {
    getScriptLock: () => ({ waitLock() {}, releaseLock() {} }),
  },
  Logger: { log: () => {} },
};
