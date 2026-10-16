import test from "node:test";
import assert from "node:assert/strict";
import { heroPosition, HERO_PATH, ease } from "../features/world/scene/motion";
import { entries, findEntry } from "../features/journal/content";
import { existsSync } from "node:fs";

test("approved flight stays continuous, finite and in front of the architecture", () => {
  let previous = heroPosition(0);
  for (let i = 1; i <= 2000; i++) {
    const point = heroPosition(i / 2000);
    assert.ok(point.every(Number.isFinite));
    assert.ok(point[2] > 9);
    assert.ok(Math.hypot(...point.map((n, axis) => n - previous[axis])) < 0.1);
    previous = point;
  }
  for (const [t, x, y, z] of HERO_PATH) {
    heroPosition(t).forEach((n, axis) =>
      assert.ok(Math.abs(n - [x, y, z][axis]) < 1e-8),
    );
  }
  assert.deepEqual(heroPosition(-1), heroPosition(0));
  assert.deepEqual(heroPosition(2), heroPosition(1));
});
test("camera handing off to the courtyard fades in a bounded, monotonic interval", () => {
  let previous = 0;
  for (let i = 0; i <= 1000; i++) {
    const value = ease(0.43, 0.66, i / 1000);
    assert.ok(value >= previous && value >= 0 && value <= 1);
    previous = value;
  }
  assert.equal(ease(0.43, 0.66, 0), 0);
  assert.equal(ease(0.43, 0.66, 1), 1);
});
test("published journal entries have unique routes and real local scene assets", () => {
  assert.equal(new Set(entries.map((e) => e.slug)).size, entries.length);
  for (const entry of entries) {
    assert.equal(findEntry(entry.slug)?.title, entry.title);
    assert.ok(existsSync(`public${entry.image}`));
    assert.ok(entry.sections.every((section) => section.paragraphs.length > 0));
  }
  assert.equal(findEntry("missing-place"), undefined);
});
