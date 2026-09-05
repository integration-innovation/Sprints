import assert from "node:assert/strict";
import test from "node:test";
import { addDays, addWeeks, formatDate, weekdayName } from "./dates.ts";

test("a day step lands on the next day", () => {
  assert.equal(addDays("2026-09-05", 1), "2026-09-06");
  assert.equal(addDays("2026-09-05", 3), "2026-09-08");
  assert.equal(addDays("2026-09-05", 0), "2026-09-05");
});

test("a day step crosses months and years", () => {
  assert.equal(addDays("2026-09-30", 1), "2026-10-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-01-31", 1), "2026-02-01");
});

test("a day step handles a leap day", () => {
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2028-02-29", 1), "2028-03-01");
  assert.equal(addDays("2027-02-28", 1), "2027-03-01");
});

test("weeks are days, so the two agree", () => {
  assert.equal(addWeeks("2026-09-05", 2), addDays("2026-09-05", 14));
  assert.equal(addWeeks("2026-09-05", 1), "2026-09-12");
  assert.equal(addWeeks("2026-12-27", 1), "2027-01-03");
});

test("dates stay put across a clock change, being plain calendar days", () => {
  // The UK moves its clocks on 25 October 2026; a calendar day must not shift.
  assert.equal(addDays("2026-10-24", 1), "2026-10-25");
  assert.equal(addDays("2026-10-25", 1), "2026-10-26");
  assert.equal(weekdayName("2026-10-25"), "Sunday");
});

test("a run of daily sprints produces consecutive days", () => {
  const start = "2026-09-05";
  const dates = Array.from({ length: 6 }, (_, i) => addDays(start, i * 1));
  assert.deepEqual(dates, [
    "2026-09-05", "2026-09-06", "2026-09-07", "2026-09-08", "2026-09-09", "2026-09-10",
  ]);
});

test("a run of bi-weekly sprints stays a fortnight apart", () => {
  const dates = Array.from({ length: 4 }, (_, i) => addWeeks("2026-09-05", i * 2));
  assert.deepEqual(dates, ["2026-09-05", "2026-09-19", "2026-10-03", "2026-10-17"]);
});

test("formatting and weekday naming read as calendar days", () => {
  assert.equal(formatDate("2026-09-05"), "5 Sept 2026");
  assert.equal(weekdayName("2026-09-05"), "Saturday");
});
