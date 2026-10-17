"use client";

import {
  useEffect,
  useLayoutEffect,
  useId,
  useRef,
  type CSSProperties,
} from "react";
import { gsap } from "gsap";
import { lockArrivalScroll } from "./arrival-scroll";
import "./arrival.css";

export type ArrivalStage = "loading" | "preparing" | "ready" | "fallback";

export interface ArrivalProps {
  stage: ArrivalStage;
  /** Page entry locks document scrolling; embedded scenes only cover their viewport. */
  scope?: "page" | "scene";
  /** Cloud reveal for landscapes; blocks alone for small previews and panels. */
  variant?: "clouds" | "blocks";
  label?: string;
  /** A measured fraction of downloaded bytes, never an estimated timer. */
  progress?: number;
  onRevealComplete?: () => void;
}

const CLOUDS = [
  { name: "far-west", depth: "far", side: -1, image: 2 },
  { name: "far-east", depth: "far", side: 1, image: 3 },
  { name: "middle-west", depth: "far", side: -1, image: 0 },
  { name: "middle-east", depth: "far", side: 1, image: 1 },
  { name: "bridge", depth: "near", side: 0, image: 0 },
  { name: "near-west", depth: "near", side: -1, image: 2 },
  { name: "near-east", depth: "near", side: 1, image: 3 },
] as const;

const CLOUD_SIZES = [
  [802, 461],
  [795, 485],
  [748, 448],
  [692, 508],
] as const;

type BlockKind = "stone" | "earth" | "grass" | "wood" | "leaf";
type IslandBlock = { x: number; y: number; z: number; kind: BlockKind };

// Assembly runs from the hanging stone foundation to the little tree. It is
// decorative state feedback, deliberately independent from download percent.
const ISLAND_BLOCKS: IslandBlock[] = [
  { x: 1, y: 1, z: -2, kind: "stone" },
  { x: 0, y: 1, z: -1, kind: "stone" },
  { x: 1, y: 0, z: -1, kind: "stone" },
  { x: 1, y: 1, z: -1, kind: "stone" },
  { x: 2, y: 1, z: -1, kind: "earth" },
  { x: 1, y: 2, z: -1, kind: "earth" },
  { x: 0, y: 0, z: 0, kind: "grass" },
  { x: 1, y: 0, z: 0, kind: "grass" },
  { x: 0, y: 1, z: 0, kind: "grass" },
  { x: 2, y: 0, z: 0, kind: "grass" },
  { x: 1, y: 1, z: 0, kind: "grass" },
  { x: 0, y: 2, z: 0, kind: "grass" },
  { x: 2, y: 1, z: 0, kind: "grass" },
  { x: 1, y: 2, z: 0, kind: "grass" },
  { x: 2, y: 2, z: 0, kind: "grass" },
  { x: 1, y: 1, z: 1, kind: "wood" },
  { x: 1, y: 1, z: 2, kind: "wood" },
  { x: 1, y: 0, z: 3, kind: "leaf" },
  { x: 0, y: 1, z: 3, kind: "leaf" },
  { x: 1, y: 1, z: 3, kind: "leaf" },
  { x: 2, y: 1, z: 3, kind: "leaf" },
  { x: 1, y: 2, z: 3, kind: "leaf" },
  { x: 1, y: 1, z: 4, kind: "leaf" },
];

