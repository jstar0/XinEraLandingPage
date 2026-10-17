import test from "node:test";
import assert from "node:assert/strict";
import {
  blendWorldTime,
  cycleHour,
  cycleSelectionHour,
  localHour,
  sampleWorldTime,
  WORLD_DAY_MS,
} from "../features/world/scene/world-time";

const closeTo = (actual: number, expected: number, tolerance = 1e-10) =>
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );

test("a visible minute completes the day while preserving the arrival hour", () => {
  assert.equal(WORLD_DAY_MS, 60_000);
  closeTo(cycleHour(8.25, 0), 8.25);
  closeTo(cycleHour(8.25, 15_000), 14.25);
  closeTo(cycleHour(8.25, 30_000), 20.25);
  closeTo(cycleHour(8.25, WORLD_DAY_MS), 8.25);
  closeTo(cycleHour(8.25, WORLD_DAY_MS * 10_000), 8.25);
});

test("the scene clock wraps at midnight and stays inside the 24-hour interval", () => {
  closeTo(cycleHour(23, 2_500), 0);
  closeTo(cycleHour(23, 5_000), 1);
  closeTo(cycleHour(1, -5_000), 23);
  closeTo(cycleHour(48, 0), 0);
  for (let elapsed = -120_000; elapsed <= 120_000; elapsed += 137) {
    const hour = cycleHour(23.9, elapsed);
    assert.ok(hour >= 0 && hour < 24);
  }
});

test("local time includes local hours, minutes, seconds and milliseconds", () => {
  const date = new Date(2026, 9, 17, 8, 30, 45, 500);
  closeTo(localHour(date), 8 + 30 / 60 + 45 / 3_600 + 500 / 3_600_000);
  closeTo(localHour(new Date(2026, 9, 17, 0, 0, 0, 0)), 0);
});

test("selecting the full cycle leaves natural night, but preserves daylight", () => {
  for (const hour of [0, 3, 5, 19, 21, 23.9]) {
    const target = cycleSelectionHour(hour);
    assert.equal(target, 8);
    assert.equal(sampleWorldTime(target).night, 0);
    assert.equal(sampleWorldTime(target).period, "morning");
  }
  for (const hour of [7, 8.25, 12, 15.5, 17]) {
    assert.equal(cycleSelectionHour(hour), hour);
  }
});

test("the natural day distinguishes dawn, morning, noon, afternoon, dusk and night", () => {
  const periods = [
    [0, "night", "夜间"],
    [5, "dawn", "黎明"],
    [7, "morning", "上午"],
    [11, "noon", "正午"],
    [13, "afternoon", "午后"],
    [17, "dusk", "黄昏"],
    [19, "night", "夜间"],
  ] as const;
  for (const [hour, period, label] of periods) {
    const sample = sampleWorldTime(hour);
    assert.equal(sample.period, period);
    assert.equal(sample.label, label);
  }
  assert.equal(sampleWorldTime(12).night, 0);
  assert.equal(sampleWorldTime(12).warmth, 0);
  assert.equal(sampleWorldTime(0).night, 1);
  assert.equal(sampleWorldTime(0).warmth, 0);
  assert.ok(sampleWorldTime(7).warmth > sampleWorldTime(10).warmth);
  closeTo(sampleWorldTime(7).warmth, sampleWorldTime(17).warmth);
});

test("the natural sun makes one continuous circle including the midnight seam", () => {
  let previous = sampleWorldTime(0);
  for (let step = 1; step <= 2_400; step++) {
    const next = sampleWorldTime(step / 100);
    assert.ok(
      Math.hypot(
        Math.sin(next.orbit) - Math.sin(previous.orbit),
        Math.cos(next.orbit) - Math.cos(previous.orbit),
      ) < 0.003,
    );
    assert.ok(Math.abs(next.night - previous.night) < 0.02);
    assert.ok(Math.abs(next.warmth - previous.warmth) < 0.03);
    previous = next;
  }
  closeTo(sampleWorldTime(0).orbit, -Math.PI);
  closeTo(sampleWorldTime(6).orbit, -Math.PI / 2);
  closeTo(sampleWorldTime(12).orbit, 0);
  closeTo(sampleWorldTime(18).orbit, Math.PI / 2);
  assert.deepEqual(sampleWorldTime(24), sampleWorldTime(0));
});

