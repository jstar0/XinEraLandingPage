import * as THREE from "three";
// The voxel geometry, face palette and depth positions restore the earlier
// spatial-study opening. Clouds are independent volumes, not moving cutout images.
export function createCloudSystem(scene: THREE.Scene) {
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    fog: true,
  });
  function cloud({
    x,
    y,
    z,
    sx = 1,
    sy = 1,
    sz = 1,
    seed = 7,
  }: {
    x: number;
    y: number;
    z: number;
    sx?: number;
    sy?: number;
    sz?: number;
    seed?: number;
  }) {
    const occupied = new Set<string>(),
      step = 0.19,
      key = (a: number, b: number, c: number) => a + "," + b + "," + c;
    const lobes = [
      [-1.85, 0.1, 0, 0.95, 0.47, 0.75],
      [-0.75, 0.42, 0.05, 1.15, 0.85, 0.93],
      [0.45, 0.6, 0, 1.16, 1.02, 0.88],
      [1.55, 0.18, -0.1, 1.0, 0.6, 0.8],
      [0, -0.18, 0.28, 2.5, 0.45, 0.75],
    ];
    const noise = (a: number, b: number, c: number) => {
      const n = Math.sin(a * 17.43 + b * 31.7 + c * 13.59 + seed) * 43758.54;
      return n - Math.floor(n);
    };
    for (let iz = -8; iz <= 8; iz++)
      for (let iy = -7; iy <= 10; iy++)
        for (let ix = -17; ix <= 17; ix++) {
          const px = ix * step,
            py = iy * step,
            pz = iz * step;
          let d = 99;
          for (const [cx, cy, cz, rx, ry, rz] of lobes)
            d = Math.min(
              d,
              ((px - cx) / rx) ** 2 +
                ((py - cy) / ry) ** 2 +
                ((pz - cz) / rz) ** 2,
            );
          if (d < 1 + (noise(ix, iy, iz) - 0.5) * 0.15)
            occupied.add(key(ix, iy, iz));
        }
    const positions: number[] = [],
      colors: number[] = [],
      normals: number[] = [],
      indices: number[] = [];
    const faces = [
      { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0], color: "#eacdc5" },
      { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], color: "#ffe8c7" },
      { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1], color: "#fff1cf" },
      { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], color: "#afa1bb" },
      { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], color: "#f2d5c7" },
      { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0], color: "#cfc0d2" },
    ];
    const has = (
      c: number[],
      n: number[],
      u: number[],
      v: number[],
      du: number,
      dv: number,
    ) =>
      occupied.has(
        key(
          c[0] + n[0] + u[0] * du + v[0] * dv,
          c[1] + n[1] + u[1] * du + v[1] * dv,
          c[2] + n[2] + u[2] * du + v[2] * dv,
        ),
      );
    for (const cell of occupied) {
      const c = cell.split(",").map(Number);
      for (const f of faces) {
        const { n, u, v } = f;
        if (has(c, n, u, v, 0, 0)) continue;
        const start = positions.length / 3;
        const baseColor = new THREE.Color(f.color);
        for (const [du, dv] of [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ]) {
          for (let a = 0; a < 3; a++) {
            positions.push(
              (c[a] + 0.5 * n[a] + 0.5 * du * u[a] + 0.5 * dv * v[a]) * step,
            );
            normals.push(n[a]);
          }
          const ao =
            Number(has(c, n, u, v, du, 0)) +
            Number(has(c, n, u, v, 0, dv)) +
            Number(has(c, n, u, v, du, dv));
          const shade =
            (1 - ao * 0.055) * (0.975 + noise(c[0], c[1], c[2]) * 0.035);
          colors.push(
            baseColor.r * shade,
            baseColor.g * shade,
            baseColor.b * shade,
          );
        }
        indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    scene.add(mesh);
    return mesh;
  }

  const specs = [
    {
      name: "cloud-near-left",
      x: -4.8,
      y: -3.2,
      z: 5.7,
      sx: 1.4,
      sy: 1.25,
      sz: 1.2,
      seed: 18,
    },
    {
      name: "cloud-near-right",
      x: 4.9,
      y: -3.3,
      z: 6.6,
      sx: 1.3,
      sy: 1.3,
      sz: 1.15,
      seed: 43,
    },
    {
      name: "cloud-far-left",
      x: -12,
      y: 10,
      z: -17,
      sx: 1.4,
      sy: 1.2,
      sz: 1.1,
      seed: 32,
    },
    {
      name: "cloud-far-right",
      x: 18,
      y: 6.5,
      z: -20,
      sx: 1.9,
      sy: 1.4,
      sz: 1.1,
      seed: 88,
    },
    {
      name: "cloud-lower-bridge",
      x: 2.8,
      y: -4.1,
      z: 7.4,
      sx: 2.0,
      sy: 1.4,
      sz: 1.35,
      seed: 61,
    },
  ];
  const meshes = specs.map((spec) => {
    const mesh = cloud(spec);
    mesh.name = spec.name;
    return mesh;
  });
  let mobile = false;
  return {
    meshes,
    setMobile(value: boolean) {
      mobile = value;
      for (let i = 0; i < meshes.length; i++) {
        const m = meshes[i],
          s = specs[i];
        m.position.y = s.y * (mobile && s.z > 0 ? 1.1 : 1);
        m.scale.set(s.sx, s.sy, s.sz);
      }
    },
    update(time: number) {
      for (let i = 0; i < meshes.length; i++) {
        const s = specs[i];
        meshes[i].position.x =
          s.x * (mobile && s.z > 0 ? 0.65 : 1) +
          (i === 3 ? Math.sin(time * 0.045) * 0.13 : 0);
      }
    },
    dispose() {
      meshes.forEach((m) => {
        m.removeFromParent();
        m.geometry.dispose();
      });
      material.dispose();
    },
  };
}