function Island() {
  const id = useId().replaceAll(":", "");
  return (
    <svg viewBox="0 0 220 198" aria-hidden="true">
      <defs>
        {(["stone", "earth", "grass", "wood", "leaf"] as const).flatMap(
          (kind) =>
            (["left", "right", "top"] as const).map((face) => (
              <pattern
                key={`${kind}-${face}`}
                id={`${id}-${kind}-${face}`}
                patternUnits="userSpaceOnUse"
                width="16"
                height="16"
                patternTransform={
                  face === "left"
                    ? "matrix(1.125 .5625 0 1.1875 -18 0)"
                    : face === "right"
                      ? "matrix(1.125 -.5625 0 1.1875 0 9)"
                      : "matrix(1.125 -.5625 1.125 .5625 -18 0)"
                }
              >
                <image
                  href={`/xinera/arrival/${kind === "grass" && face !== "top" ? "earth" : kind}.png`}
                  width="16"
                  height="16"
                />
              </pattern>
            )),
        )}
      </defs>
      <ellipse
        className="arrival-island-shadow"
        cx="110"
        cy="184"
        rx="38"
        ry="6"
      />
      {ISLAND_BLOCKS.map(({ x, y, z, kind }, index) => (
        <g
          key={index}
          transform={`translate(${110 + (x - y) * 18} ${104 + (x + y) * 9 - z * 19})`}
        >
          <g
            className={`arrival-block arrival-block-${kind}`}
            data-block={index}
          >
            <path
              style={{ fill: `url(#${id}-${kind}-left)` }}
              d="M-18 0L0 9V28L-18 19Z"
            />
            <path
              style={{ fill: `url(#${id}-${kind}-right)` }}
              d="M0 9L18 0V19L0 28Z"
            />
            <path
              style={{ fill: `url(#${id}-${kind}-top)` }}
              d="M-18 0L0-9L18 0L0 9Z"
            />
            <path fill="#3b2d24" opacity=".14" d="M-18 0L0 9V28L-18 19Z" />
            <path fill="#352d33" opacity=".27" d="M0 9L18 0V19L0 28Z" />
            <path fill="#fff1d8" opacity=".12" d="M-18 0L0-9L18 0L0 9Z" />
            {kind === "grass" && (
              <path
                className="arrival-block-grass-edge"
                d="M-18 0L0 9L18 0V5L0 14L-18 5Z"
              />
            )}
          </g>
        </g>
      ))}
    </svg>
  );
}

