import * as THREE from "three";
import type { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import type { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import type { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import type { BlockGTAOPass } from "./block-gtao-pass";
import type { BlockPbrSet } from "./block-materials";
import { nextPreparationTask } from "./prepare-budget";

async function compileForTarget(
  renderer: THREE.WebGLRenderer,
  object: THREE.Object3D,
  camera: THREE.Camera,
  target: THREE.WebGLRenderTarget | null,
  signal: AbortSignal,
) {
  signal.throwIfAborted();
  const previous = renderer.getRenderTarget();
  let pending: Promise<unknown>;
  try {
    renderer.setRenderTarget(target);
    pending = renderer.compileAsync(object, camera);
  } finally {
    renderer.setRenderTarget(previous);
  }
  await pending;
  await nextPreparationTask(signal);
}

/** Keep CPU uploads and shader waits out of the first visible composer frame. */
export async function warmScene(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  target: THREE.WebGLRenderTarget,
  effects: {
    occlusion: BlockGTAOPass;
    bloom: UnrealBloomPass;
    antialias: SMAAPass;
    output: OutputPass;
  },
  signal: AbortSignal,
  pbr?: BlockPbrSet,
) {
  signal.throwIfAborted();
  const textures = new Set<THREE.Texture>();
  const collect = (value: unknown) => {
    if (value instanceof THREE.Texture && !value.isRenderTargetTexture)
      textures.add(value);
  };
  scene.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(node.material)
      ? node.material
      : [node.material])
      Object.values(material).forEach(collect);
  });
  // Custom dielectric F0 lives in a shader uniform, outside standard material fields.
  for (const maps of pbr?.values() ?? []) Object.values(maps).forEach(collect);
  let deadline = performance.now() + 6;
  for (const texture of textures) {
    signal.throwIfAborted();
    renderer.initTexture(texture);
    if (performance.now() >= deadline) {
      await nextPreparationTask(signal);
      deadline = performance.now() + 6;
    }
  }
  await nextPreparationTask(signal);
  // Offscreen rendering uses different output/tone-mapping shader defines than
  // the default framebuffer. Warming the latter misses every actual beauty variant.
  await compileForTarget(renderer, scene, camera, target, signal);
  await effects.occlusion.prepare(renderer, signal);
  await nextPreparationTask(signal);

  const { occlusion, bloom, antialias, output } = effects;
  // These r186 properties are not all represented in the published typings.
  const bloomMaterials = bloom as unknown as {
    materialHighPassFilter: THREE.Material;
    separableBlurMaterials: THREE.Material[];
    compositeMaterial: THREE.Material;
    blendMaterial: THREE.Material;
  };
  const materials = [
    occlusion.gtaoMaterial,
    occlusion.pdMaterial,
    occlusion.copyMaterial,
    occlusion.blendMaterial,
    bloomMaterials.materialHighPassFilter,
    ...bloomMaterials.separableBlurMaterials,
    bloomMaterials.compositeMaterial,
    bloomMaterials.blendMaterial,
    ...Object.values(antialias).filter(
      (value): value is THREE.Material => value instanceof THREE.Material,
    ),
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3),
  );
  geometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2),
  );
  const screenCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(geometry, materials[0]);
  try {
    for (const material of materials) {
      quad.material = material;
      await compileForTarget(renderer, quad, screenCamera, target, signal);
    }
    // OutputPass assigns these same defines on its first render. The app uses ACES/sRGB.
    if (
      renderer.toneMapping === THREE.ACESFilmicToneMapping &&
      renderer.outputColorSpace === THREE.SRGBColorSpace
    ) {
      output.material.defines = {
        SRGB_TRANSFER: "",
        ACES_FILMIC_TONE_MAPPING: "",
      };
      quad.material = output.material;
      await compileForTarget(renderer, quad, screenCamera, null, signal);
    }
  } finally {
    geometry.dispose();
    // The pass owns its material; discard only our temporary quad geometry.
  }
}
