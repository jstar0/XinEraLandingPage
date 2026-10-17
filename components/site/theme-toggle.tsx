"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { themeStorageKey, type SiteTheme } from "@/lib/theme";

let inMemoryPreference: SiteTheme | null = null;
let pendingTheme: SiteTheme | null = null;
let themeTransition: ViewTransition | undefined;
let themeRequest = 0;

function currentTheme(): SiteTheme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function applyTheme(theme: SiteTheme) {
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute("content", theme === "dark" ? "#111e30" : "#f4dfc9");
}

function saveTheme(theme: SiteTheme, showDay = false) {
  const request = ++themeRequest;
  inMemoryPreference = theme;
  pendingTheme = theme;
  try {
    localStorage.setItem(themeStorageKey, theme);
  } catch {
    // The visible theme remains usable without persistent storage.
  }
  const update = () => {
    if (request !== themeRequest) return;
    pendingTheme = null;
    applyTheme(theme);
    window.dispatchEvent(
      new CustomEvent("xinera:world-clock-change", { detail: { showDay } }),
    );
  };
  themeTransition?.skipTransition();
  themeTransition = undefined;
  const root = document.documentElement;
  if (
    document.querySelector("#journey") ||
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    !document.startViewTransition
  ) {
    delete root.dataset.themeTransition;
    update();
    return;
  }
  root.dataset.themeTransition = "true";
  const transition = document.startViewTransition(update);
  themeTransition = transition;
  void transition.finished
    .catch(() => {})
    .finally(() => {
      if (themeTransition !== transition) return;
      themeTransition = undefined;
      delete root.dataset.themeTransition;
    });
}

export function ThemeSync() {
  useEffect(() => {
    function sync() {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(themeStorageKey);
      } catch {
        saved = inMemoryPreference;
      }
      applyTheme(saved === "dark" ? "dark" : "light");
    }
    function storage(event: StorageEvent) {
      if (event.key === themeStorageKey || event.key === null) sync();
    }
    sync();
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener("storage", storage);
    };
  }, []);
  return null;
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "light");
  const dark = theme === "dark";
  return (
    <button
      className="theme-toggle"
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="深色模式"
      title={dark ? "切换浅色主题" : "切换深色主题"}
      onClick={() => {
        saveTheme(
          (pendingTheme ?? currentTheme()) === "dark" ? "light" : "dark",
        );
      }}
    >
      <ThemeIcon />
    </button>
  );
}

function ThemeIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" shapeRendering="crispEdges">
      <g className="theme-orbit">
        <g className="theme-sun">
          <path d="M15 7h18v18H15z" fill="#e9944a" />
          <path d="M18 10h12v12H18z" fill="#ffe5a0" />
          <path
            d="M22 1h4v3h-4zM22 28h4v3h-4zM9 14h3v4H9zM36 14h3v4h-3zM11 3h3v3h-3zM34 3h3v3h-3zM11 26h3v3h-3zM34 26h3v3h-3z"
            fill="#d17b34"
          />
        </g>
        <g className="theme-moon">
          <path d="M14 46h20v20H14z" fill="#b3c7e1" />
          <path d="M17 49h14v14H17z" fill="#eaf0e4" />
          <path d="M18 50h5v5h-5zM25 57h5v5h-5zM19 59h3v3h-3z" fill="#90a8c2" />
        </g>
      </g>
      <path className="theme-horizon" d="M7 37h9v-2h16v2h9v2H7z" />
    </svg>
  );
}

