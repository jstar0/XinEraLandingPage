/** One visible minute advances the scene through one complete day. */
export const WORLD_DAY_MS = 60_000;

export type WorldPeriod =
  | "dawn"
  | "morning"
  | "noon"
  | "afternoon"
  | "dusk"
  | "night";

export type WorldTime = {
  hour: number;
  orbit: number;
  night: number;
  warmth: number;
  sunVisibility: number;
  period: WorldPeriod;
  label: string;
};

const TAU = Math.PI * 2;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const wrapHour = (hour: number) => ((hour % 24) + 24) % 24;
const forwardArc = (from: number, to: number) =>
  (((to - from) % TAU) + TAU) % TAU;

function smoothstep(low: number, high: number, value: number) {
  const t = clamp((value - low) / (high - low));
  return t * t * (3 - 2 * t);
}

/** Read the visitor's local wall clock once, including its fractional hour. */
export function localHour(date: Date): number {
  return (
    date.getHours() +
    date.getMinutes() / 60 +
    date.getSeconds() / 3_600 +
    date.getMilliseconds() / 3_600_000
  );
}

/** elapsedMs is accumulated visible time after the arrival has revealed. */
export function cycleHour(initialHour: number, elapsedMs: number): number {
  return wrapHour(
    initialHour + ((elapsedMs % WORLD_DAY_MS) / WORLD_DAY_MS) * 24,
  );
}

function periodAt(hour: number): WorldPeriod {
  if (hour < 5 || hour >= 19) return "night";
  if (hour < 7) return "dawn";
  if (hour < 11) return "morning";
  if (hour < 13) return "noon";
  if (hour < 17) return "afternoon";
  return "dusk";
}

const LABELS: Record<WorldPeriod, string> = {
  dawn: "黎明",
  morning: "上午",
  noon: "正午",
  afternoon: "午后",
  dusk: "黄昏",
  night: "夜间",
};

/** Sample a stable scene mode; theme transitions use blendWorldTime. */
export function sampleWorldTime(hour: number, darkMix = 0): WorldTime {
  hour = wrapHour(hour);
  darkMix = clamp(darkMix);
  const dayOrbit = ((hour - 12) / 24) * TAU;
  const solarHeight = Math.cos(dayOrbit);
  const naturalNight = 1 - smoothstep(-0.12, 0.2, solarHeight);
  const night = naturalNight + (1 - naturalNight) * darkMix;
  const warmth =
    (1 - smoothstep(0.15, 0.9, solarHeight)) *
    (1 - naturalNight) *
    (1 - darkMix);

  // The moon travels from the left horizon to the right, never reversing.
  // At the cycle seam it returns below the horizon's visibility fade.
  const darkOrbit = Math.PI / 2 + (hour / 24) * Math.PI;
  const orbit =
    darkMix === 1
      ? darkOrbit
      : dayOrbit + forwardArc(dayOrbit, darkOrbit) * darkMix;
  const period = darkMix >= 0.5 ? "night" : periodAt(hour);

  return {
    hour,
    orbit,
    night,
    warmth,
    sunVisibility: 1 - darkMix,
    period,
    label: LABELS[period],
  };
}

/** Continue forward even when a new theme interrupts an unfinished change. */
export function blendWorldTime(
  from: WorldTime,
  to: WorldTime,
  progress: number,
): WorldTime {
  const t = clamp(progress);
  const mix = (start: number, end: number) => start + (end - start) * t;
  const description = t < 0.5 ? from : to;

  return {
    hour: to.hour,
    orbit: from.orbit + forwardArc(from.orbit, to.orbit) * t,
    night: mix(from.night, to.night),
    warmth: mix(from.warmth, to.warmth),
    sunVisibility: mix(from.sunVisibility, to.sunVisibility),
    period: description.period,
    label: description.label,
  };
}