export function Arrival({
  stage,
  progress,
  onRevealComplete,
  scope = "page",
  variant = "clouds",
  label,
}: ArrivalProps) {
  const root = useRef<HTMLDivElement>(null);
  const controller = useRef<{ update: (stage: ArrivalStage) => void } | null>(
    null,
  );
  const completed = useRef(onRevealComplete);

  useEffect(() => {
    completed.current = onRevealComplete;
  }, [onRevealComplete]);

  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const unlockScroll = scope === "page" ? lockArrivalScroll() : () => {};
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const clouds = Array.from(
      element.querySelectorAll<HTMLElement>(".arrival-cloud"),
    );
    const blocks = Array.from(
      element.querySelectorAll<SVGGElement>(".arrival-block"),
    );
    const island = element.querySelector<HTMLElement>(".arrival-island");
    const mist = element.querySelector<HTMLElement>(".arrival-mist");
    const caption = element.querySelector<HTMLElement>(".arrival-caption");
    let current: ArrivalStage = "loading";
    let shown = false;
    let settled = false;
    let exiting = false;
    let disposed = false;
    let finished = false;
    let assembly: gsap.core.Timeline | undefined;
    let entrance: gsap.core.Timeline | undefined;
    let ambience: gsap.core.Timeline | undefined;
    let exit: gsap.core.Timeline | undefined;
    const context = gsap.context(() => {}, element);

    const finish = () => {
      if (finished || disposed) return;
      finished = true;
      element.dataset.phase = "complete";
      unlockScroll();
      completed.current?.();
    };

    const reveal = context.add("reveal", (fallback = false) => {
      if (exiting || finished || disposed) return;
      exiting = true;
      element.dataset.phase = "revealing";
      if (timer) clearTimeout(timer);
      entrance?.kill();
      ambience?.kill();
      if (fallback || reduced.matches) {
        assembly?.kill();
        exit = gsap.timeline({ onComplete: finish }).to(element, {
          autoAlpha: 0,
          duration: shown ? 0.18 : 0,
          ease: "power1.out",
        });
        return;
      }
      if (variant === "blocks") {
        exit = gsap
          .timeline({ onComplete: finish })
          .to([island, caption], {
            y: -6,
            duration: 0.2,
            ease: "power2.out",
          })
          .to(
            element,
            { autoAlpha: 0, duration: 0.25, ease: "power1.inOut" },
            0,
          );
        return;
      }
      exit = gsap.timeline({ onComplete: finish });
      exit
        .to(
          [island, caption],
          { autoAlpha: 0, y: -9, duration: 0.22, ease: "power2.in" },
          0,
        )
        .to(mist, { opacity: 0, duration: 0.42, ease: "power2.inOut" }, 0.08);
      clouds.forEach((cloud) => {
        const near = cloud.dataset.depth === "near";
        const side = Number(cloud.dataset.side);
        const bounds = cloud.getBoundingClientRect();
        const viewport = element.getBoundingClientRect();
        const travel =
          side === 0
            ? 0
            : side < 0
              ? viewport.left - bounds.right - 70
              : viewport.right - bounds.left + 70;
        exit!.to(
          cloud,
          {
            x: travel,
            y:
              side === 0 ? viewport.bottom - bounds.top + 70 : near ? 100 : -36,
            scale: near ? 1.08 : 1.02,
            duration: near ? 0.82 : 0.96,
            ease: "power2.inOut",
          },
          near ? 0 : 0.1,
        );
      });
      exit.to(element, { autoAlpha: 0, duration: 0.16 }, 0.98);
    });

    const show = context.add("show", () => {
      if (disposed || finished || current === "ready" || current === "fallback")
        return;
      shown = true;
      element.dataset.phase = "assembling";
      gsap.set(element, { visibility: "visible" });
      if (reduced.matches) {
        settled = true;
        element.dataset.phase = "waiting";
        gsap.to(element, { opacity: 1, duration: 0.15 });
        return;
      }

      gsap.set(blocks, { autoAlpha: 0, transformOrigin: "50% 100%" });
      entrance = gsap.timeline();
      entrance.to(
        element,
        { opacity: 1, duration: 0.25, ease: "power1.out" },
        0,
      );
      clouds.forEach((cloud, index) => {
        const near = cloud.dataset.depth === "near";
        entrance!.fromTo(
          cloud,
          {
            x:
              Number(cloud.dataset.side) *
              element.clientWidth *
              (near ? 0.18 : 0.08),
            y: near ? 46 : -10,
            scale: 0.97,
            opacity: 0,
          },
          {
            x: 0,
            y: 0,
            scale: 1,
            opacity: 1,
            duration: 0.88,
            ease: "power3.out",
          },
          index * 0.035,
        );
      });
      entrance.fromTo(
        caption,
        { y: 7, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.35 },
        0.35,
      );

      assembly = gsap.timeline({
        delay: 0.15,
        onComplete: () => {
          settled = true;
          element.dataset.phase = "waiting";
          if (current === "ready") reveal();
        },
      });
      blocks.forEach((block, index) => {
        const direction = index % 2 ? 1 : -1;
        const start = index * 0.065;
        assembly!
          .fromTo(
            block,
            {
              x: direction * (index > 15 ? 9 : 5),
              y: -48,
              rotation: direction * 7,
              scaleX: 0.93,
              scaleY: 1.06,
              autoAlpha: 0,
            },
            {
              x: 0,
              y: 0,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              autoAlpha: 1,
              duration: 0.3,
              ease: "power2.in",
            },
            start,
          )
          .to(
            block,
            {
              scaleX: 1.11,
              scaleY: 0.83,
              rotation: -direction * 1.5,
              duration: 0.065,
              ease: "power1.out",
            },
            start + 0.3,
          )
          .to(
            block,
            {
              y: -4,
              scaleX: 0.97,
              scaleY: 1.07,
              rotation: direction * 0.8,
              duration: 0.13,
              ease: "power2.out",
            },
            start + 0.365,
          )
          .to(
            block,
            {
              y: 0,
              scaleX: 1,
              scaleY: 1,
              rotation: 0,
              duration: 0.2,
              ease: "power2.inOut",
            },
            start + 0.495,
          );
      });

      // Only the whole settled island and cloud interiors drift; the landed
      // blocks stay put, so a slow connection does not restart fake progress.
      ambience = gsap.timeline({ repeat: -1, yoyo: true, delay: 2.3 });
      ambience.to(island, { y: -4, duration: 2.7, ease: "sine.inOut" }, 0);
      clouds.forEach((cloud, index) => {
        ambience!.to(
          cloud.firstElementChild,
          { y: index % 2 ? -3 : 4, duration: 2.7, ease: "sine.inOut" },
          0,
        );
      });
    });

    const update = context.add("update", (next: ArrivalStage) => {
      current = next;
      if (finished || exiting) return;
      if (next === "fallback") {
        if (!shown) {
          if (timer) clearTimeout(timer);
          finish();
        } else reveal(true);
      } else if (next === "ready") {
        if (!shown) {
          if (timer) clearTimeout(timer);
          finish();
        } else if (settled || reduced.matches) {
          reveal();
        } else if (assembly) {
          // Once the actual frame is ready, finish the in-flight construction
          // in at most 550ms; never impose a full replay on a quick cache hit.
          assembly.timeScale(
            Math.max(1, (assembly.duration() - assembly.time()) / 0.55),
          );
        }
      }
    });

    const preferenceChanged = context.add("preferenceChanged", () => {
      if (!reduced.matches || !shown || finished) return;
      entrance?.kill();
      ambience?.kill();
      assembly?.kill();
      exit?.kill();
      if (current === "ready" || current === "fallback") {
        exiting = false;
        reveal(true);
      } else {
        settled = true;
        element.dataset.phase = "waiting";
        gsap.set(blocks, { x: 0, y: 0, rotation: 0, scale: 1, autoAlpha: 1 });
        if (clouds.length)
          gsap.set(clouds, { x: 0, y: 0, scale: 1, autoAlpha: 1 });
        gsap.set(element, { autoAlpha: 1 });
      }
    });

    controller.current = { update: (next) => update(next) };
    const timer = setTimeout(() => {
      // Keep the cloud formation intact on slow connections: intrinsic sizes
      // reserve its geometry, and no individual bitmap pops in mid-entrance.
      void Promise.allSettled(
        clouds.map((cloud) =>
          (cloud.firstElementChild as HTMLImageElement).decode(),
        ),
      ).then(() => show());
    }, 250);
    const onPreferenceChange = () => preferenceChanged();
    reduced.addEventListener("change", onPreferenceChange);
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      reduced.removeEventListener("change", onPreferenceChange);
      controller.current = null;
      context.revert();
      unlockScroll();
    };
  }, [scope, variant]);

  useEffect(() => {
    controller.current?.update(stage);
  }, [stage, scope, variant]);

  const measured =
    typeof progress === "number" && Number.isFinite(progress)
      ? Math.min(1, Math.max(0, progress))
      : undefined;
  const terminal = stage === "ready" || stage === "fallback";
  const preparing = stage === "preparing" || measured === 1;
  const message = label ?? (preparing ? "正在点亮世界" : "正在准备旅途");

  return (
    <div
      ref={root}
      className="arrival"
      data-scope={scope}
      data-variant={variant}
      data-stage={stage}
      data-phase="dormant"
    >
      {variant === "clouds" && (
        <>
          <div className="arrival-mist" aria-hidden="true" />
          <div className="arrival-cloudfield" aria-hidden="true">
            {CLOUDS.map(({ name, depth, side, image }) => (
              <div
                key={name}
                className={`arrival-cloud arrival-cloud-${name}`}
                data-depth={depth}
                data-side={side}
              >
                <img
                  className="arrival-cloud-body"
                  src={`/xinera/arrival/cloud-${image}.webp`}
                  width={CLOUD_SIZES[image][0]}
                  height={CLOUD_SIZES[image][1]}
                  alt=""
                  loading="eager"
                  fetchPriority="low"
                  draggable={false}
                />
              </div>
            ))}
          </div>
        </>
      )}
      <div className="arrival-center">
        <div className="arrival-island">
          <Island />
        </div>
        <div className="arrival-caption">
          <p role="status" aria-live="polite">
            {terminal ? "" : message}
          </p>
          {!terminal && !preparing && measured !== undefined && (
            <div className="arrival-progress" aria-hidden="true">
              <span className="arrival-progress-track">
                <i
                  style={{ "--arrival-progress": measured } as CSSProperties}
                />
              </span>
              <span className="arrival-progress-value">
                {Math.floor(measured * 100)}%
              </span>
            </div>
          )}
          {!terminal && (preparing || measured === undefined) && (
            <span className="arrival-status-mark" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
