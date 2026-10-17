import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { finishHeroMaterials, type HeroMaterialMap } from "./hero-materials";
import { prepareHeroWater } from "./hero-water";
import { prepareBlockMaterialsAsync } from "../../gallery/block-materials";
import { createBlockLights, readBlockLights } from "../../gallery/block-lights";
import { requestHero } from "./hero-request";
import { loadBlockPbr } from "../../rendering/pbr-textures";

/** Authored hero diorama: facade, courtyard, Juyiting and a mossy floating rock base. */
export async function loadHeroModel(
  signal: AbortSignal,
  anisotropy: number,
  download?: Promise<ArrayBuffer>,
) {
  let materialResources: Awaited<ReturnType<typeof loadBlockPbr>> | undefined;
  const definitionsPromise = fetch("/xinera/hero/cathedral-materials.json", {
    signal,
  }).then(async (response) => {
    if (!response.ok) throw new Error("Hero material definitions unavailable");
    return (await response.json()) as HeroMaterialMap;
  });
  const pbrPromise = definitionsPromise
    .then((definitions) => loadBlockPbr(definitions, signal, anisotropy))
    .then((loaded) => {
      if (signal.aborted) {
        loaded.dispose();
        signal.throwIfAborted();
      }
      materialResources = loaded;
    })
    .catch((error: unknown) => {
      if (signal.aborted) throw error;
      console.warn(
        "Hero PBR textures unavailable; retaining base materials",
        error,
      );
    });
  let gltf: Awaited<ReturnType<GLTFLoader["parseAsync"]>> | undefined;
  try {
    const [bytes, data, definitions] = await Promise.all([
      download ?? requestHero(signal, () => {}),
      readBlockLights("/xinera/hero/cathedral-island-lights.json", signal),
      definitionsPromise,
      pbrPromise,
    ]);
    signal.throwIfAborted();
    gltf = await new GLTFLoader()
      .setMeshoptDecoder(MeshoptDecoder)
      .parseAsync(bytes, "/xinera/hero/");
    signal.throwIfAborted();
    await prepareBlockMaterialsAsync(gltf.scene, anisotropy, signal);
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
    const materialStats = finishHeroMaterials(
      group,
      definitions,
      materialResources?.textures,
    );
    signal.throwIfAborted();
    const lights = createBlockLights(group, data, 6);
    const water = prepareHeroWater(group);
    return { group, lights, water, materialResources, materialStats };
  } catch (error) {
    if (gltf) disposeHeroObject(gltf.scene);
    materialResources?.dispose();
    // A parallel texture request may finish after another branch has failed.
    void pbrPromise.then(
      () => materialResources?.dispose(),
      () => {},
    );
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
