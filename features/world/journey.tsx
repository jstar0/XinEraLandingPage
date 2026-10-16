"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Header } from "@/components/site/header";
import { StepLink } from "@/components/site/step-link";
import { asset } from "@/lib/site";

export function Journey() {
  const root = useRef<HTMLElement>(null);
  const [scene, setScene] = useState<"courtyard" | "hall">("courtyard");
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let controller: AbortController | undefined;
    function mount() {
      controller?.abort();
      if (reduced.matches || !el) return;
      const current = new AbortController();
      controller = current;
      import("./scene/runtime")
        .then(({ mountJourney }) => {
          if (!current.signal.aborted) return mountJourney(el, current.signal);
        })
        .catch((error) => {
          if (!current.signal.aborted)
            console.warn(
              "Scene unavailable; retaining the accessible static view.",
              error,
            );
        });
    }
    mount();
    reduced.addEventListener("change", mount);
    return () => {
      reduced.removeEventListener("change", mount);
      controller?.abort();
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
      aria-label="心纪元，从这里踏上旅途"
    >
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
        <Header hero />
        <div id="hero-type">
          <h1>
            <img
              src={asset("hero-title.png")}
              alt="心纪元 XIN ERA"
              width="373"
              height="172"
              className="hero-title"
              fetchPriority="high"
            />
          </h1>
          <p>Minecraft · 原创剧情 RPG</p>
          <a
            id="depart"
            href="#view-window"
            data-enter-world
            onKeyDown={enterKey}
            aria-label="出发"
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
            src={asset(`${scene}.jpg`)}
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
