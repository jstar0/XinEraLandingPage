export type GridPoint = {
  x: number;
  y: number;
};

export type ProjectedQuad = {
  bottomLeft: GridPoint;
  bottomRight: GridPoint;
  topLeft: GridPoint;
  topRight: GridPoint;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function snapUnit(value: number) {
  const clamped = clamp(value, 0, 1);

  if (Math.abs(clamped) < 1e-9) {
    return 0;
  }

  if (Math.abs(clamped - 1) < 1e-9) {
    return 1;
  }

  return clamped;
}

function solveLinearSystem(matrix: number[][], values: number[]) {
  const size = values.length;
  const rows = matrix.map((row, index) => [...row, values[index]]);

  for (let column = 0; column < size; column += 1) {
    let pivotRow = column;

    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(rows[row][column]) > Math.abs(rows[pivotRow][column])) {
        pivotRow = row;
      }
    }

    const pivot = rows[pivotRow][column];

    if (Math.abs(pivot) < 1e-9) {
      return null;
    }

    [rows[column], rows[pivotRow]] = [rows[pivotRow], rows[column]];

    for (let entry = column; entry <= size; entry += 1) {
      rows[column][entry] /= pivot;
    }

    for (let row = 0; row < size; row += 1) {
      if (row === column) {
        continue;
      }

      const factor = rows[row][column];

      for (let entry = column; entry <= size; entry += 1) {
        rows[row][entry] -= factor * rows[column][entry];
      }
    }
  }

  return rows.map((row) => row[size]);
}

function buildHomography(source: GridPoint[], target: GridPoint[]) {
  const matrix: number[][] = [];
  const values: number[] = [];

  for (let index = 0; index < source.length; index += 1) {
    const sourcePoint = source[index];
    const targetPoint = target[index];

    matrix.push([
      sourcePoint.x,
      sourcePoint.y,
      1,
      0,
      0,
      0,
      -targetPoint.x * sourcePoint.x,
      -targetPoint.x * sourcePoint.y,
    ]);
    values.push(targetPoint.x);
    matrix.push([
      0,
      0,
      0,
      sourcePoint.x,
      sourcePoint.y,
      1,
      -targetPoint.y * sourcePoint.x,
      -targetPoint.y * sourcePoint.y,
    ]);
    values.push(targetPoint.y);
  }

  const solved = solveLinearSystem(matrix, values);

  if (!solved) {
    return null;
  }

  return [...solved, 1];
}

function applyHomography(homography: number[], point: GridPoint) {
  const denominator = homography[6] * point.x + homography[7] * point.y + homography[8];

  if (Math.abs(denominator) < 1e-9) {
    return null;
  }

  return {
    x: (homography[0] * point.x + homography[1] * point.y + homography[2]) / denominator,
    y: (homography[3] * point.x + homography[4] * point.y + homography[5]) / denominator,
  };
}

export function mapPointerToProjectedQuad(point: GridPoint, quad: ProjectedQuad) {
  const homography = buildHomography(
    [quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft],
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ],
  );
  const mapped = homography ? applyHomography(homography, point) : null;

  if (!mapped) {
    return null;
  }

  return {
    x: snapUnit(mapped.x),
    y: snapUnit(mapped.y),
  };
}
