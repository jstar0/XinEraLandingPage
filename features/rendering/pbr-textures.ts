import * as THREE from "three";
import runtime from "../../public/xinera/pbr/runtime.json";
import {
  blockTextureKey,
  type BlockMaterialDefinitions,
  type BlockPbrSet,
  type BlockPbrTextures,
} from "./block-materials";

type Entry = { tile: number; normal: boolean; specular: boolean };
const entries = new Map<string, Entry>(
  runtime.textures.map(([key, tile, mask]) => [
    String(key),
    {
      tile: Number(tile),
      normal: (Number(mask) & 1) !== 0,
      specular: (Number(mask) & 2) !== 0,
    },
  ]),
);

async function loadAtlas(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`PBR atlas failed: ${response.status}`);
  const bitmap = await createImageBitmap(await response.blob(), {
    imageOrientation: "none",
    premultiplyAlpha: "none",
    colorSpaceConversion: "none",
  });
  if (signal.aborted) {
    bitmap.close();
    signal.throwIfAborted();
  }
  if (bitmap.width !== runtime.width || bitmap.height !== runtime.height) {
    bitmap.close();
    throw new Error("PBR atlas dimensions do not match the manifest");
  }
  return bitmap;
}

/**
 * Three shared network PNGs, not one request per block. Only the scene's actual
 * tiles are cropped, each with its own mip chain so distant faces cannot bleed
 * into neighboring materials. The pack never replaces a scene's base color.
 */
export async function loadBlockPbr(
  definitions: BlockMaterialDefinitions,
  signal: AbortSignal,
  anisotropy: number,
): Promise<{ textures: BlockPbrSet; dispose: () => void }> {
  signal.throwIfAborted();
  const requested = [
    ...new Set(definitions.tiles.map((tile) => blockTextureKey(tile.texture))),
  ].filter((key) => entries.has(key));
  const textures = new Map<string, BlockPbrTextures>();
  const owned = new Set<THREE.Texture>();
  const dispose = () => {
    owned.forEach((texture) => texture.dispose());
    owned.clear();
    textures.clear();
  };
  if (!requested.length) return { textures, dispose };
  const results = await Promise.allSettled([
    loadAtlas(runtime.atlases.normal, signal),
    loadAtlas(runtime.atlases.orm, signal),
    loadAtlas(runtime.atlases.f0, signal),
  ]);
  const bitmaps = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
  try {
    const failure = results.find((result) => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
    signal.throwIfAborted();
    const [normal, orm, f0] = bitmaps;
    function extract(image: ImageBitmap, tile: number) {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = runtime.tileSize;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("PBR texture canvas unavailable");
      context.drawImage(
        image,
        (tile % runtime.columns) * runtime.tileSize,
        Math.floor(tile / runtime.columns) * runtime.tileSize,
        runtime.tileSize,
        runtime.tileSize,
        0,
        0,
        runtime.tileSize,
        runtime.tileSize,
      );
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.NoColorSpace;
      texture.flipY = false;
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.anisotropy = Math.max(1, Math.min(anisotropy, 8));
      owned.add(texture);
      return texture;
    }
    for (const key of requested) {
      const entry = entries.get(key)!;
      const maps: BlockPbrTextures = {};
      const surface = extract(orm, entry.tile);
      if (entry.normal) {
        maps.normalMap = extract(normal, entry.tile);
        maps.normalScale = 1;
        maps.aoMap = surface;
      }
      if (entry.specular) {
        maps.roughnessMap = surface;
        maps.metalnessMap = surface;
        maps.f0Map = extract(f0, entry.tile);
      }
      textures.set(key, maps);
    }
    return { textures, dispose };
  } catch (error) {
    dispose();
    throw error;
  } finally {
    bitmaps.forEach((bitmap) => bitmap.close());
  }
}
