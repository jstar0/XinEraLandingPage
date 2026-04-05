import assert from "node:assert/strict";
import test from "node:test";

type RuntimeModule = {
  formatTileRenderSnapshot: (input: {
    edgeOpacity: number;
    glowOpacity: number;
    highlightOpacity: number;
    lift: number;
    translateX: number;
    translateY: number;
  }) => {
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
  tileRenderSnapshotChanged: (
    previous:
      | {
          edgeOpacity: string;
          glowOpacity: string;
          highlightOpacity: string;
          transform: string;
        }
      | null,
    next: {
      edgeOpacity: string;
      glowOpacity: string;
      highlightOpacity: string;
      transform: string;
    },
      ) => boolean;
  resolveHeroRenderProfile: (userAgent: string) => "full" | "light";
};

async function loadRuntimeModule(): Promise<RuntimeModule> {
  try {
    return await import("../components/home/entry-station-hero-runtime");
  } catch {
    return {
      formatTileRenderSnapshot: () => ({
        edgeOpacity: "",
        glowOpacity: "",
        highlightOpacity: "",
        transform: "",
      }),
      shouldRunHeroAnimationLoop: () => false,
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

test("tile snapshots are rounded and only count as changed when rendered output changes", async () => {
  const runtime = await loadRuntimeModule();

  const base = runtime.formatTileRenderSnapshot({
    edgeOpacity: 0.33331,
    glowOpacity: 0.44441,
    highlightOpacity: 0.55551,
    lift: 10,
    translateX: -1.2344,
    translateY: -5.6784,
  });
  const visuallyEqual = runtime.formatTileRenderSnapshot({
    edgeOpacity: 0.33329,
    glowOpacity: 0.44439,
    highlightOpacity: 0.55559,
    lift: 10,
    translateX: -1.23441,
    translateY: -5.67839,
  });
  const visiblyDifferent = runtime.formatTileRenderSnapshot({
    edgeOpacity: 0.36,
    glowOpacity: 0.48,
    highlightOpacity: 0.62,
    lift: 12,
    translateX: -1.4,
    translateY: -6.2,
  });

  assert.match(base.transform, /^translate3d\(-1\.23px, -5\.68px, 0\)$/);
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
