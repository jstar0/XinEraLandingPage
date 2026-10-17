import {
  blendWorldTime,
  cycleHour,
  localHour,
  sampleWorldTime,
  type WorldTime,
} from "./scene/world-time";

/** One clock feeds the renderer, its fallback and the header. No React frame updates. */
export function createWorldClock(root: HTMLElement) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const query =
    process.env.NODE_ENV === "development"
      ? new URLSearchParams(location.search)
      : null;
  const preview = query?.get("time");
  const previewHour =
    preview !== null &&
    preview !== undefined &&
    Number.isFinite(Number(preview))
      ? Number(preview)
      : null;
  let initialHour = previewHour ?? localHour(new Date());
  let elapsed = 0;
  let last = performance.now();
  let lastPaint = -Infinity;
  let darkTo = document.documentElement.dataset.theme === "dark" ? 1 : 0;
  let transitionFrom: WorldTime | null = null;
  let transitionElapsed = 2000;
  let raf = 0;
  let visible = true;
  let disposed = false;
  let poster = "";
  const fixed = previewHour !== null || query?.has("poster");
  const sample = () => {
    const target = sampleWorldTime(cycleHour(initialHour, elapsed), darkTo);
    if (!transitionFrom || transitionElapsed >= 2000) return target;
    const t = transitionElapsed / 2000;
    return blendWorldTime(transitionFrom, target, t * t * (3 - 2 * t));
  };

  function paint() {
    const time = sample();
    root.dataset.timeStart = initialHour.toFixed(4);
    root.dataset.timePeriod = time.period;
    root.dataset.timeHour = time.hour.toFixed(3);
    root.dataset.timeMode = darkTo ? "night" : "cycle";
    root.dataset.timeTransition = String(transitionElapsed < 2000);
    root.style.setProperty("--world-night", time.night.toFixed(4));
    root.style.setProperty("--world-warmth", time.warmth.toFixed(4));
    root.style.setProperty(
      "--world-mist",
      [
        239 + (35 - 239) * time.night,
        213 + (53 - 213) * time.night,
        184 + (77 - 184) * time.night,
      ]
        .map(Math.round)
        .join(","),
    );
    root.style.setProperty(
      "--world-orbit",
      `${(time.orbit * 180) / Math.PI}deg`,
    );
    root.style.setProperty(
      "--world-ink",
      `color-mix(in srgb, #253043, #edf0f7 ${time.night * 100}%)`,
    );
    root
      .querySelectorAll<HTMLElement>("[data-world-time-label]")
      .forEach((el) => {
        if (el.textContent !== time.label) el.textContent = time.label;
      });
    // Only the visible fallback needs a time-specific image. Once WebGL is
    // ready, a full cycle must not download additional poster variants.
    if (root.dataset.heroModel !== "ready") {
      const tone = time.hour < 9 ? "-dawn" : time.hour >= 15 ? "-dusk" : "";
      if (tone !== poster || !root.dataset.timePoster) {
        poster = tone;
        root.dataset.timePoster = tone || "day";
        const picture = root.querySelector(
          ".hero-fallback:not(.hero-fallback-night)",
        );
        picture
          ?.querySelector("source")
          ?.setAttribute("srcset", `/xinera/hero-poster-mobile${tone}.webp`);
        picture
          ?.querySelector("img")
          ?.setAttribute("src", `/xinera/hero-poster-desktop${tone}.webp`);
      }
    }
  }
  function running() {
    return (
      !fixed &&
      !reduced.matches &&
      root.dataset.timePaused !== "true" &&
      root.dataset.arrival === "complete"
    );
  }
  function tick(now: number) {
    raf = 0;
    if (disposed || document.hidden || !visible) return;
    const delta = Math.max(0, now - last);
    last = now;
    const wasTransitioning = transitionElapsed < 2000;
    // Freeze the hour during a forward-only sun/moon handoff.
    if (transitionElapsed < 2000) {
      transitionElapsed = Math.min(2000, transitionElapsed + delta);
    } else if (running()) elapsed += delta;
    if (now - lastPaint >= 80 || wasTransitioning) {
      paint();
      lastPaint = now;
    }
    if (running() || transitionElapsed < 2000)
      raf = requestAnimationFrame(tick);
  }
  function wake() {
    last = performance.now();
    if (!disposed && !document.hidden && visible && !raf)
      raf = requestAnimationFrame(tick);
  }
  function sync() {
    const next = document.documentElement.dataset.theme === "dark" ? 1 : 0;
    if (next !== darkTo) {
      transitionFrom = sample();
      darkTo = next;
      transitionElapsed = reduced.matches ? 2000 : 0;
    }
    if (reduced.matches) {
      transitionElapsed = 2000;
    }
    paint();
    wake();
  }
  const themes = new MutationObserver(sync);
  themes.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  const arrival = new MutationObserver(wake);
  arrival.observe(root, {
    attributes: true,
    attributeFilter: ["data-arrival", "data-time-paused"],
  });
  const visibility = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) wake();
  });
  visibility.observe(root);
  document.addEventListener("visibilitychange", wake);
  window.addEventListener("xinera:world-clock-change", sync);
  reduced.addEventListener("change", sync);
  // Local visual review can inspect several hours without reloading the model.
  const review = (event: Event) => {
    const hour = (event as CustomEvent<number>).detail;
    if (!Number.isFinite(hour)) return;
    initialHour = hour;
    elapsed = 0;
    paint();
  };
  if (process.env.NODE_ENV === "development")
    window.addEventListener("xinera:world-time-preview", review);
  paint();
  wake();
  return {
    sample,
    transitioning: () => transitionElapsed < 2000,
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      themes.disconnect();
      arrival.disconnect();
      visibility.disconnect();
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("xinera:world-clock-change", sync);
      window.removeEventListener("xinera:world-time-preview", review);
      reduced.removeEventListener("change", sync);
    },
  };
}
