"use client";

import React, { useEffect, useRef, type AnchorHTMLAttributes } from "react";

import { resolveMagneticTranslation } from "./landing-page-effects";

type MagneticAnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  maxOffsetX?: number;
  maxOffsetY?: number;
  targetName: string;
};

function joinClassNames(...tokens: Array<string | undefined>) {
  return tokens.filter(Boolean).join(" ");
}

function applyMagneticState(
  node: HTMLAnchorElement,
  state: { intensity: number; x: number; y: number },
) {
  node.style.setProperty("--magnetic-intensity", state.intensity.toFixed(3));
  node.style.setProperty("--magnetic-x", `${state.x}px`);
  node.style.setProperty("--magnetic-y", `${state.y}px`);
}

export default function MagneticAnchor({
  children,
  className,
  maxOffsetX,
  maxOffsetY,
  onPointerLeave,
  onPointerMove,
  targetName,
  ...props
}: MagneticAnchorProps) {
  const nodeRef = useRef<HTMLAnchorElement | null>(null);
  const enabledRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const pendingStateRef = useRef<{ intensity: number; x: number; y: number } | null>(null);

  function cancelFrame() {
    if (frameRef.current === null) {
      return;
    }

    window.cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }

  function resetState() {
    cancelFrame();
    pendingStateRef.current = null;

    if (!nodeRef.current) {
      return;
    }

    applyMagneticState(nodeRef.current, { intensity: 0, x: 0, y: 0 });
  }

  function flushState() {
    frameRef.current = null;

    if (!nodeRef.current || !pendingStateRef.current) {
      return;
    }

    applyMagneticState(nodeRef.current, pendingStateRef.current);
    pendingStateRef.current = null;
  }

  function queueState(nextState: { intensity: number; x: number; y: number }) {
    pendingStateRef.current = nextState;

    if (frameRef.current !== null) {
      return;
    }

    frameRef.current = window.requestAnimationFrame(flushState);
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );

    const syncMediaState = () => {
      enabledRef.current = mediaQuery.matches;

      if (!enabledRef.current) {
        resetState();
      }
    };

    syncMediaState();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncMediaState);

      return () => {
        mediaQuery.removeEventListener("change", syncMediaState);
        resetState();
      };
    }

    mediaQuery.addListener(syncMediaState);

    return () => {
      mediaQuery.removeListener(syncMediaState);
      resetState();
    };
  }, []);

  return (
    <a
      {...props}
      ref={nodeRef}
      data-magnetic-target={targetName}
      className={joinClassNames("magnetic-target", className)}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        resetState();
      }}
      onPointerMove={(event) => {
        onPointerMove?.(event);

        if (!enabledRef.current || event.pointerType === "touch" || event.pointerType === "pen") {
          return;
        }

        if (!nodeRef.current) {
          return;
        }

        queueState(
          resolveMagneticTranslation({
            clientX: event.clientX,
            clientY: event.clientY,
            maxOffsetX,
            maxOffsetY,
            rect: nodeRef.current.getBoundingClientRect(),
          }),
        );
      }}
    >
      {children}
    </a>
  );
}
