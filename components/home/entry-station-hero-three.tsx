"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

import {
  mapPointerToProjectedQuad,
  type GridPoint,
  type ProjectedQuad,
} from "./projected-quad";

type EntryStationHeroThreeProps = {
  imageAlt: string;
  imageSrc: string;
};

type GridPulse = {
  createdAt: number;
  origin: GridPoint;
};

const COLUMNS = 24;
const ROWS = 14;
const MAX_PULSES = 6;
const PLANE_ASPECT = 11 / 8;
const PLANE_WIDTH = 2;
const PLANE_HEIGHT = PLANE_WIDTH / PLANE_ASPECT;
const RIPPLE_DURATION_MS = 1050;

const vertexShader = `
  attribute vec2 tileCenter;
  attribute vec2 tileLocal;

  uniform float uTime;
  uniform vec3 uPointer;
  uniform int uPulseCount;
  uniform vec2 uPulseOrigins[${MAX_PULSES}];
  uniform float uPulseCreatedAt[${MAX_PULSES}];

  varying vec2 vUv;
  varying vec2 vTileLocal;
  varying float vLift;
  varying float vHoverLift;
  varying float vRippleLift;

  float powerFalloff(float distanceValue, float radius, float powerValue) {
    if (distanceValue >= radius) {
      return 0.0;
    }

    return pow(1.0 - distanceValue / radius, powerValue);
  }

  float sampleIdleLift(vec2 point, float timeValue) {
    float phase = mod(timeValue, 9000.0);
    float progress = phase / 9000.0;
    float centerX = -0.22 + 1.44 * progress;
    float band = powerFalloff(abs(point.x - centerX), 0.28, 1.75);
    float rowLag = 0.84 + 0.16 * sin(timeValue * 0.0009 + point.y * 10.5);
    float microShift = 0.9 + 0.1 * sin(timeValue * 0.0016 + point.x * 13.2 + point.y * 7.4);

    return band * 21.0 * rowLag * microShift;
  }

  float sampleHoverLift(vec2 point, vec3 pointerValue) {
    if (pointerValue.z < 0.5) {
      return 0.0;
    }

    float distanceValue = distance(point, pointerValue.xy);
    return powerFalloff(distanceValue, 0.19, 1.9) * 46.0;
  }

  float sampleRippleLift(vec2 point, float timeValue) {
    float total = 0.0;

    for (int i = 0; i < ${MAX_PULSES}; i += 1) {
      if (i >= uPulseCount) {
        break;
      }

      float age = timeValue - uPulseCreatedAt[i];

      if (age < 0.0 || age > ${RIPPLE_DURATION_MS}.0) {
        continue;
      }

      float waveFront = age * 0.0003;
      float distanceValue = distance(point, uPulseOrigins[i]);
      float ring = powerFalloff(abs(distanceValue - waveFront), 0.09, 1.6);
      float fade = pow(1.0 - age / ${RIPPLE_DURATION_MS}.0, 1.22);

      total += ring * 14.0 * fade;
    }

    return total;
  }

  void main() {
    vUv = uv;
    vTileLocal = tileLocal;

    float idleLift = sampleIdleLift(tileCenter, uTime);
    float hoverLift = sampleHoverLift(tileCenter, uPointer);
    float rippleLift = sampleRippleLift(tileCenter, uTime);
    float maxLift = uPointer.z > 0.5 ? 62.0 : 24.0;
    float lift = clamp(idleLift + hoverLift + rippleLift, 0.0, maxLift);

    vec3 nextPosition = position;
    nextPosition.x += -lift * 0.00007;
    nextPosition.y += lift * 0.00016;

    vLift = lift;
    vHoverLift = hoverLift;
    vRippleLift = rippleLift;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(nextPosition, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D uTexture;

  varying vec2 vUv;
  varying vec2 vTileLocal;
  varying float vLift;
  varying float vHoverLift;
  varying float vRippleLift;

  float borderMask(vec2 localValue) {
    float edgeDistance = min(min(localValue.x, 1.0 - localValue.x), min(localValue.y, 1.0 - localValue.y));
    return 1.0 - smoothstep(0.0, 0.045, edgeDistance);
  }

  float crossMask(vec2 localValue) {
    float vertical = 1.0 - smoothstep(0.0, 0.08, abs(localValue.x - 0.5));
    float horizontal = 1.0 - smoothstep(0.0, 0.08, abs(localValue.y - 0.5));
    return max(vertical, horizontal);
  }

  void main() {
    vec4 source = texture2D(uTexture, vUv);
    vec3 base = mix(source.rgb, pow(source.rgb, vec3(0.58)), 0.74);
    base *= vec3(1.2, 1.16, 1.1);
    base += vec3(0.046, 0.052, 0.052);

    float glow = clamp(vLift / 46.0, 0.0, 0.9);
    float border = borderMask(vTileLocal);
    float cross = crossMask(vTileLocal) * clamp((vHoverLift + vRippleLift + vLift * 0.16) / 36.0, 0.0, 0.96);
    float bottomEdge = (1.0 - smoothstep(0.0, 0.18, vTileLocal.y)) * clamp(vLift / 56.0, 0.0, 0.76);
    vec3 cyan = vec3(0.18, 0.86, 0.88);
    vec3 warm = vec3(0.78, 0.58, 0.32);
    vec3 color = base;

    color += cyan * border * (0.06 + glow * 0.2);
    color += cyan * cross * 0.22;
    color += cyan * bottomEdge * 0.26;
    color += warm * glow * 0.03;
    color *= 1.2 + glow * 0.1;

    gl_FragColor = vec4(color, 1.0);
  }
`;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function buildTileGeometry() {
  const positions: number[] = [];
  const uvs: number[] = [];
  const tileCenters: number[] = [];
  const tileLocals: number[] = [];
  const tileWidth = PLANE_WIDTH / COLUMNS;
  const tileHeight = PLANE_HEIGHT / ROWS;
  const gapX = tileWidth * 0.035;
  const gapY = tileHeight * 0.035;

  function pushVertex(
    x: number,
    y: number,
    u: number,
    v: number,
    centerX: number,
    centerY: number,
    localX: number,
    localY: number,
  ) {
    positions.push(x, y, 0);
    uvs.push(u, v);
    tileCenters.push(centerX, centerY);
    tileLocals.push(localX, localY);
  }

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLUMNS; col += 1) {
      const x0 = -PLANE_WIDTH / 2 + col * tileWidth + gapX;
      const x1 = -PLANE_WIDTH / 2 + (col + 1) * tileWidth - gapX;
      const y1 = PLANE_HEIGHT / 2 - row * tileHeight - gapY;
      const y0 = PLANE_HEIGHT / 2 - (row + 1) * tileHeight + gapY;
      const u0 = col / COLUMNS;
      const u1 = (col + 1) / COLUMNS;
      const v1 = 1 - row / ROWS;
      const v0 = 1 - (row + 1) / ROWS;
      const centerX = (col + 0.5) / COLUMNS;
      const centerY = (row + 0.5) / ROWS;

      pushVertex(x0, y0, u0, v0, centerX, centerY, 0, 0);
      pushVertex(x1, y0, u1, v0, centerX, centerY, 1, 0);
      pushVertex(x1, y1, u1, v1, centerX, centerY, 1, 1);
      pushVertex(x0, y0, u0, v0, centerX, centerY, 0, 0);
      pushVertex(x1, y1, u1, v1, centerX, centerY, 1, 1);
      pushVertex(x0, y1, u0, v1, centerX, centerY, 0, 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("tileCenter", new THREE.Float32BufferAttribute(tileCenters, 2));
  geometry.setAttribute("tileLocal", new THREE.Float32BufferAttribute(tileLocals, 2));
  geometry.computeBoundingSphere();

  return geometry;
}

export default function EntryStationHeroThree({
  imageAlt,
  imageSrc,
}: EntryStationHeroThreeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef({ active: false, x: 0.5, y: 0.5 });
  const pulsesRef = useRef<GridPulse[]>([]);
  const previousPointRef = useRef<GridPoint>({ x: 0.5, y: 0.5 });
  const lastRippleRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    const panel = panelRef.current;

    if (!container || !panel) {
      return;
    }

    const containerNode = container;
    const panelNode = panel;
    let disposed = false;
    let inViewport = true;
    let rafId: number | null = null;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(
      -PLANE_WIDTH / 2,
      PLANE_WIDTH / 2,
      PLANE_HEIGHT / 2,
      -PLANE_HEIGHT / 2,
      -10,
      10,
    );
    const texture = new THREE.TextureLoader().load(imageSrc);
    const pulseOrigins = Array.from({ length: MAX_PULSES }, () => new THREE.Vector2(0, 0));
    const pulseCreatedAt = Array.from({ length: MAX_PULSES }, () => 0);
    const geometry = buildTileGeometry();
    const material = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      fragmentShader,
      transparent: false,
      uniforms: {
        uPointer: { value: new THREE.Vector3(0.5, 0.5, 0) },
        uPulseCount: { value: 0 },
        uPulseCreatedAt: { value: pulseCreatedAt },
        uPulseOrigins: { value: pulseOrigins },
        uTexture: { value: texture },
        uTime: { value: 0 },
      },
      vertexShader,
    });
    const mesh = new THREE.Mesh(geometry, material);
    let projectedQuad: ProjectedQuad | null = null;

    camera.position.z = 4;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.domElement.setAttribute("aria-label", imageAlt);
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.className = "absolute inset-0 z-10 h-full w-full";
    scene.add(mesh);
    panelNode.appendChild(renderer.domElement);

    const cornerMarkers = {
      bottomLeft: createCornerMarker("0%", "100%"),
      bottomRight: createCornerMarker("100%", "100%"),
      topLeft: createCornerMarker("0%", "0%"),
      topRight: createCornerMarker("100%", "0%"),
    };

    for (const marker of Object.values(cornerMarkers)) {
      panelNode.appendChild(marker);
    }

    function createCornerMarker(left: string, top: string) {
      const marker = document.createElement("span");

      marker.style.position = "absolute";
      marker.style.left = left;
      marker.style.top = top;
      marker.style.width = "0";
      marker.style.height = "0";
      marker.style.pointerEvents = "none";
      marker.style.visibility = "hidden";
      marker.setAttribute("aria-hidden", "true");

      return marker;
    }

    function resizeRenderer() {
      renderer.setSize(Math.max(1, panelNode.clientWidth), Math.max(1, panelNode.clientHeight), false);
      updateProjectedQuad();
    }

    function markerPoint(marker: HTMLElement) {
      const rect = marker.getBoundingClientRect();

      return { x: rect.left, y: rect.top };
    }

    function updateProjectedQuad() {
      if (panelNode.clientWidth <= 0 || panelNode.clientHeight <= 0) {
        projectedQuad = null;
        return projectedQuad;
      }

      projectedQuad = {
        bottomLeft: markerPoint(cornerMarkers.bottomLeft),
        bottomRight: markerPoint(cornerMarkers.bottomRight),
        topLeft: markerPoint(cornerMarkers.topLeft),
        topRight: markerPoint(cornerMarkers.topRight),
      };

      return projectedQuad;
    }

    function pointFromPointer(event: PointerEvent): GridPoint {
      const projectedPoint = mapPointerToProjectedQuad(
        { x: event.clientX, y: event.clientY },
        projectedQuad ?? updateProjectedQuad() ?? {
          bottomLeft: { x: 0, y: panelNode.clientHeight },
          bottomRight: { x: panelNode.clientWidth, y: panelNode.clientHeight },
          topLeft: { x: 0, y: 0 },
          topRight: { x: panelNode.clientWidth, y: 0 },
        },
      );

      if (projectedPoint) {
        return {
          x: clamp(projectedPoint.x, 0, 1),
          y: clamp(projectedPoint.y, 0, 1),
        };
      }

      const rect = panelNode.getBoundingClientRect();

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

      pulsesRef.current = [...pulsesRef.current.slice(-MAX_PULSES + 1), { createdAt: now, origin: point }];
      previousPointRef.current = point;
      lastRippleRef.current = now;
    }

    function requestFrame() {
      if (rafId !== null || disposed) {
        return;
      }

      rafId = window.requestAnimationFrame(renderFrame);
    }

    function shouldAnimate() {
      if (document.visibilityState !== "visible" || !inViewport) {
        return false;
      }

      return !mediaQuery.matches || pointerRef.current.active || pulsesRef.current.length > 0;
    }

    function updateUniforms(now: number) {
      const reducedMotion = mediaQuery.matches;
      const nextPulses = reducedMotion
        ? []
        : pulsesRef.current.filter((pulse) => now - pulse.createdAt <= RIPPLE_DURATION_MS);

      pulsesRef.current = nextPulses;
      material.uniforms.uTime.value = reducedMotion ? 0 : now;
      material.uniforms.uPointer.value.set(
        pointerRef.current.x,
        pointerRef.current.y,
        pointerRef.current.active ? 1 : 0,
      );
      material.uniforms.uPulseCount.value = nextPulses.length;

      for (let index = 0; index < MAX_PULSES; index += 1) {
        const pulse = nextPulses[index];
        pulseOrigins[index].set(pulse?.origin.x ?? 0, pulse?.origin.y ?? 0);
        pulseCreatedAt[index] = pulse?.createdAt ?? 0;
      }
    }

    function renderFrame(now: number) {
      rafId = null;

      if (disposed || document.visibilityState !== "visible" || !inViewport) {
        return;
      }

      updateUniforms(now);
      renderer.render(scene, camera);

      if (shouldAnimate()) {
        requestFrame();
      }
    }

    function handlePointerEnter(event: PointerEvent) {
      updateProjectedQuad();

      const point = pointFromPointer(event);
      const now = performance.now();

      pointerRef.current = { active: true, ...point };
      maybeSpawnPulse(point, now, true);
      requestFrame();
    }

    function handlePointerMove(event: PointerEvent) {
      const point = pointFromPointer(event);
      const now = performance.now();

      pointerRef.current = { active: true, ...point };
      maybeSpawnPulse(point, now);
      requestFrame();
    }

    function handlePointerLeave() {
      pointerRef.current = {
        active: false,
        x: pointerRef.current.x,
        y: pointerRef.current.y,
      };
      requestFrame();
    }

    const resizeObserver = new ResizeObserver(() => {
      resizeRenderer();
      requestFrame();
    });
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        inViewport = entry?.isIntersecting ?? false;

        if (inViewport) {
          requestFrame();
        }
      },
      { threshold: 0.01 },
    );
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestFrame();
      }
    };
    const handleReducedMotionChange = () => {
      requestFrame();
    };
    const handleScroll = () => {
      projectedQuad = null;
    };

    resizeRenderer();
    resizeObserver.observe(panelNode);
    intersectionObserver.observe(containerNode);
    panelNode.addEventListener("pointerenter", handlePointerEnter);
    panelNode.addEventListener("pointermove", handlePointerMove);
    panelNode.addEventListener("pointerleave", handlePointerLeave);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("scroll", handleScroll, { passive: true });
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleReducedMotionChange);
    } else {
      mediaQuery.addListener(handleReducedMotionChange);
    }
    requestFrame();

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      panelNode.removeEventListener("pointerenter", handlePointerEnter);
      panelNode.removeEventListener("pointermove", handlePointerMove);
      panelNode.removeEventListener("pointerleave", handlePointerLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("scroll", handleScroll);
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", handleReducedMotionChange);
      } else {
        mediaQuery.removeListener(handleReducedMotionChange);
      }

      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }

      if (renderer.domElement.parentElement === panelNode) {
        panelNode.removeChild(renderer.domElement);
      }

      for (const marker of Object.values(cornerMarkers)) {
        if (marker.parentElement === panelNode) {
          panelNode.removeChild(marker);
        }
      }

      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
    };
  }, [imageAlt, imageSrc]);

  return (
    <div
      ref={containerRef}
      data-hero-grid-three="entry-station"
      data-grid-columns={COLUMNS}
      data-grid-rows={ROWS}
      className="group relative mx-auto aspect-[11/8] w-full max-w-[720px] touch-none select-none"
    >
      <div className="pointer-events-none absolute inset-[-8%_-6%_10%_-6%] bg-[radial-gradient(circle_at_50%_55%,rgba(47,211,213,0.18),transparent_36%),radial-gradient(circle_at_50%_110%,rgba(12,71,76,0.52),transparent_30%)] blur-2xl" />
      <div className="pointer-events-none absolute inset-x-[10%] bottom-[-6%] h-[16%] bg-[radial-gradient(circle,rgba(47,211,213,0.2),rgba(47,211,213,0.04)_42%,transparent_72%)] blur-xl" />

      <div className="relative h-full w-full [perspective:1800px]">
        <div className="absolute inset-[4%_3%] [transform-style:preserve-3d] [transform:rotateX(12deg)_rotateY(-18deg)_rotateZ(-1.9deg)] md:inset-[3.5%_2.5%]">
          <div className="absolute inset-[-1px] bg-[linear-gradient(135deg,rgba(47,211,213,0.32),rgba(255,255,255,0.06)_42%,rgba(47,211,213,0.22))] opacity-65" />
          <div
            ref={panelRef}
            className="absolute inset-[1px] overflow-hidden bg-[#05080b] shadow-[0_20px_50px_rgba(0,0,0,0.42)]"
          >
            <img
              src={imageSrc}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover opacity-[0.06] grayscale"
            />
            <div className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(180deg,rgba(5,8,11,0.01),rgba(5,8,11,0.045)),linear-gradient(135deg,rgba(47,211,213,0.045),transparent_36%,rgba(212,169,94,0.04)_82%)]" />
            <div className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(180deg,rgba(255,255,255,0.045)_0,rgba(255,255,255,0.045)_1px,transparent_1px,transparent_4px)] opacity-24 mix-blend-screen" />
            <div
              className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(rgba(196,214,218,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(196,214,218,0.08)_1px,transparent_1px)] opacity-55"
              style={{
                backgroundSize: `calc(100%/${COLUMNS}) calc(100%/${ROWS})`,
              }}
            />
            <div className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(circle_at_50%_12%,rgba(255,255,255,0.08),transparent_24%),linear-gradient(180deg,transparent_0%,rgba(5,8,11,0.055)_76%,rgba(5,8,11,0.22)_100%)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
