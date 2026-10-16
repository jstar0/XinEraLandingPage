import { CatmullRomCurve3, Vector3 } from "three";
import type { IslandView } from "./content";

type Point = [number, number, number];

function closedCurve(points: Point[]) {
  const curve = new CatmullRomCurve3(
    points.map((point) => new Vector3(...point)),
    true,
    "centripetal",
  );
  curve.arcLengthDivisions = 480;
  return curve;
}

// Closed camera paths keep the loop seam smooth. The coastal path stays outside
// the island bounds; the other two paths remain above its highest point (9.21).
export const islandTours: Record<
  IslandView,
  { duration: number; eye: CatmullRomCurve3; target: CatmullRomCurve3 }
> = {
  coast: {
    duration: 110,
    eye: closedCurve([
      [25, 7, 28],
      [29, 8, 0],
      [24, 9, -30],
      [0, 8, -43],
      [-25, 7, -30],
      [-29, 6, 0],
      [-24, 6, 31],
      [0, 7, 43],
    ]),
    target: closedCurve([
      [0, 4.5, 6],
      [0, 5, -3],
      [0.5, 5.8, -7],
      [0, 5.3, -8],
      [-1, 4.6, -5],
      [-1, 4, 0],
      [0, 3.5, 8],
      [0, 3.8, 12],
    ]),
  },
  crater: {
    duration: 75,
    eye: closedCurve([
      [13, 15, 7],
      [17, 16, -7],
      [10, 18, -22],
      [-5, 17, -23],
      [-15, 14, -10],
      [-11, 13.5, 5],
      [1, 14, 12],
    ]),
    target: closedCurve([
      [0.93, 5.9, -5.34],
      [0.7, 6.8, -6.3],
      [0.4, 7, -6.9],
      [0.6, 6.5, -6.1],
      [0.93, 5.9, -5.34],
      [1.4, 5.4, -3.8],
      [1.2, 5.6, -4.5],
    ]),
  },
  island: {
    duration: 100,
    eye: closedCurve([
      [39, 24, 48],
      [48, 25, 2],
      [35, 27, -47],
      [0, 26, -61],
      [-38, 24, -46],
      [-47, 22, 1],
      [-34, 21, 48],
      [2, 23, 62],
    ]),
    target: closedCurve([
      [0, 2.5, 3],
      [0, 3, 0],
      [0, 3.5, -3],
      [0, 3.4, -5],
      [0, 3, -3],
      [0, 2.5, 0],
      [0, 2, 4],
      [0, 2.3, 6],
    ]),
  },
};

/** Sample into caller-owned vectors so the render loop creates no garbage. */
export function sampleIslandTour(
  route: IslandView,
  progress: number,
  eye: Vector3,
  target: Vector3,
) {
  const phase = ((progress % 1) + 1) % 1;
  const tour = islandTours[route];
  tour.eye.getPointAt(phase, eye);
  tour.target.getPointAt(phase, target);
}
