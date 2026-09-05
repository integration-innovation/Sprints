import assert from "node:assert/strict";
import test from "node:test";
import { REFERENCE_NOTICES, REQUIRED_NOTICES } from "./notices.ts";

test("the storage warning is on the page, not behind the menu", () => {
  // The whole point of splitting these lists is which side this one lands on.
  // A programme that vanishes with the browser is not a footnote.
  const front = REQUIRED_NOTICES.map((n) => `${n.title} ${n.body}`).join(" ");
  assert.match(front, /stays in this browser/i);
  assert.match(front, /back it up|connect a google sheet/i);
});

test("recording other people is stated before anyone starts", () => {
  const front = REQUIRED_NOTICES.map((n) => n.title).join(" ");
  assert.match(front, /recording other people/i);
});

test("neither list is empty, so a page rendering one is never blank", () => {
  assert.ok(REQUIRED_NOTICES.length > 0);
  assert.ok(REFERENCE_NOTICES.length > 0);
});

test("the front page stays short enough to be read", () => {
  // Four is the point at which people stop reading and the list stops working.
  assert.ok(REQUIRED_NOTICES.length <= 4, "move the extra one to the reference list");
});

test("no notice appears in both lists", () => {
  const titles = [...REQUIRED_NOTICES, ...REFERENCE_NOTICES].map((n) => n.title);
  assert.equal(new Set(titles).size, titles.length);
});

test("every notice says something, not just a heading", () => {
  for (const notice of [...REQUIRED_NOTICES, ...REFERENCE_NOTICES]) {
    assert.ok(notice.title.trim(), "a notice with no title");
    assert.ok(notice.body.trim().length > 40, `${notice.title} has no real body`);
  }
});