test("dark mode takes the moon across one upper night arc without reversing", () => {
  let previous = sampleWorldTime(0, 1);
  for (let step = 0; step < 2_400; step++) {
    const sample = sampleWorldTime(step / 100, 1);
    assert.equal(sample.night, 1);
    assert.equal(sample.warmth, 0);
    assert.equal(sample.sunVisibility, 0);
    assert.equal(sample.period, "night");
    assert.equal(sample.label, "夜间");
    assert.ok(-Math.cos(sample.orbit) >= -1e-10);
    assert.ok(sample.orbit >= previous.orbit);
    assert.ok(sample.orbit - previous.orbit < 0.002);
    assert.ok(-Math.sin(sample.orbit) >= -Math.sin(previous.orbit));
    previous = sample;
  }
  closeTo(-Math.sin(sampleWorldTime(0, 1).orbit), -1);
  closeTo(-Math.cos(sampleWorldTime(12, 1).orbit), 1);
  closeTo(-Math.sin(sampleWorldTime(23.999, 1).orbit), 1, 1e-7);
  // The only positional reset occurs at the horizon, hidden by the renderer.
  assert.ok(Math.abs(Math.cos(previous.orbit)) < 0.002);
  closeTo(Math.cos(sampleWorldTime(24, 1).orbit), 0);
  assert.deepEqual(sampleWorldTime(0, 1), sampleWorldTime(24, 1));
});

test("partial mode samples bound lighting and advance toward the night arc", () => {
  for (const hour of [0, 5, 8, 12, 17, 23.999]) {
    const day = sampleWorldTime(hour);
    const dark = sampleWorldTime(hour, 1);
    let previous = day;
    for (let step = 0; step <= 100; step++) {
      const sample = sampleWorldTime(hour, step / 100);
      assert.ok(sample.night >= previous.night && sample.night <= 1);
      assert.ok(sample.warmth <= previous.warmth && sample.warmth >= 0);
      assert.ok(sample.orbit >= previous.orbit - 1e-10);
      closeTo(sample.sunVisibility, 1 - step / 100);
      previous = sample;
    }
    const midpoint = sampleWorldTime(hour, 0.5);
    closeTo(midpoint.orbit, (day.orbit + dark.orbit) / 2);
    assert.deepEqual(sampleWorldTime(hour, -5), day);
    assert.deepEqual(sampleWorldTime(hour, 5), dark);
  }
});

function assertForwardBlend(
  from: ReturnType<typeof sampleWorldTime>,
  to: typeof from,
) {
  let previous = from;
  for (let step = 0; step <= 100; step++) {
    const frame = blendWorldTime(from, to, step / 100);
    assert.equal(frame.hour, to.hour);
    assert.ok(frame.orbit >= previous.orbit);
    assert.ok(frame.orbit - from.orbit < Math.PI * 2);
    for (const channel of ["night", "warmth", "sunVisibility"] as const) {
      assert.ok(frame[channel] >= Math.min(from[channel], to[channel]) - 1e-10);
      assert.ok(frame[channel] <= Math.max(from[channel], to[channel]) + 1e-10);
    }
    assert.equal(frame.period, step < 50 ? from.period : to.period);
    assert.equal(frame.label, step < 50 ? from.label : to.label);
    previous = frame;
  }
  // An unwrapped forward angle can differ from the target by complete turns.
  closeTo(Math.sin(previous.orbit), Math.sin(to.orbit));
  closeTo(Math.cos(previous.orbit), Math.cos(to.orbit));
  closeTo(previous.night, to.night);
  closeTo(previous.warmth, to.warmth);
  closeTo(previous.sunVisibility, to.sunVisibility);
  return previous;
}

test("both theme changes keep orbit moving forward and reach the target direction", () => {
  for (const hour of [0, 5, 8, 12, 17, 23.999]) {
    const day = sampleWorldTime(hour);
    const dark = sampleWorldTime(hour, 1);
    assertForwardBlend(day, dark);
    assertForwardBlend(dark, day);
    closeTo(blendWorldTime(day, day, 1).orbit, day.orbit);
    assert.deepEqual(
      blendWorldTime(day, dark, -1),
      blendWorldTime(day, dark, 0),
    );
    assert.deepEqual(
      blendWorldTime(day, dark, 2),
      blendWorldTime(day, dark, 1),
    );
  }
});

test("interrupting a theme change uses its current frame without turning backward", () => {
  for (const hour of [0, 6, 12, 18, 23.999]) {
    const day = sampleWorldTime(hour);
    const dark = sampleWorldTime(hour, 1);
    for (const progress of [0.01, 0.25, 0.5, 0.75, 0.99]) {
      let current = blendWorldTime(day, dark, progress);
      for (let turn = 0; turn < 4; turn++) {
        const target = turn % 2 === 0 ? day : dark;
        const start = blendWorldTime(current, target, 0);
        assert.deepEqual(start, current);
        assertForwardBlend(current, target);
        current = blendWorldTime(current, target, progress);
      }
    }
  }
});
