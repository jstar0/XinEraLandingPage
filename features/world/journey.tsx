"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Header } from "@/components/site/header";
import { BrandWordmark } from "@/components/site/brand";
import { StepLink } from "@/components/site/step-link";
import { asset } from "@/lib/site";
import { Arrival } from "../rendering/arrival";
import { createWorldClock } from "./world-clock";
import {
  HERO_URL,
  requestHero,
  type JourneyLoadState,
} from "./scene/hero-request";

export function Journey() {
  const root = useRef<HTMLElement>(null);
  const [scene, setScene] = useState<"courtyard" | "hall">("courtyard");
  const [load, setLoad] = useState<JourneyLoadState>({ stage: "loading" });
  const [arrived, setArrived] = useState(false);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const clock = createWorldClock(el);
    let controller: AbortController | undefined;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    function mount() {
      controller?.abort();
      clearTimeout(watchdog);
      if (reduced.matches || !el) {
        setLoad({ stage: "fallback" });
        return;
      }
      const current = new AbortController();
      controller = current;
      const resetWatchdog = (timeout: number) => {
        clearTimeout(watchdog);
        watchdog = setTimeout(() => {
          report({ stage: "fallback" });
          current.abort();
        }, timeout);
      };
      const report = (state: JourneyLoadState) => {
        if (current.signal.aborted) return;
        if (state.stage === "ready" || state.stage === "fallback")
          clearTimeout(watchdog);
        else if (state.stage === "preparing") resetWatchdog(45_000);
        setLoad(state);
      };
      resetWatchdog(30_000);
      const download = requestHero(current.signal, report, () =>
        resetWatchdog(30_000),
      );
      // Local design review only; production builds eliminate this branch.
      const inspectArrival =
        process.env.NODE_ENV === "development" &&
        new URLSearchParams(location.search).get("arrival") === "preview";
      const visibleDownload = inspectArrival
        ? Promise.all([
            download,
            new Promise<void>((resolve) => setTimeout(resolve, 4500)),
          ]).then(([bytes]) => bytes)
        : download;
      // The model may fail before the dynamically imported renderer is ready.
      void visibleDownload.catch(() => report({ stage: "fallback" }));
      import("./scene/runtime")
        .then(({ mountJourney }) => {
          if (!current.signal.aborted)
            return mountJourney(
              el,
              current.signal,
              visibleDownload,
              report,
              clock,
            );
        })
        .catch((error) => {
          if (!current.signal.aborted) {
            report({ stage: "fallback" });
            console.warn(
              "Scene unavailable; retaining the accessible static view.",
              error,
            );
          }
        });
    }
    mount();
    reduced.addEventListener("change", mount);
    return () => {
      reduced.removeEventListener("change", mount);
      clearTimeout(watchdog);
      controller?.abort();
      clock.dispose();
    };
  }, []);
  function enterKey(event: KeyboardEvent<HTMLAnchorElement>) {
    if (event.key === " ") {
      event.preventDefault();
      event.currentTarget.click();
    }
  }
  function tabKey(e: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const next =
      e.key === "Home"
        ? "courtyard"
        : e.key === "End"
          ? "hall"
          : scene === "hall"
            ? "courtyard"
            : "hall";
    setScene(next);
    root.current
      ?.querySelector<HTMLButtonElement>(`[data-scene="${next}"]`)
      ?.focus();
  }
  return (
    <section
      ref={root}
      id="journey"
      data-scene={scene}
      data-arrival={arrived ? "complete" : "pending"}
      aria-label="心纪元，从这里踏上旅途"
    >
      <link
        rel="preload"
        as="fetch"
        href={HERO_URL}
        crossOrigin="anonymous"
        fetchPriority="high"
        media="(prefers-reduced-motion: no-preference)"
      />
      <div id="stage">
        <div id="sky-scene">
          <picture className="hero-fallback">
            <source
              media="(max-width: 700px)"
              srcSet={asset("hero-poster-mobile.webp")}
            />
            <img
              src={asset("hero-poster-desktop.webp")}
              alt=""
              fetchPriority="high"
            />
          </picture>
          <picture className="hero-fallback hero-fallback-night">
            <source
              media="(max-width: 700px)"
              srcSet={asset("hero-poster-mobile-night.webp")}
            />
            <img src={asset("hero-poster-desktop-night.webp")} alt="" />
          </picture>
          <canvas id="sky-canvas" aria-hidden="true" />
          <div className="sun-haze" />
        </div>
        <Arrival
          variant="clouds"
          stage={load.stage}
          progress={load.progress}
          onRevealComplete={() => {
            if (root.current) root.current.dataset.arrival = "complete";
            setArrived(true);
          }}
        />
        <Header hero />
        <div id="hero-type">
          <h1>
            <BrandWordmark />
          </h1>
          <p>Minecraft · 原创剧情 RPG</p>
          <a
            id="depart"
            href="#view-window"
            data-enter-world
            onKeyDown={enterKey}
            aria-label="出发"
            aria-disabled={!arrived || undefined}
            tabIndex={arrived ? undefined : -1}
          >
            <img
              src={asset("hero-button.png")}
              alt=""
              width="185"
              height="59"
            />
          </a>
        </div>
        <a
          className="scroll-hint"
          href="#view-window"
          data-enter-world
          onKeyDown={enterKey}
          aria-disabled={!arrived || undefined}
          tabIndex={arrived ? undefined : -1}
        >
          <span>向下探索</span>
          <i aria-hidden="true">
            <b />
          </i>
        </a>
        <div
          id="view-window"
          role="tabpanel"
          aria-labelledby={`scene-${scene}`}
        >
          <img
            className="world-fallback"
            src={asset(`${scene}.webp`)}
            loading="lazy"
            alt={
              scene === "hall"
                ? "西奥格勒教堂的彩窗大厅"
                : "西奥格勒教堂庭院的台阶与拱廊"
            }
          />
          <canvas id="world-canvas" aria-hidden="true" />
          <div className="world-gradient" />
          <div id="world-title">
            <p>新纪元联邦 / 西奥格勒</p>
            <h2>{scene === "hall" ? "彩窗大厅" : "庭院"}</h2>
          </div>
          <div id="scene-tabs" role="tablist" aria-label="西奥格勒教堂视角">
            {(["courtyard", "hall"] as const).map((key) => (
              <button
                key={key}
                id={`scene-${key}`}
                role="tab"
                aria-selected={scene === key}
                aria-controls="view-window"
                tabIndex={scene === key ? 0 : -1}
                data-scene={key}
                onKeyDown={tabKey}
                onClick={() => setScene(key)}
              >
                {key === "hall" ? "彩窗大厅" : "庭院"}
              </button>
            ))}
            <span className={`tab-track ${scene === "hall" ? "hall" : ""}`} />
          </div>
        </div>
        <div id="world-caption">
          <span className="section-number">01 — 旅途</span>
          <h2>
            从异乡人，
            <br />
            成为骑士。
          </h2>
          <p>
            从故乡的战火中出逃，走过五座城市。
            <br />
            在陌生的人群里，找到值得守护的事物。
          </p>
          <StepLink href="/journal/courtyard">读一页旅途</StepLink>
        </div>
      </div>
    </section>
  );
}
