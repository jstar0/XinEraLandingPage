import assert from "node:assert/strict";
import test from "node:test";

type NumericSnapshot = {
  edgeOpacity: number;
  glowOpacity: number;
  highlightOpacity: number;
  translateX: number;
  translateY: number;
};

type RuntimeModule = {
  createTileRenderSnapshot: (
    input: {
      edgeOpacity: number;
      glowOpacity: number;
      highlightOpacity: number;
      lift: number;
      translateX: number;
      translateY: number;
    },
    renderProfile?: "full" | "light",
  ) => NumericSnapshot;
  formatTileRenderSnapshot: (input: NumericSnapshot) => {
    edgeOpacity: string;
    glowOpacity: string;
    highlightOpacity: string;
    transform: string;
  };
  shouldRunHeroAnimationLoop: (input: {
    documentVisible: boolean;
    hasRenderableBox: boolean;
    inViewport: boolean;
    pointerActive: boolean;
    pulseCount: number;
    reducedMotion: boolean;
  }) => boolean;
  resolveHeroFrameInterval: (input: {
    pointerActive: boolean;
    pulseCount: number;
    renderProfile: "full" | "light";
  }) => number;
  resolveHeroGridDefinition: (renderProfile: "full" | "light") => {
    columns: number;
    layerMode: "compact" | "full";
    rows: number;
  };
  tileRenderSnapshotChanged: (
    previous: NumericSnapshot | null,
    next: NumericSnapshot,
  ) => boolean;
  resolveHeroRenderProfile: (userAgent: string) => "full" | "light";
};

async function loadRuntimeModule(): Promise<RuntimeModule> {
  try {
    return await import("../components/home/entry-station-hero-runtime");
  } catch {
    return {
      createTileRenderSnapshot: () => ({
        edgeOpacity: 0,
        glowOpacity: 0,
        highlightOpacity: 0,
        translateX: 0,
        translateY: 0,
      }),
      formatTileRenderSnapshot: () => ({
        edgeOpacity: "",
        glowOpacity: "",
        highlightOpacity: "",
        transform: "",
      }),
      shouldRunHeroAnimationLoop: () => false,
      resolveHeroFrameInterval: () => 42,
      resolveHeroGridDefinition: () => ({
        columns: 24,
        layerMode: "full",
        rows: 14,
      }),
      tileRenderSnapshotChanged: () => false,
      resolveHeroRenderProfile: () => "full",
    };
  }
}

test("hero animation loop only runs when the instance is actually visible", async () => {
  const runtime = await loadRuntimeModule();

  assert.equal(
    runtime.shouldRunHeroAnimationLoop({
      documentVisible: true,
      hasRenderableBox: true,
      inViewport: true,
      pointerActive: false,
      pulseCount: 0,
      reducedMotion: false,
    }),
    true,
  );

  assert.equal(
    runtime.shouldRunHeroAnimationLoop({
      documentVisible: true,
      hasRenderableBox: false,
      inViewport: true,
      pointerActive: false,
      pulseCount: 0,
      reducedMotion: false,
    }),
    false,
  );

  assert.equal(
    runtime.shouldRunHeroAnimationLoop({
      documentVisible: false,
      hasRenderableBox: true,
      inViewport: true,
      pointerActive: false,
      pulseCount: 0,
      reducedMotion: false,
    }),
    false,
  );

  assert.equal(
    runtime.shouldRunHeroAnimationLoop({
      documentVisible: true,
      hasRenderableBox: true,
      inViewport: false,
      pointerActive: false,
      pulseCount: 0,
      reducedMotion: false,
    }),
    false,
  );
});

test("reduced motion disables idle looping but keeps active interaction frames eligible", async () => {
  const runtime = await loadRuntimeModule();

  assert.equal(
    runtime.shouldRunHeroAnimationLoop({
      documentVisible: true,
      hasRenderableBox: true,
      inViewport: true,
      pointerActive: false,
      pulseCount: 0,
      reducedMotion: true,
    }),
    false,
  );

  assert.equal(
    runtime.shouldRunHeroAnimationLoop({
      documentVisible: true,
      hasRenderableBox: true,
      inViewport: true,
      pointerActive: true,
      pulseCount: 0,
      reducedMotion: true,
    }),
    true,
  );

  assert.equal(
    runtime.shouldRunHeroAnimationLoop({
      documentVisible: true,
      hasRenderableBox: true,
      inViewport: true,
      pointerActive: false,
      pulseCount: 2,
      reducedMotion: true,
    }),
    true,
  );
});

