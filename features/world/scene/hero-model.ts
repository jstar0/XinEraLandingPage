import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { finishHeroMaterials, type HeroMaterialMap } from "./hero-materials";
import { prepareHeroWater } from "./hero-water";
import { prepareBlockMaterials } from "../../gallery/block-materials";
import { createBlockLights, readBlockLights } from "../../gallery/block-lights";

/** Authored hero diorama: facade, courtyard, Juyiting and a mossy floating rock base. */
export async function loadHeroModel(signal: AbortSignal, anisotropy: number) {
  const response = await fetch("/xinera/hero/cathedral-island.glb?v=abc7b920", {
    signal,
  });
  if (!response.ok) throw new Error("Cannot load cathedral model");
  const bytes = await response.arrayBuffer();
  signal.throwIfAborted();
  const gltf = await new GLTFLoader()
    .setMeshoptDecoder(MeshoptDecoder)
    .parseAsync(bytes, "/xinera/hero/");
  try {
    signal.throwIfAborted();
    prepareBlockMaterials(gltf.scene, anisotropy);
    gltf.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material]) {
        if (!(material instanceof THREE.MeshStandardMaterial)) continue;
        material.roughness = 0.91;
        material.metalness = 0;
        // glTF's black emission factor otherwise suppresses its lamp atlas.
        if (material.emissiveMap) material.emissive.set("#ffffff");
        material.emissiveIntensity = 1.6;
        if (material.transparent) object.castShadow = false;
      }
    });
    const group = new THREE.Group();
    group.name = "hero-cathedral-model";
    group.add(gltf.scene);
    const [data, materialResponse] = await Promise.all([
      readBlockLights("/xinera/hero/cathedral-island-lights.json", signal),
      fetch("/xinera/hero/cathedral-materials.json", { signal }),
    ]);
    if (!materialResponse.ok)
      throw new Error("Hero material definitions unavailable");
    finishHeroMaterials(
      group,
      (await materialResponse.json()) as HeroMaterialMap,
    );
    signal.throwIfAborted();
    const lights = createBlockLights(group, data, 6);
    const water = prepareHeroWater(group);
    return { group, lights, water };
  } catch (error) {
    disposeHeroObject(gltf.scene);
    throw error;
  }
}

export function disposeHeroObject(root: THREE.Object3D) {
  const textures = new Set<THREE.Texture>();
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    if (object instanceof THREE.DirectionalLight) object.shadow.dispose();
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Points))
      return;
    object.geometry.dispose();
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material))
        if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  textures.forEach((texture) => texture.dispose());
  materials.forEach((material) => material.dispose());
}
