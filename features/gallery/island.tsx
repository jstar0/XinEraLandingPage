"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { GalleryPlace, GallerySettings, IslandView } from "./content";
import { galleryPlaces, scenes } from "./content";
import type { IslandController } from "./runtime";
import { Arrival } from "../rendering/arrival";

function subscribeMotion(callback: () => void) {
  const query = matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export function Island({ place }: { place: GalleryPlace }) {
  const scene = scenes[place];
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  const canvas = useRef<HTMLCanvasElement>(null);
  const controller = useRef<IslandController | undefined>(undefined);
  const revealed = useRef(false);
  const settings = useRef<GallerySettings>({
    night: false,
    touring: true,
    route: "coast",
  });
  const [night, setNight] = useState(false);
  const [touring, setTouring] = useState(true);
  const [route, setRoute] = useState<IslandView>("coast");
  const [status, setStatus] = useState<
    "loading" | "preparing" | "ready" | "unavailable"
  >("loading");
  const [revealComplete, setRevealComplete] = useState(false);
  const interactive = status === "ready" && revealComplete;

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const abort = new AbortController();
    const fail = () => {
      if (abort.signal.aborted) return;
      abort.abort();
      controller.current = undefined;
      setStatus("unavailable");
    };
    const watchdog = setTimeout(fail, 45_000);
    import("./runtime")
      .then(({ mountIsland }) =>
        mountIsland(
          el,
          abort.signal,
          () => ({
            ...settings.current,
            touring:
              revealed.current &&
              settings.current.touring &&
              !matchMedia("(prefers-reduced-motion: reduce)").matches,
          }),
          fail,
          () => {
            if (abort.signal.aborted) return;
            settings.current.touring = false;
            setTouring(false);
          },
          place,
          () => {
            if (!abort.signal.aborted) setStatus("preparing");
          },
        ),
      )
      .then((instance) => {
        if (abort.signal.aborted || !instance) return;
        clearTimeout(watchdog);
        controller.current = instance;
        setStatus("ready");
      })
      .catch(fail);
    return () => {
      clearTimeout(watchdog);
      abort.abort();
      controller.current = undefined;
      revealed.current = false;
    };
  }, [place]);

  const chooseRoute = (value: IslandView) => {
    if (!interactive) return;
    settings.current.route = value;
    setRoute(value);
    controller.current?.view(value);
  };

  return (
    <div
      className="island-viewer"
      data-status={status}
      data-place={place}
      data-night={night}
      data-route={route}
      data-touring={interactive && touring && !reducedMotion}
      data-revealed={revealComplete}
      aria-busy={status === "loading" || status === "preparing"}
    >
      <img
        className="island-poster"
        src={scene.image}
        alt={scene.imageAlt}
        fetchPriority="high"
      />
      <canvas
        ref={canvas}
        className="island-canvas"
        tabIndex={interactive ? 0 : -1}
        aria-label={`${scene.title}三维视图。沿选定路线自动巡游；拖动或缩放可暂停巡游。键盘方向键旋转，加减键缩放。下方可选择${scene.routes.map(({ label }) => label).join("、")}路线。`}
        aria-hidden={!interactive}
      />
      <Arrival
        scope="scene"
        variant="clouds"
        stage={status === "unavailable" ? "fallback" : status}
        onRevealComplete={() => {
          revealed.current = true;
          setRevealComplete(true);
          controller.current?.reveal();
        }}
      />
      <div className="island-topline">
        <span className="island-label">
          {String(galleryPlaces.indexOf(place) + 1).padStart(2, "0")} /{" "}
          {scene.title}
        </span>
        <div className="island-light" aria-label="场景光照">
          <button
            aria-pressed={!night}
            disabled={!interactive}
            onClick={() => {
              settings.current.night = false;
              setNight(false);
            }}
          >
            <span aria-hidden="true">☀</span> 日景
          </button>
          <button
            aria-pressed={night}
            disabled={!interactive}
            onClick={() => {
              settings.current.night = true;
              setNight(true);
            }}
          >
            <span aria-hidden="true">☾</span> 夜景
          </button>
        </div>
      </div>
      <div className="island-controls">
        <div className="island-presets" aria-label="选择巡游路线">
          {scene.routes.map(({ id, label, description }) => (
            <button
              key={id}
              aria-pressed={route === id}
              title={description}
              disabled={!interactive}
              onClick={() => chooseRoute(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          className="island-orbit"
          disabled={!interactive || reducedMotion}
          aria-pressed={interactive && touring && !reducedMotion}
          onClick={() => {
            const next = !touring;
            settings.current.touring = next;
            setTouring(next);
            if (!next) controller.current?.pause();
          }}
        >
          <span aria-hidden="true">
            {touring && !reducedMotion ? "Ⅱ" : "▷"}
          </span>
          {reducedMotion ? "减少动态已开启" : touring ? "暂停巡游" : "继续巡游"}
        </button>
      </div>
      <p
        className="island-status island-live-status"
        role="status"
        hidden={!interactive && status !== "unavailable"}
      >
        {status === "unavailable"
          ? "当前暂时无法显示三维，已保留场景静帧。"
          : touring && !reducedMotion
            ? "沿着风景慢慢走 · 拖动可暂停"
            : "拖动环顾 · 滚轮缩放"}
      </p>
      <noscript>
        <style>{".island-live-status{display:none!important}"}</style>
        <p className="island-status">
          启用 JavaScript 后可转动查看，当前显示场景静帧。
        </p>
      </noscript>
    </div>
  );
}
