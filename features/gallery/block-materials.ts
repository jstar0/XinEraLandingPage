import * as THREE from "three";
import { nextPreparationTask } from "../rendering/prepare-budget";

const CHUNK_SIZE = 2048;
const PREPARATION_BUDGET_MS = 6;

type PreparedMesh = {
  object: THREE.Mesh;
  original: THREE.MeshStandardMaterial;
  local: Float32Array;
  indices: Uint32Array;
  groups: { start: number; count: number; materialIndex: number }[];
  materials: THREE.MeshStandardMaterial[];
};

/** Gallery exports use 16px block textures in 20px atlas cells (2px gutters). */
export function prepareBlockMaterials(
  root: THREE.Object3D,
  anisotropy: number,
) {
  const preparation = prepare(root, anisotropy);
  while (!preparation.next().done) {
    // Synchronous consumers use the same preparation and resource ownership.
  }
}

/** Keep the loading animation responsive while preparing a large block mesh. */
export async function prepareBlockMaterialsAsync(
  root: THREE.Object3D,
  anisotropy: number,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  const preparation = prepare(root, anisotropy);
  let deadline = performance.now() + PREPARATION_BUDGET_MS;
  try {
    for (;;) {
      signal?.throwIfAborted();
      if (preparation.next().done) return;
      if (performance.now() >= deadline) {
        await nextPreparationTask(signal);
        deadline = performance.now() + PREPARATION_BUDGET_MS;
      }
    }
  } finally {
    // Also runs when a navigation disposes the scene during a pending yield.
    preparation.return();
  }
}

