import type { TileVisualState } from "./hero-grid-motion";

export type TileRenderSnapshot = {
  edgeOpacity: string;
  glowOpacity: string;
  highlightOpacity: string;
  transform: string;
};

export function formatTileRenderSnapshot(state: TileVisualState): TileRenderSnapshot {
  return {
    edgeOpacity: state.edgeOpacity.toFixed(3),
    glowOpacity: state.glowOpacity.toFixed(3),
    highlightOpacity: state.highlightOpacity.toFixed(3),
    transform: `translate3d(${state.translateX.toFixed(2)}px, ${state.translateY.toFixed(2)}px, 0)`,
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
    previous.transform !== next.transform ||
    previous.glowOpacity !== next.glowOpacity ||
    previous.edgeOpacity !== next.edgeOpacity ||
    previous.highlightOpacity !== next.highlightOpacity
  );
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
