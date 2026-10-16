"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { GalleryPlace, GallerySettings, IslandView } from "./content";
import { galleryPlaces, scenes } from "./content";
import type { IslandController } from "./runtime";

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
  const settings = useRef<GallerySettings>({
    night: false,
    touring: true,
    route: "coast",
  });
  const [night, setNight] = useState(false);
  const [touring, setTouring] = useState(true);
  const [route, setRoute] = useState<IslandView>("coast");
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">(
    "loading",
  );

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const abort = new AbortController();
    import("./runtime")
      .then(({ mountIsland }) =>
        mountIsland(
          el,
          abort.signal,
          () => ({
            ...settings.current,
            touring:
              settings.current.touring &&
              !matchMedia("(prefers-reduced-motion: reduce)").matches,
          }),
          () => {
            if (!abort.signal.aborted) setStatus("unavailable");
          },
          () => {
            if (abort.signal.aborted) return;
            settings.current.touring = false;
            setTouring(false);
          },
          place,
        ),
      )
      .then((instance) => {
        if (abort.signal.aborted || !instance) return;
        controller.current = instance;
        setStatus("ready");
      })
      .catch(() => {
        if (!abort.signal.aborted) setStatus("unavailable");
      });
    return () => {
      abort.abort();
      controller.current = undefined;
    };
  }, [place]);

  const chooseRoute = (value: IslandView) => {
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
      data-touring={touring && !reducedMotion}
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
        tabIndex={status === "ready" ? 0 : -1}
        aria-label={`${scene.title}三维视图。沿选定路线自动巡游；拖动或缩放可暂停巡游。键盘方向键旋转，加减键缩放。下方可选择${scene.routes.map(({ label }) => label).join("、")}路线。`}
        aria-hidden={status !== "ready"}
      />
      <div className="island-topline">
        <span className="island-label">
          {String(galleryPlaces.indexOf(place) + 1).padStart(2, "0")} /{" "}
          {scene.title}
        </span>
        <div className="island-light" aria-label="场景光照">
          <button
            aria-pressed={!night}
            disabled={status !== "ready"}
            onClick={() => {
              settings.current.night = false;
              setNight(false);
            }}
          >
            <span aria-hidden="true">☀</span> 日景
          </button>
          <button
            aria-pressed={night}
            disabled={status !== "ready"}
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
              disabled={status !== "ready"}
              onClick={() => chooseRoute(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          className="island-orbit"
          disabled={status !== "ready" || reducedMotion}
          aria-pressed={touring && !reducedMotion}
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
      <p className="island-status island-live-status" role="status">
        {status === "loading"
          ? "正在准备三维场景…"
          : status === "unavailable"
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
