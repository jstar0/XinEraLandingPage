import { HERO_GRID_COLUMNS, HERO_GRID_ROWS, type TileVisualState } from "./hero-grid-motion";

export type TileRenderSnapshot = {
  edgeOpacity: number;
  glowOpacity: number;
  highlightOpacity: number;
  translateX: number;
  translateY: number;
};

export type HeroGridDefinition = {
  columns: number;
  layerMode: "compact" | "full";
  rows: number;
};

const ACTIVE_FRAME_INTERVAL_MS = 28;
const FULL_IDLE_FRAME_INTERVAL_MS = 42;
const LIGHT_IDLE_FRAME_INTERVAL_MS = 72;
const LIGHT_GRID_COLUMNS = 18;
const LIGHT_GRID_ROWS = 10;
const LIGHT_GLOW_OPACITY_MAX = 0.18;
const LIGHT_EDGE_OPACITY_MAX = 0.12;
const LIGHT_HIGHLIGHT_OPACITY_MAX = 0.16;

function roundTo(value: number, digits: number) {
  const precision = 10 ** digits;
  const rounded = Math.round(value * precision) / precision;

  return Object.is(rounded, -0) ? 0 : rounded;
}

export function createTileRenderSnapshot(
  state: TileVisualState,
  renderProfile: "full" | "light" = "full",
): TileRenderSnapshot {
  const edgeOpacity =
    renderProfile === "light" ? Math.min(state.edgeOpacity, LIGHT_EDGE_OPACITY_MAX) : state.edgeOpacity;
  const glowOpacity =
    renderProfile === "light" ? Math.min(state.glowOpacity, LIGHT_GLOW_OPACITY_MAX) : state.glowOpacity;
  const highlightOpacity =
    renderProfile === "light"
      ? Math.min(state.highlightOpacity, LIGHT_HIGHLIGHT_OPACITY_MAX)
      : state.highlightOpacity;

  return {
    edgeOpacity: roundTo(edgeOpacity, 3),
    glowOpacity: roundTo(glowOpacity, 3),
    highlightOpacity: roundTo(highlightOpacity, 3),
    translateX: roundTo(state.translateX, 2),
    translateY: roundTo(state.translateY, 2),
  };
}

export function formatTileRenderSnapshot(snapshot: TileRenderSnapshot) {
  return {
    edgeOpacity: snapshot.edgeOpacity.toFixed(3),
    glowOpacity: snapshot.glowOpacity.toFixed(3),
    highlightOpacity: snapshot.highlightOpacity.toFixed(3),
    transform: `translate3d(${snapshot.translateX.toFixed(2)}px, ${snapshot.translateY.toFixed(2)}px, 0)`,
  };
}

export function tileRenderSnapshotChanged(
  previous: TileRenderSnapshot | null,
  next: TileRenderSnapshot,
) {
  if (!previous) {
    return true;
  }

  return (
    previous.translateX !== next.translateX ||
    previous.translateY !== next.translateY ||
    previous.glowOpacity !== next.glowOpacity ||
    previous.edgeOpacity !== next.edgeOpacity ||
    previous.highlightOpacity !== next.highlightOpacity
  );
}

export function resolveHeroFrameInterval(input: {
  pointerActive: boolean;
  pulseCount: number;
  renderProfile: "full" | "light";
}) {
  if (input.pointerActive || input.pulseCount > 0) {
    return ACTIVE_FRAME_INTERVAL_MS;
  }

  return input.renderProfile === "light" ? LIGHT_IDLE_FRAME_INTERVAL_MS : FULL_IDLE_FRAME_INTERVAL_MS;
}

export function resolveHeroGridDefinition(renderProfile: "full" | "light"): HeroGridDefinition {
  if (renderProfile === "light") {
    return {
      columns: LIGHT_GRID_COLUMNS,
      layerMode: "compact",
      rows: LIGHT_GRID_ROWS,
    };
  }

  return {
    columns: HERO_GRID_COLUMNS,
    layerMode: "full",
    rows: HERO_GRID_ROWS,
  };
}

export function shouldRunHeroAnimationLoop(input: {
  documentVisible: boolean;
  hasRenderableBox: boolean;
  inViewport: boolean;
  pointerActive: boolean;
  pulseCount: number;
  reducedMotion: boolean;
}) {
  if (!input.documentVisible || !input.hasRenderableBox || !input.inViewport) {
    return false;
  }

  if (input.pointerActive || input.pulseCount > 0) {
    return true;
  }

  return !input.reducedMotion;
}

export function resolveHeroRenderProfile(userAgent: string): "full" | "light" {
  const normalized = userAgent.toLowerCase();
  const isAppleWebKit = normalized.includes("applewebkit");
  const isSafari =
    normalized.includes("safari/") &&
    !normalized.includes("chrome/") &&
    !normalized.includes("crios/") &&
    !normalized.includes("edg/") &&
    !normalized.includes("opr/") &&
    !normalized.includes("fxios/");
  const isIOSWebKitShell =
    normalized.includes("iphone") ||
    normalized.includes("ipad") ||
    normalized.includes("ipod");

  return isSafari || (isAppleWebKit && isIOSWebKitShell) ? "light" : "full";
}
