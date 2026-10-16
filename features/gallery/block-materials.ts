import * as THREE from "three";

/** Gallery exports use 16px block textures in 20px atlas cells (2px gutters). */
export function prepareBlockMaterials(
  root: THREE.Object3D,
  anisotropy: number,
) {
  const tiles = new Map<THREE.Texture, Map<number, THREE.CanvasTexture>>();
  const replaced = new Set<THREE.Material>();
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
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const original = object.material;
    if (!(original instanceof THREE.MeshStandardMaterial) || !original.map)
      return;
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
      return;
    const emissionImage = original.emissiveMap?.image as
      | { width: number; height: number }
      | undefined;
    if (
      original.emissiveMap &&
      (emissionImage?.width !== image.width ||
        emissionImage?.height !== image.height)
    )
      throw new Error("Block emission atlas must match the color atlas layout");
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
    }
    const index = geometry.getIndex();
    const buckets = new Map<number, number[]>();
    for (
      let triangle = 0;
      triangle < (index?.count ?? uv.count);
      triangle += 3
    ) {
      const a = index ? index.getX(triangle) : triangle;
      const b = index ? index.getX(triangle + 1) : triangle + 1;
      const c = index ? index.getX(triangle + 2) : triangle + 2;
      const tile = tileIds[a];
      // Keep the export contract explicit: a triangle cannot span two block textures.
      if (tileIds[b] !== tile || tileIds[c] !== tile)
        throw new Error("Invalid block atlas triangle");
      let bucket = buckets.get(tile);
      if (!bucket) buckets.set(tile, (bucket = []));
      bucket.push(a, b, c);
    }
    const materials: THREE.MeshStandardMaterial[] = [];
    const indices = new Uint32Array(index?.count ?? uv.count);
    geometry.clearGroups();
    let offset = 0;
    for (const [tile, bucket] of buckets) {
      // Cloning preserves alphaTest (MASK), transparency (BLEND), opacity and side.
      const material = original.clone();
      material.userData.blockTextureTile = tile;
      material.alphaToCoverage = false;
      material.map = extractTile(source, tile);
      if (original.emissiveMap)
        material.emissiveMap = extractTile(original.emissiveMap, tile);
      geometry.addGroup(offset, bucket.length, materials.length);
      indices.set(bucket, offset);
      offset += bucket.length;
      materials.push(material);
    }
    geometry.setAttribute("uv", new THREE.BufferAttribute(local, 2));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    object.material = materials;
    replaced.add(original);
  });
  replaced.forEach((material) => material.dispose());
  tiles.forEach((_, source) => source.dispose());
}