test("light render profile slows idle cadence but keeps active cadence intact", async () => {
  const runtime = await loadRuntimeModule();

  assert.equal(
    runtime.resolveHeroFrameInterval({
      pointerActive: false,
      pulseCount: 0,
      renderProfile: "full",
    }),
    42,
  );
  assert.equal(
    runtime.resolveHeroFrameInterval({
      pointerActive: false,
      pulseCount: 0,
      renderProfile: "light",
    }),
    72,
  );
  assert.equal(
    runtime.resolveHeroFrameInterval({
      pointerActive: true,
      pulseCount: 0,
      renderProfile: "light",
    }),
    28,
  );
  assert.equal(
    runtime.resolveHeroFrameInterval({
      pointerActive: false,
      pulseCount: 1,
      renderProfile: "light",
    }),
    28,
  );
});

test("light render profile also reduces grid density and overlay complexity", async () => {
  const runtime = await loadRuntimeModule();

  assert.deepEqual(runtime.resolveHeroGridDefinition("full"), {
    columns: 24,
    layerMode: "full",
    rows: 14,
  });
  assert.deepEqual(runtime.resolveHeroGridDefinition("light"), {
    columns: 18,
    layerMode: "compact",
    rows: 10,
  });
});

test("tile snapshots are quantized before formatting and light profile clamps expensive opacity ranges", async () => {
  const runtime = await loadRuntimeModule();

  const base = runtime.createTileRenderSnapshot(
    {
      edgeOpacity: 0.33331,
      glowOpacity: 0.44441,
      highlightOpacity: 0.55551,
      lift: 10,
      translateX: -1.2344,
      translateY: -5.6784,
    },
    "full",
  );
  const visuallyEqual = runtime.createTileRenderSnapshot(
    {
      edgeOpacity: 0.33329,
      glowOpacity: 0.44439,
      highlightOpacity: 0.55559,
      lift: 10,
      translateX: -1.23441,
      translateY: -5.67839,
    },
    "full",
  );
  const light = runtime.createTileRenderSnapshot(
    {
      edgeOpacity: 0.33331,
      glowOpacity: 0.44441,
      highlightOpacity: 0.55551,
      lift: 10,
      translateX: -1.2344,
      translateY: -5.6784,
    },
    "light",
  );
  const visiblyDifferent = runtime.createTileRenderSnapshot(
    {
      edgeOpacity: 0.36,
      glowOpacity: 0.48,
      highlightOpacity: 0.62,
      lift: 12,
      translateX: -1.4,
      translateY: -6.2,
    },
    "full",
  );
  const formatted = runtime.formatTileRenderSnapshot(base);

  assert.deepEqual(base, {
    edgeOpacity: 0.333,
    glowOpacity: 0.444,
    highlightOpacity: 0.556,
    translateX: -1.23,
    translateY: -5.68,
  });
  assert.deepEqual(light, {
    edgeOpacity: 0.12,
    glowOpacity: 0.18,
    highlightOpacity: 0.16,
    translateX: -1.23,
    translateY: -5.68,
  });
  assert.match(formatted.transform, /^translate3d\(-1\.23px, -5\.68px, 0\)$/);
  assert.equal(runtime.tileRenderSnapshotChanged(null, base), true);
  assert.equal(runtime.tileRenderSnapshotChanged(base, visuallyEqual), false);
  assert.equal(runtime.tileRenderSnapshotChanged(base, visiblyDifferent), true);
});

test("webkit-heavy environments resolve to the light hero render profile", async () => {
  const runtime = await loadRuntimeModule();

  assert.equal(
    runtime.resolveHeroRenderProfile(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    ),
    "light",
  );
  assert.equal(
    runtime.resolveHeroRenderProfile(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/123.0.0.0 Mobile/15E148 Safari/604.1",
    ),
    "light",
  );
  assert.equal(
    runtime.resolveHeroRenderProfile(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    ),
    "full",
  );
});
