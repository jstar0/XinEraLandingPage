import assert from "node:assert/strict";
import test from "node:test";

type MotionModule = {
  createHoverPulse: (origin: { x: number; y: number }, createdAt: number) => unknown;
  sampleHoverLift: (
    point: { x: number; y: number },
    pointer: { active: boolean; x: number; y: number },
  ) => number;
  sampleIdleSweepLift: (point: { x: number; y: number }, time: number) => number;
  resolveTileVisualState: (input: {
    point: { x: number; y: number };
    pointer: { active: boolean; x: number; y: number };
    pulses: unknown[];
    time: number;
  }) => {
    edgeOpacity: number;
    glowOpacity: number;
    lift: number;
    translateX: number;
    translateY: number;
  };
};

async function loadMotionModule(): Promise<MotionModule> {
  try {
    return await import("../components/home/hero-grid-motion");
  } catch {
    return {
      createHoverPulse: () => ({ missing: true }),
      sampleHoverLift: () => 0,
      sampleIdleSweepLift: () => 0,
      resolveTileVisualState: () => ({
        edgeOpacity: 0,
        glowOpacity: 0,
        lift: 0,
        translateX: 0,
        translateY: 0,
      }),
    };
  }
}

test("idle sweep favors the broad band currently crossing the grid", async () => {
  const motion = await loadMotionModule();
  const time = 4_500;

  const centerBand = motion.sampleIdleSweepLift({ x: 0.5, y: 0.45 }, time);
  const farLeft = motion.sampleIdleSweepLift({ x: 0.04, y: 0.45 }, time);
  const farRight = motion.sampleIdleSweepLift({ x: 0.92, y: 0.45 }, time);

  assert.ok(centerBand > 8, "expected the middle of the sweep to visibly lift");
  assert.ok(centerBand > farLeft * 4, "expected tiles far from the sweep to stay much flatter");
  assert.ok(centerBand > farRight * 4, "expected the sweep to remain localized instead of lifting the whole plane");
});

test("hover lift peaks at the pointer tile and falls off across nearby tiles", async () => {
  const motion = await loadMotionModule();
  const pointer = { active: true, x: 0.54, y: 0.46 };

  const center = motion.sampleHoverLift({ x: 0.54, y: 0.46 }, pointer);
  const neighbor = motion.sampleHoverLift({ x: 0.62, y: 0.46 }, pointer);
  const distant = motion.sampleHoverLift({ x: 0.88, y: 0.18 }, pointer);

  assert.ok(center > 30, "expected the hovered tile to receive the dominant lift");
  assert.ok(center > neighbor, "expected neighboring tiles to lift less than the pointer tile");
  assert.ok(neighbor > distant, "expected the hover field to decay with distance");
});

test("hover ripple stacks on top of hover lift instead of replacing it", async () => {
  const motion = await loadMotionModule();
  const pointer = { active: true, x: 0.53, y: 0.51 };
  const pulse = motion.createHoverPulse({ x: 0.53, y: 0.51 }, 0);

  const hoverOnly = motion.resolveTileVisualState({
    point: { x: 0.53, y: 0.51 },
    pointer,
    pulses: [],
    time: 240,
  });
  const hoverWithRipple = motion.resolveTileVisualState({
    point: { x: 0.53, y: 0.51 },
    pointer,
    pulses: [pulse],
    time: 240,
  });

  assert.ok(hoverOnly.lift > 30, "expected core hover lift even without a ripple");
  assert.ok(
    hoverWithRipple.lift > hoverOnly.lift,
    "expected the ripple to add to the hover field rather than override it",
  );
});

test("tile visual offsets stay shallow enough to avoid strong perspective overlap", async () => {
  const motion = await loadMotionModule();
  const pointer = { active: true, x: 0.5, y: 0.5 };
  const pulse = motion.createHoverPulse({ x: 0.5, y: 0.5 }, 0);
  const state = motion.resolveTileVisualState({
    point: { x: 0.5, y: 0.5 },
    pointer,
    pulses: [pulse],
    time: 280,
  });

  assert.ok(state.lift > 30, "expected the sampled tile to visibly lift");
  assert.ok(Math.abs(state.translateX) < state.lift * 0.03, "expected x offset to stay shallow");
  assert.ok(Math.abs(state.translateY) < state.lift * 0.1, "expected y offset to stay shallow");
  assert.ok(state.glowOpacity > 0, "expected lift to drive highlight opacity");
  assert.ok(state.edgeOpacity > 0, "expected lift to drive edge opacity");
});
