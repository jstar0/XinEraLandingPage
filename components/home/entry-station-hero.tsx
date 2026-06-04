"use client";

import React, { useEffect, useRef, type CSSProperties } from "react";

import {
  createTileRenderSnapshot,
  formatTileRenderSnapshot,
  resolveHeroFrameInterval,
  resolveHeroGridDefinition,
  resolveHeroRenderProfile,
  shouldRunHeroAnimationLoop,
  tileRenderSnapshotChanged,
  type HeroGridDefinition,
  type TileRenderSnapshot,
} from "./entry-station-hero-runtime";
import {
  buildHeroGridTiles,
  collectActiveTileIndices,
  createHoverPulse,
  resolveTileVisualState,
  type GridPoint,
  type GridPointer,
  type GridPulse,
} from "./hero-grid-motion";

type EntryStationHeroProps = {
  imageAlt: string;
  imageSrc: string;
};

type TileRefs = {
  edge: HTMLDivElement | null;
  glow: HTMLDivElement | null;
  highlight: HTMLDivElement | null;
  tile: HTMLDivElement | null;
};

type FrameRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function EntryStationHero({
  imageAlt,
  imageSrc,
}: EntryStationHeroProps) {
  const [renderProfile, setRenderProfile] = React.useState<"full" | "light">(() =>
    typeof window === "undefined" ? "full" : resolveHeroRenderProfile(window.navigator.userAgent),
  );
  const [gridDefinition, setGridDefinition] = React.useState<HeroGridDefinition>(() =>
    resolveHeroGridDefinition(
      typeof window === "undefined" ? "full" : resolveHeroRenderProfile(window.navigator.userAgent),
    ),
  );
  const frameRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<GridPointer>({ active: false, x: 0.5, y: 0.5 });
  const pulsesRef = useRef<GridPulse[]>([]);
  const previousPointRef = useRef<GridPoint>({ x: 0.5, y: 0.5 });
  const frameRectRef = useRef<FrameRect | null>(null);
  const inViewportRef = useRef(true);
  const lastRippleRef = useRef(0);
  const lastPaintRef = useRef(0);
  const rafRef = useRef<number>();
  const tileRefs = useRef<TileRefs[]>([]);
  const tileSnapshotRef = useRef<Array<TileRenderSnapshot | null>>([]);
  const previousActiveIndicesRef = useRef<number[]>([]);

  const tiles = React.useMemo(
    () => buildHeroGridTiles(gridDefinition.columns, gridDefinition.rows),
    [gridDefinition.columns, gridDefinition.rows],
  );
  const tileBackgroundSize = React.useMemo(
    () => `${gridDefinition.columns * 100}% ${gridDefinition.rows * 100}%`,
    [gridDefinition.columns, gridDefinition.rows],
  );

  useEffect(() => {
    const node = frameRef.current;

    if (!node) {
      return;
    }

    const frame = node;
    const resolvedRenderProfile = resolveHeroRenderProfile(window.navigator.userAgent);
    setRenderProfile(resolvedRenderProfile);
    setGridDefinition(resolveHeroGridDefinition(resolvedRenderProfile));
    tileSnapshotRef.current = [];
    previousActiveIndicesRef.current = [];

    function updateFrameRect() {
      const rect = frame.getBoundingClientRect();

      frameRectRef.current = {
        height: rect.height,
        left: rect.left,
        top: rect.top,
        width: rect.width,
      };
    }

    function hasRenderableBox() {
      const rect = frameRectRef.current;

      return Boolean(rect && rect.width > 0 && rect.height > 0);
    }

    function pointFromPointer(event: PointerEvent): GridPoint {
      const rect = frameRectRef.current;

      if (!rect) {
        updateFrameRect();
      }

      const nextRect = frameRectRef.current;

      if (!nextRect) {
        return { x: 0.5, y: 0.5 };
      }

      return {
        x: clamp((event.clientX - nextRect.left) / nextRect.width, 0, 1),
        y: clamp((event.clientY - nextRect.top) / nextRect.height, 0, 1),
      };
    }

    function maybeSpawnPulse(point: GridPoint, now: number, force = false) {
      const delta = Math.hypot(point.x - previousPointRef.current.x, point.y - previousPointRef.current.y);

      if (!force && (now - lastRippleRef.current < 170 || delta < 0.055)) {
        return;
      }

      pulsesRef.current.push(createHoverPulse(point, now));
      lastRippleRef.current = now;
      previousPointRef.current = point;
    }

    function handlePointer(event: PointerEvent, forcePulse = false) {
      const point = pointFromPointer(event);
      const now = performance.now();

      pointerRef.current = {
        active: true,
        ...point,
      };

      maybeSpawnPulse(point, now, forcePulse);
    }

    function onPointerEnter(event: PointerEvent) {
      updateFrameRect();
      handlePointer(event, true);
      queueNextFrame();
    }

    function onPointerMove(event: PointerEvent) {
      handlePointer(event);
      queueNextFrame();
    }

    function onPointerLeave() {
      pointerRef.current = {
        active: false,
        x: pointerRef.current.x,
        y: pointerRef.current.y,
      };
    }

    updateFrameRect();

    frame.addEventListener("pointerenter", onPointerEnter);
    frame.addEventListener("pointermove", onPointerMove);
    frame.addEventListener("pointerleave", onPointerLeave);

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observer = new IntersectionObserver(
      ([entry]) => {
        inViewportRef.current = entry?.isIntersecting ?? false;

        if (inViewportRef.current) {
          queueNextFrame();
        }
      },
      {
        threshold: 0.01,
      },
    );
    const resizeObserver = new ResizeObserver(() => {
      updateFrameRect();
      queueNextFrame();
    });

    observer.observe(frame);
    resizeObserver.observe(frame);
    const handleResize = () => {
      updateFrameRect();
      queueNextFrame();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        queueNextFrame();
      }
    };
    const handleReducedMotionChange = () => {
      queueNextFrame();
    };

    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleReducedMotionChange);
    } else {
      mediaQuery.addListener(handleReducedMotionChange);
    }

    function queueNextFrame() {
      if (rafRef.current !== undefined) {
        return;
      }

      rafRef.current = window.requestAnimationFrame(paint);
    }

    function paint(now: number) {
      rafRef.current = undefined;

      if (document.visibilityState !== "visible") {
        return;
      }

      const reducedMotion = mediaQuery.matches;
      const activePulses = pulsesRef.current.filter((pulse) => now - pulse.createdAt <= pulse.duration);
      pulsesRef.current = reducedMotion ? [] : activePulses;

      const shouldRun = shouldRunHeroAnimationLoop({
        documentVisible: document.visibilityState === "visible",
        hasRenderableBox: hasRenderableBox(),
        inViewport: inViewportRef.current,
        pointerActive: pointerRef.current.active,
        pulseCount: pulsesRef.current.length,
        reducedMotion,
      });

      if (!shouldRun) {
        return;
      }

      const frameInterval = resolveHeroFrameInterval({
        pointerActive: pointerRef.current.active,
        pulseCount: pulsesRef.current.length,
        renderProfile: resolvedRenderProfile,
      });

      if (now - lastPaintRef.current < frameInterval) {
        queueNextFrame();
        return;
      }

      lastPaintRef.current = now;

      const currentActiveIndices = collectActiveTileIndices({
        columns: gridDefinition.columns,
        pointer: pointerRef.current,
        pulses: pulsesRef.current,
        rows: gridDefinition.rows,
        time: reducedMotion ? 0 : now,
      });
      const activeIndexSet = new Set<number>(previousActiveIndicesRef.current);
      for (const index of currentActiveIndices) {
        activeIndexSet.add(index);
      }
      previousActiveIndicesRef.current = currentActiveIndices;

      for (const index of Array.from(activeIndexSet)) {
        const tile = tiles[index];
        const refs = tileRefs.current[index];

        if (!tile || !refs?.tile || !refs.glow || !refs.edge || !refs.highlight) {
          continue;
        }

        const state = resolveTileVisualState({
          point: tile,
          pointer: pointerRef.current,
          pulses: pulsesRef.current,
          time: reducedMotion ? 0 : now,
        });
        const snapshot = createTileRenderSnapshot(state, resolvedRenderProfile);

        if (!tileRenderSnapshotChanged(tileSnapshotRef.current[index] ?? null, snapshot)) {
          continue;
        }

        const formattedSnapshot = formatTileRenderSnapshot(snapshot);

        refs.tile.style.transform = formattedSnapshot.transform;
        refs.glow.style.opacity = formattedSnapshot.glowOpacity;
        refs.edge.style.opacity = formattedSnapshot.edgeOpacity;
        refs.highlight.style.opacity = formattedSnapshot.highlightOpacity;
        tileSnapshotRef.current[index] = snapshot;
      }

      queueNextFrame();
    }

    queueNextFrame();

    return () => {
      frame.removeEventListener("pointerenter", onPointerEnter);
      frame.removeEventListener("pointermove", onPointerMove);
      frame.removeEventListener("pointerleave", onPointerLeave);
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.removeEventListener("change", handleReducedMotionChange);
      } else {
        mediaQuery.removeListener(handleReducedMotionChange);
      }

      if (rafRef.current !== undefined) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
      }
    };
  }, [gridDefinition.columns, gridDefinition.rows, tiles]);

  return (
    <div
      ref={frameRef}
      data-grid-columns={gridDefinition.columns}
      data-grid-rows={gridDefinition.rows}
      data-hero-grid="entry-station"
      className="group relative mx-auto aspect-[11/8] w-full max-w-[720px] touch-none select-none"
    >
      <div className="pointer-events-none absolute inset-[-8%_-6%_10%_-6%] bg-[radial-gradient(circle_at_50%_55%,rgba(47,211,213,0.18),transparent_36%),radial-gradient(circle_at_50%_110%,rgba(12,71,76,0.52),transparent_30%)] blur-2xl" />
      <div className="pointer-events-none absolute inset-x-[10%] bottom-[-6%] h-[16%] bg-[radial-gradient(circle,rgba(47,211,213,0.2),rgba(47,211,213,0.04)_42%,transparent_72%)] blur-xl" />

      <div className="relative h-full w-full [perspective:1800px]">
        <div className="absolute inset-[4%_3%] [transform-style:preserve-3d] [transform:rotateX(12deg)_rotateY(-18deg)_rotateZ(-1.9deg)] md:inset-[3.5%_2.5%]">
          <div className="absolute inset-[-1px] bg-[linear-gradient(135deg,rgba(47,211,213,0.32),rgba(255,255,255,0.06)_42%,rgba(47,211,213,0.22))] opacity-65" />
          <div className="absolute inset-[1px] overflow-hidden bg-[#05080b] shadow-[0_20px_50px_rgba(0,0,0,0.42)]">
            <img
              src={imageSrc}
              alt={imageAlt}
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.42] grayscale"
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,8,11,0.06),rgba(5,8,11,0.18)),linear-gradient(135deg,rgba(47,211,213,0.1),transparent_36%,rgba(212,169,94,0.06)_82%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.045)_0,rgba(255,255,255,0.045)_1px,transparent_1px,transparent_4px)] opacity-30 mix-blend-screen" />

            {tiles.map((tile, index) => {
              const tileStyle: CSSProperties = {
                height: `${100 / gridDefinition.rows}%`,
                left: `${(tile.col * 100) / gridDefinition.columns}%`,
                top: `${(tile.row * 100) / gridDefinition.rows}%`,
                width: `${100 / gridDefinition.columns}%`,
              };
              const faceStyle: CSSProperties = {
                backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0)), url(${imageSrc})`,
                backgroundPosition: tile.backgroundPosition,
                backgroundSize: tileBackgroundSize,
              };

              return (
                <div
                  key={tile.id}
                  style={tileStyle}
                  className="absolute p-[1px]"
                  ref={(node) => {
                    tileRefs.current[index] = {
                      ...tileRefs.current[index],
                      tile: node,
                    };
                  }}
                >
                  <div
                    style={faceStyle}
                    className="absolute inset-0 overflow-hidden border border-[rgba(202,224,228,0.12)] bg-[#091015] bg-cover bg-no-repeat shadow-[inset_0_0_0_1px_rgba(255,255,255,0.025)]"
                  />
                  <div
                    className={`pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent_0_38%,rgba(224,247,247,0.18)_50%,transparent_62%),linear-gradient(180deg,transparent_0_38%,rgba(224,247,247,0.18)_50%,transparent_62%)] opacity-0 ${
                      renderProfile === "light" ? "" : "mix-blend-screen"
                    }`}
                    ref={(node) => {
                      tileRefs.current[index] = {
                        ...tileRefs.current[index],
                        highlight: node,
                      };
                    }}
                  />
                  <div
                    className={`pointer-events-none absolute inset-0 border border-[rgba(47,211,213,0.34)] opacity-0 ${
                      gridDefinition.layerMode === "compact"
                        ? "shadow-[inset_0_0_4px_rgba(255,255,255,0.025)]"
                        : renderProfile === "light"
                          ? "shadow-[inset_0_0_6px_rgba(255,255,255,0.04)]"
                          : "shadow-[0_0_18px_rgba(47,211,213,0.16),inset_0_0_10px_rgba(255,255,255,0.05)]"
                    }`}
                    ref={(node) => {
                      tileRefs.current[index] = {
                        ...tileRefs.current[index],
                        glow: node,
                      };
                    }}
                  />
                  <div
                    className={`pointer-events-none absolute inset-x-[10%] bottom-[-10px] h-[12px] bg-[linear-gradient(180deg,rgba(47,211,213,0.55),rgba(16,53,58,0.06))] opacity-0 ${
                      gridDefinition.layerMode === "compact" ? "" : renderProfile === "light" ? "" : "blur-[6px]"
                    }`}
                    ref={(node) => {
                      tileRefs.current[index] = {
                        ...tileRefs.current[index],
                        edge: node,
                      };
                    }}
                  />
                </div>
              );
            })}

            <div
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(196,214,218,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(196,214,218,0.08)_1px,transparent_1px)] opacity-55"
              style={{
                backgroundSize: `calc(100%/${gridDefinition.columns}) calc(100%/${gridDefinition.rows})`,
              }}
            />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,255,255,0.12),transparent_24%),linear-gradient(180deg,transparent_0%,rgba(5,8,11,0.24)_72%,rgba(5,8,11,0.65)_100%)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
