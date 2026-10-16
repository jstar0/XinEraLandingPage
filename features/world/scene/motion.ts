/** Approved camera path. Keep this separate from pointer drift and DOM layout. */
export const HERO_PATH = [
  [0, 0, 0, 14.4],
  [0.22, 0.08, -0.04, 13.45],
  [0.36, 0.5, -0.28, 12.6],
  [0.44, 2.6, -1.5, 10.7],
  [0.51, 3.6, -2.1, 10.3],
  [0.62, 3.85, -2.3, 10.2],
  [1, 3.85, -2.3, 10.2],
] as const;
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export function ease(a: number, b: number, x: number) {
  const t = clamp((x - a) / (b - a));
  return t * t * t * (t * (t * 6 - 15) + 10);
}
export function heroPosition(t: number): [number, number, number] {
  let k = 0;
  while (k < HERO_PATH.length - 2 && t > HERO_PATH[k + 1][0]) k++;
  const a = HERO_PATH[k],
    b = HERO_PATH[k + 1];
  const before = HERO_PATH[Math.max(0, k - 1)],
    after = HERO_PATH[Math.min(HERO_PATH.length - 1, k + 2)];
  const d = b[0] - a[0],
    u = clamp((t - a[0]) / d),
    u2 = u * u,
    u3 = u2 * u;
  return [1, 2, 3].map((c) => {
    const m0 = (b[c] - before[c]) / (b[0] - before[0]);
    const m1 = (after[c] - a[c]) / (after[0] - a[0]);
    return (
      (2 * u3 - 3 * u2 + 1) * a[c] +
      (u3 - 2 * u2 + u) * m0 * d +
      (-2 * u3 + 3 * u2) * b[c] +
      (u3 - u2) * m1 * d
    );
  }) as [number, number, number];
}
