"use client";

import { useEffect, useSyncExternalStore } from "react";
import { themeStorageKey, type SiteTheme } from "@/lib/theme";

let inMemoryPreference: SiteTheme | null = null;

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

export function ThemeSync() {
  useEffect(() => {
    const system = matchMedia("(prefers-color-scheme: dark)");
    function sync() {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(themeStorageKey);
      } catch {
        saved = inMemoryPreference;
      }
      applyTheme(
        saved === "dark" || saved === "light"
          ? saved
          : system.matches
            ? "dark"
            : "light",
      );
    }
    function storage(event: StorageEvent) {
      if (event.key === themeStorageKey || event.key === null) sync();
    }
    applyTheme(currentTheme());
    system.addEventListener("change", sync);
    window.addEventListener("storage", storage);
    return () => {
      system.removeEventListener("change", sync);
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
      title={dark ? "切换到白天" : "切换到夜晚"}
      onClick={() => {
        const next = currentTheme() === "dark" ? "light" : "dark";
        inMemoryPreference = next;
        applyTheme(next);
        try {
          localStorage.setItem(themeStorageKey, next);
        } catch {
          // The visible theme remains usable without persistent storage.
        }
      }}
    >
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
            <path
              d="M18 50h5v5h-5zM25 57h5v5h-5zM19 59h3v3h-3z"
              fill="#90a8c2"
            />
          </g>
        </g>
        <path className="theme-horizon" d="M7 37h9v-2h16v2h9v2H7z" />
      </svg>
    </button>
  );
}
