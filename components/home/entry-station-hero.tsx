"use client";

import React, { useEffect, useRef, type CSSProperties } from "react";

import {
  buildHeroGridTiles,
  createHoverPulse,
  HERO_GRID_COLUMNS,
  HERO_GRID_ROWS,
  resolveTileVisualState,
  type GridPoint,
  type GridPointer,
  type GridPulse,
} from "./hero-grid-motion";

type EntryStationHeroProps = {
  imageAlt: string;
  imageSrc: string;
};

const TILES = buildHeroGridTiles();
const TILE_BACKGROUND_SIZE = `${HERO_GRID_COLUMNS * 100}% ${HERO_GRID_ROWS * 100}%`;

type TileRefs = {
  edge: HTMLDivElement | null;
  glow: HTMLDivElement | null;
  highlight: HTMLDivElement | null;
  tile: HTMLDivElement | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function EntryStationHero({
  imageAlt,
  imageSrc,
}: EntryStationHeroProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<GridPointer>({ active: false, x: 0.5, y: 0.5 });
  const pulsesRef = useRef<GridPulse[]>([]);
  const previousPointRef = useRef<GridPoint>({ x: 0.5, y: 0.5 });
  const lastRippleRef = useRef(0);
  const lastPaintRef = useRef(0);
  const rafRef = useRef<number>();
  const tileRefs = useRef<TileRefs[]>([]);

  useEffect(() => {
    const node = frameRef.current;

    if (!node) {
      return;
    }

    const frame = node;

    function pointFromPointer(event: PointerEvent): GridPoint {
      const rect = frame.getBoundingClientRect();

      return {
        x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
        y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
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
      handlePointer(event, true);
    }

    function onPointerMove(event: PointerEvent) {
      handlePointer(event);
    }

    function onPointerLeave() {
      pointerRef.current = {
        active: false,
        x: pointerRef.current.x,
        y: pointerRef.current.y,
      };
    }

    frame.addEventListener("pointerenter", onPointerEnter);
    frame.addEventListener("pointermove", onPointerMove);
    frame.addEventListener("pointerleave", onPointerLeave);

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    function paint(now: number) {
      if (document.visibilityState !== "visible") {
        rafRef.current = window.requestAnimationFrame(paint);
        return;
      }

      if (!mediaQuery.matches && now - lastPaintRef.current < 28) {
        rafRef.current = window.requestAnimationFrame(paint);
        return;
      }

      lastPaintRef.current = now;
      pulsesRef.current = pulsesRef.current.filter((pulse) => now - pulse.createdAt <= pulse.duration);

      for (let index = 0; index < TILES.length; index += 1) {
        const tile = TILES[index];
        const refs = tileRefs.current[index];

        if (!refs?.tile || !refs.glow || !refs.edge || !refs.highlight) {
          continue;
        }

        const state = resolveTileVisualState({
          point: tile,
          pointer: pointerRef.current,
          pulses: pulsesRef.current,
          time: mediaQuery.matches ? 0 : now,
        });

        refs.tile.style.transform = `translate3d(${state.translateX.toFixed(2)}px, ${state.translateY.toFixed(2)}px, 0)`;
        refs.glow.style.opacity = state.glowOpacity.toFixed(3);
        refs.edge.style.opacity = state.edgeOpacity.toFixed(3);
        refs.highlight.style.opacity = state.highlightOpacity.toFixed(3);
      }

      rafRef.current = window.requestAnimationFrame(paint);
    }

    rafRef.current = window.requestAnimationFrame(paint);

    return () => {
      frame.removeEventListener("pointerenter", onPointerEnter);
      frame.removeEventListener("pointermove", onPointerMove);
      frame.removeEventListener("pointerleave", onPointerLeave);

      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={frameRef}
      data-grid-columns={HERO_GRID_COLUMNS}
      data-grid-rows={HERO_GRID_ROWS}
      data-hero-grid="entry-station"
      className="group relative mx-auto aspect-[11/8] w-full max-w-[720px] touch-none select-none"
    >
      <div className="pointer-events-none absolute inset-[-8%_-6%_10%_-6%] bg-[radial-gradient(circle_at_50%_55%,rgba(47,211,213,0.18),transparent_36%),radial-gradient(circle_at_50%_110%,rgba(12,71,76,0.52),transparent_30%)] blur-2xl" />
      <div className="pointer-events-none absolute inset-x-[10%] bottom-[-6%] h-[16%] bg-[radial-gradient(circle,rgba(47,211,213,0.2),rgba(47,211,213,0.04)_42%,transparent_72%)] blur-xl" />

      <div className="relative h-full w-full [perspective:1800px]">
        <div className="absolute inset-[4%_3%] [transform-style:preserve-3d] [transform:rotateX(11deg)_rotateY(-16deg)_rotateZ(-1.7deg)] md:inset-[3.5%_2.5%]">
          <div className="absolute inset-[-1px] bg-[linear-gradient(135deg,rgba(47,211,213,0.32),rgba(255,255,255,0.06)_42%,rgba(47,211,213,0.22))] opacity-65" />
          <div className="absolute inset-[1px] overflow-hidden bg-[#05080b] shadow-[0_20px_50px_rgba(0,0,0,0.42)]">
            <img
              src={imageSrc}
              alt={imageAlt}
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.42] grayscale"
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,8,11,0.06),rgba(5,8,11,0.18)),linear-gradient(135deg,rgba(47,211,213,0.1),transparent_36%,rgba(212,169,94,0.06)_82%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.045)_0,rgba(255,255,255,0.045)_1px,transparent_1px,transparent_4px)] opacity-30 mix-blend-screen" />

            {TILES.map((tile, index) => {
              const tileStyle: CSSProperties = {
                height: `${100 / HERO_GRID_ROWS}%`,
                left: `${(tile.col * 100) / HERO_GRID_COLUMNS}%`,
                top: `${(tile.row * 100) / HERO_GRID_ROWS}%`,
                width: `${100 / HERO_GRID_COLUMNS}%`,
              };
              const faceStyle: CSSProperties = {
                backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0)), url(${imageSrc})`,
                backgroundPosition: tile.backgroundPosition,
                backgroundSize: TILE_BACKGROUND_SIZE,
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
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent_0_38%,rgba(224,247,247,0.18)_50%,transparent_62%),linear-gradient(180deg,transparent_0_38%,rgba(224,247,247,0.18)_50%,transparent_62%)] mix-blend-screen opacity-0"
                    ref={(node) => {
                      tileRefs.current[index] = {
                        ...tileRefs.current[index],
                        highlight: node,
                      };
                    }}
                  />
                  <div
                    className="pointer-events-none absolute inset-0 border border-[rgba(47,211,213,0.34)] opacity-0 shadow-[0_0_18px_rgba(47,211,213,0.16),inset_0_0_10px_rgba(255,255,255,0.05)]"
                    ref={(node) => {
                      tileRefs.current[index] = {
                        ...tileRefs.current[index],
                        glow: node,
                      };
                    }}
                  />
                  <div
                    className="pointer-events-none absolute inset-x-[10%] bottom-[-10px] h-[12px] bg-[linear-gradient(180deg,rgba(47,211,213,0.55),rgba(16,53,58,0.06))] opacity-0 blur-[6px]"
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

            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(196,214,218,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(196,214,218,0.08)_1px,transparent_1px)] bg-[size:calc(100%/24)_calc(100%/14)] opacity-55" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,255,255,0.12),transparent_24%),linear-gradient(180deg,transparent_0%,rgba(5,8,11,0.24)_72%,rgba(5,8,11,0.65)_100%)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
