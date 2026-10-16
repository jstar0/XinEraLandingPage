import * as THREE from "three";

type Kind =
  | "stone"
  | "wood"
  | "leaves"
  | "glass"
  | "metal"
  | "light"
  | "water"
  | "other";
export type HeroMaterialMap = {
  tiles: { tile: number; texture: string; kind: Kind }[];
};

/** Retains original vanilla albedo; only the physical response varies by actual texture. */
export function finishHeroMaterials(
  root: THREE.Object3D,
  definitions: HeroMaterialMap,
) {
  const names = new Map(definitions.tiles.map((tile) => [tile.tile, tile]));
  const relief = new Map<THREE.Texture, THREE.CanvasTexture>();
  function subtleRelief(map: THREE.Texture) {
    const existing = relief.get(map);
    if (existing) return existing;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 16;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(map.image as CanvasImageSource, 0, 0, 16, 16);
    const pixels = ctx.getImageData(0, 0, 16, 16);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const value = Math.round(
        pixels.data[i] * 0.2126 +
          pixels.data[i + 1] * 0.7152 +
          pixels.data[i + 2] * 0.0722,
      );
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
      pixels.data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.flipY = map.flipY;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.anisotropy = map.anisotropy;
    relief.set(map, texture);
    return texture;
  }
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material]) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue;
      const definition = names.get(material.userData.blockTextureTile);
      const kind = definition?.kind ?? "other";
      material.roughness =
        kind === "glass"
          ? 0.18
          : kind === "metal"
            ? 0.42
            : kind === "wood"
              ? 0.72
              : kind === "leaves"
                ? 0.85
                : 0.88;
      material.metalness = kind === "metal" ? 0.55 : 0;
      material.envMapIntensity =
        kind === "glass" ? 1.1 : kind === "metal" ? 0.9 : 0.65;
      if (material.map && (kind === "stone" || kind === "wood")) {
        material.bumpMap = subtleRelief(material.map);
        material.bumpScale = kind === "stone" ? 0.004 : 0.002;
      }
      if (kind === "leaves") {
        material.alphaToCoverage = false;
        material.roughness = 1;
        material.envMapIntensity = 0.2;
        if (definition?.texture.includes("leaves")) material.alphaTest = 0.18;
      }
    }
  });
}