function TimeGlyph({ moon = false }: { moon?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" shapeRendering="crispEdges">
      {moon ? (
        <>
          <path d="M4 4h16v16H4z" fill="#9db5d2" />
          <path d="M6 6h12v12H6z" fill="#e5edf2" />
          <path d="M7 7h4v3H7zM13 12h4v4h-4zM8 14h2v3H8z" fill="#b4c7da" />
        </>
      ) : (
        <>
          <path
            d="M6 6h12v12H6zM11 1h2v3h-2zM11 20h2v3h-2zM1 11h3v2H1zM20 11h3v2h-3z"
            fill="#e9a25d"
          />
          <path d="M8 8h8v8H8z" fill="#ffe6a7" />
          <path d="M10 10h4v4h-4z" fill="#fff4d6" />
        </>
      )}
    </svg>
  );
}

function subscribeMotion(onChange: () => void) {
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function reducedMotion() {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function subscribeClock(onChange: () => void) {
  window.addEventListener("xinera:world-clock-change", onChange);
  return () =>
    window.removeEventListener("xinera:world-clock-change", onChange);
}

function timePaused() {
  return (
    document.querySelector<HTMLElement>("#journey")?.dataset.timePaused ===
    "true"
  );
}

export function WorldTimeControl() {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "light");
  const reduced = useSyncExternalStore(
    subscribeMotion,
    reducedMotion,
    () => false,
  );
  const paused = useSyncExternalStore(subscribeClock, timePaused, () => false);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    root.current
      ?.querySelector<HTMLButtonElement>(
        '.world-time-modes button[aria-pressed="true"]',
      )
      ?.focus();
    function outside(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !root.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      opener.current?.focus();
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div
      className="world-time"
      ref={root}
      onBlur={(event) => {
        if (
          event.relatedTarget instanceof Node &&
          !event.currentTarget.contains(event.relatedTarget)
        ) {
          setOpen(false);
        }
      }}
    >
      <button
        ref={opener}
        type="button"
        className="world-time-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        title="时光"
        onClick={() => setOpen(!open)}
      >
        <span className="world-time-emblem" aria-hidden="true">
          <span className="world-time-day">
            <TimeGlyph />
          </span>
          <span className="world-time-night">
            <TimeGlyph moon />
          </span>
        </span>
        <span data-world-time-label>此刻</span>
        <span className="world-time-chevron" aria-hidden="true" />
      </button>
      {open && (
        <div
          id={panelId}
          className="world-time-panel"
          role="dialog"
          aria-label="时光与主题"
        >
          <div
            className="world-time-modes"
            role="group"
            aria-label="流转与主题"
          >
            <button
              type="button"
              aria-pressed={theme === "light"}
              aria-label="昼夜流转，浅色主题"
              title="从白天开始，完整昼夜循环"
              onClick={() => saveTheme("light", true)}
            >
              <TimeGlyph />
              <span>昼夜流转</span>
            </button>
            <button
              type="button"
              aria-pressed={theme === "dark"}
              aria-label="只看夜色，深色主题"
              title="深色主题，仅在夜间流转"
              onClick={() => saveTheme("dark")}
            >
              <TimeGlyph moon />
              <span>只看夜色</span>
            </button>
          </div>
          <div className="world-time-footer">
            <span className="world-time-rate">
              {reduced ? "静止显示" : paused ? "停留此刻" : "每分钟一天"}
            </span>
            <button
              type="button"
              className="world-time-pause"
              disabled={reduced}
              aria-label={
                reduced ? "已减少动态" : paused ? "继续流转" : "暂停流转"
              }
              title={
                reduced
                  ? "已跟随减少动态设置"
                  : paused
                    ? "继续流转"
                    : "暂停流转"
              }
              aria-pressed={paused || reduced}
              onClick={() => {
                const journey = document.querySelector<HTMLElement>("#journey");
                if (!journey) return;
                journey.dataset.timePaused = String(!timePaused());
                window.dispatchEvent(new Event("xinera:world-clock-change"));
              }}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d={
                    paused || reduced
                      ? "M5 3v10l8-5z"
                      : "M4 3h3v10H4zM10 3h3v10h-3z"
                  }
                  fill="currentColor"
                />
              </svg>
              {reduced ? "已暂停" : paused ? "继续" : "暂停"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