function* prepare(root: THREE.Object3D, anisotropy: number) {
  const tiles = new Map<THREE.Texture, Map<number, THREE.CanvasTexture>>();
  const temporaryMaterials: THREE.Material[] = [];
  const prepared: PreparedMesh[] = [];
  let committed = false;
  function extractTile(source: THREE.Texture, tile: number) {
    let cache = tiles.get(source);
    if (!cache) tiles.set(source, (cache = new Map()));
    const cached = cache.get(tile);
    if (cached) return cached;
    const image = source.image as CanvasImageSource & {
      width: number;
      height: number;
    };
    const columns = image.width / 20;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 16;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Block texture canvas unavailable");
    context.drawImage(
      image,
      (tile % columns) * 20 + 2,
      Math.floor(tile / columns) * 20 + 2,
      16,
      16,
      0,
      0,
      16,
      16,
    );
    const texture = new THREE.CanvasTexture(canvas);
    texture.flipY = false;
    texture.colorSpace = source.colorSpace;
    // Each block owns its mip chain, including any separate emission atlas.
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.anisotropy = Math.min(anisotropy, 8);
    cache.set(tile, texture);
    return texture;
  }
  const meshes: THREE.Mesh[] = [];
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) meshes.push(object);
  });
  try {
    for (const object of meshes) {
      const original = object.material;
      if (!(original instanceof THREE.MeshStandardMaterial) || !original.map)
        continue;
      const source = original.map;
      const image = source.image as CanvasImageSource & {
        width: number;
        height: number;
      };
      const columns = image.width / 20;
      const rows = image.height / 20;
      if (
        !Number.isInteger(columns) ||
        !Number.isInteger(rows) ||
        columns < 1 ||
        rows < 1 ||
        columns * rows > 65_536
      )
        continue;
      const emissionImage = original.emissiveMap?.image as
        | { width: number; height: number }
        | undefined;
      if (
        original.emissiveMap &&
        (emissionImage?.width !== image.width ||
          emissionImage?.height !== image.height)
      )
        throw new Error(
          "Block emission atlas must match the color atlas layout",
        );
      const geometry = object.geometry as THREE.BufferGeometry;
      const uv = geometry.getAttribute("uv");
      const local = new Float32Array(uv.count * 2);
      const tileIds = new Uint16Array(uv.count);
      for (let vertex = 0; vertex < uv.count; vertex++) {
        const u = uv.getX(vertex),
          v = uv.getY(vertex);
        const column = THREE.MathUtils.clamp(
          Math.floor((u * image.width) / 20),
          0,
          columns - 1,
        );
        const row = THREE.MathUtils.clamp(
          Math.floor((v * image.height) / 20),
          0,
          rows - 1,
        );
        tileIds[vertex] = row * columns + column;
        local[vertex * 2] = THREE.MathUtils.clamp(
          (u * image.width - column * 20 - 2) / 16,
          0,
          1,
        );
        local[vertex * 2 + 1] = THREE.MathUtils.clamp(
          (v * image.height - row * 20 - 2) / 16,
          0,
          1,
        );
        if ((vertex + 1) % CHUNK_SIZE === 0) yield;
      }
      yield;
      const index = geometry.getIndex();
      const indexCount = index?.count ?? uv.count;
      const counts = new Uint32Array(columns * rows);
      const order: number[] = [];
      for (let triangle = 0; triangle < indexCount; triangle += 3) {
        const a = index ? index.getX(triangle) : triangle;
        const b = index ? index.getX(triangle + 1) : triangle + 1;
        const c = index ? index.getX(triangle + 2) : triangle + 2;
        const tile = tileIds[a];
        // Keep the export contract explicit: a triangle cannot span two block textures.
        if (tileIds[b] !== tile || tileIds[c] !== tile)
          throw new Error("Invalid block atlas triangle");
        if (!counts[tile]) order.push(tile);
        counts[tile] += 3;
        if ((triangle + 3) % (CHUNK_SIZE * 3) === 0) yield;
      }
      yield;
      const materials: THREE.MeshStandardMaterial[] = [];
      const indices = new Uint32Array(indexCount);
      const groups: PreparedMesh["groups"] = [];
      const cursors = new Uint32Array(counts.length);
      let offset = 0;
      for (const tile of order) {
        // Cloning preserves alphaTest (MASK), transparency (BLEND), opacity and side.
        const material = original.clone();
        temporaryMaterials.push(material);
        material.userData.blockTextureTile = tile;
        material.alphaToCoverage = false;
        material.map = extractTile(source, tile);
        if (original.emissiveMap)
          material.emissiveMap = extractTile(original.emissiveMap, tile);
        groups.push({
          start: offset,
          count: counts[tile],
          materialIndex: materials.length,
        });
        cursors[tile] = offset;
        offset += counts[tile];
        materials.push(material);
        yield;
      }
      for (let triangle = 0; triangle < indexCount; triangle += 3) {
        const a = index ? index.getX(triangle) : triangle;
        const tile = tileIds[a];
        const cursor = cursors[tile];
        indices[cursor] = a;
        indices[cursor + 1] = index ? index.getX(triangle + 1) : triangle + 1;
        indices[cursor + 2] = index ? index.getX(triangle + 2) : triangle + 2;
        cursors[tile] += 3;
        if ((triangle + 3) % (CHUNK_SIZE * 3) === 0) yield;
      }
      prepared.push({ object, original, local, indices, groups, materials });
      yield;
    }
    // No scene changes before this point: abort/error can dispose only our staged
    // resources, and a caller can safely dispose its original tree while we wait.
    const replaced = new Set<THREE.Material>();
    for (const {
      object,
      original,
      local,
      indices,
      groups,
      materials,
    } of prepared) {
      object.geometry.groups = groups;
      object.geometry.setAttribute("uv", new THREE.BufferAttribute(local, 2));
      object.geometry.setIndex(new THREE.BufferAttribute(indices, 1));
      object.material = materials;
      replaced.add(original);
    }
    committed = true;
    replaced.forEach((material) => material.dispose());
    tiles.forEach((_, source) => source.dispose());
  } finally {
    if (!committed) {
      temporaryMaterials.forEach((material) => material.dispose());
      tiles.forEach((cache) => cache.forEach((texture) => texture.dispose()));
    }
  }
}
