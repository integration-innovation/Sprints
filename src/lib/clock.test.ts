import assert from "node:assert/strict";
import test from "node:test";
import { HOUR_MINUTES, PHASES, pendingReminders, phaseAt, remaining, toneAt } from "./clock.ts";

const min = (m: number) => m * 60000;

test("the phases tile the hour with no gaps and no overlaps", () => {
  for (let i = 1; i < PHASES.length; i += 1) {
    assert.equal(PHASES[i].from, PHASES[i - 1].to, `${PHASES[i - 1].label} → ${PHASES[i].label}`);
  }
  assert.equal(PHASES[0].from, 0);
  assert.equal(PHASES[PHASES.length - 2].to, HOUR_MINUTES);
});

test("each run-sheet boundary lands in the phase that starts there", () => {
  assert.equal(phaseAt(min(0)).id, "target");
  assert.equal(phaseAt(min(5)).id, "share");
  assert.equal(phaseAt(min(10)).id, "build");
  assert.equal(phaseAt(min(50)).id, "test");
  assert.equal(phaseAt(min(55)).id, "show");
  assert.equal(phaseAt(min(60)).id, "over");
  assert.equal(phaseAt(min(90)).id, "over");
});

test("a clock started in the future reads as minute zero, not as an error", () => {
  assert.equal(phaseAt(-5000).id, "target");
  assert.equal(remaining(-5000).text, "60:00");
});

test("tone changes only at the boundaries a person can act on", () => {
  assert.equal(toneAt(min(49.99)), "calm");
  assert.equal(toneAt(min(50)), "closing");
  assert.equal(toneAt(min(59.99)), "closing");
  assert.equal(toneAt(min(60)), "over");
});

test("remaining counts down to zero and stays there", () => {
  assert.equal(remaining(0).text, "60:00");
  assert.equal(remaining(min(52) + 30000).text, "07:30");
  assert.equal(remaining(min(60)).text, "00:00");
  assert.equal(remaining(min(75)).text, "00:00");
});

test("reminders already passed are not scheduled again", () => {
  assert.deepEqual(pendingReminders(0).map((r) => r.inMs), [min(50), min(55)]);
  assert.deepEqual(pendingReminders(min(52)).map((r) => r.inMs), [min(3)]);
  assert.deepEqual(pendingReminders(min(58)), []);
});
