export type GridPoint = {
  x: number;
  y: number;
};

export type GridPointer = GridPoint & {
  active: boolean;
};

export type GridPulse = {
  amplitude: number;
  createdAt: number;
  duration: number;
  origin: GridPoint;
  speed: number;
  thickness: number;
};

export type TileVisualState = {
  edgeOpacity: number;
  glowOpacity: number;
  highlightOpacity: number;
  lift: number;
  translateX: number;
  translateY: number;
};

export type HeroGridTile = GridPoint & {
  backgroundPosition: string;
  col: number;
  id: string;
  row: number;
};

export const HERO_GRID_COLUMNS = 24;
export const HERO_GRID_ROWS = 14;

const IDLE_CYCLE_MS = 9_000;
const IDLE_SWEEP_START = -0.22;
const IDLE_SWEEP_TRAVEL = 1.44;
const IDLE_SWEEP_RADIUS = 0.28;
const IDLE_SWEEP_AMPLITUDE = 18;
const HOVER_RADIUS = 0.19;
const HOVER_AMPLITUDE = 46;
const MAX_IDLE_LIFT = 22;
const MAX_ACTIVE_LIFT = 62;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function powerFalloff(distance: number, radius: number, power: number) {
  if (distance >= radius) return 0;
  return Math.pow(1 - distance / radius, power);
}

export function buildHeroGridTiles(
  columns = HERO_GRID_COLUMNS,
  rows = HERO_GRID_ROWS,
): HeroGridTile[] {
  const tiles: HeroGridTile[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const x = (col + 0.5) / columns;
      const y = (row + 0.5) / rows;

      tiles.push({
        backgroundPosition: `${(col / Math.max(columns - 1, 1)) * 100}% ${
          (row / Math.max(rows - 1, 1)) * 100
        }%`,
        col,
        id: `${col}-${row}`,
        row,
        x,
        y,
      });
    }
  }

  return tiles;
}

export function createHoverPulse(origin: GridPoint, createdAt: number): GridPulse {
  return {
    amplitude: 14,
    createdAt,
    duration: 1_050,
    origin,
    speed: 0.0003,
    thickness: 0.09,
  };
}

export function sampleIdleSweepLift(point: GridPoint, time: number) {
  const phase = ((time % IDLE_CYCLE_MS) + IDLE_CYCLE_MS) % IDLE_CYCLE_MS;
  const progress = phase / IDLE_CYCLE_MS;
  const centerX = IDLE_SWEEP_START + IDLE_SWEEP_TRAVEL * progress;
  const band = powerFalloff(Math.abs(point.x - centerX), IDLE_SWEEP_RADIUS, 1.75);
  const rowLag = 0.84 + 0.16 * Math.sin(time * 0.0009 + point.y * 10.5);
  const microShift = 0.9 + 0.1 * Math.sin(time * 0.0016 + point.x * 13.2 + point.y * 7.4);

  return band * IDLE_SWEEP_AMPLITUDE * rowLag * microShift;
}

export function sampleHoverLift(point: GridPoint, pointer: GridPointer) {
  if (!pointer.active) return 0;

  const distance = Math.hypot(point.x - pointer.x, point.y - pointer.y);
  return powerFalloff(distance, HOVER_RADIUS, 1.9) * HOVER_AMPLITUDE;
}

export function sampleRippleLift(point: GridPoint, pulses: GridPulse[], time: number) {
  let total = 0;

  for (const pulse of pulses) {
    const age = time - pulse.createdAt;

    if (age < 0 || age > pulse.duration) {
      continue;
    }

    const waveFront = age * pulse.speed;
    const distance = Math.hypot(point.x - pulse.origin.x, point.y - pulse.origin.y);
    const ring = powerFalloff(Math.abs(distance - waveFront), pulse.thickness, 1.6);
    const fade = Math.pow(1 - age / pulse.duration, 1.22);

    total += ring * pulse.amplitude * fade;
  }

  return total;
}

export function resolveTileVisualState(input: {
  point: GridPoint;
  pointer: GridPointer;
  pulses: GridPulse[];
  time: number;
}): TileVisualState {
  const idleLift = sampleIdleSweepLift(input.point, input.time);
  const hoverLift = sampleHoverLift(input.point, input.pointer);
  const rippleLift = sampleRippleLift(input.point, input.pulses, input.time);
  const lift = clamp(
    idleLift + hoverLift + rippleLift,
    0,
    input.pointer.active ? MAX_ACTIVE_LIFT : MAX_IDLE_LIFT,
  );

  return {
    edgeOpacity: clamp(lift / 56, 0, 0.76),
    glowOpacity: clamp(lift / 46, 0, 0.9),
    highlightOpacity: clamp((hoverLift + rippleLift) / 36, 0, 0.96),
    lift,
    translateX: -lift * 0.017,
    translateY: -lift * 0.058,
  };
}
